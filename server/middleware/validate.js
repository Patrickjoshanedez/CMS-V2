import AppError from '../utils/AppError.js';

const applyValidatedRequestData = (req, source, data) => {
  req.validated = {
    ...(req.validated || {}),
    [source]: data,
  };

  if (source === 'query') {
    // Express 5 exposes req.query via a getter. Shadow it per-request with parsed data.
    Object.defineProperty(req, 'query', {
      value: data,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    return;
  }

  req[source] = data;
};

/**
 * Generic Zod validation middleware factory.
 * Validates req.body, req.query, or req.params against a Zod schema.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [source='body'] - Request property to validate
 * @returns {Function} Express middleware
 *
 * @example
 *   import { registerSchema } from './auth.validation.js';
 *   router.post('/register', validate(registerSchema), controller.register);
 */
const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('. ');

      return next(new AppError(messages, 400, 'VALIDATION_ERROR'));
    }

    // Replace the source data with the parsed/transformed data.
    // Query requires special handling in Express 5 (getter-only property).
    applyValidatedRequestData(req, source, result.data);
    next();
  };
};

export default validate;
