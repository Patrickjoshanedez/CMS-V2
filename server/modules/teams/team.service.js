import Team from './team.model.js';
import TeamInvite from './teamInvite.model.js';
import User from '../users/user.model.js';
import Project from '../projects/project.model.js';
import Notification from '../notifications/notification.model.js';
import Section from '../academics/section.model.js';
import DocumentTemplate from './documentTemplate.model.js';
import { sendTeamInviteEmail } from '../notifications/email.service.js';
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { ROLES, TITLE_STATUSES } from '@cms/shared';

const MAX_TEAM_MEMBERS = 4;
const TEAM_MEMBER_ROLES = Team.MEMBER_ROLES || [
  'Project Lead & Systems Analyst',
  'Frontend & UI/UX Developer',
  'Backend & Database Developer',
  'Full-Stack Developer',
  'QA & Technical Documentor',
  'Programmer',
  'Documentor',
  'Pitcher',
  'UI/UX',
  'QA/Tester',
  'Researcher',
  'Backend Developer',
  'Frontend Developer',
  'All-Around',
  'All-around',
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
   * Resolve the assigned or section instructor for a team.
   * @param {Object} team
   * @param {Object} leaderUser
   * @returns {Promise<string|null>} instructorId
   */
  async _resolveInstructorId(team, leaderUser) {
    if (leaderUser?.instructorId) {
      return leaderUser.instructorId.toString();
    }
    if (team?.sectionId) {
      const section = await Section.findById(team.sectionId).select('createdBy').lean();
      if (section?.createdBy) {
        return section.createdBy.toString();
      }
    }
    if (leaderUser?.sectionId) {
      const section = await Section.findById(leaderUser.sectionId).select('createdBy').lean();
      if (section?.createdBy) {
        return section.createdBy.toString();
      }
    }
    const fallbackInstructor = await User.findOne({ role: ROLES.INSTRUCTOR, isActive: true })
      .select('_id')
      .lean();
    return fallbackInstructor ? fallbackInstructor._id.toString() : null;
  }

  /**
   * Create a new project team. The requesting student becomes the leader.
   * @param {string} userId - The ID of the student creating the team.
   * @param {Object} data - { name? }
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
    let academicYear = typeof data.academicYear === 'string' ? data.academicYear.trim() : '';

    if (user.sectionId) {
      const section = await Section.findById(user.sectionId).select('courseId academicYear').lean();
      sectionId = user.sectionId;
      courseId = section?.courseId || null;
      academicYear = section?.academicYear || academicYear;
    }

    if (!academicYear) {
      throw new AppError(
        'Please complete your profile section before creating a team.',
        400,
        'PROFILE_SECTION_REQUIRED',
      );
    }

    const team = await Team.create({
      name: teamName,
      academicYear,
      leaderId: userId,
      members: [userId],
      sectionId,
      courseId,
    });

    // Link the user to the team
    user.teamId = team._id;
    await user.save({ validateBeforeSave: false });

    // Notify the instructor of team creation and committee requirement
    try {
      const instructorId = await this._resolveInstructorId(team, user);
      if (instructorId) {
        let sectionName = '';
        let sectionCode = '';
        if (sectionId) {
          const sec = await Section.findById(sectionId).select('name code');
          if (sec) {
            sectionName = sec.name || '';
            sectionCode = sec.code || '';
          }
        }
        const codeSuffix = team._id.toString().slice(-6).toUpperCase();
        const formattedGroupCode = `#${codeSuffix}`;
        const leaderFullName =
          [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') ||
          `${user.firstName} ${user.lastName}`;

        const notif = await Notification.create({
          userId: instructorId,
          type: 'team_formation_pending_committee',
          title: 'New Team Formed',
          message: `Team "${team.name}" has been created by ${user.firstName} ${user.lastName} and will require faculty committee appointments.`,
          metadata: {
            teamId: team._id.toString(),
            teamName: team.name,
            groupCode: formattedGroupCode,
            rosterCode: codeSuffix,
            academicYear: team.academicYear || '',
            section: sectionName,
            sectionCode: sectionCode,
            leaderName: leaderFullName,
            memberCount: team.members.length,
            maxMembers: MAX_TEAM_MEMBERS,
            requiresCommittee: true,
            actionUrl: `/teams?teamId=${team._id}`,
          },
        });
        emitToUser(instructorId, 'notification:new', notif);
      }
    } catch (notifErr) {
      // Notification failure should not abort team creation
      console.warn('[createTeam] Failed to notify instructor:', notifErr.message);
    }

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

    // Invalidate outstanding invites so finalized teams cannot add members via stale invite links.
    await TeamInvite.updateMany(
      { teamId: team._id, status: 'pending' },
      { $set: { status: 'expired' } },
    );

    const populatedTeam = await Team.findById(team._id)
      .populate(
        'leaderId',
        'firstName middleName lastName email profilePicture instructorId sectionId',
      )
      .populate('members', 'firstName middleName lastName email profilePicture role')
      .populate('sectionId', 'name code academicYear');

    // Notify instructor that team roster is finalized and awaiting committee assignment
    try {
      const leader =
        populatedTeam?.leaderId ||
        (await User.findById(leaderId).select(
          'firstName middleName lastName instructorId sectionId',
        ));
      const instructorId = await this._resolveInstructorId(team, leader);
      if (instructorId) {
        let sectionName = populatedTeam?.sectionId?.name || '';
        let sectionCode = populatedTeam?.sectionId?.code || '';
        if (!sectionName && team.sectionId) {
          const sec = await Section.findById(team.sectionId).select('name code');
          if (sec) {
            sectionName = sec.name || '';
            sectionCode = sec.code || '';
          }
        }
        if (!sectionName && leader?.sectionId) {
          const sec = await Section.findById(leader.sectionId).select('name code');
          if (sec) {
            sectionName = sec.name || '';
            sectionCode = sec.code || '';
          }
        }

        const codeSuffix = team._id.toString().slice(-6).toUpperCase();
        const formattedGroupCode = `#${codeSuffix}`;
        const leaderFullName =
          [leader.firstName, leader.middleName, leader.lastName].filter(Boolean).join(' ') ||
          `${leader.firstName} ${leader.lastName}`;

        const notif = await Notification.create({
          userId: instructorId,
          type: 'team_formation_pending_committee',
          title: 'Team Formation Completed',
          message: `Team "${team.name}" has locked their roster (${team.members.length} member${team.members.length === 1 ? '' : 's'}) and is awaiting faculty committee appointments.`,
          metadata: {
            teamId: team._id.toString(),
            teamName: team.name,
            groupCode: formattedGroupCode,
            rosterCode: codeSuffix,
            academicYear: team.academicYear || '',
            section: sectionName,
            sectionCode: sectionCode,
            leaderName: leaderFullName,
            memberCount: team.members.length,
            maxMembers: MAX_TEAM_MEMBERS,
            requiresCommittee: true,
            actionUrl: `/teams?teamId=${team._id}`,
          },
        });
        emitToUser(instructorId, 'notification:new', notif);
      }
    } catch (notifErr) {
      console.warn('[lockTeam] Failed to notify instructor:', notifErr.message);
    }

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

    const isMember = (team.members || []).some(
      (memberId) => memberId.toString() === userId.toString(),
    );
    if (!isMember) {
      throw new AppError('You are not a member of this team.', 403, 'FORBIDDEN');
    }

    team.members = (team.members || []).filter(
      (memberId) => memberId.toString() !== userId.toString(),
    );
    team.memberRoles = (team.memberRoles || []).filter(
      (assignment) => assignment?.userId?.toString() !== userId.toString(),
    );

    const remainingMemberIds = team.members.map((memberId) => memberId.toString());
    const wasLeader = team.leaderId?.toString() === userId.toString();

    if (remainingMemberIds.length === 0) {
      await User.updateOne({ _id: userId, teamId: team._id }, { $set: { teamId: null } });
      await TeamInvite.deleteMany({ teamId: team._id, status: 'pending' });
      await team.deleteOne();
      return { team: null };
    }

    if (wasLeader) {
      team.leaderId = team.members[0];
    }

    await team.save();

    await User.updateOne({ _id: userId, teamId: team._id }, { $set: { teamId: null } });

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
        .populate('members', 'firstName middleName lastName email profilePicture role')
        .populate('adviserId', 'firstName middleName lastName email profilePicture')
        .populate('secretaryId', 'firstName middleName lastName email profilePicture')
        .populate('panelistIds', 'firstName middleName lastName email profilePicture');
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
        .populate('members', 'firstName middleName lastName email profilePicture role')
        .populate('adviserId', 'firstName middleName lastName email profilePicture')
        .populate('secretaryId', 'firstName middleName lastName email profilePicture')
        .populate('panelistIds', 'firstName middleName lastName email profilePicture');

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
      .select('adviserId secretaryId panelistIds capstonePhase titleStatus projectStatus')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('secretaryId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    const teamObject = team.toObject();
    const assignedAdviser = teamObject.adviserId || currentProject?.adviserId || null;
    const assignedSecretary = teamObject.secretaryId || currentProject?.secretaryId || null;
    const assignedPanelists =
      teamObject.panelistIds && teamObject.panelistIds.length > 0
        ? teamObject.panelistIds
        : currentProject?.panelistIds || [];

    teamObject.assignment = {
      projectId: currentProject?._id || null,
      instructor: teamObject.leaderId?.instructorId || null,
      adviser: assignedAdviser,
      secretary: assignedSecretary,
      panelists: assignedPanelists,
      capstonePhase: currentProject?.capstonePhase || null,
      titleStatus: currentProject?.titleStatus || null,
      projectStatus: currentProject?.projectStatus || null,
    };

    // Include pending invites so the leader can share 6-digit codes
    const isLeader = team.leaderId?._id?.toString() === userId.toString();
    if (isLeader) {
      const pendingInvites = await TeamInvite.find({
        teamId: team._id,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
        .select('email inviteCode expiresAt createdAt')
        .sort({ createdAt: -1 })
        .lean();
      teamObject.pendingInvites = pendingInvites;
    }

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

    if (team.isLocked) {
      throw new AppError(
        'This team is already finalized and can no longer add members.',
        409,
        'TEAM_ALREADY_LOCKED',
      );
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

    const token = existingInvite?.token || uuidv4();
    const inviteCode = existingInvite?.inviteCode || (await this.generateUniqueInviteCode());

    let invite = existingInvite;
    if (invite) {
      invite.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await invite.save();
    } else {
      invite = await TeamInvite.create({
        teamId,
        email: data.email,
        token,
        inviteCode,
      });
    }

    const inviter = await User.findById(leaderId).select(
      'firstName middleName lastName sectionId instructorId',
    );
    const inviterName = inviter?.fullName || 'A team leader';

    // Always persist and emit in-app notifications even if SMTP fails.
    const inviteNotif = await Notification.create({
      userId: invitedUser._id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You have been invited to join team "${team.name}".`,
      metadata: { teamId, inviteToken: token, inviteCode },
    });
    emitToUser(invitedUser._id, 'notification:new', inviteNotif);

    let emailSent = false;
    try {
      await sendTeamInviteEmail(data.email, team.name, inviterName, token, inviteCode);
      emailSent = true;
    } catch (error) {
      console.warn(
        '[TeamService] Invite email delivery failed; invite remains active for in-app acceptance.',
        {
          email: data.email,
          teamId: team._id?.toString?.() || String(team._id),
          code: error?.code,
          responseCode: error?.responseCode,
          message: error?.message,
        },
      );
    }

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
      emailSent,
      reusedInvite: Boolean(existingInvite),
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

    if (team.isLocked) {
      throw new AppError(
        'This team is already finalized and can no longer add members.',
        409,
        'TEAM_ALREADY_LOCKED',
      );
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
          scopedSectionId &&
          user.sectionId &&
          user.sectionId.toString() !== scopedSectionId.toString(),
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
   * Search student invite candidates before creating a team.
   * @param {string} leaderId
   * @param {Object} query - { search?, limit? }
   * @returns {Object} { candidates }
   */
  async listCreateTeamInviteCandidates(leaderId, query) {
    const leader = await User.findById(leaderId).select('sectionId');
    if (!leader) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const limit = Number.isFinite(query.limit) ? query.limit : 8;

    const filter = {
      role: ROLES.STUDENT,
      isActive: true,
      _id: { $ne: leaderId },
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
    const teamsContainingCandidates = await Team.find({ members: { $in: candidateIds } })
      .select('members')
      .lean();

    const memberOfAnotherTeamSet = new Set();
    for (const existingTeam of teamsContainingCandidates) {
      for (const memberId of existingTeam.members || []) {
        memberOfAnotherTeamSet.add(memberId.toString());
      }
    }

    const scopedSectionId = leader?.sectionId || null;

    const candidates = users
      .map((user) => {
        const userId = user._id.toString();
        const inAnotherSection = Boolean(
          scopedSectionId &&
          user.sectionId &&
          user.sectionId.toString() !== scopedSectionId.toString(),
        );
        const alreadyInTeam = memberOfAnotherTeamSet.has(userId);
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
    if (!invite) {
      throw new AppError('This invitation is invalid or has expired.', 400, 'INVALID_INVITE');
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.isLocked) {
      if (invite.status === 'pending') {
        invite.status = 'expired';
        await invite.save();
      }

      throw new AppError(
        'This team is already finalized and can no longer add members.',
        409,
        'TEAM_ALREADY_LOCKED',
      );
    }

    if (!invite.isValid()) {
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
      { returnDocument: 'after' },
    );

    if (!claimedUser) {
      throw new AppError('You are already a member of a team', 409, 'ALREADY_IN_TEAM');
    }

    const updatedTeam = await Team.findOneAndUpdate(
      {
        _id: team._id,
        isLocked: false,
        members: { $ne: user._id },
        $expr: { $lt: [{ $size: '$members' }, MAX_TEAM_MEMBERS] },
      },
      {
        $addToSet: { members: user._id },
      },
      { returnDocument: 'after' },
    );

    if (!updatedTeam) {
      await User.updateOne({ _id: user._id, teamId: team._id }, { $set: { teamId: null } });

      const freshTeam = await Team.findById(team._id).select('members isLocked');
      if (!freshTeam) {
        throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
      }

      if (freshTeam.isLocked) {
        if (invite.status === 'pending') {
          invite.status = 'expired';
          await invite.save();
        }

        throw new AppError(
          'This team is already finalized and can no longer add members.',
          409,
          'TEAM_ALREADY_LOCKED',
        );
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

    const isTeamMember = team.members?.some(
      (member) => member?._id?.toString() === memberId.toString(),
    );
    if (!isTeamMember) {
      throw new AppError(
        'The selected user is not a member of this team.',
        404,
        'MEMBER_NOT_FOUND',
      );
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
   * Attach or clear a team-level GitHub repository link (leader-only action).
   * @param {string} teamId
   * @param {string} leaderId
   * @param {string} githubUrl
   * @returns {Object} { team }
   */
  async updateGithubLink(teamId, leaderId, githubUrl) {
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
        'Only the team leader can update the GitHub repository link.',
        403,
        'FORBIDDEN',
      );
    }

    const normalizedLink = typeof githubUrl === 'string' ? githubUrl.trim() : '';
    if (normalizedLink && !/^https?:\/\/(www\.)?github\.com\/.+/i.test(normalizedLink)) {
      throw new AppError(
        'Please provide a valid GitHub repository URL (e.g. https://github.com/org/repo).',
        400,
        'INVALID_GITHUB_URL',
      );
    }

    team.githubUrl = normalizedLink;
    await team.save();

    // If there is an active project, also synchronize prototypes link
    if (normalizedLink) {
      const activeProject = await Project.findOne({ teamId: team._id, isDeleted: false });
      if (activeProject) {
        const existingIdx = activeProject.prototypes.findIndex(
          (p) => p.type === 'link' && p.title.toLowerCase().includes('github'),
        );
        if (existingIdx >= 0) {
          activeProject.prototypes[existingIdx].url = normalizedLink;
        } else {
          activeProject.prototypes.push({
            title: 'GitHub Repository',
            type: 'link',
            url: normalizedLink,
            uploadedBy: leaderId,
          });
        }
        await activeProject.save();
      }
    }

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
    const { page = 1, limit = 20, academicYear, sectionId, search, teamId } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (teamId) filter._id = teamId;
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
        .populate('members', 'firstName middleName lastName email role')
        .populate('adviserId', 'firstName middleName lastName email profilePicture')
        .populate('secretaryId', 'firstName middleName lastName email profilePicture')
        .populate('panelistIds', 'firstName middleName lastName email profilePicture'),
      Team.countDocuments(filter),
    ]);

    const teamIds = teams.map((team) => team._id);
    const latestProjects = teamIds.length
      ? await Project.find({ teamId: { $in: teamIds } })
          .sort({ createdAt: -1 })
          .select(
            'teamId adviserId secretaryId panelistIds capstonePhase titleStatus projectStatus',
          )
          .populate('adviserId', 'firstName middleName lastName email profilePicture')
          .populate('secretaryId', 'firstName middleName lastName email profilePicture')
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

      const assignedAdviser = team.adviserId || currentProject?.adviserId || null;
      const assignedSecretary = team.secretaryId || currentProject?.secretaryId || null;
      const assignedPanelists =
        team.panelistIds && team.panelistIds.length > 0
          ? team.panelistIds
          : currentProject?.panelistIds || [];

      team.assignment = {
        projectId: currentProject?._id || null,
        instructor: team.leaderId?.instructorId || null,
        adviser: assignedAdviser,
        secretary: assignedSecretary,
        panelists: assignedPanelists,
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

  /**
   * Assign committee (Adviser, Panelists, Secretary) to a team.
   * @param {string} teamId
   * @param {string} instructorId
   * @param {Object} data - { adviserId?, secretaryId?, panelistIds? }
   * @returns {Promise<{ team: Object, message: string }>}
   */
  async assignCommittee(teamId, instructorId, data) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    const instructor = await User.findById(instructorId).select('firstName lastName role');
    if (!instructor || (instructor.role !== ROLES.INSTRUCTOR && instructor.role !== ROLES.ADMIN)) {
      throw new AppError(
        'Only course instructors can assign the faculty committee.',
        403,
        'FORBIDDEN',
      );
    }

    const { adviserId, secretaryId, panelistIds = [] } = data;

    // Validate mutual exclusion between roles on the same team
    if (adviserId && secretaryId && adviserId.toString() === secretaryId.toString()) {
      throw new AppError(
        'The adviser and committee secretary cannot be the same faculty member on the same team.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (
      adviserId &&
      Array.isArray(panelistIds) &&
      panelistIds.some((p) => p.toString() === adviserId.toString())
    ) {
      throw new AppError(
        'A faculty adviser cannot serve as a defense panelist on the same team.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (
      secretaryId &&
      Array.isArray(panelistIds) &&
      panelistIds.some((p) => p.toString() === secretaryId.toString())
    ) {
      throw new AppError(
        'A committee secretary cannot serve as a defense panelist on the same team.',
        400,
        'ROLE_CONFLICT',
      );
    }

    if (Array.isArray(panelistIds) && panelistIds.length > 0) {
      const uniquePanelists = new Set(panelistIds.map((p) => p.toString()));
      if (uniquePanelists.size !== panelistIds.length) {
        throw new AppError(
          'Defense panelists cannot contain duplicate faculty members.',
          400,
          'DUPLICATE_PANELISTS',
        );
      }
    }

    // Validate adviser if provided
    let adviser = null;
    if (adviserId) {
      adviser = await User.findById(adviserId);
      if (!adviser) {
        throw new AppError('The specified adviser was not found.', 400, 'INVALID_ADVISER');
      }
      if (adviser.role === ROLES.INSTRUCTOR || adviser.role === 'instructor') {
        throw new AppError(
          'Course instructors cannot serve as a capstone adviser. Please appoint a verified faculty member.',
          400,
          'INVALID_COMMITTEE_ROLE',
        );
      }
      if (adviser.role === ROLES.STUDENT || adviser.role === 'student') {
        throw new AppError(
          'Students cannot serve on the faculty committee.',
          400,
          'INVALID_COMMITTEE_ROLE',
        );
      }
      team.adviserId = adviser._id;
    }

    // Validate secretary if provided
    let secretary = null;
    if (secretaryId) {
      secretary = await User.findById(secretaryId);
      if (!secretary) {
        throw new AppError(
          'The specified committee secretary was not found.',
          400,
          'INVALID_SECRETARY',
        );
      }
      if (secretary.role === ROLES.INSTRUCTOR || secretary.role === 'instructor') {
        throw new AppError(
          'Course instructors cannot serve as a committee secretary. Please appoint a verified faculty member.',
          400,
          'INVALID_COMMITTEE_ROLE',
        );
      }
      if (secretary.role === ROLES.STUDENT || secretary.role === 'student') {
        throw new AppError(
          'Students cannot serve on the faculty committee.',
          400,
          'INVALID_COMMITTEE_ROLE',
        );
      }
      team.secretaryId = secretary._id;
    }

    // Validate panelists if provided
    if (Array.isArray(panelistIds) && panelistIds.length > 0) {
      if (panelistIds.length > 5) {
        throw new AppError('A team can have at most 5 panelists.', 400, 'MAX_PANELISTS_EXCEEDED');
      }
      const panelists = await User.find({ _id: { $in: panelistIds } }).select(
        '_id firstName lastName role',
      );
      for (const p of panelists) {
        if (p.role === ROLES.INSTRUCTOR || p.role === 'instructor') {
          throw new AppError(
            `Course instructors cannot serve as defense panelists (${p.firstName} ${p.lastName} is an instructor). Please appoint verified faculty members.`,
            400,
            'INVALID_COMMITTEE_ROLE',
          );
        }
        if (p.role === ROLES.STUDENT || p.role === 'student') {
          throw new AppError(
            `Students cannot serve on the defense panel (${p.firstName} ${p.lastName} is a student).`,
            400,
            'INVALID_COMMITTEE_ROLE',
          );
        }
      }
      team.panelistIds = panelistIds;
    }

    await team.save();

    // Reconcile and sync with associated Project if one already exists
    const project = await Project.findOne({ teamId: team._id }).sort({ createdAt: -1 });
    if (project) {
      if (adviserId) project.adviserId = adviserId;
      if (secretaryId) project.secretaryId = secretaryId;
      if (Array.isArray(panelistIds) && panelistIds.length > 0) {
        project.panelistIds = panelistIds;
        const structuredPanelists = panelistIds.map((pId, idx) => ({
          userId: pId,
          role: idx === 0 ? 'chair' : 'member',
        }));
        if (secretaryId && !panelistIds.some((p) => p.toString() === secretaryId.toString())) {
          structuredPanelists.push({ userId: secretaryId, role: 'secretary' });
        }
        project.panelists = structuredPanelists;
      }
      await project.save();
    }

    // Determine whether the committee is fully assigned (1 Adviser, 1 Secretary, and at least 3 Panelists)
    const REQUIRED_PANEL_COUNT = 3;
    const isFullyAssigned =
      Boolean(team.adviserId) &&
      Boolean(team.secretaryId) &&
      Array.isArray(team.panelistIds) &&
      team.panelistIds.length >= REQUIRED_PANEL_COUNT;

    // If fully assigned, mark pending committee appointment notifications for this team as read and completed
    if (isFullyAssigned) {
      try {
        await Notification.updateMany(
          {
            type: { $in: ['team_formation_pending_committee', 'committee_appointment_required'] },
            $or: [{ 'metadata.teamId': team._id }, { 'metadata.teamId': team._id.toString() }],
          },
          {
            $set: {
              isRead: true,
              'metadata.status': 'completed',
              'metadata.requiresCommittee': false,
              'metadata.isFullyAssigned': true,
            },
          },
        );
      } catch (e) {
        console.warn(
          '[assignCommittee] Failed to mark notifications as read/completed:',
          e.message,
        );
      }
    }

    // Send targeted in-app notifications
    try {
      // 1. Notify Adviser
      if (adviser) {
        const notif = await Notification.create({
          userId: adviser._id,
          type: 'adviser_assigned',
          title: 'Adviser Appointment',
          message: `You have been appointed as Capstone Adviser for Team "${team.name}".`,
          metadata: { teamId: team._id, assignedBy: instructorId },
        });
        emitToUser(adviser._id, 'notification:new', notif);
      }

      // 2. Notify Secretary
      if (secretary) {
        const notif = await Notification.create({
          userId: secretary._id,
          type: 'secretary_assigned',
          title: 'Committee Secretary Appointment',
          message: `You have been appointed as Committee Secretary for Team "${team.name}".`,
          metadata: { teamId: team._id, assignedBy: instructorId },
        });
        emitToUser(secretary._id, 'notification:new', notif);
      }

      // 3. Notify Panelists
      if (Array.isArray(panelistIds)) {
        for (const panelistId of panelistIds) {
          const notif = await Notification.create({
            userId: panelistId,
            type: 'panelist_assigned',
            title: 'Panelist Appointment',
            message: `You have been appointed to the defense committee for Team "${team.name}".`,
            metadata: { teamId: team._id, assignedBy: instructorId },
          });
          emitToUser(panelistId, 'notification:new', notif);
        }
      }

      // 4. Notify all Team Members
      if (Array.isArray(team.members)) {
        for (const memberId of team.members) {
          const notif = await Notification.create({
            userId: memberId,
            type: 'committee_assigned',
            title: 'Faculty Committee Appointed',
            message: `Your instructor has assigned your capstone committee (Adviser, Committee Secretary, and Panelists).`,
            metadata: {
              teamId: team._id,
              adviserId: team.adviserId,
              secretaryId: team.secretaryId,
              panelistIds: team.panelistIds,
            },
          });
          emitToUser(memberId, 'notification:new', notif);
        }
      }
    } catch (notifErr) {
      console.warn(
        '[assignCommittee] Failed to dispatch appointment notifications:',
        notifErr.message,
      );
    }

    const populatedTeam = await Team.findById(team._id)
      .populate('leaderId', 'firstName middleName lastName email profilePicture instructorId')
      .populate('members', 'firstName middleName lastName email profilePicture role')
      .populate('adviserId', 'firstName middleName lastName email profilePicture')
      .populate('secretaryId', 'firstName middleName lastName email profilePicture')
      .populate('panelistIds', 'firstName middleName lastName email profilePicture');

    return {
      team: populatedTeam,
      isFullyAssigned,
      message: isFullyAssigned
        ? 'Faculty committee assigned and team notified successfully.'
        : 'Committee assignments saved (partial assignment).',
    };
  }

  /**
   * Retrieve dynamic manuscript template for a team with Title Approval access gating.
   * Locked until the team's project title pitch is approved.
   * @param {string} teamId
   * @returns {Promise<Object>} { isUnlocked, approvedTitle, template }
   */
  async getTeamManuscriptTemplate(teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const project = await Project.findOne({ teamId: team._id });
    const isTitleApproved = Boolean(
      project &&
      (project.titleStatus === TITLE_STATUSES.APPROVED || project.titleStatus === 'approved'),
    );

    if (!isTitleApproved) {
      return {
        isUnlocked: false,
        reason: 'TITLE_DEFENSE_APPROVAL_REQUIRED',
        approvedTitle: project?.title || null,
      };
    }

    // Fetch active template for this academic year, or latest active
    let activeTemplate = await DocumentTemplate.findOne({
      targetType: 'MANUSCRIPT_CHAPTERS_1_5',
      academicYear: team.academicYear,
      isActive: true,
    }).sort({ updatedAt: -1 });

    if (!activeTemplate) {
      activeTemplate = await DocumentTemplate.findOne({
        targetType: 'MANUSCRIPT_CHAPTERS_1_5',
        isActive: true,
      }).sort({ updatedAt: -1 });
    }

    const fallbackUrl = 'https://docs.google.com/document/d/1tTwi29xL.../copy';
    const fallbackVersion = `AY ${team.academicYear || '2025–2026'} v2.1`;

    const isGoogleDocs = activeTemplate ? activeTemplate.distributionType === 'GOOGLE_DOCS' : true;

    const url = activeTemplate
      ? activeTemplate.resourcePayload?.googleDocsUrl ||
        activeTemplate.resourcePayload?.fileAttachmentUrl ||
        fallbackUrl
      : fallbackUrl;

    const version = activeTemplate?.versionLabel || fallbackVersion;
    const updatedAt = activeTemplate?.updatedAt
      ? new Date(activeTemplate.updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
      : 'Sep 01, 2026';

    return {
      isUnlocked: true,
      approvedTitle: project?.title || 'Approved Capstone Title',
      template: {
        title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
        type: isGoogleDocs ? 'google_docs' : 'downloadable_file',
        url,
        version,
        updatedAt,
      },
    };
  }

  /**
   * Update the active institutional manuscript template (Instructor only).
   * Cascades globally across all teams and approved students.
   * @param {Object} data
   * @param {string} userId
   * @returns {Promise<Object>} Updated DocumentTemplate document
   */
  async updateManuscriptTemplate(data, userId) {
    const {
      academicYear = '2025-2026',
      versionLabel = 'AY 2025–2026 v2.1',
      distributionType = 'GOOGLE_DOCS',
      docUrl,
      fileAttachmentUrl,
      fileName,
    } = data;

    const normDistributionType =
      distributionType === 'google_docs' || distributionType === 'GOOGLE_DOCS'
        ? 'GOOGLE_DOCS'
        : 'FILE_ATTACHMENT';

    const resourcePayload = {
      googleDocsUrl: normDistributionType === 'GOOGLE_DOCS' ? docUrl : null,
      fileAttachmentUrl: normDistributionType === 'FILE_ATTACHMENT' ? fileAttachmentUrl : null,
      fileName: normDistributionType === 'FILE_ATTACHMENT' ? fileName : null,
    };

    // Deactivate previous templates for this academic year & targetType
    await DocumentTemplate.updateMany(
      { targetType: 'MANUSCRIPT_CHAPTERS_1_5', academicYear },
      { $set: { isActive: false } },
    );

    const newTemplate = await DocumentTemplate.create({
      targetType: 'MANUSCRIPT_CHAPTERS_1_5',
      academicYear,
      versionLabel,
      distributionType: normDistributionType,
      resourcePayload,
      updatedBy: userId,
      isActive: true,
    });

    return newTemplate;
  }
}

export default new TeamService();
