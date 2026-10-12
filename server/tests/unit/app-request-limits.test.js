import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('App Request Body Limiting', () => {
  it('should accept typical JSON payloads under 2MB', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    // Expect standard 401 or 400 from auth logic, NOT 413 Payload Too Large
    expect(res.status).not.toBe(413);
  });

  it('should reject standard non-upload JSON payloads exceeding 2MB with 413 and structured error', async () => {
    const largePayload = { data: 'x'.repeat(2.5 * 1024 * 1024) };
    const res = await request(app).post('/api/auth/login').send(largePayload);

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({
      success: false,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        status: 413,
      },
    });
  });

  it('should allow payloads exceeding 2MB on scoped /api/projects/archive/bulk without 413', async () => {
    const largePayload = { data: 'x'.repeat(2.5 * 1024 * 1024) };
    const res = await request(app).post('/api/projects/archive/bulk').send(largePayload);

    // Route requires auth, should return 401/400, NOT 413 Payload Too Large
    expect(res.status).not.toBe(413);
  });

  it('should allow payloads exceeding 2MB on scoped /api/submissions routes without 413', async () => {
    const largePayload = { data: 'x'.repeat(2.5 * 1024 * 1024) };
    const res = await request(app).post('/api/submissions/upload').send(largePayload);

    // Route requires auth, should return 401/400, NOT 413 Payload Too Large
    expect(res.status).not.toBe(413);
  });
});
