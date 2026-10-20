/**
 * TeamTemplateService — Modular domain service handling team manuscript template resolution,
 * title approval gating, and institutional template updates by Instructors.
 */
import mongoose from 'mongoose';
import Team from '../team.model.js';
import Project from '../../projects/project.model.js';
import DocumentTemplate from '../documentTemplate.model.js';
import AppError from '../../../utils/AppError.js';
import { TITLE_STATUSES } from '@cms/shared';

export class TeamTemplateService {
  /**
   * Retrieve dynamic manuscript template for a team with Title Approval access gating.
   * Locked until the team's project title pitch is approved.
   *
   * @param {string} teamId
   * @returns {Promise<Object>} { isUnlocked, approvedTitle, template }
   */
  async getTeamManuscriptTemplate(teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Retrieve global system settings helper
    const getSystemSettingsPromise = async () => {
      try {
        const SystemSettings =
          mongoose.models.SystemSettings ||
          (await import('../../settings/settings.model.js')).default;
        return await SystemSettings.findOne({ key: 'global' }).lean();
      } catch {
        return null;
      }
    };

    // Parallelize project lookup, global settings, and active academic year document template
    const [project, settings, academicYearTemplate] = await Promise.all([
      Project.findOne({ teamId: team._id }),
      getSystemSettingsPromise(),
      DocumentTemplate.findOne({
        targetType: 'MANUSCRIPT_CHAPTERS_1_5',
        academicYear: team.academicYear,
        isActive: true,
      }).sort({ updatedAt: -1 }),
    ]);

    const isTitleApproved = Boolean(
      project &&
      (project.titleStatus === TITLE_STATUSES.APPROVED || project.titleStatus === 'approved'),
    );

    // 1. Check SystemSettings for instructor-configured templates
    let settingsUrl = null;
    const settingsTpl =
      settings?.documentTemplates?.find((t) => t.documentType === 'manuscript_template') ||
      settings?.documentTemplates?.find((t) => t.documentType === 'proposal_template');
    if (settingsTpl?.templateUrl) {
      settingsUrl = settingsTpl.templateUrl;
    }

    // 2. Fall back to generic active template if academic-year-specific is not found
    let activeTemplate = academicYearTemplate;
    if (!activeTemplate) {
      activeTemplate = await DocumentTemplate.findOne({
        targetType: 'MANUSCRIPT_CHAPTERS_1_5',
        isActive: true,
      }).sort({ updatedAt: -1 });
    }

    const fallbackUrl =
      settingsUrl ||
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy';
    const fallbackVersion = `AY ${team.academicYear || '2025–2026'} v2.1`;
    const isGoogleDocs = activeTemplate ? activeTemplate.distributionType === 'GOOGLE_DOCS' : true;

    const url =
      settingsUrl ||
      (activeTemplate
        ? activeTemplate.resourcePayload?.googleDocsUrl ||
          activeTemplate.resourcePayload?.fileAttachmentUrl ||
          fallbackUrl
        : fallbackUrl);

    const version = activeTemplate?.versionLabel || fallbackVersion;
    const rawDate = activeTemplate?.updatedAt || settingsTpl?.lastUpdated;
    const updatedAt = rawDate
      ? new Date(rawDate).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
      : 'Sep 01, 2026';

    const templateMeta = {
      title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
      type: isGoogleDocs ? 'google_docs' : 'downloadable_file',
      url,
      version,
      updatedAt,
    };

    if (!isTitleApproved) {
      return {
        isUnlocked: false,
        reason: 'TITLE_DEFENSE_APPROVAL_REQUIRED',
        approvedTitle: project?.title || null,
        template: templateMeta,
      };
    }

    return {
      isUnlocked: true,
      approvedTitle: project?.title || 'Approved Capstone Title',
      template: templateMeta,
    };
  }

  /**
   * Update the active institutional manuscript template (Instructor only).
   * Cascades globally across all teams and approved students.
   *
   * @param {Object} data
   * @param {string} userId
   * @returns {Promise<Object>} Updated DocumentTemplate document
   */
  async updateManuscriptTemplate(data, userId) {
    const {
      targetType = 'MANUSCRIPT_CHAPTERS_1_5',
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

    const templateResourceUrl =
      normDistributionType === 'GOOGLE_DOCS' ? docUrl : fileAttachmentUrl || '';

    const resourcePayload = {
      googleDocsUrl: normDistributionType === 'GOOGLE_DOCS' ? docUrl : null,
      fileAttachmentUrl: normDistributionType === 'FILE_ATTACHMENT' ? fileAttachmentUrl : null,
      fileName: normDistributionType === 'FILE_ATTACHMENT' ? fileName : null,
    };

    // Deactivate previous templates for this academic year & targetType
    await DocumentTemplate.updateMany({ targetType, academicYear }, { $set: { isActive: false } });

    const newTemplate = await DocumentTemplate.create({
      targetType,
      academicYear,
      versionLabel,
      distributionType: normDistributionType,
      resourcePayload,
      updatedBy: userId,
      isActive: true,
    });

    // Also synchronize to SystemSettings.documentTemplates so settings page and team widgets are in lockstep
    try {
      const SystemSettings =
        mongoose.models.SystemSettings ||
        (await import('../../settings/settings.model.js')).default;
      const settings = await SystemSettings.findOne({ key: 'global' });
      if (settings) {
        const templates = settings.documentTemplates || [];
        const docType = targetType === 'ACTION_DONE_MATRIX' ? 'adm_form' : 'manuscript_template';
        const existingIdx = templates.findIndex((t) => t.documentType === docType);
        const newEntry = {
          documentType: docType,
          templateUrl: templateResourceUrl,
          description:
            targetType === 'ACTION_DONE_MATRIX'
              ? 'Action Done Matrix (ADM) Official Template'
              : 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
          lastUpdated: new Date(),
        };
        if (existingIdx >= 0) {
          templates[existingIdx] = newEntry;
        } else {
          templates.push(newEntry);
        }
        settings.documentTemplates = templates;
        await settings.save();
      }
    } catch (syncErr) {
      console.warn('[updateManuscriptTemplate] SystemSettings sync warning:', syncErr.message);
    }

    return newTemplate;
  }
}

export const teamTemplateService = new TeamTemplateService();
export default teamTemplateService;
