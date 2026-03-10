import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // Set default test env vars if not in .env
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long-for-testing',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-32-chars-long-for-testing',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/migrations/**',
      ],
    },
    setupFiles: ['./tests/helpers/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    conditions: ['node', 'import', 'require'],
  },
  optimizeDeps: {
    exclude: ['@shelby-protocol/sdk'],
  },
  ssr: {
    noExternal: [/^(?!.*node_modules).*$/],
  },
  esbuild: {
    target: 'node18',
  },
});

