import mongoose from 'mongoose';

/**
 * AuditLog model — immutable record of significant system actions.
 *
 * Every important user action (submissions, approvals, rejections, role changes,
 * login events, settings changes, archiving) is logged here. Audit entries are
 * append-only — they cannot be updated or deleted through the application.
 *
 * Fields:
 *   - action: a machine-readable action code (e.g. 'project.archived', 'submission.approved')
 *   - actor: the user who performed the action
 *   - actorRole: the role of the user at the time of the action
 *   - targetType: the type of entity affected (e.g. 'Project', 'Submission', 'User')
 *   - targetId: the ID of the affected entity
 *   - description: a human-readable summary of what happened
 *   - metadata: additional context (JSON) specific to the action
 *   - ipAddress: the IP address from which the action was performed
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    actorRole: {
      type: String,
      required: true,
    },

    targetType: {
      type: String,
      enum: ['User', 'Team', 'Project', 'Submission', 'Evaluation', 'Settings', 'System'],
      required: true,
      index: true,
    },

    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    description: {
      type: String,
      required: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable — no updatedAt
  },
);

// Compound indexes for common query patterns
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
