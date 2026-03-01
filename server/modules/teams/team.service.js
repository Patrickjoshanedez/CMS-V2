import Team from './team.model.js';
import TeamInvite from './teamInvite.model.js';
import User from '../users/user.model.js';
import Notification from '../notifications/notification.model.js';
import { sendTeamInviteEmail } from '../notifications/email.service.js';
import { emitToUser } from '../../services/socket.service.js';
import AppError from '../../utils/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { ROLES } from '@cms/shared';

const MAX_TEAM_MEMBERS = 4;

/**
 * TeamService — Business logic for team management.
 * Handles creation, invitations, membership, and lock workflow.
 */
class TeamService {
  /**
   * Create a new project team. The requesting student becomes the leader.
   * @param {string} userId - The ID of the student creating the team.
   * @param {Object} data - { name, academicYear }
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

    const team = await Team.create({
      name: data.name,
      academicYear: data.academicYear,
      leaderId: userId,
      members: [userId],
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
      .populate('leaderId', 'firstName middleName lastName email profilePicture')
      .populate('members', 'firstName middleName lastName email profilePicture role');

    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    return { team };
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

    if (team.isLocked) {
      throw new AppError('This team is locked and cannot accept new members.', 403, 'TEAM_LOCKED');
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
    const invite = await TeamInvite.create({
      teamId,
      email: data.email,
      token,
    });

    // Send invite email
    await sendTeamInviteEmail(data.email, team.name, token);

    // Create an in-app notification for the invited user
    const inviteNotif = await Notification.create({
      userId: invitedUser._id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You have been invited to join team "${team.name}".`,
      metadata: { teamId, inviteToken: token },
    });
    emitToUser(invitedUser._id, 'notification:new', inviteNotif);

    return { invite };
  }

  /**
   * Accept a team invitation by token.
   * @param {string} token - The invite token.
   * @param {string} userId - The authenticated user accepting.
   * @returns {Object} { team }
   */
  async acceptInvite(token, userId) {
    const invite = await TeamInvite.findOne({ token });
    if (!invite || !invite.isValid()) {
      throw new AppError('This invitation is invalid or has expired.', 400, 'INVALID_INVITE');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.email !== invite.email) {
      throw new AppError('This invitation was not sent to your email address.', 403, 'FORBIDDEN');
    }

    // Allow "orphaned" students to join new teams — if user already has a team, remove them first
    if (user.teamId) {
      const previousTeam = await Team.findById(user.teamId);
      if (previousTeam) {
        previousTeam.members = previousTeam.members.filter(
          (memberId) => memberId.toString() !== userId.toString(),
        );
        // If the user was the leader and there are remaining members, transfer leadership
        if (
          previousTeam.leaderId.toString() === userId.toString() &&
          previousTeam.members.length > 0
        ) {
          previousTeam.leaderId = previousTeam.members[0];
        }
        await previousTeam.save();
      }
    }

    const team = await Team.findById(invite.teamId);
    if (!team) {
      throw new AppError('Team no longer exists.', 404, 'TEAM_NOT_FOUND');
    }

    if (team.isLocked) {
      throw new AppError('This team is locked and cannot accept new members.', 403, 'TEAM_LOCKED');
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
   * Lock a team (Instructor or team leader action).
   * A locked team cannot accept new members or invitations.
   * @param {string} teamId
   * @param {Object} requestingUser - req.user
   * @returns {Object} { team }
   */
  async lockTeam(teamId, requestingUser) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found.', 404, 'TEAM_NOT_FOUND');
    }

    // Only the team leader or an instructor can lock
    const isLeader = team.leaderId.toString() === requestingUser._id.toString();
    const isInstructor = requestingUser.role === ROLES.INSTRUCTOR;

    if (!isLeader && !isInstructor) {
      throw new AppError(
        'Only the team leader or an instructor can lock a team.',
        403,
        'FORBIDDEN',
      );
    }

    team.isLocked = true;
    await team.save();

    // Notify all team members of the lock
    const lockNotifs = await Notification.insertMany(
      team.members.map((memberId) => ({
        userId: memberId,
        type: 'team_locked',
        title: 'Team Locked',
        message: `Team "${team.name}" has been locked. No further membership changes are allowed.`,
        metadata: { teamId: team._id },
      })),
    );
    lockNotifs.forEach((n) => emitToUser(n.userId, 'notification:new', n));

    return { team };
  }

  /**
   * List all teams (Instructor/Adviser only, paginated).
   * @param {Object} query - { page, limit, academicYear?, search?, isLocked? }
   * @returns {Object} { teams, pagination }
   */
  async listTeams(query) {
    const { page = 1, limit = 20, academicYear, search, isLocked } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (isLocked !== undefined) filter.isLocked = isLocked;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('leaderId', 'firstName middleName lastName email')
        .populate('members', 'firstName middleName lastName email role'),
      Team.countDocuments(filter),
    ]);

    return {
      teams,
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
