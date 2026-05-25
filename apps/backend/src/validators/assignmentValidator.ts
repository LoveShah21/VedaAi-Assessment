import { z } from 'zod';

export const createAssignmentSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }).min(3, 'Title must be at least 3 characters').max(100),
    subject: z.string({ required_error: 'Subject is required' }).min(2, 'Subject must be at least 2 characters'),
    gradeLevel: z.string({ required_error: 'Grade level is required' }).min(1, 'Grade level is required'),
    topic: z.string({ required_error: 'Topic is required' }).min(2, 'Topic must be at least 2 characters'),
    difficulty: z.enum(['easy', 'medium', 'hard'], {
      required_error: 'Difficulty must be easy, medium, or hard',
    }),
    numberOfQuestions: z.preprocess(
      (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
      z.number({ required_error: 'Number of questions is required' }).min(1, 'At least 1 question is required').max(100, 'Maximum of 100 questions')
    ),
    questionType: z.enum(['mcq', 'short', 'long', 'mixed'], {
      required_error: 'Question type must be mcq, short, long, or mixed',
    }),
    sourceMaterial: z.string().optional(),
  }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
