import { Queue, Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';
import { shelbyService } from '../services/shelby.service';

// Job runs daily: mark already-expired blobs, then renew blobs expiring within 7 days.
const REPEAT_CRON = '0 2 * * *'; // 02:00 UTC daily
const THRESHOLD_DAYS = 7;
const RENEWAL_DAYS = 30;

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

export const shelbyExpirationQueue = new Queue('shelby-expiration', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 24 * 3600, count: 100 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export const shelbyExpirationWorker = new Worker(
  'shelby-expiration',
  async (_job: Job) => {
    logger.info('Shelby expiration job started');

    // 1. Mark blobs already past expiration as 'expired'
    const expired = await shelbyService.markExpiredBlobs();

    // 2. Renew blobs approaching expiration
    const { renewed, failed } = await shelbyService.renewExpiringBlobs(THRESHOLD_DAYS, RENEWAL_DAYS);

    logger.info(`Shelby expiration job done: ${expired} expired, ${renewed} renewed, ${failed} failed`);
    return { expired, renewed, failed };
  },
  { connection: redisConnection, concurrency: 1 }
);

shelbyExpirationWorker.on('completed', (job) => {
  logger.info(`Shelby expiration job ${job.id} completed:`, job.returnvalue);
});

shelbyExpirationWorker.on('failed', (job, err) => {
  logger.error(`Shelby expiration job ${job?.id} failed:`, err);
});

shelbyExpirationWorker.on('error', (err) => {
  logger.error('Shelby expiration worker error:', err);
});

/**
 * Schedule the daily expiration job.
 * Safe to call multiple times — BullMQ deduplicates repeatable jobs by key.
 */
export async function scheduleShelbyExpirationJob(): Promise<void> {
  await shelbyExpirationQueue.add(
    'check-expiration',
    {},
    {
      repeat: { pattern: REPEAT_CRON },
      jobId: 'shelby-expiration-daily',
    }
  );
  logger.info('Shelby expiration job scheduled (cron: daily 02:00 UTC)');
}
