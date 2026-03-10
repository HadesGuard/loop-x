import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * Setup test database
 * Run migrations before tests
 */
export async function setupTestDatabase() {
  try {
    // Reset database (optional - can be slow)
    // execSync('pnpm prisma migrate reset --force', { stdio: 'inherit' });
    
    // Run migrations
    execSync('pnpm prisma migrate deploy', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleanup test data
 */
export async function cleanupTestDatabase() {
  try {
    // Delete in correct order (respecting foreign keys)
    await prisma.refreshToken.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.video.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * Get Prisma client for tests
 */
export function getPrismaClient(): PrismaClient {
  return prisma;
}

/**
 * Close Prisma connection
 */
export async function closePrismaConnection() {
  await prisma.$disconnect();
}

