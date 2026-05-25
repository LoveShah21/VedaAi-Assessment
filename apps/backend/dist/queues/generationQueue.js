"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJobPositionInQueue = exports.addGenerationJob = exports.questionGenerationQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
exports.questionGenerationQueue = new bullmq_1.Queue('question-generation', {
    connection: redis_1.redisConnectionOptions,
});
const addGenerationJob = async (assignmentId) => {
    const job = await exports.questionGenerationQueue.add('generate', { assignmentId }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    });
    return job;
};
exports.addGenerationJob = addGenerationJob;
const getJobPositionInQueue = async (jobId) => {
    const jobs = await exports.questionGenerationQueue.getJobs(['waiting', 'paused']);
    const index = jobs.findIndex((j) => j.id === jobId);
    return index !== -1 ? index + 1 : 1;
};
exports.getJobPositionInQueue = getJobPositionInQueue;
