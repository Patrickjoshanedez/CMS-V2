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

    if (user.teamId) {
      throw new AppError(
        'You are already a member of a team. Leave your current team first.',
        409,
        'ALREADY_IN_TEAM',
      );
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
   * Get the authenticated student's team with populated members.
   * @param {string} userId
   * @returns {Object} { team }
   */
  async getMyTeam(userId) {
    const user = await User.findById(userId);
    if (!user || !user.teamId) {
      throw new AppError('You are not a member of any team.', 404, 'NO_TEAM');
    }

    const team = await Team.findById(user.teamId)
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
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
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
    const inviter = await User.findById(leaderId).select('firstName middleName lastName');
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

    return { invite };
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
      .select('firstName middleName lastName email')
      .sort({ firstName: 1, lastName: 1 })
      .limit(limit);

    const candidates = users.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    }));

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

    if (user.teamId) {
      throw new AppError(
        'You are already part of a team. Please leave your current team before joining a new one.',
        400,
        'ALREADY_IN_TEAM',
      );
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.members.length >= MAX_TEAM_MEMBERS) {
      throw new AppError(
        `Team is already at maximum capacity (${MAX_TEAM_MEMBERS} members).`,
        400,
        'TEAM_FULL',
      );
    }

    // Add the user to the team
    team.members.push(userId);
    await team.save();

    // Update user's teamId
    user.teamId = team._id;
    await user.save({ validateBeforeSave: false });

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
