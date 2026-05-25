"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGenerationWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const Assignment_1 = require("../models/Assignment");
const Result_1 = require("../models/Result");
const aiService_1 = require("../services/aiService");
const pdfService_1 = require("../services/pdfService");
const cacheService_1 = require("../services/cacheService");
const socketManager_1 = require("../socket/socketManager");
const initGenerationWorker = () => {
    const worker = new bullmq_1.Worker('question-generation', async (job) => {
        const { assignmentId } = job.data;
        console.log(`👷 Worker: Starting question generation for assignment: ${assignmentId}`);
        const assignment = await Assignment_1.Assignment.findById(assignmentId);
        if (!assignment) {
            throw new Error(`Assignment not found: ${assignmentId}`);
        }
        try {
            // 1. Update status to processing
            assignment.status = 'processing';
            await assignment.save();
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', { assignmentId });
            // Invalidate list cache
            await cacheService_1.cacheService.del('assignments:list');
            // 2. Generate questions using AI
            const questions = await (0, aiService_1.generateQuestions)({
                subject: assignment.subject,
                gradeLevel: assignment.gradeLevel,
                topic: assignment.topic,
                difficulty: assignment.difficulty,
                numberOfQuestions: assignment.numberOfQuestions,
                questionType: assignment.questionType,
                sourceMaterial: assignment.sourceMaterial,
            });
            // 3. Create or update Result
            let result = await Result_1.Result.findOne({ assignmentId });
            if (!result) {
                result = new Result_1.Result({
                    assignmentId: assignment._id,
                    questions,
                });
            }
            else {
                result.questions = questions;
            }
            // 4. Generate A4 PDF
            const pdfFilename = await (0, pdfService_1.generateAssessmentPDF)(assignment, questions);
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
            await cacheService_1.cacheService.set(`result:${assignmentId}`, JSON.stringify(responsePayload), 3600 // 1 hour TTL
            );
            // Invalidate lists again to ensure status is up to date
            await cacheService_1.cacheService.del('assignments:list');
            // 6. Emit completion event
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:completed', responsePayload);
            console.log(`👷 Worker: Successfully completed assignment: ${assignmentId}`);
            return responsePayload;
        }
        catch (error) {
            console.error(`❌ Worker Error on assignment ${assignmentId}:`, error);
            // Update assignment status to failed
            assignment.status = 'failed';
            assignment.error = error.message || 'Unknown generation error';
            await assignment.save();
            // Invalidate list cache
            await cacheService_1.cacheService.del('assignments:list');
            // Emit failure event
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:failed', {
                assignmentId,
                error: assignment.error,
            });
            throw error;
        }
    }, {
        connection: redis_1.redisConnectionOptions,
        concurrency: 2,
    });
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
exports.initGenerationWorker = initGenerationWorker;
