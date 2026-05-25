"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssignmentSchema = void 0;
const zod_1 = require("zod");
exports.createAssignmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string({ required_error: 'Title is required' }).min(3, 'Title must be at least 3 characters').max(100),
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
    }),
});
