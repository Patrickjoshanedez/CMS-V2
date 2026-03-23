import mongoose from 'mongoose';

const MAX_TEAM_MEMBERS = 4;
const TEAM_MEMBER_ROLES = [
  'Programmer',
  'Documentor',
  'Pitcher',
  'UI/UX',
  'QA/Tester',
  'Researcher',
  'Backend Developer',
  'Frontend Developer',
];

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
    memberRoles: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: TEAM_MEMBER_ROLES,
          required: true,
        },
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    googleDocUrl: {
      type: String,
      trim: true,
      default: '',
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
teamSchema.index({ courseId: 1, academicYear: 1 });
teamSchema.index({ sectionId: 1 });

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
    this.invalidate('members', `Team cannot have more than ${MAX_TEAM_MEMBERS} members`);
  }

  if (Array.isArray(this.memberRoles)) {
    const roleOwnerSet = new Set();

    this.memberRoles.forEach((assignment, index) => {
      const targetId = assignment?.userId?.toString();
      if (!targetId) return;

      // Only check for duplicate roles, not membership
      if (roleOwnerSet.has(targetId)) {
        this.invalidate(
          `memberRoles.${index}.userId`,
          'Each member can only have one assigned role',
        );
      }

      roleOwnerSet.add(targetId);
    });
  }

  next();
});

// --- Statics ---

/** Maximum number of members allowed per team */
teamSchema.statics.MAX_MEMBERS = MAX_TEAM_MEMBERS;
teamSchema.statics.MEMBER_ROLES = TEAM_MEMBER_ROLES;

const Team = mongoose.model('Team', teamSchema);

export default Team;
