"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssignmentSchema = void 0;
// apps/backend/src/validators/assignmentValidator.ts
const zod_1 = require("zod");
// Schema for direct API calls (flat body with proper field names)
const directSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required'),
    className: zod_1.z.string().min(1, 'Class is required'),
    schoolName: zod_1.z.string().min(1, 'School name is required'),
    timeAllowed: zod_1.z.coerce.number().min(15).max(240),
    dueDate: zod_1.z.string().min(1, 'Due date is required'),
    questionTypes: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.string().min(1),
        count: zod_1.z.coerce.number().min(1).max(50),
        marksPerQuestion: zod_1.z.coerce.number().min(1).max(20),
    }))
        .min(1, 'At least one question type is required'),
    difficultyDistribution: zod_1.z
        .object({
        easy: zod_1.z.coerce.number(),
        medium: zod_1.z.coerce.number(),
        hard: zod_1.z.coerce.number(),
    })
        .refine((d) => d.easy + d.medium + d.hard === 100, 'Difficulty must sum to 100'),
    additionalInstructions: zod_1.z.string().optional().default(''),
    includeAnswerKey: zod_1.z.boolean().optional().default(false),
    voicePrompt: zod_1.z.string().optional(),
});
// Schema for the nested formData shape sent by the frontend
// Accepts the frontend's field names: grade, questionRows, difficulty, voicePrompt
const formDataSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required'),
    grade: zod_1.z.string().min(1, 'Grade/Class is required'),
    schoolName: zod_1.z.string().min(1, 'School name is required'),
    timeAllowed: zod_1.z.coerce.number().min(15).max(240),
    dueDate: zod_1.z.string().min(1, 'Due date is required'),
    questionRows: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().optional(),
        type: zod_1.z.string().min(1),
        count: zod_1.z.coerce.number().min(1).max(50),
        marksPerQuestion: zod_1.z.coerce.number().min(1).max(20),
    }))
        .min(1, 'At least one question type is required'),
    difficulty: zod_1.z.object({
        easy: zod_1.z.coerce.number(),
        medium: zod_1.z.coerce.number(),
        hard: zod_1.z.coerce.number(),
    }),
    voicePrompt: zod_1.z.string().optional().default(''),
    includeAnswerKey: zod_1.z.boolean().optional().default(false),
    // file is handled separately via multer
    file: zod_1.z.any().optional(),
});
exports.createAssignmentSchema = zod_1.z.object({
    body: zod_1.z.union([
        // Option 1: Direct flat body
        directSchema,
        // Option 2: Nested formData from frontend
        zod_1.z.object({
            formData: formDataSchema,
        }),
        // Option 3: Passthrough (file upload with formData as string or partial)
        zod_1.z.object({}).passthrough(),
    ]),
});
