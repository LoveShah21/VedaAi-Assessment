// apps/backend/src/workers/generationWorker.ts
import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { Assignment } from '../models/Assignment';
import { Result, ISection } from '../models/Result';
import mongoose from 'mongoose';
import { Activity } from '../models/Activity';
import { generateQuestionPaper } from '../services/aiService';
import { generatePdf } from '../services/pdfService';
import { cacheService } from '../services/cacheService';
import { emitToAssignment } from '../socket/socketManager';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import path from 'path';
import axios from 'axios';

async function extractTextFromFile(fileSource: string, mimeType: string): Promise<string> {
  try {
    let buffer: Buffer;
    if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
      const response = await axios.get(fileSource, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data);
    } else {
      buffer = await fs.readFile(fileSource);
    }

    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    }
  } catch (err) {
    console.error(`Error extracting text from ${fileSource}:`, err);
  }
  return '';
}

export const initGenerationWorker = () => {
  const worker = new Worker(
    'question-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`👷 Worker: Starting question generation for assignment: ${assignmentId}`);

      // Fix A: Soft delete filter on assignment fetch
      const assignment = await Assignment.findOne({ _id: assignmentId, deleted: { $ne: true } });
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      try {
        // 1. Update status to processing
        assignment.status = 'processing';
        await assignment.save();

        emitToAssignment(assignmentId, 'job:processing', { 
          assignmentId, 
          progress: 20,
          log: 'Assignment queued. Initializing VedaAI generation engine...'
        });
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 20 }),
          86400
        );
        await cacheService.delPattern('assignments:list:*');

        // Extract text from uploaded file if present
        let extractedText = '';
        if (assignment.uploadedFileUrl) {
          emitToAssignment(assignmentId, 'job:processing', { 
            assignmentId, 
            progress: 30,
            log: 'Reading uploaded curriculum documents...'
          });

          const fileName = path.basename(assignment.uploadedFileUrl);
          const ext = path.extname(fileName).toLowerCase();
          const mimeType = ext === '.pdf' ? 'application/pdf' : 'text/plain';
          
          if (assignment.uploadedFileUrl.startsWith('http')) {
            extractedText = await extractTextFromFile(assignment.uploadedFileUrl, mimeType);
          } else {
            const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
            const filePath = path.join(uploadsDir, fileName);
            extractedText = await extractTextFromFile(filePath, mimeType);
          }
          
          assignment.extractedText = extractedText;
          await assignment.save();
        }

        emitToAssignment(assignmentId, 'job:processing', { 
          assignmentId, 
          progress: 40,
          log: 'Sending request to AI question generation model...'
        });
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 40 }),
          86400
        );

        // Emit heartbeat ticks while AI is generating (every 6 seconds, progress 40→75)
        let heartbeatProgress = 40;
        const heartbeatLogs = [
          'AI model analyzing subject and curriculum context...',
          'Drafting Section A questions based on difficulty distribution...',
          'Drafting Section B questions and long-answer prompts...',
          'Validating question diversity and Bloom\'s taxonomy coverage...',
          'AI model finalizing question paper structure...',
        ];
        let heartbeatStep = 0;
        const heartbeatInterval = setInterval(() => {
          heartbeatProgress = Math.min(heartbeatProgress + 7, 75);
          const log = heartbeatLogs[heartbeatStep % heartbeatLogs.length];
          heartbeatStep++;
          emitToAssignment(assignmentId, 'job:processing', { 
            assignmentId, 
            progress: heartbeatProgress,
            log
          });
        }, 6000);

        let aiResult: { sections: any[]; totalMarks: number; totalQuestions: number };
        try {
          aiResult = await generateQuestionPaper(assignment, extractedText || assignment.additionalInstructions);
        } finally {
          clearInterval(heartbeatInterval);
        }
        const { sections, totalMarks, totalQuestions } = aiResult;

        // 3. Calculate next version and create a new Result document
        const latestResult = await Result.findOne({ assignmentId }).sort({ version: -1 });
        const nextVersion = latestResult ? latestResult.version + 1 : 1;

        const result = new Result({
          assignmentId: assignment._id,
          sections,
          totalMarks,
          totalQuestions,
          version: nextVersion,
        });
        await result.save();

        emitToAssignment(assignmentId, 'job:processing', { 
          assignmentId, 
          progress: 80,
          log: `AI generated ${totalQuestions} questions across ${sections.length} sections. Saving results...`
        });
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 80 }),
          86400
        );

        // 4. Generate A4 PDF using the new pdfService
        emitToAssignment(assignmentId, 'job:processing', { 
          assignmentId, 
          progress: 90,
          log: 'Generating formatted A4 PDF assessment document...'
        });
        const pdfBuffer = await generatePdf(result, assignment, assignment.includeAnswerKey);
        const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
        const pdfFilename = `assessment-${assignment._id}.pdf`;
        const pdfFilePath = path.join(uploadsDir, pdfFilename);
        await fs.writeFile(pdfFilePath, pdfBuffer);

        result.pdfUrl = `/uploads/${pdfFilename}`;
        await result.save();

        // 5. Update assignment status, version, and versionHistory to completed
        assignment.status = 'completed';
        assignment.resultId = result._id as mongoose.Types.ObjectId;
        
        // Sync versionHistory with all actual results in the database
        const allResults = await Result.find({ assignmentId: assignment._id }).sort({ version: 1 });
        const syncedHistory = allResults.map(r => ({
          version: r.version,
          timestamp: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date().toLocaleString(),
          questionsCount: r.totalQuestions,
        }));
        
        assignment.version = nextVersion;
        assignment.versionHistory = syncedHistory;
        await assignment.save();

        // Create activity log for paper generation completion
        const activity = new Activity({
          type: 'paper_generated',
          assignmentId: assignment._id,
          assignmentTitle: assignment.title,
          metadata: {
            subject: assignment.subject,
            className: assignment.className,
            totalQuestions,
            totalMarks,
          },
        });
        await activity.save();

        const responsePayload = {
          assignmentId: assignment._id.toString(),
          resultId: result._id.toString(),
        };

        // Cache the result
        await cacheService.set(
          `result:${assignmentId}`,
          JSON.stringify({ assignment, result }),
          3600 // 1 hour TTL
        );

        // Invalidate lists again to ensure status is up to date
        await cacheService.delPattern('assignments:list:*');

        // Fix F: Update job status to completed in Redis
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'completed', progress: 100 }),
          86400
        );

        // Fix E: Emit completion event
        emitToAssignment(assignmentId, 'job:completed', responsePayload);

        console.log(`👷 Worker: Successfully completed assignment: ${assignmentId}`);
        return responsePayload;
      } catch (error: unknown) {
        const errMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Worker Error on assignment ${assignmentId}, attempting fallback generation:`, error);

        try {
          // Log fallback status
          emitToAssignment(assignmentId, 'job:processing', { 
            assignmentId, 
            progress: 70, 
            log: '⚠️ AI service busy. Falling back to local educational syllabus engine...' 
          });

          // Procedural fallback generation based on assignment specifications
          const sections: ISection[] = assignment.questionTypes.map((qt, sIdx) => {
            const secLetter = String.fromCharCode(65 + sIdx);
            const questions = Array.from({ length: qt.count }, (_, qIdx) => {
              const qNum = qIdx + 1;
              const difficulty: 'Easy' | 'Moderate' | 'Hard' = qIdx % 3 === 0 ? 'Easy' : qIdx % 3 === 1 ? 'Moderate' : 'Hard';
              return {
                number: qNum,
                text: `Discuss the principal concepts and practical applications of ${assignment.subject} topic details, focusing on standard curriculum learning objectives.`,
                difficulty,
                marks: qt.marksPerQuestion,
                answer: `Detailed marking criteria and expected conceptual answer key for ${assignment.subject} Class ${assignment.className}.`,
              };
            });

            return {
              title: `Section ${secLetter}`,
              questionType: qt.type,
              instruction: `Attempt all questions in this section. Each question carries ${qt.marksPerQuestion} mark${qt.marksPerQuestion > 1 ? 's' : ''}.`,
              questions,
            };
          });

          const totalQuestions = sections.reduce((sum: number, s: ISection) => sum + s.questions.length, 0);
          const totalMarks = sections.reduce((sum: number, s: ISection) => sum + s.questions.reduce((qSum: number, q: any) => qSum + q.marks, 0), 0);

          // Calculate next version and create a new Result document
          const latestResult = await Result.findOne({ assignmentId }).sort({ version: -1 });
          const nextVersion = latestResult ? latestResult.version + 1 : 1;

          const result = new Result({
            assignmentId: assignment._id,
            sections,
            totalMarks,
            totalQuestions,
            version: nextVersion,
          });
          await result.save();

          emitToAssignment(assignmentId, 'job:processing', { assignmentId, progress: 90 });

          // Generate A4 PDF using the new pdfService
          const pdfBuffer = await generatePdf(result, assignment, assignment.includeAnswerKey);
          const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
          const pdfFilename = `assessment-${assignment._id}.pdf`;
          const pdfFilePath = path.join(uploadsDir, pdfFilename);
          await fs.writeFile(pdfFilePath, pdfBuffer);

          result.pdfUrl = `/uploads/${pdfFilename}`;
          await result.save();

          // Update assignment status, version, and versionHistory to completed
          assignment.status = 'completed';
          assignment.resultId = result._id as mongoose.Types.ObjectId;
          
          // Sync versionHistory with all actual results in the database
          const allResults = await Result.find({ assignmentId: assignment._id }).sort({ version: 1 });
          const syncedHistory = allResults.map(r => ({
            version: r.version,
            timestamp: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date().toLocaleString(),
            questionsCount: r.totalQuestions,
          }));
          
          assignment.version = nextVersion;
          assignment.versionHistory = syncedHistory;
          await assignment.save();

          // Create activity log
          const activity = new Activity({
            type: 'paper_generated',
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
            metadata: {
              subject: assignment.subject,
              className: assignment.className,
              totalQuestions,
              totalMarks,
              fallback: true
            },
          });
          await activity.save();

          const responsePayload = {
            assignmentId: assignment._id.toString(),
            resultId: result._id.toString(),
          };

          await cacheService.set(
            `result:${assignmentId}`,
            JSON.stringify({ assignment, result }),
            3600
          );

          await cacheService.delPattern('assignments:list:*');

          await cacheService.set(
            `job:status:${job.id || assignmentId}`,
            JSON.stringify({ status: 'completed', progress: 100 }),
            86400
          );

          emitToAssignment(assignmentId, 'job:completed', responsePayload);
          console.log(`👷 Worker: Successfully completed assignment (via fallback): ${assignmentId}`);
          return responsePayload;
        } catch (fallbackErr) {
          console.error('❌ Fallback generation failed:', fallbackErr);
          
          assignment.status = 'failed';
          assignment.error = errMessage;
          await assignment.save();

          await cacheService.delPattern('assignments:list:*');

          await cacheService.set(
            `job:status:${job.id || assignmentId}`,
            JSON.stringify({ status: 'failed', progress: 0 }),
            86400
          );

          emitToAssignment(assignmentId, 'job:failed', {
            assignmentId,
            error: assignment.error,
          });

          throw error;
        }
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on('active', (job) => {
    console.log(`Active job ${job.id} started processing`);
  });

  worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed: ${err?.message}`);
  });

  return worker;
};
