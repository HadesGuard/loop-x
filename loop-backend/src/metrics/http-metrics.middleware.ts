import { NextFunction, Request, Response } from 'express';
import client from 'prom-client';

// Shared Prometheus registry
export const register = new client.Registry();

// Default Node.js/process metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// HTTP request duration histogram (used for p50/p95/p99 via histogram_quantile)
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  // Reasonable SRE-style buckets for web latency
  buckets: [
    0.005, 0.01, 0.025, 0.05, 0.1,
    0.25, 0.5, 1, 2.5, 5, 10
  ],
  registers: [register],
});

// Total requests counter partitioned by method/route/status
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

// Express middleware to observe per-request metrics
export function httpMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  // After response finished, record metrics
  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    // Best-effort route label; fallback to path to avoid exploding cardinality
    const route = (req as any).route?.path || req.path || 'unmatched';
    const method = req.method;
    const statusCode = String(res.statusCode);

    httpRequestDurationSeconds.labels(method, route, statusCode).observe(durationSec);
    httpRequestsTotal.labels(method, route, statusCode).inc();
  });

  next();
}

// Handler to expose metrics in Prometheus text format
export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

