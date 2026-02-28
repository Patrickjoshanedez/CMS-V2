/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward them to the global error-handling middleware.
 *
 * Eliminates try/catch boilerplate in every controller.
 *
 * @param {Function} fn - Async route handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post('/register', catchAsync(async (req, res) => {
 *     const user = await authService.register(req.body);
 *     res.status(201).json({ success: true, data: user });
 *   }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default catchAsync;
