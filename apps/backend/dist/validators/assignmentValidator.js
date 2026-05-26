"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssignmentSchema = void 0;
const zod_1 = require("zod");
const flatSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    subject: zod_1.z.string({ required_error: 'Subject is required' }).min(2, 'Subject must be at least 2 characters'),
    gradeLevel: zod_1.z.string({ required_error: 'Grade level is required' }).min(1, 'Grade level is required'),
    topic: zod_1.z.string({ required_error: 'Topic is required' }).min(2, 'Topic must be at least 2 characters'),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard'], {
        required_error: 'Difficulty must be easy, medium, or hard',
    }),
    numberOfQuestions: zod_1.z.preprocess((val) => (typeof val === 'string' ? parseInt(val, 10) : val), zod_1.z.number({ required_error: 'Number of questions is required' }).min(1, 'At least 1 question is required').max(100, 'Maximum of 100 questions')),
    questionType: zod_1.z.enum(['mcq', 'short', 'long', 'mixed'], {
        required_error: 'Question type must be mcq, short, long, or mixed',
    }),
    sourceMaterial: zod_1.z.string().optional(),
});
const nestedSchema = zod_1.z.object({
    jobId: zod_1.z.string().optional(),
    formData: zod_1.z.object({
        subject: zod_1.z.string({ required_error: 'Subject is required' }),
        grade: zod_1.z.string({ required_error: 'Grade level is required' }),
        schoolName: zod_1.z.string().optional(),
        timeAllowed: zod_1.z.number().optional(),
        difficulty: zod_1.z.any().optional(),
        includeAnswerKey: zod_1.z.boolean().optional(),
        dueDate: zod_1.z.string().optional(),
        questionRows: zod_1.z.array(zod_1.z.any()).optional(),
        voicePrompt: zod_1.z.string().optional(),
    }),
});
exports.createAssignmentSchema = zod_1.z.object({
    body: zod_1.z.union([flatSchema, nestedSchema]),
});
