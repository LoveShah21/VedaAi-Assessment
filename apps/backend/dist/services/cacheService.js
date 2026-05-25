"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const redis_1 = require("../config/redis");
exports.cacheService = {
    get: async (key) => {
        try {
            return await redis_1.redisClient.get(key);
        }
        catch (error) {
            console.error(`❌ Cache get error for key ${key}:`, error);
            return null;
        }
    },
    set: async (key, value, ttlSeconds) => {
        try {
            if (ttlSeconds) {
                await redis_1.redisClient.set(key, value, 'EX', ttlSeconds);
            }
            else {
                await redis_1.redisClient.set(key, value);
            }
        }
        catch (error) {
            console.error(`❌ Cache set error for key ${key}:`, error);
        }
    },
    del: async (key) => {
        try {
            await redis_1.redisClient.del(key);
        }
        catch (error) {
            console.error(`❌ Cache del error for key ${key}:`, error);
        }
    },
    delPattern: async (pattern) => {
        try {
            const keys = await redis_1.redisClient.keys(pattern);
            if (keys.length > 0) {
                await redis_1.redisClient.del(...keys);
            }
        }
        catch (error) {
            console.error(`❌ Cache delPattern error for pattern ${pattern}:`, error);
        }
    },
};
