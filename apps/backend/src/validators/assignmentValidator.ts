// apps/backend/src/validators/assignmentValidator.ts
import { z } from 'zod';

const createSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  className: z.string().min(1, 'Class is required'),
  schoolName: z.string().min(1, 'School name is required'),
  timeAllowed: z.coerce.number().min(15, 'Minimum time is 15 minutes').max(240, 'Maximum time is 240 minutes'),
  dueDate: z.string().min(1, 'Due date is required'),
  questionTypes: z
    .array(
      z.object({
        type: z.string().min(1),
        count: z.coerce.number().min(1, 'Minimum count is 1').max(50, 'Maximum count is 50'),
        marksPerQuestion: z.coerce.number().min(1, 'Minimum marks is 1').max(20, 'Maximum marks is 20'),
      })
    )
    .min(1, 'At least one question type is required'),
  difficultyDistribution: z
    .object({
      easy: z.coerce.number(),
      medium: z.coerce.number(),
      hard: z.coerce.number(),
    })
    .refine((d) => d.easy + d.medium + d.hard === 100, 'Difficulty distribution must sum to 100'),
  additionalInstructions: z.string().optional().default(''),
  includeAnswerKey: z.boolean().optional().default(false),
  formData: z.any().optional(),
  voicePrompt: z.string().optional(),
});

export const createAssignmentSchema = z.object({
  body: z.union([
    createSchema,
    z.object({
      formData: createSchema,
    })
  ])
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
