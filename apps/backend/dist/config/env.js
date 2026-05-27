"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load environment variables from .env file
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(4000),
    MONGODB_URI: zod_1.z.string().default('mongodb://localhost:27017/vedaai'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    OPENCODE_API_KEY: zod_1.z.string().min(1, 'OPENCODE_API_KEY is required'),
    OPENCODE_MODEL: zod_1.z.string().min(1, 'OPENCODE_MODEL is required'),
    OPENCODE_API_URL: zod_1.z.string().url().default('https://api.opencode.ai/v1/chat/completions'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:3000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    UPLOAD_DIR: zod_1.z.string().default('./uploads'),
    R2_ACCOUNT_ID: zod_1.z.string().min(1, 'R2_ACCOUNT_ID is required'),
    R2_ACCESS_KEY_ID: zod_1.z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
    R2_SECRET_ACCESS_KEY: zod_1.z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
    R2_BUCKET_NAME: zod_1.z.string().default('vedaai'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}
exports.env = parsed.data;
