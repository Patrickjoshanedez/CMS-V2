import Manuscript from './document.model.js';
import Project from '../projects/project.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import AppError from '../../utils/AppError.js';
import { ROLES } from '@cms/shared';

class DocumentService {
  async uploadManuscript(userId, projectId, payload) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);

    this._assertCanUpload(user, project);

    const title = payload.title || `${project.title} - ${payload.documentType}`;
    const permissionSnapshot = await this._syncPermissionsInternal(project);

    const fallbackDriveFileId = `external:${projectId}:${payload.documentType}`;

    const manuscript = await Manuscript.findOneAndUpdate(
      { projectId, documentType: payload.documentType },
      {
        $set: {
          projectId,
          documentType: payload.documentType,
          title,
          originalFileName: '',
          mimeType: 'text/uri-list',
          externalDocUrl: payload.externalDocUrl,
          externalDocProvider: payload.externalDocProvider || 'google_docs',
          // Keep a deterministic placeholder so environments with legacy unique indexes on driveFileId don't fail on null.
          driveFileId: fallbackDriveFileId,
          driveWebViewLink: null,
          driveEditLink: null,
          uploadedBy: user._id,
          reviewStatus: 'pending_review',
          reviewSubmittedBy: null,
          reviewSubmittedAt: null,
          commentsLastSyncedAt: null,
          commentsSyncCursor: null,
          archivedComments: [],
          permissionSnapshot,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return { manuscript };
  }

  async listProjectManuscripts(userId, projectId, query = {}) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanView(user, project);

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [manuscripts, total] = await Promise.all([
      Manuscript.find({ projectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'firstName middleName lastName email')
        .lean(),
      Manuscript.countDocuments({ projectId }),
    ]);

    return {
      manuscripts: manuscripts.map((manuscript) => ({
        ...manuscript,
        openLink: this._resolveOpenLink(user, manuscript),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOpenLink(userId, projectId, documentType) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanView(user, project);

    const manuscript = await this._getManuscriptOrFail(projectId, documentType);
    const openLink = this._resolveOpenLink(user, manuscript);

    return {
      manuscript,
      openLink,
      mode: openLink.includes('/preview') ? 'preview' : 'edit',
    };
  }

  async syncPermissions(userId, projectId, documentType) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanManagePermissions(user, project);

    const manuscript = await this._getManuscriptOrFail(projectId, documentType);
    const permissionSnapshot = await this._syncPermissionsInternal(project);

    manuscript.permissionSnapshot = permissionSnapshot;
    await manuscript.save();

    return { manuscript };
  }

  async submitReview(userId, projectId, documentType) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanSubmitReview(user, project);

    const manuscript = await this._getManuscriptOrFail(projectId, documentType);

    manuscript.reviewStatus = 'review_submitted';
    manuscript.reviewSubmittedBy = user._id;
    manuscript.reviewSubmittedAt = new Date();
    manuscript.commentsLastSyncedAt = new Date();
    manuscript.commentsSyncCursor = null;
    await manuscript.save();

    return { manuscript };
  }

  async syncComments(userId, projectId, documentType) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanSubmitReview(user, project);

    const manuscript = await this._getManuscriptOrFail(projectId, documentType);
    manuscript.commentsLastSyncedAt = new Date();
    await manuscript.save();

    return { manuscript };
  }

  async getArchivedComments(userId, projectId, documentType) {
    const user = await this._getUserOrFail(userId);
    const project = await this._getProjectOrFail(projectId);
    this._assertCanView(user, project);

    const manuscript = await this._getManuscriptOrFail(projectId, documentType);

    return {
      manuscriptId: manuscript._id,
      comments: manuscript.archivedComments,
      commentsLastSyncedAt: manuscript.commentsLastSyncedAt,
    };
  }

  async _syncPermissionsInternal(project) {
    const users = await this._loadProjectUsers(project);

    const studentPermissions = users.students
      .filter((user) => !!user.email)
      .map((student) => ({
        userId: student._id,
        email: student.email.toLowerCase(),
        role: 'writer',
      }));

    const adviserPermissions = users.adviser?.email
      ? [{ userId: users.adviser._id, email: users.adviser.email.toLowerCase(), role: 'commenter' }]
      : [];

    const panelistPermissions = users.panelists
      .filter((panelist) => !!panelist.email)
      .map((panelist) => ({
        userId: panelist._id,
        email: panelist.email.toLowerCase(),
        role: 'reader',
      }));

    const grantedAt = new Date();

    return {
      students: studentPermissions.map((entry) => ({ ...entry, grantedAt })),
      adviser: adviserPermissions.map((entry) => ({ ...entry, grantedAt })),
      panelists: panelistPermissions.map((entry) => ({ ...entry, grantedAt })),
      lastSyncedAt: grantedAt,
    };
  }

  async _loadProjectUsers(project) {
    const team = await Team.findById(project.teamId).select('members');
    if (!team) {
      throw new AppError('Project team not found.', 404, 'TEAM_NOT_FOUND');
    }

    const [students, adviser, panelists] = await Promise.all([
      User.find({ _id: { $in: team.members } }).select('email firstName middleName lastName'),
      project.adviserId
        ? User.findById(project.adviserId).select('email firstName middleName lastName')
        : null,
      project.panelistIds?.length
        ? User.find({ _id: { $in: project.panelistIds } }).select(
            'email firstName middleName lastName',
          )
        : [],
    ]);

    return { students, adviser, panelists };
  }

  _resolveOpenLink(user, manuscript) {
    const link =
      manuscript.externalDocUrl || manuscript.driveEditLink || manuscript.driveWebViewLink;
    if (!link) {
      return null;
    }

    if (user.role === ROLES.PANELIST) {
      return this._toGooglePreviewUrl(link);
    }

    return link;
  }

  _toGooglePreviewUrl(url) {
    if (!url) return null;

    if (url.includes('docs.google.com/document/d/')) {
      return url.replace('/edit?embedded=true', '/preview').replace('/edit', '/preview');
    }

    return url;
  }

  _assertCanUpload(user, project) {
    if (user.role === ROLES.INSTRUCTOR) {
      return;
    }

    if (user.role !== ROLES.STUDENT) {
      throw new AppError('Only students can upload manuscripts.', 403, 'FORBIDDEN');
    }

    if (!user.teamId || String(user.teamId) !== String(project.teamId)) {
      throw new AppError('You can only upload manuscripts for your own project.', 403, 'FORBIDDEN');
    }
  }

  _assertCanView(user, project) {
    const teamIdMatches = user.teamId && String(user.teamId) === String(project.teamId);
    const isAssignedAdviser = project.adviserId && String(project.adviserId) === String(user._id);
    const isAssignedPanelist = (project.panelistIds || []).some(
      (panelistId) => String(panelistId) === String(user._id),
    );

    if (
      user.role === ROLES.INSTRUCTOR ||
      teamIdMatches ||
      isAssignedAdviser ||
      isAssignedPanelist
    ) {
      return;
    }

    throw new AppError('You are not allowed to access this manuscript.', 403, 'FORBIDDEN');
  }

  _assertCanManagePermissions(user, project) {
    if (user.role === ROLES.INSTRUCTOR) {
      return;
    }

    const isAssignedAdviser = project.adviserId && String(project.adviserId) === String(user._id);
    const isStudentOwner =
      user.role === ROLES.STUDENT && String(user.teamId || '') === String(project.teamId);

    if (isAssignedAdviser || isStudentOwner) {
      return;
    }

    throw new AppError('You are not allowed to manage manuscript permissions.', 403, 'FORBIDDEN');
  }

  _assertCanSubmitReview(user, project) {
    if (user.role === ROLES.INSTRUCTOR) {
      return;
    }

    const isAssignedAdviser = project.adviserId && String(project.adviserId) === String(user._id);
    if (isAssignedAdviser) {
      return;
    }

    throw new AppError(
      'Only the assigned adviser or an instructor can submit reviews.',
      403,
      'FORBIDDEN',
    );
  }

  async _getUserOrFail(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  async _getProjectOrFail(projectId) {
    const project = await Project.findById(projectId).select('title teamId adviserId panelistIds');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    return project;
  }

  async _getManuscriptOrFail(projectId, documentType) {
    const manuscript = await Manuscript.findOne({ projectId, documentType })
      .populate('uploadedBy', 'firstName middleName lastName email')
      .populate('reviewSubmittedBy', 'firstName middleName lastName email');

    if (!manuscript) {
      throw new AppError(
        'Manuscript not found for this project and document type.',
        404,
        'MANUSCRIPT_NOT_FOUND',
      );
    }

    return manuscript;
  }
}

const documentService = new DocumentService();

export default documentService;
