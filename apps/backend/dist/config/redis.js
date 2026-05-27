"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.redisConnectionOptions = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
// Single source of truth — fall back to local Redis if env var is absent
const REDIS_URL = env_1.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = REDIS_URL.startsWith('rediss://');
// Parse the URL once for BullMQ (which needs a structured object, not a raw URL)
let parsedUrl;
try {
    parsedUrl = new URL(REDIS_URL);
}
catch {
    parsedUrl = new URL('redis://localhost:6379');
}
// Shared options applied to every Redis instance
const sharedOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false, // Upstash doesn't support CLIENT LIST
    retryStrategy: (times) => Math.min(times * 200, 10000),
    keepAlive: 10000, // Prevent idle-connection drops on Upstash
    ...(isTLS ? { tls: { rejectUnauthorized: true } } : {}),
};
// BullMQ connection — must be a structured object (host / port / password)
exports.redisConnectionOptions = {
    host: parsedUrl.hostname || 'localhost',
    port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
    ...sharedOptions,
};
// General-purpose ioredis client — uses raw URL (supports all schemes cleanly)
exports.redisClient = new ioredis_1.default(REDIS_URL, sharedOptions);
exports.redisClient.on('connect', () => {
    console.log('📡 Redis Connected successfully');
});
exports.redisClient.on('error', (err) => {
    // EPIPE / ECONNRESET are transient reconnect events — ioredis handles them automatically
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET')
        return;
    console.error('❌ Redis Error:', err.message);
});
