// apps/backend/src/validators/assignmentValidator.ts
import { z } from 'zod';

// Schema for direct API calls (flat body with proper field names)
const directSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  className: z.string().min(1, 'Class is required'),
  schoolName: z.string().min(1, 'School name is required'),
  timeAllowed: z.coerce.number().min(15).max(240),
  dueDate: z.string().min(1, 'Due date is required'),
  questionTypes: z
    .array(
      z.object({
        type: z.string().min(1),
        count: z.coerce.number().min(1).max(50),
        marksPerQuestion: z.coerce.number().min(1).max(20),
      })
    )
    .min(1, 'At least one question type is required'),
  difficultyDistribution: z
    .object({
      easy: z.coerce.number(),
      medium: z.coerce.number(),
      hard: z.coerce.number(),
    })
    .refine((d) => d.easy + d.medium + d.hard === 100, 'Difficulty must sum to 100'),
  additionalInstructions: z.string().optional().default(''),
  includeAnswerKey: z.boolean().optional().default(false),
  voicePrompt: z.string().optional(),
});

// Schema for the nested formData shape sent by the frontend
// Accepts the frontend's field names: grade, questionRows, difficulty, voicePrompt
const formDataSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  grade: z.string().min(1, 'Grade/Class is required'),
  schoolName: z.string().min(1, 'School name is required'),
  timeAllowed: z.coerce.number().min(15).max(240),
  dueDate: z.string().min(1, 'Due date is required'),
  questionRows: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string().min(1),
        count: z.coerce.number().min(1).max(50),
        marksPerQuestion: z.coerce.number().min(1).max(20),
      })
    )
    .min(1, 'At least one question type is required'),
  difficulty: z.object({
    easy: z.coerce.number(),
    medium: z.coerce.number(),
    hard: z.coerce.number(),
  }),
  voicePrompt: z.string().optional().default(''),
  includeAnswerKey: z.boolean().optional().default(false),
  // file is handled separately via multer
  file: z.any().optional(),
});

export const createAssignmentSchema = z.object({
  body: z.union([
    // Option 1: Direct flat body
    directSchema,
    // Option 2: Nested formData from frontend
    z.object({
      formData: formDataSchema,
    }),
    // Option 3: Passthrough (file upload with formData as string or partial)
    z.object({}).passthrough(),
  ]),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
