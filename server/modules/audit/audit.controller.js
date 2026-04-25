import auditService from './audit.service.js';

/**
 * AuditController — thin HTTP handlers for audit log endpoints.
 */

/**
 * GET /api/audit
 * Query audit logs with filtering and pagination.
 * Instructor-only.
 */
export const queryLogs = async (req, res, next) => {
  try {
    const result = await auditService.queryLogs(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit/:targetType/:targetId
 * Get audit history for a specific entity.
 * Available to Instructor, Adviser, Panelist.
 */
export const getEntityHistory = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const logs = await auditService.getEntityHistory(targetType, targetId, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/audit/project/:projectId
 * Get the full audit trail for a project (Project events + all scoped Submission/Evaluation events).
 * Available to Instructor, Adviser, Panelist.
 */
export const getProjectHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const logs = await auditService.getProjectAuditTrail(projectId, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
