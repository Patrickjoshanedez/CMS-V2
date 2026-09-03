import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import AppError from '../../utils/AppError.js';
import validate from '../../middleware/validate.js';

describe('validate middleware', () => {
  it('overwrites req.body with parsed data and stores req.validated.body', () => {
    const middleware = validate(
      z.object({
        email: z.string().trim().toLowerCase().email(),
      }),
      'body',
    );

    const req = {
      body: { email: '  USER@EXAMPLE.COM  ' },
    };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(req.body).toEqual({ email: 'user@example.com' });
    expect(req.validated?.body).toEqual({ email: 'user@example.com' });
    expect(next).toHaveBeenCalledWith();
  });

  it('handles getter-only req.query and shadows it with parsed data', () => {
    const middleware = validate(
      z.object({
        page: z.coerce.number().int().min(1),
        limit: z.coerce.number().int().min(1).max(100),
      }),
      'query',
    );

    const req = {
      _rawQuery: {
        page: '2',
        limit: '10',
      },
    };

    Object.defineProperty(req, 'query', {
      configurable: true,
      enumerable: true,
      get() {
        return this._rawQuery;
      },
    });

    const next = vi.fn();

    middleware(req, {}, next);

    expect(req.query).toEqual({ page: 2, limit: 10 });
    expect(req.validated?.query).toEqual({ page: 2, limit: 10 });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes AppError to next when schema validation fails', () => {
    const middleware = validate(
      z.object({
        page: z.coerce.number().int().min(1),
      }),
      'query',
    );

    const req = { query: { page: '0' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});
