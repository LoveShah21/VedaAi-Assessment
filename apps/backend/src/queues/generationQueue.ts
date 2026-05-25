import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';

export const questionGenerationQueue = new Queue('question-generation', {
  connection: redisConnectionOptions,
});

export const addGenerationJob = async (assignmentId: string) => {
  const job = await questionGenerationQueue.add(
    'generate',
    { assignmentId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
  return job;
};

export const getJobPositionInQueue = async (jobId: string): Promise<number> => {
  const jobs = await questionGenerationQueue.getJobs(['waiting', 'paused']);
  const index = jobs.findIndex((j) => j.id === jobId);
  return index !== -1 ? index + 1 : 1;
};
