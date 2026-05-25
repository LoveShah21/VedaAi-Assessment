import { redisClient } from '../config/redis';

export const cacheService = {
  get: async (key: string): Promise<string | null> => {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      return null;
    }
  },

  set: async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
    try {
      if (ttlSeconds) {
        await redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, value);
      }
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
    }
  },

  del: async (key: string): Promise<void> => {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`❌ Cache del error for key ${key}:`, error);
    }
  },

  delPattern: async (pattern: string): Promise<void> => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error(`❌ Cache delPattern error for pattern ${pattern}:`, error);
    }
  },
};
