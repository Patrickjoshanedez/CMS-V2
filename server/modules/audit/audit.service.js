import AuditLog from './audit.model.js';

/**
 * AuditService — central service for logging and querying audit trail entries.
 *
 * All audit log writes go through this service so that the logging format
 * is consistent across the entire application. The service is also responsible
 * for querying and paginating audit records for the admin UI.
 */
class AuditService {
  _escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _normalizePagination(page, limit) {
    const normalizedPage = Number.isFinite(Number(page))
      ? Math.max(1, Math.trunc(Number(page)))
      : 1;

    const numericLimit = Number.isFinite(Number(limit)) ? Math.trunc(Number(limit)) : 50;
    const normalizedLimit = Math.min(100, Math.max(1, numericLimit));

    return { normalizedPage, normalizedLimit };
  }

  _normalizeEndDate(endDate) {
    if (!endDate) return null;

    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (typeof endDate === 'string' && dateOnlyPattern.test(endDate)) {
      const [year, month, day] = endDate.split('-').map(Number);
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    return new Date(endDate);
  }

  /**
   * Create an audit log entry.
   * @param {Object} params
   * @param {string} params.action - Machine-readable action code (e.g. 'project.archived')
   * @param {string} params.actor - User ID of the person who performed the action
   * @param {string} params.actorRole - Role of the user at action time
   * @param {string} params.targetType - Type of entity affected
   * @param {string} [params.targetId] - ID of the affected entity
   * @param {string} params.description - Human-readable description
   * @param {Object} [params.metadata] - Extra context
   * @param {string} [params.ipAddress] - Client IP
   * @param {boolean} [params.requireSuccess=false] - When true, rethrow write errors
   * @returns {Promise<Object>} The created audit log entry.
   */
  async log({
    action,
    actor,
    actorRole,
    targetType,
    targetId,
    description,
    metadata,
    ipAddress,
    requireSuccess = false,
  }) {
    try {
      const entry = await AuditLog.create({
        action,
        actor,
        actorRole,
        targetType,
        targetId: targetId ? targetId.toString() : null,
        description,
        metadata: metadata || {},
        ipAddress: ipAddress || null,
      });
      return entry;
    } catch (error) {
      // Audit logging should never crash the main operation.
      // Log the error but only rethrow when strict mode is requested.
      console.error('[AuditService] Failed to write audit log:', error.message);
      if (requireSuccess) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Helper method to extract log context from an Express request.
   * @param {Object} req - Express request object
   * @returns {{ actor: string, actorRole: string, ipAddress: string }}
   */
  contextFromRequest(req) {
    return {
      actor: req.user?._id?.toString(),
      actorRole: req.user?.role || 'unknown',
      ipAddress: req.ip || req.connection?.remoteAddress || null,
    };
  }

  /**
   * Query audit logs with filtering and pagination.
   * @param {Object} filters
   * @param {string} [filters.action] - Filter by action code pattern
   * @param {string} [filters.actor] - Filter by actor user ID
   * @param {string} [filters.targetType] - Filter by target entity type
   * @param {string} [filters.targetId] - Filter by target entity ID
   * @param {string} [filters.startDate] - Filter entries after this date
   * @param {string} [filters.endDate] - Filter entries before this date
   * @param {number} [filters.page=1] - Page number
   * @param {number} [filters.limit=50] - Items per page
   * @returns {Promise<{ logs: Array, total: number, page: number, totalPages: number }>}
   */
  async queryLogs(filters = {}) {
    const {
      action,
      actor,
      targetType,
      targetId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const query = {};
    const { normalizedPage, normalizedLimit } = this._normalizePagination(page, limit);

    if (action) {
      // Support partial match for action codes (e.g. 'project' matches 'project.archived')
      query.action = { $regex: this._escapeRegex(String(action)), $options: 'i' };
    }
    if (actor) {
      query.actor = actor;
    }
    if (targetType) {
      query.targetType = targetType;
    }
    if (targetId) {
      query.targetId = targetId.toString();
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = this._normalizeEndDate(endDate);
    }

    const skip = (normalizedPage - 1) * normalizedLimit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page: normalizedPage,
      totalPages: Math.ceil(total / normalizedLimit),
    };
  }

  /**
   * Get audit logs for a specific entity (e.g., a project or submission).
   * @param {string} targetType - Entity type
   * @param {string} targetId - Entity ID
   * @param {number} [limit=20] - Max entries
   * @returns {Promise<Array>}
   */
  async getEntityHistory(targetType, targetId, limit = 20) {
    return AuditLog.find({ targetType, targetId: targetId?.toString() })
      .populate('actor', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get all audit logs related to a specific project, across all target types.
   * Includes Project-level events AND any Submission/Evaluation events that
   * stored the projectId in their metadata.
   *
   * @param {string} projectId - The project's MongoDB ObjectId
   * @param {number} [limit=100]
   * @returns {Promise<Array>}
   */
  async getProjectAuditTrail(projectId, limit = 100) {
    const pid = projectId?.toString();
    const logs = await AuditLog.find({
      $or: [
        { targetType: 'Project', targetId: pid },
        { 'metadata.projectId': pid },
      ],
    })
      .populate('actor', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return logs;
  }
}

export default new AuditService();
