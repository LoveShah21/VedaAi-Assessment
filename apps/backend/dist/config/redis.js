"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.redisConnectionOptions = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
let connectionConfig = {
    host: '127.0.0.1',
    port: 6379,
};
try {
    const url = new URL(env_1.env.REDIS_URL);
    connectionConfig = {
        host: url.hostname || '127.0.0.1',
        port: url.port ? parseInt(url.port, 10) : 6379,
        password: url.password ? decodeURIComponent(url.password) : undefined,
    };
}
catch (e) {
    const parts = env_1.env.REDIS_URL.replace('redis://', '').split(':');
    if (parts.length === 2) {
        connectionConfig = {
            host: parts[0],
            port: parseInt(parts[1], 10),
        };
    }
}
exports.redisConnectionOptions = {
    ...connectionConfig,
    maxRetriesPerRequest: null, // Required by BullMQ
};
exports.redisClient = new ioredis_1.default(env_1.env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
});
exports.redisClient.on('connect', () => {
    console.log('📡 Redis Connected successfully');
});
exports.redisClient.on('error', (err) => {
    console.error('❌ Redis Error:', err);
});
