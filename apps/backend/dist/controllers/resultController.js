"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamPdf = exports.getResult = exports.getResultById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Result_1 = require("../models/Result");
const cacheService_1 = require("../services/cacheService");
const pdfService = __importStar(require("../services/pdfService"));
const getResultById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(404).json({
                success: false,
                message: 'Result not found',
            });
            return;
        }
        const result = await Result_1.Result.findById(id);
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Result not found',
            });
            return;
        }
        // Check Redis cache keyed by assignmentId
        const cacheKey = `result:${result.assignmentId}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            res.status(200).json({
                success: true,
                source: 'cache',
                result: parsed.result ?? result,
            });
            return;
        }
        res.status(200).json({
            success: true,
            source: 'database',
            result,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getResultById = getResultById;
const getResult = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }
        const cacheKey = `result:${id}`;
        const cached = await cacheService_1.cacheService.get(cacheKey);
        if (cached) {
            res.status(200).json(JSON.parse(cached));
            return;
        }
        const result = await Result_1.Result.findById(id);
        if (!result) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getResult = getResult;
const streamPdf = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }
        const result = await Result_1.Result.findById(id).populate('assignmentId');
        if (!result) {
            res.status(404).json({ error: 'Result not found' });
            return;
        }
        const assignment = result.assignmentId;
        // Override includeAnswerKey if query param provided
        const includeAnswerKey = req.query.includeAnswerKey !== undefined
            ? req.query.includeAnswerKey === 'true'
            : assignment.includeAnswerKey;
        const pdfBuffer = await pdfService.generatePdf(result, assignment, includeAnswerKey);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="question-paper.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        next(error);
    }
};
exports.streamPdf = streamPdf;
