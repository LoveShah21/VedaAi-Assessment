import Redis from 'ioredis';
import { env } from './env';

// Single source of truth — fall back to local Redis if env var is absent
const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

// Parse the URL once for BullMQ (which needs a structured object, not a raw URL)
let parsedUrl: URL;
try {
  parsedUrl = new URL(REDIS_URL);
} catch {
  parsedUrl = new URL('redis://localhost:6379');
}

// Shared options applied to every Redis instance
const sharedOptions = {
  maxRetriesPerRequest: null,   // Required by BullMQ
  enableReadyCheck: false,      // Upstash doesn't support CLIENT LIST
  retryStrategy: (times: number) => Math.min(times * 200, 10000),
  keepAlive: 10000,             // Prevent idle-connection drops on Upstash
  ...(isTLS ? { tls: { rejectUnauthorized: true } } : {}),
};

// BullMQ connection — must be a structured object (host / port / password)
export const redisConnectionOptions = {
  host: parsedUrl.hostname || 'localhost',
  port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 6379,
  password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
  username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
  ...sharedOptions,
};

// General-purpose ioredis client — uses raw URL (supports all schemes cleanly)
export const redisClient = new Redis(REDIS_URL, sharedOptions);

redisClient.on('connect', () => {
  console.log('📡 Redis Connected successfully');
});

redisClient.on('error', (err: NodeJS.ErrnoException) => {
  // EPIPE / ECONNRESET are transient reconnect events — ioredis handles them automatically
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  console.error('❌ Redis Error:', err.message);
});
