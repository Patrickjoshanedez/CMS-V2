import auditService from '../modules/audit/audit.service.js';

/**
 * Express middleware factory for automatic audit logging.
 *
 * Attaches a post-response audit logger to the response's `finish` event.
 * Only logs on successful responses (2xx status codes) to avoid cluttering
 * the audit trail with failed attempts.
 *
 * @param {string} action - Machine-readable action code (e.g. 'project.archived')
 * @param {string} targetType - The type of entity affected
 * @param {Object} [options]
 * @param {Function} [options.getTargetId] - (req, res) => targetId
 * @param {Function} [options.getDescription] - (req, res) => string
 * @param {Function} [options.getMetadata] - (req, res) => object
 * @returns {Function} Express middleware
 *
 * @example
 *   router.post(
 *     '/',
 *     authenticate,
 *     authorize(ROLES.INSTRUCTOR),
 *     auditLog('user.created', 'User', {
 *       getDescription: (req) => `Created user ${req.body.email}`,
 *     }),
 *     controller.create,
 *   );
 */
const auditLog = (action, targetType, options = {}) => {
  const {
    getTargetId = (req) => req.params.id || req.params.projectId || req.params.submissionId,
    getDescription = () => action.replace(/\./g, ' '),
    getMetadata = () => ({}),
  } = options;

  return (req, res, next) => {
    // Store the original json method to intercept the response
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only audit successful operations
      if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
        // Fire-and-forget — do not block the response
        setImmediate(async () => {
          try {
            await auditService.log({
              action,
              actor: req.user?._id,
              actorRole: req.user?.role || 'unknown',
              targetType,
              targetId: getTargetId(req, body),
              description: getDescription(req, body),
              metadata: getMetadata(req, body),
              ipAddress: req.ip || req.connection?.remoteAddress,
            });
          } catch (err) {
            // Swallow — audit failures must not affect the main flow
            console.error('[AuditMiddleware] Error:', err.message);
          }
        });
      }

      return originalJson(body);
    };

    next();
  };
};

export default auditLog;
