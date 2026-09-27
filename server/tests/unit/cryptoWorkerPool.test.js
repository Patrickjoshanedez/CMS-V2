import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../utils/cryptoWorkerPool.js';
import { compositeAuthKeyGenerator } from '../../middleware/rateLimiter.js';

describe('Phase 1: Crypto Worker Pool & Composite Rate Limiter', () => {
  it('hashes and verifies passwords off the main event loop', async () => {
    const plain = 'AcademicPass2026!';
    const hash = await hashPassword(plain, 10);

    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$')).toBe(true);

    const isMatch = await verifyPassword(plain, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await verifyPassword('WrongPassword!', hash);
    expect(isMismatch).toBe(false);
  });

  it('compositeAuthKeyGenerator handles ip and normalized email', () => {
    const reqWithEmail = {
      ip: '192.168.1.100',
      body: { email: ' STUDENT.BukSU@BukSU.edu.ph ' },
    };
    const key = compositeAuthKeyGenerator(reqWithEmail);
    expect(key).toBe('192.168.1.100:student.buksu@buksu.edu.ph');

    const reqWithoutEmail = {
      ip: '192.168.1.100',
      body: {},
    };
    const keyFallback = compositeAuthKeyGenerator(reqWithoutEmail);
    expect(keyFallback).toBe('192.168.1.100');
  });
});
