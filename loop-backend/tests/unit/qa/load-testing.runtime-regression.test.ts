import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('CER-28 load-testing runtime regression', () => {
  it('error case: exits non-zero when all load requests fail', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
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
      'Expected non-zero exit code when the load target is unreachable and scenarios all fail',
    ).not.toBe(0);
  });
});
