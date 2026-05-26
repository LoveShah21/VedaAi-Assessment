import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    teacherName: z.string().optional(),
    schoolName: z.string().optional(),
    city: z.string().optional(),
    board: z.string().optional(),
    defaultTimeAllowed: z.number().min(15).max(180).optional(),
    defaultDifficulty: z.object({
      easy: z.number().min(0).max(100),
      medium: z.number().min(0).max(100),
      hard: z.number().min(0).max(100),
    }).optional(),
    includeAnswerKeyDefault: z.boolean().optional(),
  }),
});
