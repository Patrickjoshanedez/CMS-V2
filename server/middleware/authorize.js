import AppError from '../utils/AppError.js';
import Project from '../modules/projects/project.model.js';
import Team from '../modules/teams/team.model.js';
import { ROLES, PANEL_ROLES, SECRETARY_CAPABILITIES } from '@cms/shared';

/**
 * Role-based authorization middleware factory.
 * Returns middleware that checks if req.user.role is in the allowed roles array.
 * Note: 'faculty' users are automatically granted permissions for 'adviser' and 'panelist' roles.
 *
 * Must be placed AFTER the authenticate middleware.
 *
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    const userRole = req.user.role;

    // Direct match
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    // Faculty persona compatibility: 'faculty' satisfies 'adviser' and 'panelist'
    if (
      userRole === ROLES.FACULTY &&
      (allowedRoles.includes(ROLES.ADVISER) || allowedRoles.includes(ROLES.PANELIST))
    ) {
      return next();
    }

    // Legacy role compatibility: 'adviser' and 'panelist' satisfy 'faculty'
    if (
      allowedRoles.includes(ROLES.FACULTY) &&
      (userRole === ROLES.ADVISER || userRole === ROLES.PANELIST)
    ) {
      return next();
    }

    return next(
      new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'),
    );
  };
};

/**
 * Project-specific panel role authorization middleware.
 * Validates that a faculty user is assigned to the specified project with one of the allowed panel roles
 * (e.g., 'chair' for issuing verdicts, 'secretary' for uploading defense minutes, 'member' for scoring).
 * Instructors are automatically authorized.
 *
 * @param {...string} allowedPanelRoles - e.g. 'chair', 'secretary', 'member'
 * @returns {Function} Express middleware
 */
