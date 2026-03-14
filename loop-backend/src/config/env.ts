import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SHELBY_NETWORK: z.enum(['shelbynet', 'testnet', 'mainnet']).default('testnet'),
  SHELBY_API_KEY: z.string().optional(),
  SHELBY_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  SHELBY_SERVICE_ACCOUNT_ADDRESS: z.string().optional(),
  APTOS_NODE_URL: z.string().default('https://fullnode.testnet.aptoslabs.com/v1'),
  APTOS_CONTRACT_ADDRESS: z.string().optional(),
  FFMPEG_PATH: z.string().default('/usr/bin/ffmpeg'),
  LOG_LEVEL: z.string().default('info'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      logger.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };

