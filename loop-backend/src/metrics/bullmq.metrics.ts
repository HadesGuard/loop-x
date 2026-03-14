import client from 'prom-client';
import { Queue, Job } from 'bullmq';

// Reuse the shared registry from the HTTP metrics module
import { register } from './http-metrics.middleware';
import { logger } from '../utils/logger';

// Gauges for queue lengths by status
const queueJobsGauge = new client.Gauge({
  name: 'bullmq_queue_jobs',
  help: 'Number of BullMQ jobs by status',
  labelNames: ['queue', 'status'] as const,
  registers: [register],
});

// Summary for completed job durations (seconds) with client-side quantiles
const jobDurationSummary = new client.Summary({
  name: 'bullmq_job_duration_seconds',
  help: 'Duration of completed BullMQ jobs in seconds',
  labelNames: ['queue'] as const,
  percentiles: [0.5, 0.95, 0.99],
  maxAgeSeconds: 10 * 60,
  ageBuckets: 5,
  registers: [register],
});

type CollectorOptions = {
  queueName: string;
  pollIntervalMs?: number;
};

// Maintain a small LRU of observed job IDs to avoid double-counting in the summary
class ObservedJobs {
  private readonly maxSize: number;
  private readonly set: Set<string> = new Set();
  private readonly order: string[] = [];

  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
  }

  has(id: string) {
    return this.set.has(id);
  }

  add(id: string) {
    if (this.set.has(id)) return;
    this.set.add(id);
    this.order.push(id);
    if (this.order.length > this.maxSize) {
      const oldest = this.order.shift();
      if (oldest) this.set.delete(oldest);
    }
  }
}

export function startBullMqMetrics({ queueName, pollIntervalMs = 15000 }: CollectorOptions) {
  // Create a lightweight Queue handle (no Worker) to inspect metrics via Redis
  const queue = new Queue(queueName, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    },
  });

  const seen = new ObservedJobs();

  async function collectOnce() {
    try {
      // Queue length by status
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      for (const [status, value] of Object.entries(counts)) {
        queueJobsGauge.labels(queueName, status).set(typeof value === 'number' ? value : 0);
      }

      // Sample latest completed jobs and observe durations
      // Uses a small window and dedup by jobId to approximate streaming observations
      const completed: Job[] = await queue.getCompleted(0, 50);
      for (const job of completed) {
        const id = String(job.id);
        if (seen.has(id)) continue;
        // Duration computed from processedOn -> finishedOn when available
        const start = job.processedOn ?? job.timestamp;
        const end = job.finishedOn ?? job.finishedOn ?? job.timestamp;
        if (start && end && end >= start) {
          const durationSec = (end - start) / 1000;
          jobDurationSummary.labels(queueName).observe(durationSec);
        }
        seen.add(id);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      logger.error('[metrics] BullMQ collection error', err);
    }
  }

  // Kick off interval collection
  // Note: no await — fire-and-forget timer; safe if called once at server boot
  setInterval(collectOnce, pollIntervalMs).unref();

  // Do an immediate first collection shortly after boot
  setTimeout(collectOnce, 3000).unref();
}
