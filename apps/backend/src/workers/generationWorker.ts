import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { Assignment } from '../models/Assignment';
import { Result } from '../models/Result';
import { generateQuestions } from '../services/aiService';
import { generateAssessmentPDF } from '../services/pdfService';
import { cacheService } from '../services/cacheService';
import { emitToAssignment } from '../socket/socketManager';

export const initGenerationWorker = () => {
  const worker = new Worker(
    'question-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`👷 Worker: Starting question generation for assignment: ${assignmentId}`);

      const assignment = await Assignment.findById(assignmentId);
      if (!assignment) {
        throw new Error(`Assignment not found: ${assignmentId}`);
      }

      try {
        // 1. Update status to processing
        assignment.status = 'processing';
        await assignment.save();
        emitToAssignment(assignmentId, 'job:processing', { assignmentId });

        // Invalidate list cache
        await cacheService.del('assignments:list');

        // 2. Generate questions using AI
        const questions = await generateQuestions({
          subject: assignment.subject,
          gradeLevel: assignment.gradeLevel,
          topic: assignment.topic,
          difficulty: assignment.difficulty,
          numberOfQuestions: assignment.numberOfQuestions,
          questionType: assignment.questionType,
          sourceMaterial: assignment.sourceMaterial,
        });

        // 3. Create or update Result
        let result = await Result.findOne({ assignmentId });
        if (!result) {
          result = new Result({
            assignmentId: assignment._id,
            questions,
          });
        } else {
          result.questions = questions;
        }

        // 4. Generate A4 PDF
        const pdfFilename = await generateAssessmentPDF(assignment, questions);
        result.pdfUrl = `/uploads/${pdfFilename}`;
        await result.save();

        // 5. Update assignment status to completed
        assignment.status = 'completed';
        await assignment.save();

        const responsePayload = {
          assignment,
          result,
        };

        // Cache the result
        await cacheService.set(
          `result:${assignmentId}`,
          JSON.stringify(responsePayload),
          3600 // 1 hour TTL
        );

        // Invalidate lists again to ensure status is up to date
        await cacheService.del('assignments:list');

        // 6. Emit completion event
        emitToAssignment(assignmentId, 'job:completed', responsePayload);

        console.log(`👷 Worker: Successfully completed assignment: ${assignmentId}`);
        return responsePayload;
      } catch (error: any) {
        console.error(`❌ Worker Error on assignment ${assignmentId}:`, error);

        // Update assignment status to failed
        assignment.status = 'failed';
        assignment.error = error.message || 'Unknown generation error';
        await assignment.save();

        // Invalidate list cache
        await cacheService.del('assignments:list');

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
