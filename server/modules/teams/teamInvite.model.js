import mongoose from 'mongoose';

const INVITE_STATUSES = ['pending', 'accepted', 'declined', 'expired'];

const teamInviteSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team ID is required'],
    },
    email: {
      type: String,
      required: [true, 'Invitee email is required'],
      lowercase: true,
      trim: true,
    },
    token: {
      type: String,
      required: [true, 'Invite token is required'],
      unique: true,
    },
    status: {
      type: String,
      enum: {
        values: INVITE_STATUSES,
        message: 'Status must be one of: ' + INVITE_STATUSES.join(', '),
      },
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// --- Indexes ---
teamInviteSchema.index({ token: 1 }, { unique: true });
teamInviteSchema.index({ teamId: 1 });
teamInviteSchema.index({ email: 1, teamId: 1 });
// TTL index: auto-cleanup expired invites
teamInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Check if the invite is still valid (pending and not expired).
 * @returns {boolean}
 */
teamInviteSchema.methods.isValid = function () {
  return this.status === 'pending' && this.expiresAt > new Date();
};

const TeamInvite = mongoose.model('TeamInvite', teamInviteSchema);

export default TeamInvite;
