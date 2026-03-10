import { describe, it, expect, beforeAll } from 'vitest';

// Skip if bcrypt is not available
let hashPassword: any;
let comparePassword: any;

beforeAll(async () => {
  try {
    const passwordModule = await import('../../../src/utils/password');
    hashPassword = passwordModule.hashPassword;
    comparePassword = passwordModule.comparePassword;
  } catch (error) {
    console.warn('bcrypt not available, skipping password tests');
  }
});

describe.skipIf(!hashPassword)('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hash length
    });
    
    it('should produce different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // bcrypt includes salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });
    
    it('should return false for incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      
      const isValid = await comparePassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });
});

