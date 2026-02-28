import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  // Team notifications
  'team_invite',
  'team_joined',
  'team_locked',
  // Project / title workflow notifications
  'project_created',
  'title_submitted',
  'title_approved',
  'title_rejected',
  'title_modification_requested',
  'title_modification_resolved',
  'adviser_assigned',
  'panelist_assigned',
  'panelist_selected',
  'panelist_removed',
  'deadlines_set',
  'project_rejected',
  // Submission / document workflow notifications
  'chapter_submitted',
  'submission_approved',
  'submission_revisions_required',
  'submission_rejected',
  'submission_locked',
  'unlock_requested',
  'unlock_resolved',
  'annotation_added',
  // General
  'welcome',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: NOTIFICATION_TYPES,
        message: 'Type must be one of: ' + NOTIFICATION_TYPES.join(', '),
      },
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message must not exceed 1000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// --- Indexes ---
// Composite index for fetching unread notifications
notificationSchema.index({ userId: 1, isRead: 1 });
// Composite index for fetching latest notifications (descending)
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
