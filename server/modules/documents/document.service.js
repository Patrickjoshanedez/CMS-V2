import { DocTemplate, ProjectDocument } from './document.model.js';
import Project from '../projects/project.model.js';
import Team from '../teams/team.model.js';
import User from '../users/user.model.js';
import googleDocsService from '../../services/google-docs.service.js';
import AppError from '../../utils/AppError.js';
import { ROLES } from '@cms/shared';

/**
 * DocumentService — Business logic for Google Docs template management
 * and per-project document generation / retrieval.
 */
class DocumentService {
  /* ═══════════════════ Templates (Instructor) ═══════════════════ */

  /**
   * Register an existing Google Doc as a CMS template.
   * Verifies the doc is accessible by the service account before saving.
   */
  async createTemplate(userId, data) {
    if (!googleDocsService.isConfigured()) {
      throw new AppError(
        'Google Docs integration is not configured. Please contact the administrator.',
        503,
        'GOOGLE_DOCS_NOT_CONFIGURED',
      );
    }

    // Verify the doc actually exists and is a Google Doc
    await googleDocsService.verifyDocumentAccess(data.googleDocId);

    // Get the doc metadata (URL, etc.)
    const metadata = await googleDocsService.getDocumentMetadata(data.googleDocId);

    const template = await DocTemplate.create({
      title: data.title,
      description: data.description || '',
      googleDocId: data.googleDocId,
      googleDocUrl:
        metadata.webViewLink || `https://docs.google.com/document/d/${data.googleDocId}/edit`,
      documentType: data.documentType,
      createdBy: userId,
    });

    return { template };
  }

  /**
   * List all templates, optionally filtered by type and active status.
   */
  async listTemplates(query) {
    const filter = {};
    if (query.documentType) filter.documentType = query.documentType;
    if (query.isActive !== undefined) filter.isActive = query.isActive;

    const templates = await DocTemplate.find(filter)
      .sort({ documentType: 1, createdAt: -1 })
      .populate('createdBy', 'firstName middleName lastName email');

    return { templates };
  }

  /**
   * Get a single template by ID.
   */
  async getTemplate(templateId) {
    const template = await DocTemplate.findById(templateId).populate(
      'createdBy',
      'firstName middleName lastName email',
    );
    if (!template) {
      throw new AppError('Template not found.', 404, 'TEMPLATE_NOT_FOUND');
    }
    return { template };
  }

  /**
   * Update template metadata (title, description, isActive).
   */
  async updateTemplate(templateId, data) {
    const template = await DocTemplate.findById(templateId);
    if (!template) {
      throw new AppError('Template not found.', 404, 'TEMPLATE_NOT_FOUND');
    }

    if (data.title !== undefined) template.title = data.title;
    if (data.description !== undefined) template.description = data.description;
    if (data.isActive !== undefined) template.isActive = data.isActive;

    await template.save();
    return { template };
  }

  /**
   * Delete a template (hard delete). Only if no project documents reference it.
   */
  async deleteTemplate(templateId) {
    const template = await DocTemplate.findById(templateId);
    if (!template) {
      throw new AppError('Template not found.', 404, 'TEMPLATE_NOT_FOUND');
    }

    const refCount = await ProjectDocument.countDocuments({ templateId });
    if (refCount > 0) {
      throw new AppError(
        `Cannot delete this template — it is referenced by ${refCount} project document(s). Deactivate it instead.`,
        409,
        'TEMPLATE_IN_USE',
      );
    }

    await template.deleteOne();
    return { message: 'Template deleted.' };
  }

  /* ═══════════════════ Project Documents ═══════════════════ */

