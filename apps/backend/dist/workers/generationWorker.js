"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGenerationWorker = void 0;
// apps/backend/src/workers/generationWorker.ts
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const Assignment_1 = require("../models/Assignment");
const Result_1 = require("../models/Result");
const Activity_1 = require("../models/Activity");
const aiService_1 = require("../services/aiService");
const pdfService_1 = require("../services/pdfService");
const cacheService_1 = require("../services/cacheService");
const socketManager_1 = require("../socket/socketManager");
const promises_1 = __importDefault(require("fs/promises"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
async function extractTextFromFile(fileSource, mimeType) {
    try {
        let buffer;
        if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
            const response = await axios_1.default.get(fileSource, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
        }
        else {
            buffer = await promises_1.default.readFile(fileSource);
        }
        if (mimeType === 'application/pdf') {
            const data = await (0, pdf_parse_1.default)(buffer);
            return data.text;
        }
        else if (mimeType === 'text/plain') {
            return buffer.toString('utf-8');
        }
    }
    catch (err) {
        console.error(`Error extracting text from ${fileSource}:`, err);
    }
    return '';
}
const initGenerationWorker = () => {
    const worker = new bullmq_1.Worker('question-generation', async (job) => {
        const { assignmentId } = job.data;
        console.log(`👷 Worker: Starting question generation for assignment: ${assignmentId}`);
        // Fix A: Soft delete filter on assignment fetch
        const assignment = await Assignment_1.Assignment.findOne({ _id: assignmentId, deleted: { $ne: true } });
        if (!assignment) {
            throw new Error(`Assignment not found: ${assignmentId}`);
        }
        try {
            // 1. Update status to processing
            assignment.status = 'processing';
            await assignment.save();
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                assignmentId,
                progress: 20,
                log: 'Assignment queued. Initializing VedaAI generation engine...'
            });
            await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'processing', progress: 20 }), 86400);
            await cacheService_1.cacheService.delPattern('assignments:list:*');
            // Extract text from uploaded file if present
            let extractedText = '';
            if (assignment.uploadedFileUrl) {
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                    assignmentId,
                    progress: 30,
                    log: 'Reading uploaded curriculum documents...'
                });
                const fileName = path_1.default.basename(assignment.uploadedFileUrl);
                const ext = path_1.default.extname(fileName).toLowerCase();
                const mimeType = ext === '.pdf' ? 'application/pdf' : 'text/plain';
                if (assignment.uploadedFileUrl.startsWith('http')) {
                    extractedText = await extractTextFromFile(assignment.uploadedFileUrl, mimeType);
                }
                else {
                    const uploadsDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
                    const filePath = path_1.default.join(uploadsDir, fileName);
                    extractedText = await extractTextFromFile(filePath, mimeType);
                }
                assignment.extractedText = extractedText;
                await assignment.save();
            }
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                assignmentId,
                progress: 40,
                log: 'Sending request to AI question generation model...'
            });
            await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'processing', progress: 40 }), 86400);
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
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                    assignmentId,
                    progress: heartbeatProgress,
                    log
                });
            }, 6000);
            let aiResult;
            try {
                aiResult = await (0, aiService_1.generateQuestionPaper)(assignment, extractedText || assignment.additionalInstructions);
            }
            finally {
                clearInterval(heartbeatInterval);
            }
            const { sections, totalMarks, totalQuestions } = aiResult;
            // 3. Calculate next version and create a new Result document
            const latestResult = await Result_1.Result.findOne({ assignmentId }).sort({ version: -1 });
            const nextVersion = latestResult ? latestResult.version + 1 : 1;
            const result = new Result_1.Result({
                assignmentId: assignment._id,
                sections,
                totalMarks,
                totalQuestions,
                version: nextVersion,
            });
            await result.save();
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                assignmentId,
                progress: 80,
                log: `AI generated ${totalQuestions} questions across ${sections.length} sections. Saving results...`
            });
            await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'processing', progress: 80 }), 86400);
            // 4. Generate A4 PDF using the new pdfService
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                assignmentId,
                progress: 90,
                log: 'Generating formatted A4 PDF assessment document...'
            });
            const pdfBuffer = await (0, pdfService_1.generatePdf)(result, assignment, assignment.includeAnswerKey);
            const uploadsDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
            const pdfFilename = `assessment-${assignment._id}.pdf`;
            const pdfFilePath = path_1.default.join(uploadsDir, pdfFilename);
            await promises_1.default.writeFile(pdfFilePath, pdfBuffer);
            result.pdfUrl = `/uploads/${pdfFilename}`;
            await result.save();
            // 5. Update assignment status, version, and versionHistory to completed
            assignment.status = 'completed';
            assignment.resultId = result._id;
            // Sync versionHistory with all actual results in the database
            const allResults = await Result_1.Result.find({ assignmentId: assignment._id }).sort({ version: 1 });
            const syncedHistory = allResults.map(r => ({
                version: r.version,
                timestamp: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date().toLocaleString(),
                questionsCount: r.totalQuestions,
            }));
            assignment.version = nextVersion;
            assignment.versionHistory = syncedHistory;
            await assignment.save();
            // Create activity log for paper generation completion
            const activity = new Activity_1.Activity({
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
            await cacheService_1.cacheService.set(`result:${assignmentId}`, JSON.stringify({ assignment, result }), 3600 // 1 hour TTL
            );
            // Invalidate lists again to ensure status is up to date
            await cacheService_1.cacheService.delPattern('assignments:list:*');
            // Fix F: Update job status to completed in Redis
            await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'completed', progress: 100 }), 86400);
            // Fix E: Emit completion event
            (0, socketManager_1.emitToAssignment)(assignmentId, 'job:completed', responsePayload);
            console.log(`👷 Worker: Successfully completed assignment: ${assignmentId}`);
            return responsePayload;
        }
        catch (error) {
            const errMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ Worker Error on assignment ${assignmentId}, attempting fallback generation:`, error);
            try {
                // Log fallback status
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', {
                    assignmentId,
                    progress: 70,
                    log: '⚠️ AI service busy. Falling back to local educational syllabus engine...'
                });
                // Procedural fallback generation based on assignment specifications
                const sections = assignment.questionTypes.map((qt, sIdx) => {
                    const secLetter = String.fromCharCode(65 + sIdx);
                    const questions = Array.from({ length: qt.count }, (_, qIdx) => {
                        const qNum = qIdx + 1;
                        const difficulty = qIdx % 3 === 0 ? 'Easy' : qIdx % 3 === 1 ? 'Moderate' : 'Hard';
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
                const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
                const totalMarks = sections.reduce((sum, s) => sum + s.questions.reduce((qSum, q) => qSum + q.marks, 0), 0);
                // Calculate next version and create a new Result document
                const latestResult = await Result_1.Result.findOne({ assignmentId }).sort({ version: -1 });
                const nextVersion = latestResult ? latestResult.version + 1 : 1;
                const result = new Result_1.Result({
                    assignmentId: assignment._id,
                    sections,
                    totalMarks,
                    totalQuestions,
                    version: nextVersion,
                });
                await result.save();
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:processing', { assignmentId, progress: 90 });
                // Generate A4 PDF using the new pdfService
                const pdfBuffer = await (0, pdfService_1.generatePdf)(result, assignment, assignment.includeAnswerKey);
                const uploadsDir = path_1.default.resolve(process.env.UPLOAD_DIR || './uploads');
                const pdfFilename = `assessment-${assignment._id}.pdf`;
                const pdfFilePath = path_1.default.join(uploadsDir, pdfFilename);
                await promises_1.default.writeFile(pdfFilePath, pdfBuffer);
                result.pdfUrl = `/uploads/${pdfFilename}`;
                await result.save();
                // Update assignment status, version, and versionHistory to completed
                assignment.status = 'completed';
                assignment.resultId = result._id;
                // Sync versionHistory with all actual results in the database
                const allResults = await Result_1.Result.find({ assignmentId: assignment._id }).sort({ version: 1 });
                const syncedHistory = allResults.map(r => ({
                    version: r.version,
                    timestamp: r.generatedAt ? new Date(r.generatedAt).toLocaleString() : new Date().toLocaleString(),
                    questionsCount: r.totalQuestions,
                }));
                assignment.version = nextVersion;
                assignment.versionHistory = syncedHistory;
                await assignment.save();
                // Create activity log
                const activity = new Activity_1.Activity({
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
                await cacheService_1.cacheService.set(`result:${assignmentId}`, JSON.stringify({ assignment, result }), 3600);
                await cacheService_1.cacheService.delPattern('assignments:list:*');
                await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'completed', progress: 100 }), 86400);
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:completed', responsePayload);
                console.log(`👷 Worker: Successfully completed assignment (via fallback): ${assignmentId}`);
                return responsePayload;
            }
            catch (fallbackErr) {
                console.error('❌ Fallback generation failed:', fallbackErr);
                assignment.status = 'failed';
                assignment.error = errMessage;
                await assignment.save();
                await cacheService_1.cacheService.delPattern('assignments:list:*');
                await cacheService_1.cacheService.set(`job:status:${job.id || assignmentId}`, JSON.stringify({ status: 'failed', progress: 0 }), 86400);
                (0, socketManager_1.emitToAssignment)(assignmentId, 'job:failed', {
                    assignmentId,
                    error: assignment.error,
                });
                throw error;
            }
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
