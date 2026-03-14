import { performance } from 'node:perf_hooks';

import { scenarios, websocketScenario, type Scenario } from './scenarios.ts';

type ScenarioResult = {
  name: string;
  totalRequests: number;
  successes: number;
  failures: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  requestsPerSecond: number;
  errorRate: number;
};

const BASE_URL = process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:3001';
const REQUESTS_PER_SCENARIO = Number(process.env.LOAD_TEST_REQUESTS ?? 20);
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 5);
const MAX_ERROR_RATE = Number(process.env.LOAD_TEST_MAX_ERROR_RATE ?? 0.1);

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[index].toFixed(2));
}

async function runRequest(scenario: Scenario): Promise<{ ok: boolean; latencyMs: number }> {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${BASE_URL}${scenario.path}`, {
      method: scenario.method,
      headers: {
        'content-type': 'application/json',
      },
      body: scenario.body ? JSON.stringify(scenario.body) : undefined,
    });

    return { ok: response.ok, latencyMs: performance.now() - startedAt };
  } catch {
    return { ok: false, latencyMs: performance.now() - startedAt };
  }
}

async function runScenario(scenario: Scenario): Promise<ScenarioResult> {
  const latencies: number[] = [];
  let successes = 0;
  let failures = 0;

  const startedAt = performance.now();
  for (let offset = 0; offset < REQUESTS_PER_SCENARIO; offset += CONCURRENCY) {
    const batchSize = Math.min(CONCURRENCY, REQUESTS_PER_SCENARIO - offset);
    const batch = Array.from({ length: batchSize }).map(() => runRequest(scenario));
    const results = await Promise.all(batch);

    for (const result of results) {
      latencies.push(result.latencyMs);
      if (result.ok) {
        successes += 1;
      } else {
        failures += 1;
      }
    }
  }

  const durationSec = Math.max((performance.now() - startedAt) / 1000, 0.001);
  const totalRequests = successes + failures;

  return {
    name: scenario.name,
    totalRequests,
    successes,
    failures,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    requestsPerSecond: Number((totalRequests / durationSec).toFixed(2)),
    errorRate: Number((totalRequests === 0 ? 0 : failures / totalRequests).toFixed(4)),
  };
}

async function main() {
  console.log(`Running load tests against ${BASE_URL}`);
  console.log(`Requests/scenario=${REQUESTS_PER_SCENARIO}, concurrency=${CONCURRENCY}`);

  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    results.push(result);
    console.log(
      `${scenario.name}: req/s=${result.requestsPerSecond}, p50=${result.p50Ms}ms, p95=${result.p95Ms}ms, p99=${result.p99Ms}ms, error rate=${result.errorRate}`,
    );
  }

  console.log(
    `${websocketScenario.name}: protocol=${websocketScenario.protocol}, path=${websocketScenario.urlPath}, targetConnections=${websocketScenario.targetConnections}`,
  );

  const avgRps = Number(
    (results.reduce((acc, curr) => acc + curr.requestsPerSecond, 0) / Math.max(results.length, 1)).toFixed(2),
  );
  const avgErrorRate = Number(
    (results.reduce((acc, curr) => acc + curr.errorRate, 0) / Math.max(results.length, 1)).toFixed(4),
  );

  console.log(`Summary: avg req/s=${avgRps}, avg error rate=${avgErrorRate}`);

  const highErrorScenarios = results.filter(result => result.errorRate > MAX_ERROR_RATE);
  if (highErrorScenarios.length > 0) {
    const scenarioSummaries = highErrorScenarios.map(result => `${result.name} (${result.errorRate})`).join(', ');
    console.error(
      `Load test benchmark invalid: scenario error rate exceeded threshold ${MAX_ERROR_RATE}. Failing scenarios: ${scenarioSummaries}`,
    );
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Load test execution failed', error);
  process.exitCode = 1;
});
