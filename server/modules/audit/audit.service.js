import AuditLog from './audit.model.js';

/**
 * AuditService — central service for logging and querying audit trail entries.
 *
 * All audit log writes go through this service so that the logging format
 * is consistent across the entire application. The service is also responsible
 * for querying and paginating audit records for the admin UI.
 */
class AuditService {
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
   * @returns {Promise<Object>} The created audit log entry.
   */
  async log({ action, actor, actorRole, targetType, targetId, description, metadata, ipAddress }) {
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
      // Log the error but do not rethrow.
      console.error('[AuditService] Failed to write audit log:', error.message);
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

    if (action) {
      // Support partial match for action codes (e.g. 'project' matches 'project.archived')
      query.action = { $regex: action, $options: 'i' };
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
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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
}

export default new AuditService();
