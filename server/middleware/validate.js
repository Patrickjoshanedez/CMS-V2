import AppError from '../utils/AppError.js';

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

    // Replace the source data with the parsed/transformed data
    req[source] = result.data;
    next();
  };
};

export default validate;