export const authorizePanelRole = (...allowedPanelRoles) => {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    // Instructors have full oversight
    if (req.user.role === ROLES.INSTRUCTOR) {
      return next();
    }

    const projectId = req.params.projectId || req.params.id || req.body.projectId;

    if (!projectId) {
      return next(
        new AppError(
          'Project context is required for panel authorization.',
          400,
          'PROJECT_REQUIRED',
        ),
      );
    }

    const userIdStr = req.user._id.toString();

    // 1. Check embedded panelAssignments on req.user if populated
    if (Array.isArray(req.user.panelAssignments) && req.user.panelAssignments.length > 0) {
      const assignment = req.user.panelAssignments.find(
        (a) => a.projectId && a.projectId.toString() === projectId.toString(),
      );
      if (assignment && allowedPanelRoles.includes(assignment.role)) {
        return next();
      }
    }

    // 2. Check project record directly
    try {
      const project = await Project.findById(projectId).select(
        'panelists panelistIds adviserId secretaryId',
      );
      if (!project) {
        return next(new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND'));
      }

      // Check direct secretary assignment
      if (
        allowedPanelRoles.includes('secretary') &&
        project.secretaryId &&
        project.secretaryId.toString() === userIdStr
      ) {
        return next();
      }

      // Check panelists array with discrete roles
      if (Array.isArray(project.panelists) && project.panelists.length > 0) {
        const panelistMatch = project.panelists.find(
          (p) => p.userId && (p.userId._id || p.userId).toString() === userIdStr,
        );
        if (panelistMatch && allowedPanelRoles.includes(panelistMatch.role)) {
          return next();
        }
      }

      // Fallback: If no discrete role found but user is in panelistIds and allowedPanelRoles includes 'member'
      if (
        Array.isArray(project.panelistIds) &&
        project.panelistIds.some((id) => id && id.toString() === userIdStr) &&
        allowedPanelRoles.includes('member')
      ) {
        return next();
      }

      return next(
        new AppError(
          `Action requires one of the following panel assignments: ${allowedPanelRoles.join(', ')}`,
          403,
          'PANEL_ROLE_FORBIDDEN',
        ),
      );
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Project-specific Secretary capability authorization middleware.
 * Enforces that only the assigned Committee Secretary (or Course Instructor with department oversight)
 * can execute defense minutes logging, score locking, and matrix endorsement.
 *
 * @param {string} capability - Name of capability (e.g., 'defense.minutes:create/update')
 * @returns {Function} Express middleware
 */
export const authorizeSecretaryCapability = (capability) => {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    // Instructors have administrative oversight for live minutes, but matrix endorsement
    // is strictly restricted to the appointed Committee Secretary
    if (
      req.user.role === ROLES.INSTRUCTOR &&
      capability !== SECRETARY_CAPABILITIES.MATRIX_ENDORSE &&
      capability !== 'adm.matrix:endorse'
    ) {
      return next();
    }

    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return next(
        new AppError(
          'Project context is required for secretary capability authorization.',
          400,
          'PROJECT_REQUIRED',
        ),
      );
    }

    const userIdStr = req.user._id.toString();

    try {
      const project = await Project.findById(projectId).select('secretaryId panelists');
      if (!project) {
        return next(new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND'));
      }

      const isSecretary = Boolean(
        (project.secretaryId && project.secretaryId.toString() === userIdStr) ||
        (Array.isArray(project.panelists) &&
          project.panelists.some(
            (p) =>
              p.userId &&
              (p.userId._id || p.userId).toString() === userIdStr &&
              (p.role === PANEL_ROLES.SECRETARY || p.role === 'secretary'),
          )),
      );

      // Chair may also co-confirm verdict or composite scores
      const isChair = Boolean(
        Array.isArray(project.panelists) &&
        project.panelists.some(
          (p) =>
            p.userId &&
            (p.userId._id || p.userId).toString() === userIdStr &&
            (p.role === PANEL_ROLES.CHAIR || p.role === 'chair'),
        ),
      );

      const isPanelist = Boolean(
        Array.isArray(project.panelists) &&
        project.panelists.some(
          (p) => p.userId && (p.userId._id || p.userId).toString() === userIdStr,
        ),
      );

      if (
        isSecretary ||
        ((isChair || isPanelist) && capability === 'defense.minutes:create/update') ||
        (isChair &&
          (capability === 'defense.verdict:finalize' ||
            capability === 'rubrics.composite:view/aggregate'))
      ) {
        return next();
      }

      return next(
        new AppError(
          `Action requires secretary capability "${capability}". You must be the appointed Committee Secretary for this project.`,
          403,
          'SECRETARY_CAPABILITY_REQUIRED',
        ),
      );
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Authorize Designated Signatory Role for Tiered ADM digital signing.
 * Enforces that only the designated individual (Adviser, designated Instructor, Panelists, Chair)
 * can sign their specific signatory section, and that the Secretary Endorsement gate is respected.
 */
export const verifyAdmSignatoryRole = () => {
  return async (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'AUTH_REQUIRED'));
    }

    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
      return next(new AppError('Project context is required.', 400, 'PROJECT_REQUIRED'));
    }

    const { role, tier } = req.body;
    const userIdStr = req.user._id.toString();

    try {
      const project = await Project.findById(projectId)
        .select('panelists panelistIds adviserId secretaryId teamId admSignatures sectionId')
        .populate({
          path: 'teamId',
          select: 'adviserId secretaryId panelistIds sectionId',
          populate: { path: 'sectionId', select: 'createdBy instructorId' },
        })
        .populate({
          path: 'sectionId',
          select: 'createdBy instructorId',
        });

      if (!project) {
        return next(new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND'));
      }

      const isSecretaryEndorsed = Boolean(project.admSignatures?.secretary?.endorsed);

      // 1. Capstone Adviser
      if (role === 'adviser' || (tier === 1 && req.user.role === ROLES.ADVISER)) {
        if (!isSecretaryEndorsed) {
          return next(
            new AppError(
              'The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected.',
              403,
              'SECRETARY_ENDORSEMENT_REQUIRED',
            ),
          );
        }

        const adviserId = (project.adviserId || project.teamId?.adviserId)?.toString();
        if (adviserId !== userIdStr) {
          return next(
            new AppError(
              'Only the designated Capstone Adviser can sign this section.',
              403,
              'DESIGNATED_ADVISER_REQUIRED',
            ),
          );
        }
        return next();
      }

      // 2. Course Instructor
      if (role === 'instructor' || (tier === 1 && req.user.role === ROLES.INSTRUCTOR)) {
        const section = project.sectionId || project.teamId?.sectionId;
        const sectionInstructorId = (section?.instructorId || section?.createdBy)?.toString();
        const isDesignated =
          req.user.role === ROLES.INSTRUCTOR &&
          (!sectionInstructorId || sectionInstructorId === userIdStr);

        if (!isDesignated) {
          return next(
            new AppError(
              'Only the designated Course Instructor can sign this section.',
              403,
              'DESIGNATED_INSTRUCTOR_REQUIRED',
            ),
          );
        }
        return next();
      }

      // 3. REC / Committee Chair
      if (role === 'chair' || tier === 3) {
        if (!isSecretaryEndorsed) {
          return next(
            new AppError(
              'The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected.',
              403,
              'SECRETARY_ENDORSEMENT_REQUIRED',
            ),
          );
        }

        const isChair = Boolean(
          (Array.isArray(project.panelists) &&
            project.panelists.some(
              (p) =>
                (p.userId?._id || p.userId)?.toString() === userIdStr &&
                (p.role === PANEL_ROLES.CHAIR || p.role === 'chair'),
            )) ||
          (req.user.role === ROLES.FACULTY && req.user.facultyRole === 'chair'),
        );

        if (!isChair) {
          return next(
            new AppError(
              'Only the designated Committee Chair can sign this section.',
              403,
              'DESIGNATED_CHAIR_REQUIRED',
            ),
          );
        }
        return next();
      }

      // 4. Panel Members (Tier 2)
      if (role === 'panelist' || role === 'Panel Member' || tier === 2) {
        if (!isSecretaryEndorsed) {
          return next(
            new AppError(
              'The Action Done Matrix must be reviewed and endorsed by the Committee Secretary before panel digital signatures can be collected.',
              403,
              'SECRETARY_ENDORSEMENT_REQUIRED',
            ),
          );
        }

        const isPanelist = Boolean(
          (Array.isArray(project.panelistIds) &&
            project.panelistIds.some((id) => (id?._id || id)?.toString() === userIdStr)) ||
          (Array.isArray(project.teamId?.panelistIds) &&
            project.teamId.panelistIds.some((id) => (id?._id || id)?.toString() === userIdStr)) ||
          (Array.isArray(project.panelists) &&
            project.panelists.some((p) => (p.userId?._id || p.userId)?.toString() === userIdStr)),
        );

        if (!isPanelist) {
          return next(
            new AppError(
              'Only designated Defense Panelists can sign this section.',
              403,
              'DESIGNATED_PANELIST_REQUIRED',
            ),
          );
        }
        return next();
      }

      return next(
        new AppError('Invalid signatory role or tier specified.', 400, 'INVALID_SIGNATORY_ROLE'),
      );
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Context-sensitive role authorization helper.
 * Dynamically resolves committee permissions for a user within a project or team.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string|mongoose.Types.ObjectId} targetId (teamId or projectId)
 * @returns {Promise<{ isInstructor: boolean, isAdviser: boolean, isSecretary: boolean, isPanelist: boolean, isChair: boolean, isMember: boolean }>}
 */
export const getProjectPermissions = async (userId, targetId) => {
  if (!userId || !targetId) {
    return {
      isInstructor: false,
      isAdviser: false,
      isSecretary: false,
      isPanelist: false,
      isChair: false,
      isMember: false,
    };
  }

  const userIdStr = userId.toString();

  // Target can be a Project ID or a Team ID
  let project = await Project.findById(targetId)
    .select('panelists panelistIds adviserId secretaryId teamId')
    .populate({
      path: 'teamId',
      select: 'adviserId secretaryId panelistIds members leaderId sectionId',
      populate: { path: 'sectionId', select: 'createdBy' },
    });

  let team = project?.teamId;
  if (!project) {
    team = await Team.findById(targetId).populate({
      path: 'sectionId',
      select: 'createdBy',
    });
    if (team) {
      project = await Project.findOne({ teamId: team._id }).select(
        'panelists panelistIds adviserId secretaryId',
      );
    }
  }

  const adviserIdStr = (project?.adviserId || team?.adviserId)?.toString();
  const secretaryIdStr = (project?.secretaryId || team?.secretaryId)?.toString();
  const instructorIdStr = team?.sectionId?.createdBy?.toString();

  const isInstructor = Boolean(instructorIdStr && instructorIdStr === userIdStr);
  const isAdviser = Boolean(adviserIdStr && adviserIdStr === userIdStr);
  const isSecretary = Boolean(
    (secretaryIdStr && secretaryIdStr === userIdStr) ||
    (project?.panelists &&
      project.panelists.some(
        (p) => p.userId?.toString() === userIdStr && p.role === PANEL_ROLES.SECRETARY,
      )),
  );

  const isChair = Boolean(
    project?.panelists &&
    project.panelists.some(
      (p) => p.userId?.toString() === userIdStr && p.role === PANEL_ROLES.CHAIR,
    ),
  );

  const isPanelist = Boolean(
    isChair ||
    isSecretary ||
    (project?.panelistIds && project.panelistIds.some((id) => id?.toString() === userIdStr)) ||
    (team?.panelistIds && team.panelistIds.some((id) => id?.toString() === userIdStr)) ||
    (project?.panelists && project.panelists.some((p) => p.userId?.toString() === userIdStr)),
  );

  const isMember = Boolean(team?.members && team.members.some((m) => m?.toString() === userIdStr));

  return {
    isInstructor,
    isAdviser,
    isSecretary,
    isPanelist,
    isChair,
    isMember,
  };
};

export default authorize;