  /**
   * Generate a new Google Doc for a project.
   * If templateId is supplied, the doc is copied from the template; otherwise a blank doc is created.
   * Only team members, adviser, or the instructor can generate.
   */
  async generateDocument(userId, projectId, data) {
    if (!googleDocsService.isConfigured()) {
      throw new AppError(
        'Google Docs integration is not configured. Please contact the administrator.',
        503,
        'GOOGLE_DOCS_NOT_CONFIGURED',
      );
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    const project = await Project.findById(projectId).populate('teamId', 'name leaderId members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Adviser Gate: Restrict document generation based on project status and adviser assignment
    if (!project.adviserId) {
      throw new AppError(
        'Documents cannot be generated: No adviser is assigned to this project.',
        403,
        'NO_ADVISER_ASSIGNED',
      );
    }
    if (project.titleStatus !== 'approved') {
      throw new AppError(
        'Documents cannot be generated: The project title must be approved first.',
        403,
        'TITLE_NOT_APPROVED',
      );
    }

    // Authorization: must be a team member, adviser, or instructor
    this._assertCanManageDocs(user, project);

    // Check if a document already exists for this type on this project
    const existing = await ProjectDocument.findOne({ projectId, documentType: data.documentType });
    if (existing) {
      throw new AppError(
        `A ${data.documentType} document already exists for this project.`,
        409,
        'DOCUMENT_EXISTS',
      );
    }

    let doc;
    const docTitle = data.title || `${project.title} — ${data.documentType}`;

    if (data.templateId) {
      const template = await DocTemplate.findById(data.templateId);
      if (!template) {
        throw new AppError('Template not found.', 404, 'TEMPLATE_NOT_FOUND');
      }
      if (!template.isActive) {
        throw new AppError('This template is deactivated.', 400, 'TEMPLATE_INACTIVE');
      }
      doc = await googleDocsService.createFromTemplate(
        template.googleDocId,
        docTitle,
        project.driveFolderId,
      );
    } else {
      doc = await googleDocsService.createBlankDocument(docTitle, project.driveFolderId);
    }

    const projectDocument = await ProjectDocument.create({
      projectId,
      templateId: data.templateId || null,
      title: docTitle,
      googleDocId: doc.docId,
      googleDocUrl: doc.docUrl,
      documentType: data.documentType,
      createdBy: userId,
    });

    return { document: projectDocument };
  }

  /**
   * List all documents belonging to a project, optionally filtered by type.
   * Returns different embed URLs based on the requesting user's role.
   */
  async listProjectDocuments(userId, projectId, query) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    const project = await Project.findById(projectId).populate('teamId', 'name leaderId members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    // Authorization: must be a team member, adviser, panelist, or instructor
    this._assertCanViewDocs(user, project);

    const filter = { projectId };
    if (query.documentType) filter.documentType = query.documentType;

    const documents = await ProjectDocument.find(filter)
      .sort({ documentType: 1, createdAt: -1 })
      .populate('createdBy', 'firstName middleName lastName email')
      .populate('templateId', 'title');

    // Decorate each document with the appropriate embed URL
    const canEdit = this._canEditDocs(user, project);
    const decoratedDocs = documents.map((d) => {
      const obj = d.toObject();
      obj.embedUrl = canEdit
        ? `https://docs.google.com/document/d/${d.googleDocId}/edit`
        : `https://docs.google.com/document/d/${d.googleDocId}/preview`;
      return obj;
    });

    return { documents: decoratedDocs };
  }

  /**
   * Get a single project document with role-based embed URL.
   */
  async getProjectDocument(userId, projectId, docId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    const project = await Project.findById(projectId).populate('teamId', 'name leaderId members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanViewDocs(user, project);

    const document = await ProjectDocument.findOne({ _id: docId, projectId })
      .populate('createdBy', 'firstName middleName lastName email')
      .populate('templateId', 'title');
    if (!document) {
      throw new AppError('Document not found.', 404, 'DOCUMENT_NOT_FOUND');
    }

    const canEdit = this._canEditDocs(user, project);
    const obj = document.toObject();
    obj.embedUrl = canEdit
      ? `https://docs.google.com/document/d/${document.googleDocId}/edit`
      : `https://docs.google.com/document/d/${document.googleDocId}/preview`;

    return { document: obj };
  }

  /**
   * Delete a project document and trash the Google Doc.
   * Only team leader, adviser, or instructor can delete.
   */
  async deleteProjectDocument(userId, projectId, docId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    const project = await Project.findById(projectId).populate('teamId', 'name leaderId members');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    this._assertCanManageDocs(user, project);

    const document = await ProjectDocument.findOne({ _id: docId, projectId });
    if (!document) {
      throw new AppError('Document not found.', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Trash the Google Doc (non-critical; log but don't block deletion)
    try {
      await googleDocsService.trashDocument(document.googleDocId);
    } catch (err) {
      console.warn(
        `[DocumentService] Failed to trash Google Doc ${document.googleDocId}:`,
        err.message,
      );
    }

    await document.deleteOne();
    return { message: 'Document deleted.' };
  }

  /* ═══════════════════ Authorization helpers ═══════════════════ */

  /**
   * Assert the user can manage (create/delete) documents for the project.
   * Allowed: team members, adviser, instructor.
   */
  _assertCanManageDocs(user, project) {
    const userId = user._id.toString();

    // Instructor has global access
    if (user.role === ROLES.INSTRUCTOR) return;

    // Adviser assigned to this project
    if (
      user.role === ROLES.ADVISER &&
      project.adviserId &&
      project.adviserId.toString() === userId
    ) {
      return;
    }

    // Team member
    if (
      user.role === ROLES.STUDENT &&
      project.teamId &&
      project.teamId.members?.map((m) => m.toString()).includes(userId)
    ) {
      return;
    }

    throw new AppError(
      'You do not have permission to manage documents for this project.',
      403,
      'FORBIDDEN',
    );
  }

  /**
   * Assert the user can view documents for the project.
   * Allowed: team members, adviser, panelists, instructor.
   */
  _assertCanViewDocs(user, project) {
    const userId = user._id.toString();

    if (user.role === ROLES.INSTRUCTOR) return;

    if (
      user.role === ROLES.ADVISER &&
      project.adviserId &&
      project.adviserId.toString() === userId
    ) {
      return;
    }

    if (
      user.role === ROLES.PANELIST &&
      project.panelistIds?.map((p) => p.toString()).includes(userId)
    ) {
      return;
    }

    if (
      user.role === ROLES.STUDENT &&
      project.teamId &&
      project.teamId.members?.map((m) => m.toString()).includes(userId)
    ) {
      return;
    }

    throw new AppError(
      'You do not have permission to view documents for this project.',
      403,
      'FORBIDDEN',
    );
  }

  /**
   * Determine if the user can edit (vs. view-only) the Google Doc.
   * Editors: students (team members), adviser, instructor.
   * View-only: panelists.
   */
  _canEditDocs(user, project) {
    const userId = user._id.toString();

    if (user.role === ROLES.INSTRUCTOR) return true;

    if (
      user.role === ROLES.ADVISER &&
      project.adviserId &&
      project.adviserId.toString() === userId
    ) {
      return true;
    }

    if (
      user.role === ROLES.STUDENT &&
      project.teamId &&
      project.teamId.members?.map((m) => m.toString()).includes(userId)
    ) {
      return true;
    }

    // Panelist → view-only
    return false;
  }
}

export default new DocumentService();
