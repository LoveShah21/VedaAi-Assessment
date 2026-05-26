"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAssignmentPDF = exports.getAssignmentStats = exports.duplicateAssignment = exports.deleteAssignment = exports.regenerateAssignment = exports.getAssignmentResult = exports.getAssignmentById = exports.getAssignments = exports.createAssignment = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Assignment_1 = require("../models/Assignment");
const Result_1 = require("../models/Result");
const Activity_1 = require("../models/Activity");
const generationQueue_1 = require("../queues/generationQueue");
const cacheService_1 = require("../services/cacheService");
const fileParser_1 = require("../utils/fileParser");
const socketManager_1 = require("../socket/socketManager");
const getErrorMessage = (error) => {
    if (error instanceof Error)
        return error.message;
    return String(error);
};
const createAssignment = async (req, res, next) => {
    try {
        let sourceMaterial = req.body.sourceMaterial || '';
        if (req.file) {
            console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
            try {
                const extractedText = await (0, fileParser_1.parseFileContent)(req.file);
                sourceMaterial = extractedText.trim();
            }
            catch (parseErr) {
                res.status(400).json({
                    success: false,
                    message: `Failed to parse file: ${getErrorMessage(parseErr)}`,
                });
                return;
            }
        }
        let subject = req.body.subject;
        let gradeLevel = req.body.gradeLevel || req.body.grade;
        let topic = req.body.topic;
        let difficulty = req.body.difficulty;
        let numberOfQuestions = req.body.numberOfQuestions;
        let questionType = req.body.questionType;
        let schoolName = req.body.schoolName;
        let timeAllowed = req.body.timeAllowed;
        let includeAnswerKey = req.body.includeAnswerKey;
        let questionRows = req.body.questionRows;
        // Support nested formData structure if sent by the frontend
        if (req.body.formData) {
            const fd = req.body.formData;
            subject = fd.subject || subject;
            gradeLevel = fd.grade || fd.gradeLevel || gradeLevel;
            schoolName = fd.schoolName || schoolName;
            timeAllowed = fd.timeAllowed !== undefined ? Number(fd.timeAllowed) : timeAllowed;
            includeAnswerKey = fd.includeAnswerKey !== undefined ? !!fd.includeAnswerKey : includeAnswerKey;
            questionRows = fd.questionRows || questionRows;
            // Calculate total questions if questionRows is provided
            if (Array.isArray(fd.questionRows)) {
                numberOfQuestions = fd.questionRows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
                // Map types: if there's only 1 type, map to it, otherwise mixed
                const uniqueTypes = Array.from(new Set(fd.questionRows.map((r) => String(r.type).toLowerCase())));
                if (uniqueTypes.length === 1) {
                    const typeStr = uniqueTypes[0];
                    if (typeStr.includes('mcq'))
                        questionType = 'mcq';
                    else if (typeStr.includes('short'))
                        questionType = 'short';
                    else if (typeStr.includes('long'))
                        questionType = 'long';
                    else
                        questionType = 'mixed';
                }
                else {
                    questionType = 'mixed';
                }
            }
            // Map difficulty object or weights to a string 'easy' | 'medium' | 'hard'
            if (fd.difficulty) {
                if (typeof fd.difficulty === 'string') {
                    difficulty = fd.difficulty;
                }
                else {
                    const { easy, moderate, hard } = fd.difficulty;
                    const e = Number(easy) || 0;
                    const m = Number(moderate) || 0;
                    const h = Number(hard) || 0;
                    if (e >= m && e >= h)
                        difficulty = 'easy';
                    else if (h >= e && h >= m)
                        difficulty = 'hard';
                    else
                        difficulty = 'medium';
                }
            }
            // Map voicePrompt to topic or use file name
            if (fd.voicePrompt && fd.voicePrompt.trim().length > 0) {
                topic = fd.voicePrompt.trim().slice(0, 50);
            }
            else if (req.file) {
                topic = req.file.originalname.split('.')[0];
            }
            else {
                topic = 'Curriculum';
            }
        }
        // Generate smart title
        const smartTitle = `${subject} Grade ${gradeLevel} Assessment - ${topic}`;
        const assignment = new Assignment_1.Assignment({
            title: smartTitle,
            subject,
            gradeLevel,
            topic,
            difficulty,
            numberOfQuestions,
            questionType,
            sourceMaterial,
            schoolName,
            timeAllowed,
            includeAnswerKey,
            questionRows,
            grade: gradeLevel,
            status: 'pending',
        });
        await assignment.save();
        const jobId = assignment._id.toString();
        const job = await (0, generationQueue_1.addGenerationJob)(jobId);
        const jobPosition = await (0, generationQueue_1.getJobPositionInQueue)(job.id || jobId);
        (0, socketManager_1.emitToAssignment)(jobId, 'job:queued', {
            assignmentId: jobId,
            position: jobPosition,
        });
        await cacheService_1.cacheService.delPattern('assignments:list:*');
        // Create activity log
        const activity = new Activity_1.Activity({
            type: 'assignment_created',
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
            metadata: {
                subject: assignment.subject,
                gradeLevel: assignment.gradeLevel,
                topic: assignment.topic,
                numberOfQuestions: assignment.numberOfQuestions,
            },
        });
        await activity.save();
        res.status(201).json({
            success: true,
            message: 'Assessment creation request queued successfully',
            assignment,
            jobPosition,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createAssignment = createAssignment;
const getAssignments = async (req, res, next) => {
    try {
        const status = req.query.status;
        const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        const query = { deleted: { $ne: true } };
        if (status) {
            query.status = status;
        }
        const cacheKey = `assignments:list:${status || 'all'}:${page || 'all'}:${limit || 'all'}`;
        const cachedData = await cacheService_1.cacheService.get(cacheKey);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            res.status(200).json({
                success: true,
                source: 'cache',
                ...parsed,
            });
            return;
        }
        let assignmentsQuery = Assignment_1.Assignment.find(query).sort({ createdAt: -1 });
        if (page && limit) {
            const skip = (page - 1) * limit;
            assignmentsQuery = assignmentsQuery.skip(skip).limit(limit);
        }
        const assignments = await assignmentsQuery;
        const total = await Assignment_1.Assignment.countDocuments(query);
        const payload = {
            assignments,
            total,
            page: page || 1,
            limit: limit || total,
            totalPages: limit ? Math.ceil(total / limit) : 1,
        };
        await cacheService_1.cacheService.set(cacheKey, JSON.stringify(payload), 300);
        res.status(200).json({
            success: true,
            source: 'database',
            ...payload,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAssignments = getAssignments;
const getAssignmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!assignment) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            assignment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAssignmentById = getAssignmentById;
const getAssignmentResult = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cacheKey = `result:${id}`;
        const cachedData = await cacheService_1.cacheService.get(cacheKey);
        if (cachedData) {
            res.status(200).json({
                success: true,
                source: 'cache',
                ...JSON.parse(cachedData),
            });
            return;
        }
        const assignment = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!assignment) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        const result = await Result_1.Result.findOne({ assignmentId: id });
        const payload = {
            assignment,
            result,
        };
        if (result) {
            await cacheService_1.cacheService.set(cacheKey, JSON.stringify(payload), 3600);
        }
        res.status(200).json({
            success: true,
            source: 'database',
            ...payload,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAssignmentResult = getAssignmentResult;
const regenerateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!assignment) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        assignment.status = 'pending';
        assignment.error = undefined;
        await assignment.save();
        const job = await (0, generationQueue_1.addGenerationJob)(id);
        const jobPosition = await (0, generationQueue_1.getJobPositionInQueue)(job.id || id);
        await cacheService_1.cacheService.delPattern('assignments:list:*');
        await cacheService_1.cacheService.del(`result:${id}`);
        // Create activity log for regeneration
        const activity = new Activity_1.Activity({
            type: 'regenerated',
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
            metadata: {
                subject: assignment.subject,
                gradeLevel: assignment.gradeLevel,
            },
        });
        await activity.save();
        (0, socketManager_1.emitToAssignment)(id, 'job:queued', {
            assignmentId: id,
            position: jobPosition,
        });
        res.status(200).json({
            success: true,
            message: 'Assessment regeneration request queued successfully',
            assignment,
            jobPosition,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.regenerateAssignment = regenerateAssignment;
const deleteAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!assignment) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        assignment.deleted = true;
        await assignment.save();
        // Invalidate caches
        await cacheService_1.cacheService.delPattern('assignments:list:*');
        await cacheService_1.cacheService.del(`result:${id}`);
        // Create activity log for delete
        const activity = new Activity_1.Activity({
            type: 'assignment_deleted',
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
            metadata: {
                subject: assignment.subject,
                gradeLevel: assignment.gradeLevel,
            },
        });
        await activity.save();
        res.status(200).json({
            success: true,
            message: 'Assignment soft-deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteAssignment = deleteAssignment;
const duplicateAssignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const original = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!original) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        const smartTitle = `${original.title} (Copy)`;
        const duplicated = new Assignment_1.Assignment({
            title: smartTitle,
            subject: original.subject,
            gradeLevel: original.gradeLevel,
            topic: original.topic,
            difficulty: original.difficulty,
            numberOfQuestions: original.numberOfQuestions,
            questionType: original.questionType,
            sourceMaterial: original.sourceMaterial,
            schoolName: original.schoolName,
            timeAllowed: original.timeAllowed,
            includeAnswerKey: original.includeAnswerKey,
            questionRows: original.questionRows,
            grade: original.grade,
            status: 'pending',
        });
        await duplicated.save();
        const newJobId = duplicated._id.toString();
        const job = await (0, generationQueue_1.addGenerationJob)(newJobId);
        const jobPosition = await (0, generationQueue_1.getJobPositionInQueue)(job.id || newJobId);
        // Emit socket event for queued status
        (0, socketManager_1.emitToAssignment)(newJobId, 'job:queued', {
            assignmentId: newJobId,
            position: jobPosition,
        });
        await cacheService_1.cacheService.delPattern('assignments:list:*');
        // Create activity log
        const activity = new Activity_1.Activity({
            type: 'assignment_created',
            assignmentId: duplicated._id,
            assignmentTitle: duplicated.title,
            metadata: {
                duplicatedFrom: original._id,
                subject: duplicated.subject,
                gradeLevel: duplicated.gradeLevel,
                topic: duplicated.topic,
            },
        });
        await activity.save();
        const sourceConfig = {
            subject: original.subject,
            grade: original.grade || original.gradeLevel,
            schoolName: original.schoolName || 'Veda International School',
            timeAllowed: original.timeAllowed || 60,
            difficulty: original.difficulty,
            includeAnswerKey: original.includeAnswerKey !== undefined ? original.includeAnswerKey : true,
            questionRows: original.questionRows || [],
        };
        res.status(201).json({
            success: true,
            newAssignmentId: newJobId,
            sourceConfig,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.duplicateAssignment = duplicateAssignment;
const getAssignmentStats = async (req, res, next) => {
    try {
        const assignments = await Assignment_1.Assignment.find({ deleted: { $ne: true } });
        const totalAssignments = assignments.length;
        // Compute totalQuestions using the MongoDB aggregation on Result documents linked to non-deleted completed assignments
        const questionsResult = await Result_1.Result.aggregate([
            {
                $lookup: {
                    from: 'assignments',
                    localField: 'assignmentId',
                    foreignField: '_id',
                    as: 'assignment'
                }
            },
            { $unwind: '$assignment' },
            {
                $match: {
                    'assignment.deleted': { $ne: true },
                    'assignment.status': 'completed'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalQuestions' }
                }
            }
        ]);
        const totalQuestions = questionsResult[0]?.total || 0;
        const avgQuestions = totalAssignments > 0 ? (totalQuestions / totalAssignments) : 0;
        const pendingCount = assignments.filter(a => a.status === 'pending').length;
        const processingCount = assignments.filter(a => a.status === 'processing').length;
        const failedCount = assignments.filter(a => a.status === 'failed').length;
        const completedCount = assignments.filter(a => a.status === 'completed').length;
        res.status(200).json({
            success: true,
            stats: {
                totalAssignments,
                totalQuestionsGenerated: totalQuestions,
                averageQuestionsPerAssignment: Math.round(avgQuestions * 100) / 100,
                pendingQueueCount: pendingCount,
                inProgressQueueCount: processingCount,
                failedCount,
                completedCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAssignmentStats = getAssignmentStats;
const downloadAssignmentPDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const assignment = await Assignment_1.Assignment.findOne({ _id: id, deleted: { $ne: true } });
        if (!assignment) {
            res.status(404).json({
                success: false,
                message: 'Assignment not found',
            });
            return;
        }
        const result = await Result_1.Result.findOne({ assignmentId: id });
        if (!result || !result.pdfUrl) {
            res.status(404).json({
                success: false,
                message: 'PDF not generated for this assignment',
            });
            return;
        }
        // Log the pdf_downloaded activity event
        const activity = new Activity_1.Activity({
            type: 'pdf_downloaded',
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
            metadata: {
                subject: assignment.subject,
                gradeLevel: assignment.gradeLevel,
            },
        });
        await activity.save();
        // Resolve the path to the uploads directory
        const uploadsDir = path_1.default.resolve(process.env.UPLOAD_DIR || 'uploads');
        const filename = path_1.default.basename(result.pdfUrl);
        const filePath = path_1.default.join(uploadsDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            res.download(filePath, `${assignment.title.replace(/\s+/g, '_')}.pdf`);
        }
        else {
            res.redirect(result.pdfUrl);
        }
    }
    catch (error) {
        next(error);
    }
};
exports.downloadAssignmentPDF = downloadAssignmentPDF;
