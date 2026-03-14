import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function listFilesRecursive(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir || !fs.existsSync(currentDir)) continue;

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        stack.push(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function hasLoadCommand(scripts: Record<string, string>): boolean {
  return Object.entries(scripts).some(([name, command]) => {
    const normalizedName = name.toLowerCase();
    const normalizedCommand = command.toLowerCase();
    return (
      normalizedName.includes('load') ||
      normalizedName.includes('benchmark') ||
      normalizedName.includes('perf') ||
      normalizedCommand.includes('k6 ') ||
      normalizedCommand.includes('artillery ')
    );
  });
}

function hasRequiredBenchmarkMetrics(content: string): boolean {
  const lower = content.toLowerCase();
  const requestsPerSecond = lower.includes('requests/sec') || lower.includes('req/s') || lower.includes('rps');
  const p50 = lower.includes('p50');
  const p95 = lower.includes('p95');
  const p99 = lower.includes('p99');
  const errorRate = lower.includes('error rate') || lower.includes('errors');

  return requestsPerSecond && p50 && p95 && p99 && errorRate;
}

describe('QA checks for CER-22 load-testing deliverables', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const allFiles = listFilesRecursive(repoRoot);

  const candidateScenarioFiles = allFiles.filter(file => {
    const normalized = file.toLowerCase();
    const looksLikeLoadSuitePath =
      normalized.includes('/load-test') ||
      normalized.includes('/loadtests') ||
      normalized.includes('/k6') ||
      normalized.includes('/artillery') ||
      normalized.includes('/benchmark') ||
      normalized.includes('/performance');

    return (
      looksLikeLoadSuitePath &&
      !normalized.includes('/tests/unit/qa/') &&
      (normalized.endsWith('.ts') ||
        normalized.endsWith('.js') ||
        normalized.endsWith('.mjs') ||
        normalized.endsWith('.cjs') ||
        normalized.endsWith('.yaml') ||
        normalized.endsWith('.yml') ||
        normalized.endsWith('.json'))
    );
  });

  const candidateReportFiles = allFiles.filter(file => {
    const normalized = file.toLowerCase();
    return (
      (normalized.includes('benchmark') || normalized.includes('load-test') || normalized.includes('performance-report')) &&
      (normalized.endsWith('.md') || normalized.endsWith('.json') || normalized.endsWith('.txt'))
    );
  });

  it('happy path: package exposes a single-command entry for load testing', () => {
    const packageJsonPath = path.join(repoRoot, 'package.json');
    expect(fs.existsSync(packageJsonPath), 'loop-backend/package.json must exist').toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts, 'package.json must define scripts').toBeDefined();
    expect(
      hasLoadCommand(packageJson.scripts ?? {}),
      'Expected at least one script or command related to load testing (load/benchmark/perf/k6/artillery)',
    ).toBe(true);
  });

  it('edge case: load scenarios include all required traffic flows', () => {
    expect(candidateScenarioFiles.length, 'No load-test scenario files were found').toBeGreaterThan(0);

    const combinedContent = candidateScenarioFiles
      .map(file => fs.readFileSync(file, 'utf8').toLowerCase())
      .join('\n');

    expect(combinedContent.includes('register') || combinedContent.includes('/auth/register')).toBe(true);
    expect(combinedContent.includes('login') || combinedContent.includes('/auth/login')).toBe(true);
    expect(combinedContent.includes('refresh') || combinedContent.includes('/auth/refresh')).toBe(true);
    expect(combinedContent.includes('/videos/feed') || combinedContent.includes('videos/feed')).toBe(true);
    expect(combinedContent.includes('upload')).toBe(true);
    expect(combinedContent.includes('/search') || combinedContent.includes('search')).toBe(true);
    expect(
      combinedContent.includes('websocket') || combinedContent.includes('socket.io') || combinedContent.includes('ws://'),
    ).toBe(true);
  });

  it('error case: benchmark artifacts include required latency/error metrics', () => {
    expect(candidateReportFiles.length, 'No benchmark report artifact files were found').toBeGreaterThan(0);

    const reportsWithMetrics = candidateReportFiles.some(file => {
      const content = fs.readFileSync(file, 'utf8');
      return hasRequiredBenchmarkMetrics(content);
    });

    expect(
      reportsWithMetrics,
      'No benchmark report includes requests/sec (or rps), p50/p95/p99 latency, and error rate metrics',
    ).toBe(true);
  });

  it('error case: load-testing command exits non-zero when benchmark is invalid', () => {
    const result = spawnSync('pnpm', ['load-testing'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        LOAD_TEST_BASE_URL: 'http://127.0.0.1:1',
        LOAD_TEST_REQUESTS: '2',
        LOAD_TEST_CONCURRENCY: '1',
      },
    });

    expect(result.stdout + result.stderr).toContain('error rate');
    expect(
      result.status,
      'Expected non-zero exit code when load scenarios exceed acceptable error rate',
    ).not.toBe(0);
  });
});
