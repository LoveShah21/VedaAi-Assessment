import Redis from 'ioredis';
import { env } from './env';

let connectionConfig: { host: string; port: number; password?: string } = {
  host: '127.0.0.1',
  port: 6379,
};

try {
  const url = new URL(env.REDIS_URL);
  connectionConfig = {
    host: url.hostname || '127.0.0.1',
    port: url.port ? parseInt(url.port, 10) : 6379,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  };
} catch (e) {
  const parts = env.REDIS_URL.replace('redis://', '').split(':');
  if (parts.length === 2) {
    connectionConfig = {
      host: parts[0],
      port: parseInt(parts[1], 10),
    };
  }
}

export const redisConnectionOptions = {
  ...connectionConfig,
  maxRetriesPerRequest: null, // Required by BullMQ
};

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisClient.on('connect', () => {
  console.log('📡 Redis Connected successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err);
});
