import { z } from 'zod';

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Group name is required' }).min(1, 'Group name is required'),
    className: z.string({ required_error: 'Class Name is required' }).min(1, 'Class Name is required'),
    subject: z.string({ required_error: 'Subject is required' }).min(1, 'Subject is required'),
    studentCount: z.number({ required_error: 'Student count is required' }).min(1, 'Student count must be at least 1'),
  }),
});
