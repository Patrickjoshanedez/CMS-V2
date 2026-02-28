import mongoose from 'mongoose';

const MAX_TEAM_MEMBERS = 4;

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [100, 'Team name must not exceed 100 characters'],
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team leader is required'],
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isLocked: {
      type: Boolean,
      default: false,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2025-2026)'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// --- Indexes ---
teamSchema.index({ leaderId: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ academicYear: 1 });

// --- Virtual: member count ---
teamSchema.virtual('memberCount').get(function () {
  return this.members ? this.members.length : 0;
});

// --- Virtual: is team full ---
teamSchema.virtual('isFull').get(function () {
  return this.members ? this.members.length >= MAX_TEAM_MEMBERS : false;
});

// --- Pre-validate: enforce max members ---
teamSchema.pre('validate', function (next) {
  if (this.members && this.members.length > MAX_TEAM_MEMBERS) {
    this.invalidate(
      'members',
      `Team cannot have more than ${MAX_TEAM_MEMBERS} members`,
    );
  }
  next();
});

// --- Statics ---

/** Maximum number of members allowed per team */
teamSchema.statics.MAX_MEMBERS = MAX_TEAM_MEMBERS;

const Team = mongoose.model('Team', teamSchema);

export default Team;
