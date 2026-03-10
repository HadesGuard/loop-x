import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function runMigrations() {
  try {
    logger.info('🔄 Running database migrations...');
    
    // Run Prisma migrations
    execSync('pnpm prisma migrate deploy', {
      stdio: 'inherit',
      env: process.env,
    });
    
    logger.info('✅ Migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// For development: create migration
async function createMigration(name: string) {
  try {
    logger.info(`🔄 Creating migration: ${name}...`);
    
    execSync(`pnpm prisma migrate dev --name ${name}`, {
      stdio: 'inherit',
      env: process.env,
    });
    
    logger.info('✅ Migration created successfully');
  } catch (error) {
    logger.error('❌ Migration creation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run based on command line args
const args = process.argv.slice(2);
if (args[0] === 'create' && args[1]) {
  createMigration(args[1]);
} else {
  runMigrations();
}

