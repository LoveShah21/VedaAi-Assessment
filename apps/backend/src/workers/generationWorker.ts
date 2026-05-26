// apps/backend/src/workers/generationWorker.ts
import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { Assignment } from '../models/Assignment';
import { Result } from '../models/Result';
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

        // Fix C: Fix job:processing to include progress
        emitToAssignment(assignmentId, 'job:processing', { assignmentId, progress: 30 });

        // Fix F: Fix Redis job status key to use jobId not assignmentId
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 30 }),
          86400
        );

        // Invalidate list cache
        await cacheService.delPattern('assignments:list:*');

        // Fix G: Fix file text extraction to handle TXT separately
        let extractedText = '';
        if (assignment.uploadedFileUrl) {
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

        emitToAssignment(assignmentId, 'job:processing', { assignmentId, progress: 60 });
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 60 }),
          86400
        );

        // Fix B: Replace AI service call
        const { sections, totalMarks, totalQuestions } = await generateQuestionPaper(assignment, extractedText || assignment.additionalInstructions);

        // 3. Create or update Result
        let result = await Result.findOne({ assignmentId });
        if (!result) {
          result = new Result({
            assignmentId: assignment._id,
            sections,
            totalMarks,
            totalQuestions,
            version: 1,
          });
        } else {
          result.sections = sections;
          result.totalMarks = totalMarks;
          result.totalQuestions = totalQuestions;
          result.version += 1;
        }
        await result.save();

        emitToAssignment(assignmentId, 'job:processing', { assignmentId, progress: 90 });
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'processing', progress: 90 }),
          86400
        );

        // 4. Generate A4 PDF using the new pdfService
        const pdfBuffer = await generatePdf(result, assignment, assignment.includeAnswerKey);
        const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
        const pdfFilename = `assessment-${assignment._id}.pdf`;
        const pdfFilePath = path.join(uploadsDir, pdfFilename);
        await fs.writeFile(pdfFilePath, pdfBuffer);

        result.pdfUrl = `/uploads/${pdfFilename}`;
        await result.save();

        // 5. Update assignment status to completed
        assignment.status = 'completed';
        assignment.resultId = result._id as mongoose.Types.ObjectId;
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
        console.error(`❌ Worker Error on assignment ${assignmentId}:`, error);

        // Update assignment status to failed
        assignment.status = 'failed';
        assignment.error = errMessage;
        await assignment.save();

        // Invalidate list cache
        await cacheService.delPattern('assignments:list:*');

        // Fix F: Update job status to failed in Redis
        await cacheService.set(
          `job:status:${job.id || assignmentId}`,
          JSON.stringify({ status: 'failed', progress: 0 }),
          86400
        );

        // Emit failure event
        emitToAssignment(assignmentId, 'job:failed', {
          assignmentId,
          error: assignment.error,
        });

        throw error;
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
