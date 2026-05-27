import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.preprocess(
    (val) => process.env.BACKEND_PORT || val,
    z.coerce.number().default(4000)
  ),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/vedaai'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENCODE_API_KEY: z.string().min(1, 'OPENCODE_API_KEY is required'),
  OPENCODE_MODEL: z.string().min(1, 'OPENCODE_MODEL is required'),
  OPENCODE_API_URL: z.string().url().default('https://api.opencode.ai/v1/chat/completions'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOAD_DIR: z.string().default('./uploads'),
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET_NAME: z.string().default('vedaai'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
