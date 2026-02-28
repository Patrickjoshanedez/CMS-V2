/**
 * Custom application error class.
 * All known errors should be thrown as AppError instances so the
 * global error handler can distinguish operational errors from
 * unexpected programmer errors.
 *
 * @example
 *   throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code (e.g. 'DOCUMENT_LOCKED')
   */
  constructor(message, statusCode, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
