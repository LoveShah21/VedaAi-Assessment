"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regenerateAssignment = exports.getAssignmentResult = exports.getAssignmentById = exports.getAssignments = exports.createAssignment = void 0;
const Assignment_1 = require("../models/Assignment");
const Result_1 = require("../models/Result");
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
        const { title, subject, gradeLevel, topic, difficulty, numberOfQuestions, questionType } = req.body;
        const assignment = new Assignment_1.Assignment({
            title,
            subject,
            gradeLevel,
            topic,
            difficulty,
            numberOfQuestions,
            questionType,
            sourceMaterial,
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
        await cacheService_1.cacheService.del('assignments:list');
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
        const cacheKey = 'assignments:list';
        const cachedData = await cacheService_1.cacheService.get(cacheKey);
        if (cachedData) {
            res.status(200).json({
                success: true,
                source: 'cache',
                assignments: JSON.parse(cachedData),
            });
            return;
        }
        const assignments = await Assignment_1.Assignment.find().sort({ createdAt: -1 });
        await cacheService_1.cacheService.set(cacheKey, JSON.stringify(assignments), 300);
        res.status(200).json({
            success: true,
            source: 'database',
            assignments,
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
        const assignment = await Assignment_1.Assignment.findById(id);
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
        const assignment = await Assignment_1.Assignment.findById(id);
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
        const assignment = await Assignment_1.Assignment.findById(id);
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
        await cacheService_1.cacheService.del('assignments:list');
        await cacheService_1.cacheService.del(`result:${id}`);
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
