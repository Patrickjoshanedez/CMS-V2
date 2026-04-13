import Team from './team.model.js';
import TeamInvite from './teamInvite.model.js';
import User from '../users/user.model.js';
import Project from '../projects/project.model.js';
import Notification from '../notifications/notification.model.js';
import Section from '../academics/section.model.js';
import { sendTeamInviteEmail } from '../notifications/email.service.js';
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { ROLES } from '@cms/shared';

const MAX_TEAM_MEMBERS = 4;
const TEAM_MEMBER_ROLES = Team.MEMBER_ROLES || [
  'Programmer',
  'Documentor',
  'Pitcher',
  'UI/UX',
  'QA/Tester',
  'Researcher',
  'Backend Developer',
  'Frontend Developer',
];
const INVITE_CODE_LENGTH = 6;

const INVITE_CODE_ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateInviteCodeValue = () => {
  let code = '';
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_ALPHANUMERIC.length);
    code += INVITE_CODE_ALPHANUMERIC[randomIndex];
  }
  return code;
};

/**
 * TeamService — Business logic for team management.
 * Handles creation, invitations, and membership workflows.
 */
class TeamService {
  _isValidGoogleDocUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();
      const isGoogleDocsHost = host === 'docs.google.com';
      const isGoogleDriveHost = host === 'drive.google.com';
      return isGoogleDocsHost || isGoogleDriveHost;
    } catch {
      return false;
    }
  }

  async _enforceSingleTeamMembership(user, options = {}) {
    if (!user?._id) {
      return null;
    }

    const preferredTeamId = options.preferredTeamId ? options.preferredTeamId.toString() : null;
    const memberships = await Team.find({ members: user._id })
      .select('_id leaderId members memberRoles updatedAt createdAt')
      .sort({ updatedAt: -1, createdAt: -1 });

    if (memberships.length === 0) {
      if (user.teamId) {
        user.teamId = null;
        await user.save({ validateBeforeSave: false });
      }
      return null;
    }

    const currentTeamId = user.teamId ? user.teamId.toString() : null;
    let canonicalTeam = null;

    if (preferredTeamId) {
      canonicalTeam = memberships.find((team) => team._id.toString() === preferredTeamId) || null;
    }

    if (!canonicalTeam && currentTeamId) {
      canonicalTeam = memberships.find((team) => team._id.toString() === currentTeamId) || null;
    }

    if (!canonicalTeam) {
      [canonicalTeam] = memberships;
    }

    const duplicateTeams = memberships.filter(
      (team) => team._id.toString() !== canonicalTeam._id.toString(),
    );

    for (const duplicateTeam of duplicateTeams) {
      const remainingMembers = (duplicateTeam.members || []).filter(
        (memberId) => memberId.toString() !== user._id.toString(),
      );

      if (duplicateTeam.leaderId?.toString() === user._id.toString()) {
        if (remainingMembers.length === 0) {
          await TeamInvite.deleteMany({ teamId: duplicateTeam._id, status: 'pending' });
          await Team.deleteOne({ _id: duplicateTeam._id });
          continue;
        }

        await Team.updateOne(
          { _id: duplicateTeam._id },
          {
            $pull: {
              members: user._id,
              memberRoles: { userId: user._id },
            },
            $set: { leaderId: remainingMembers[0] },
          },
        );
        continue;
      }

      await Team.updateOne(
        { _id: duplicateTeam._id },
        {
          $pull: {
            members: user._id,
            memberRoles: { userId: user._id },
          },
        },
      );
    }

    if (!user.teamId || user.teamId.toString() !== canonicalTeam._id.toString()) {
      user.teamId = canonicalTeam._id;
      await user.save({ validateBeforeSave: false });
    }

    return canonicalTeam._id;
  }

  async generateUniqueInviteCode() {
    for (let attempts = 0; attempts < 10; attempts += 1) {
      const candidateCode = generateInviteCodeValue();
      // eslint-disable-next-line no-await-in-loop
      const existingInvite = await TeamInvite.exists({ inviteCode: candidateCode });
      if (!existingInvite) {
        return candidateCode;
      }
    }

    throw new AppError(
      'Unable to generate invite code. Please try again.',
      500,
      'INVITE_CODE_GEN_FAILED',
    );
  }

  /**
   * Create a new project team. The requesting student becomes the leader.
   * @param {string} userId - The ID of the student creating the team.
   * @param {Object} data - { name?, academicYear }
   * @returns {Object} { team }
   */
  async createTeam(userId, data) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can create project teams.', 403, 'FORBIDDEN');
    }

    await this._enforceSingleTeamMembership(user);

    const alreadyInTeam = Boolean(
      await Team.exists({
        members: user._id,
      }),
    );

    if (alreadyInTeam) {
      throw new AppError(
        'You are already a member of a team. Leave your current team first.',
        409,
        'ALREADY_IN_TEAM',
      );
    }

    // Self-heal stale teamId reference when user has no actual team membership.
    if (user.teamId) {
      user.teamId = null;
    }

    const normalizedName = typeof data.name === 'string' ? data.name.trim() : '';
    const fallbackTeamName = user.lastName;
    const teamName = normalizedName || fallbackTeamName;

    let sectionId = null;
    let courseId = null;

    if (user.sectionId) {
      sectionId = user.sectionId;
      const section = await Section.findById(user.sectionId).select('courseId').lean();
      courseId = section?.courseId || null;
    }

    const team = await Team.create({
      name: teamName,
      academicYear: data.academicYear,
      leaderId: userId,
      members: [userId],
      sectionId,
      courseId,
    });

    // Link the user to the team
    user.teamId = team._id;
    await user.save({ validateBeforeSave: false });

    return { team };
  }

  /**
   * Finalize a team by locking it against further membership changes.
   * @param {string} teamId
   * @param {string} leaderId
   * @returns {Object} { team }
   */
  async lockTeam(teamId, leaderId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.leaderId.toString() !== leaderId.toString()) {
      throw new AppError('Only the team leader can finalize the team.', 403, 'FORBIDDEN');
    }

    if (team.isLocked) {
      throw new AppError('This team is already finalized.', 409, 'TEAM_ALREADY_LOCKED');
    }

    if (!team.members || team.members.length === 0) {
      throw new AppError(
        'A team must have at least one member before it can be finalized.',
        400,
        'TEAM_EMPTY',
      );
    }

    team.isLocked = true;
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'firstName middleName lastName email profilePicture')
      .populate('members', 'firstName middleName lastName email profilePicture role');

    return { team: populatedTeam };
  }

  /**
   * Leave a team (student member action).
   * Allowed only while team is not finalized.
   * If the leader leaves, leadership is transferred to another member.
   * If the last member leaves, the team is deleted.
   * @param {string} teamId
   * @param {string} userId
   * @returns {Object} { team }
   */
  async leaveTeam(teamId, userId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.isLocked) {
      throw new AppError(
        'Finalized teams cannot be modified. You cannot leave this team anymore.',
        409,
        'TEAM_ALREADY_LOCKED',
      );
    }

    const isMember = (team.members || []).some((memberId) => memberId.toString() === userId.toString());
    if (!isMember) {
      throw new AppError('You are not a member of this team.', 403, 'FORBIDDEN');
    }

    team.members = (team.members || []).filter((memberId) => memberId.toString() !== userId.toString());
    team.memberRoles = (team.memberRoles || []).filter(
      (assignment) => assignment?.userId?.toString() !== userId.toString(),
    );

    const remainingMemberIds = team.members.map((memberId) => memberId.toString());
    const wasLeader = team.leaderId?.toString() === userId.toString();

    if (remainingMemberIds.length === 0) {
      await User.updateOne(
        { _id: userId, teamId: team._id },
        { $set: { teamId: null } },
      );
      await TeamInvite.deleteMany({ teamId: team._id, status: 'pending' });
      await team.deleteOne();
      return { team: null };
    }

    if (wasLeader) {
      team.leaderId = team.members[0];
    }

    await team.save();

    await User.updateOne(
      { _id: userId, teamId: team._id },
      { $set: { teamId: null } },
    );

    const populatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'firstName middleName lastName email profilePicture')
      .populate('members', 'firstName middleName lastName email profilePicture role');

    return { team: populatedTeam };
  }

  /**
   * Get the authenticated student's team with populated members.
   * @param {string} userId
   * @returns {Object} { team }
   */
  async getMyTeam(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('You are not a member of any team.', 404, 'NO_TEAM');
    }

    const canonicalTeamId = await this._enforceSingleTeamMembership(user);

    let team = null;

    if (canonicalTeamId) {
      team = await Team.findById(canonicalTeamId)
        .populate({
          path: 'leaderId',
          select: 'firstName middleName lastName email profilePicture instructorId',
          populate: {
            path: 'instructorId',
            select: 'firstName middleName lastName email profilePicture',
          },
        })
        .populate('members', 'firstName middleName lastName email profilePicture role');
    }

    if (!team) {
      // Reconcile stale/null user.teamId by checking actual membership records.
      team = await Team.findOne({ members: user._id })
        .sort({ createdAt: -1 })
        .populate({
          path: 'leaderId',
          select: 'firstName middleName lastName email profilePicture instructorId',
          populate: {
            path: 'instructorId',
            select: 'firstName middleName lastName email profilePicture',
          },
        })
        .populate('members', 'firstName middleName lastName email profilePicture role');

      if (!team) {
        if (user.teamId) {
          user.teamId = null;
          await user.save({ validateBeforeSave: false });
        }
        throw new AppError('You are not a member of any team.', 404, 'NO_TEAM');
      }

      user.teamId = team._id;
      await user.save({ validateBeforeSave: false });
    }

    const isMember = team.members?.some((member) => member?._id?.toString() === userId.toString());
    if (!isMember) {
      // Fail closed: stale or corrupted user.teamId must not grant access.
      user.teamId = null;
      await user.save({ validateBeforeSave: false });
      throw new AppError('You are not a member of any team.', 404, 'NO_TEAM');
    }

    if (!user.teamId || user.teamId.toString() !== team._id.toString()) {
      user.teamId = team._id;
      await user.save({ validateBeforeSave: false });
    }

    const currentProject = await Project.findOne({ teamId: team._id })
      .sort({ createdAt: -1 })
      .select('adviserId panelistIds capstonePhase titleStatus projectStatus')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    const teamObject = team.toObject();
    teamObject.assignment = {
      projectId: currentProject?._id || null,
      instructor: teamObject.leaderId?.instructorId || null,
      adviser: currentProject?.adviserId || null,
      panelists: currentProject?.panelistIds || [],
      capstonePhase: currentProject?.capstonePhase || null,
      titleStatus: currentProject?.titleStatus || null,
      projectStatus: currentProject?.projectStatus || null,
    };

    return { team: teamObject };
  }

  /**
   * Invite a student to join a team (leader-only action).
   * Also implements the "Orphaned Student Adoption" workflow — existing teams can
   * send invites to students who separated from their original groups.
   * @param {string} teamId
   * @param {string} leaderId - The requesting user (must be the team leader).
   * @param {Object} data - { email }
   * @returns {Object} { invite }
   */
  async inviteMember(teamId, leaderId, data) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    const leaderUser = await User.findById(leaderId).select('teamId sectionId instructorId');
    if (!leaderUser) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    await this._enforceSingleTeamMembership(leaderUser, { preferredTeamId: team._id });

    if (team.leaderId.toString() !== leaderId.toString()) {
      throw new AppError('Only the team leader can send invitations.', 403, 'FORBIDDEN');
    }

    if (team.members.length >= MAX_TEAM_MEMBERS) {
      throw new AppError(
        `Team is already at maximum capacity (${MAX_TEAM_MEMBERS} members).`,
        400,
        'TEAM_FULL',
      );
    }

    // Check the invited user exists and is a student
    const invitedUser = await User.findOne({ email: data.email });
    if (!invitedUser) {
      throw new AppError('No user found with this email address.', 404, 'USER_NOT_FOUND');
    }

    if (invitedUser.role !== ROLES.STUDENT) {
      throw new AppError('Only students can be invited to teams.', 400, 'INVALID_ROLE');
    }

    // Check if the user is already a member
    if (team.members.some((memberId) => memberId.toString() === invitedUser._id.toString())) {
      throw new AppError('This user is already a member of your team.', 409, 'ALREADY_MEMBER');
    }

    // Block invites when the user already belongs to another team.
    // Team membership is the source of truth; user.teamId can become stale.
    const isMemberOfAnotherTeam = Boolean(
      await Team.exists({
        _id: { $ne: team._id },
        members: invitedUser._id,
      }),
    );
    if (isMemberOfAnotherTeam) {
      throw new AppError(
        `${invitedUser.fullName || 'This user'} already has a team.`,
        409,
        'ALREADY_IN_TEAM',
      );
    }

    // Self-heal stale teamId reference when no team membership exists.
    if (invitedUser.teamId) {
      await User.updateOne({ _id: invitedUser._id }, { $set: { teamId: null } });
    }

    // Check for existing pending invite
    const existingInvite = await TeamInvite.findOne({
      teamId,
      email: data.email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      throw new AppError(
        'A pending invitation already exists for this email.',
        409,
        'DUPLICATE_INVITE',
      );
    }

    const token = uuidv4();
    const inviteCode = await this.generateUniqueInviteCode();
    const invite = await TeamInvite.create({
      teamId,
      email: data.email,
      token,
      inviteCode,
    });

    // Send invite email
    const inviter = await User.findById(leaderId).select(
      'firstName middleName lastName sectionId instructorId',
    );
    const inviterName = inviter?.fullName || 'A team leader';
    await sendTeamInviteEmail(data.email, team.name, inviterName, token, inviteCode);

    // Create an in-app notification for the invited user
    const inviteNotif = await Notification.create({
      userId: invitedUser._id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You have been invited to join team "${team.name}".`,
      metadata: { teamId, inviteToken: token, inviteCode },
    });
    emitToUser(invitedUser._id, 'notification:new', inviteNotif);

    const isCrossSectionInvite = Boolean(
      inviter?.sectionId &&
        invitedUser?.sectionId &&
        inviter.sectionId.toString() !== invitedUser.sectionId.toString(),
    );

    if (isCrossSectionInvite) {
      const instructorRecipientIds = [
        invitedUser?.instructorId?.toString?.(),
        inviter?.instructorId?.toString?.(),
      ].filter(Boolean);

      const uniqueInstructorRecipientIds = [...new Set(instructorRecipientIds)];

      if (uniqueInstructorRecipientIds.length > 0) {
        const instructorNotifs = await Notification.create(
          uniqueInstructorRecipientIds.map((recipientId) => ({
            userId: recipientId,
            type: 'team_invite',
            title: 'Cross-Section Team Invitation',
            message: `${invitedUser.fullName || invitedUser.email} was invited to join team "${team.name}" from another section.`,
            metadata: {
              teamId,
              inviteeId: invitedUser._id,
              inviteToken: token,
              crossSection: true,
            },
          })),
        );

        for (const notif of instructorNotifs) {
          emitToUser(notif.userId, 'notification:new', notif);
        }
      }
    }

    return {
      invite,
      invitedUser: {
        _id: invitedUser._id,
        fullName: invitedUser.fullName,
        email: invitedUser.email,
      },
    };
  }

  /**
   * Search student invite candidates for a team (leader-only).
   * Excludes current team members and inactive users.
   * @param {string} teamId
   * @param {string} leaderId
   * @param {Object} query - { search?, limit? }
   * @returns {Object} { candidates }
   */
  async listInviteCandidates(teamId, leaderId, query) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.leaderId.toString() !== leaderId.toString()) {
      throw new AppError('Only the team leader can search invite candidates.', 403, 'FORBIDDEN');
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const limit = Number.isFinite(query.limit) ? query.limit : 8;
    const memberIds = team.members.map((id) => id.toString());
    const leader = await User.findById(leaderId).select('sectionId');
    const scopedSectionId = leader?.sectionId || team.sectionId || null;

    const filter = {
      role: ROLES.STUDENT,
      isActive: true,
      _id: { $nin: memberIds },
    };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('firstName middleName lastName email sectionId instructorId teamId')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit);

    const candidateIds = users.map((user) => user._id);
    const teamsContainingCandidates = await Team.find({
      _id: { $ne: team._id },
      members: { $in: candidateIds },
    })
      .select('members')
      .lean();

    const memberOfAnotherTeamSet = new Set();
    const memberTeamMap = new Map();
    for (const existingTeam of teamsContainingCandidates) {
      for (const memberId of existingTeam.members || []) {
        const key = memberId.toString();
        memberOfAnotherTeamSet.add(key);
        if (!memberTeamMap.has(key)) {
          memberTeamMap.set(key, existingTeam._id.toString());
        }
      }
    }

    const staleTeamIdUpdates = [];

    const candidates = users
      .map((user) => {
      const userId = user._id.toString();
      const inAnotherSection = Boolean(
        scopedSectionId && user.sectionId && user.sectionId.toString() !== scopedSectionId.toString(),
      );
      // Rely on current team membership records instead of user.teamId, which can be stale.
      const alreadyInTeam = memberOfAnotherTeamSet.has(userId);
      const mappedTeamId = memberTeamMap.get(userId);
      const currentTeamId = user.teamId ? user.teamId.toString() : null;
      if (alreadyInTeam && mappedTeamId && currentTeamId !== mappedTeamId) {
        staleTeamIdUpdates.push({
          updateOne: {
            filter: { _id: user._id },
            update: { $set: { teamId: mappedTeamId } },
          },
        });
      }
      const missingInstructor = !user.instructorId;

      const warnings = [];

      if (inAnotherSection) {
        warnings.push({
          code: 'DIFFERENT_SECTION',
          message:
            'This student is on another section and it may cause confusion. If you add this student, the system will send notification for the instructor.',
          blocksInvite: false,
        });
      }

      if (alreadyInTeam) {
        warnings.push({
          code: 'ALREADY_IN_TEAM',
          message: `${user.fullName || 'This student'} already has a team.`,
          blocksInvite: true,
        });
      }

      if (missingInstructor) {
        warnings.push({
          code: 'NO_INSTRUCTOR',
          message:
            'This student does not have an instructor yet. They should complete their profile before joining a team.',
          blocksInvite: true,
        });
      }

        return {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          canInvite: !warnings.some((warning) => warning.blocksInvite),
          warnings,
        };
      })
      .sort((a, b) => Number(b.canInvite) - Number(a.canInvite));

    if (staleTeamIdUpdates.length > 0) {
      await User.bulkWrite(staleTeamIdUpdates, { ordered: false });
    }

    return { candidates };
  }

  /**
   * Accept a team invitation by token.
   * @param {string} token - The invite token.
   * @param {string} userId - The authenticated user accepting.
   * @returns {Object} { team }
   */
  async acceptInvite(token, userId) {
    const normalizedInput = (token || '').trim();
    const normalizedCode = normalizedInput.toUpperCase();

    const invite = await TeamInvite.findOne({
      $or: [{ token: normalizedInput }, { inviteCode: normalizedCode }],
    });
    if (!invite || !invite.isValid()) {
      throw new AppError('This invitation is invalid or has expired.', 400, 'INVALID_INVITE');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const hasSection = Boolean(user.sectionId);
    const hasInstructor = Boolean(user.instructorId);
    if (!hasSection || !hasInstructor) {
      throw new AppError(
        'Complete your profile first (section and adviser are required) before joining a team.',
        400,
        'PROFILE_INCOMPLETE',
      );
    }

    if (user.email !== invite.email) {
      throw new AppError('This invitation was not sent to your email address.', 403, 'FORBIDDEN');
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
    }

    const isMemberOfAnotherTeam = await Team.exists({
      _id: { $ne: team._id },
      members: user._id,
    });
    if (isMemberOfAnotherTeam) {
      throw new AppError('You are already a member of a team', 409, 'ALREADY_IN_TEAM');
    }

    // Self-heal stale teamId value before claiming the invite.
    if (user.teamId) {
      await User.updateOne({ _id: user._id }, { $set: { teamId: null } });
    }

    if (team.members.length >= MAX_TEAM_MEMBERS) {
      throw new AppError(
        `Team is already at maximum capacity (${MAX_TEAM_MEMBERS} members).`,
        400,
        'TEAM_FULL',
      );
    }

    const claimedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        $or: [{ teamId: null }, { teamId: { $exists: false } }],
      },
      {
        $set: { teamId: team._id },
      },
      { new: true },
    );

    if (!claimedUser) {
      throw new AppError('You are already a member of a team', 409, 'ALREADY_IN_TEAM');
    }

    const updatedTeam = await Team.findOneAndUpdate(
      {
        _id: team._id,
        members: { $ne: user._id },
        $expr: { $lt: [{ $size: '$members' }, MAX_TEAM_MEMBERS] },
      },
      {
        $addToSet: { members: user._id },
      },
      { new: true },
    );

    if (!updatedTeam) {
      await User.updateOne(
        { _id: user._id, teamId: team._id },
        { $set: { teamId: null } },
      );

      const freshTeam = await Team.findById(team._id).select('members');
      if (!freshTeam) {
        throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
      }
      if (freshTeam.members.length >= MAX_TEAM_MEMBERS) {
        throw new AppError(
          `Team is already at maximum capacity (${MAX_TEAM_MEMBERS} members).`,
          400,
          'TEAM_FULL',
        );
      }

      throw new AppError('Unable to join the team at this time.', 409, 'TEAM_JOIN_CONFLICT');
    }

    // Mark invite as accepted
    invite.status = 'accepted';
    await invite.save();

    // Notify team members
    const otherMembers = team.members.filter(
      (memberId) => memberId.toString() !== userId.toString(),
    );
    const joinedNotifs = await Notification.insertMany(
      otherMembers.map((memberId) => ({
        userId: memberId,
        type: 'team_joined',
        title: 'New Team Member',
        message: `${user.fullName} has joined your team "${team.name}".`,
        metadata: { teamId: team._id, newMemberId: userId },
      })),
    );
    joinedNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));

    const populatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'firstName middleName lastName email profilePicture')
      .populate('members', 'firstName middleName lastName email profilePicture role');

    return { team: populatedTeam };
  }

  /**
   * Decline a team invitation by token.
   * @param {string} token - The invite token.
   * @param {string} userId - The authenticated user declining.
   * @returns {void}
   */
  async declineInvite(token, userId) {
    const invite = await TeamInvite.findOne({ token });
    if (!invite || !invite.isValid()) {
      throw new AppError('This invitation is invalid or has expired.', 400, 'INVALID_INVITE');
    }

    const user = await User.findById(userId);
    if (!user || user.email !== invite.email) {
      throw new AppError('This invitation was not sent to your email address.', 403, 'FORBIDDEN');
    }

    invite.status = 'declined';
    await invite.save();
  }

  /**
   * Assign or clear a member role (leader-only action).
   * @param {string} teamId
   * @param {string} leaderId
   * @param {string} memberId
   * @param {string} role
   * @returns {Object} { team }
   */
  async assignMemberRole(teamId, leaderId, memberId, role) {
    const team = await Team.findById(teamId)
      .populate({
        path: 'leaderId',
        select: 'firstName middleName lastName email instructorId',
        populate: {
          path: 'instructorId',
          select: 'firstName middleName lastName email profilePicture',
        },
      })
      .populate('members', 'firstName middleName lastName email role')
      .populate('memberRoles.userId', 'firstName middleName lastName email');

    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.leaderId?._id?.toString() !== leaderId.toString()) {
      throw new AppError('Only the team leader can assign team member roles.', 403, 'FORBIDDEN');
    }

    if (role && !TEAM_MEMBER_ROLES.includes(role)) {
      throw new AppError('Invalid team role provided.', 400, 'INVALID_TEAM_ROLE');
    }

    const existingIndex = (team.memberRoles || []).findIndex(
      (assignment) => assignment?.userId?._id?.toString() === memberId.toString(),
    );

    if (!role) {
      if (existingIndex >= 0) {
        team.memberRoles.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      team.memberRoles[existingIndex].role = role;
    } else {
      team.memberRoles.push({ userId: memberId, role });
    }

    await team.save();

    const currentProject = await Project.findOne({ teamId: team._id })
      .sort({ createdAt: -1 })
      .select('adviserId panelistIds capstonePhase titleStatus projectStatus')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    const teamObject = team.toObject();
    teamObject.assignment = {
      instructor: teamObject.leaderId?.instructorId || null,
      adviser: currentProject?.adviserId || null,
      panelists: currentProject?.panelistIds || [],
      capstonePhase: currentProject?.capstonePhase || null,
      titleStatus: currentProject?.titleStatus || null,
      projectStatus: currentProject?.projectStatus || null,
    };

    return { team: teamObject };
  }

  /**
   * Transfer team leadership to an existing member (leader-only action).
   * @param {string} teamId
   * @param {string} leaderId
   * @param {string} memberId
   * @returns {Object} { team }
   */
  async transferLeadership(teamId, leaderId, memberId) {
    const team = await Team.findById(teamId)
      .populate({
        path: 'leaderId',
        select: 'firstName middleName lastName email instructorId',
        populate: {
          path: 'instructorId',
          select: 'firstName middleName lastName email profilePicture',
        },
      })
      .populate('members', 'firstName middleName lastName email role')
      .populate('memberRoles.userId', 'firstName middleName lastName email');

    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.leaderId?._id?.toString() !== leaderId.toString()) {
      throw new AppError('Only the team leader can transfer leadership.', 403, 'FORBIDDEN');
    }

    if (team.leaderId?._id?.toString() === memberId.toString()) {
      throw new AppError('The selected member is already the team leader.', 400, 'ALREADY_LEADER');
    }

    const isTeamMember = team.members?.some((member) => member?._id?.toString() === memberId.toString());
    if (!isTeamMember) {
      throw new AppError('The selected user is not a member of this team.', 404, 'MEMBER_NOT_FOUND');
    }

    team.leaderId = memberId;
    await team.save();

    const updatedTeam = await Team.findById(team._id)
      .populate({
        path: 'leaderId',
        select: 'firstName middleName lastName email instructorId',
        populate: {
          path: 'instructorId',
          select: 'firstName middleName lastName email profilePicture',
        },
      })
      .populate('members', 'firstName middleName lastName email role')
      .populate('memberRoles.userId', 'firstName middleName lastName email');

    const currentProject = await Project.findOne({ teamId: team._id })
      .sort({ createdAt: -1 })
      .select('adviserId panelistIds capstonePhase titleStatus projectStatus')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    const teamObject = updatedTeam.toObject();
    teamObject.assignment = {
      instructor: teamObject.leaderId?.instructorId || null,
      adviser: currentProject?.adviserId || null,
      panelists: currentProject?.panelistIds || [],
      capstonePhase: currentProject?.capstonePhase || null,
      titleStatus: currentProject?.titleStatus || null,
      projectStatus: currentProject?.projectStatus || null,
    };

    return { team: teamObject };
  }

  /**
   * Attach or clear a team-level Google Docs link (leader-only action).
   * @param {string} teamId
   * @param {string} leaderId
   * @param {string} googleDocUrl
   * @returns {Object} { team }
   */
  async updateGoogleDocLink(teamId, leaderId, googleDocUrl) {
    const team = await Team.findById(teamId)
      .populate({
        path: 'leaderId',
        select: 'firstName middleName lastName email instructorId',
        populate: {
          path: 'instructorId',
          select: 'firstName middleName lastName email profilePicture',
        },
      })
      .populate('members', 'firstName middleName lastName email role')
      .populate('memberRoles.userId', 'firstName middleName lastName email');

    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.leaderId?._id?.toString() !== leaderId.toString()) {
      throw new AppError(
        'Only the team leader can update the team document link.',
        403,
        'FORBIDDEN',
      );
    }

    const normalizedLink = typeof googleDocUrl === 'string' ? googleDocUrl.trim() : '';
    if (normalizedLink && !this._isValidGoogleDocUrl(normalizedLink)) {
      throw new AppError(
        'Please provide a valid Google Docs or Google Drive link.',
        400,
        'INVALID_GOOGLE_DOC_URL',
      );
    }

    team.googleDocUrl = normalizedLink;
    await team.save();

    const currentProject = await Project.findOne({ teamId: team._id })
      .sort({ createdAt: -1 })
      .select('adviserId panelistIds capstonePhase titleStatus projectStatus')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    const teamObject = team.toObject();
    teamObject.assignment = {
      instructor: teamObject.leaderId?.instructorId || null,
      adviser: currentProject?.adviserId || null,
      panelists: currentProject?.panelistIds || [],
      capstonePhase: currentProject?.capstonePhase || null,
      titleStatus: currentProject?.titleStatus || null,
      projectStatus: currentProject?.projectStatus || null,
    };

    return { team: teamObject };
  }

  /**
   * List all teams (Instructor/Adviser only, paginated).
   * @param {Object} query - { page, limit, academicYear?, sectionId?, search? }
   * @returns {Object} { teams, pagination }
   */
  async listTeams(query) {
    const { page = 1, limit = 20, academicYear, sectionId, search } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (sectionId) filter.sectionId = sectionId;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'leaderId',
          select: 'firstName middleName lastName email instructorId',
          populate: {
            path: 'instructorId',
            select: 'firstName middleName lastName email profilePicture',
          },
        })
        .populate('members', 'firstName middleName lastName email role'),
      Team.countDocuments(filter),
    ]);

    const teamIds = teams.map((team) => team._id);
    const latestProjects = teamIds.length
      ? await Project.find({ teamId: { $in: teamIds } })
          .sort({ createdAt: -1 })
          .select('teamId adviserId panelistIds capstonePhase titleStatus projectStatus')
          .populate('adviserId', 'firstName middleName lastName email profilePicture')
          .populate('panelistIds', 'firstName middleName lastName email profilePicture')
          .lean()
      : [];

    const projectByTeamId = new Map();
    for (const project of latestProjects) {
      const key = project.teamId?.toString();
      if (!key || projectByTeamId.has(key)) continue;
      projectByTeamId.set(key, project);
    }

    const teamsWithAssignment = teams.map((teamDoc) => {
      const team = teamDoc.toObject();
      const currentProject = projectByTeamId.get(team._id.toString());

      team.assignment = {
        projectId: currentProject?._id || null,
        instructor: team.leaderId?.instructorId || null,
        adviser: currentProject?.adviserId || null,
        panelists: currentProject?.panelistIds || [],
        capstonePhase: currentProject?.capstonePhase || null,
        titleStatus: currentProject?.titleStatus || null,
        projectStatus: currentProject?.projectStatus || null,
      };

      return team;
    });

    return {
      teams: teamsWithAssignment,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default new TeamService();
