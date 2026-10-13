import mongoose from 'mongoose';
import Project from '../project.model.js';
import Team from '../../teams/team.model.js';
import User from '../../users/user.model.js';
import Section from '../../academics/section.model.js';
import Course from '../../academics/course.model.js';
import Submission from '../../submissions/submission.model.js';
import submissionService from '../../submissions/submission.service.js';
import AppError from '../../../utils/AppError.js';
import { extractPdfMetadata } from '../../../utils/pdfMetadataExtractor.js';
import { extractText } from '../../../utils/extractText.js';
import { rankFuzzyConflicts } from '../../../utils/similarityAudit.js';
import storageService from '../../../services/storage.index.js';
import settingsService from '../../settings/settings.service.js';
import pdfGeneratorService from '../../../services/pdfGenerator.service.js';
import {
  ROLES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PLAGIARISM_STATUSES,
  CAPSTONE_TITLE_MAPPING,
} from '@cms/shared';
import projectCoreService from './projectCore.service.js';
import projectTitleService from './projectTitle.service.js';

const DEFAULT_ORIGINALITY_THRESHOLD = 75;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_ABSTRACT_SIMILARITY_THRESHOLD = 0.7;
const MAX_ARCHIVE_SIMILARITY_CONFLICTS = 10;
const MIN_CORPUS_TEXT_LENGTH = 50;

function toBoundedThreshold(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

class ProjectArchiveService {
  async _getProjectOrFail(projectId) {
    return projectCoreService._getProjectOrFail(projectId);
  }

  async _notifyTeamMembers(teamId, notif, options) {
    return projectCoreService._notifyTeamMembers(teamId, notif, options);
  }

  _assertPlagiarismCleared(submission, label, threshold) {
    return projectTitleService._assertPlagiarismCleared(submission, label, threshold);
  }

  async _extractArchiveSubmissionText(file) {
    if (!file?.buffer) {
      return null;
    }

    const fileType = file.validatedMime || file.mimetype;
    if (!fileType) {
      return null;
    }

    try {
      const text = await extractText(file.buffer, fileType);
      if (typeof text !== 'string') {
        return null;
      }

      const normalized = text.trim();
      return normalized.length >= MIN_CORPUS_TEXT_LENGTH ? normalized : null;
    } catch {
      return null;
    }
  }

  /**
   * Archive a project after final defense — sets status to ARCHIVED.
   * Only an instructor can archive. Both final_academic and final_journal
   * submissions must exist and be approved.
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} data - { completionNotes? }
   * @returns {Object} { project }
   */
  async archiveProject(projectId, instructorOrData, maybeData) {
    const project = await this._getProjectOrFail(projectId);
    const data =
      maybeData !== undefined && typeof maybeData === 'object'
        ? maybeData
        : typeof instructorOrData === 'object' && instructorOrData !== null
          ? instructorOrData
          : {};

    if (project.projectStatus === PROJECT_STATUSES.ARCHIVED || project.isArchived) {
      throw new AppError('Project is already archived.', 400, 'ALREADY_ARCHIVED');
    }

    // Institutional Capstone Phase Prerequisite:
    // Only projects in the final capstone phase (Phase 4 in 4-phase progression, or Phase 3 / final stage in legacy mappings)
    // that have satisfied defense and ADM requirements are eligible for archival.
    const isFinalPhase =
      project.capstonePhase === 4 ||
      project.stage === 'final' ||
      (project.capstonePhase === 3 && (project.stage === 'capstone_3' || !project.stage));

    if (!isFinalPhase && (project.capstonePhase || 1) < 3) {
      throw new AppError(
        'Only projects in the final capstone phase that have completed defense requirements are eligible for archival.',
        400,
        'PHASE_PREREQUISITE_UNMET',
      );
    }

    // Final Defense Prerequisite:
    // If a defense schedule verdict is recorded, verify it is a passing decision.
    if (project.defenseSchedule?.verdict) {
      const verdict = String(project.defenseSchedule.verdict).toLowerCase();
      const isPassed = ['passed', 'passed_with_revision', 'approved'].includes(verdict);
      if (!isPassed) {
        throw new AppError(
          'Project defense must have a passing verdict prior to archival.',
          400,
          'DEFENSE_VERDICT_UNMET',
        );
      }
    }

    // Secretary ADM Endorsement Gate:
    // If Action Done Matrix (ADM) rows exist, secretary endorsement must be fulfilled.
    const hasADMRows =
      Array.isArray(project.actionDoneMatrix) && project.actionDoneMatrix.length > 0;
    const isSecretaryEndorsed = Boolean(
      project.admSignatures?.secretary?.endorsed ||
      project.admSignaturesByMilestone?.CAPSTONE_3?.secretary?.endorsed ||
      project.admSignaturesByMilestone?.FINAL?.secretary?.endorsed,
    );
    if (hasADMRows && !isSecretaryEndorsed && project.admStatus !== 'approved') {
      throw new AppError(
        'Action Done Matrix (ADM) must be endorsed by the committee secretary before archival.',
        400,
        'SECRETARY_ENDORSEMENT_REQUIRED',
      );
    }

    // Verify both final versions are submitted
    const [academic, journal] = await Promise.all([
      Submission.findOne({ projectId, type: 'final_academic' }).sort({ version: -1 }),
      Submission.findOne({ projectId, type: 'final_journal' }).sort({ version: -1 }),
    ]);

    if (!academic) {
      throw new AppError('Final academic version has not been submitted.', 400, 'MISSING_ACADEMIC');
    }
    if (!journal) {
      throw new AppError('Final journal version has not been submitted.', 400, 'MISSING_JOURNAL');
    }

    // --- Plagiarism clearance gate ---
    // Both final papers must have a completed plagiarism check with a passing score.
    // Fetch the configurable threshold from system settings
    let plagiarismThreshold;
    try {
      plagiarismThreshold = await settingsService.getPlagiarismThreshold();
    } catch {
      plagiarismThreshold = DEFAULT_ORIGINALITY_THRESHOLD;
    }

    this._assertPlagiarismCleared(academic, 'academic', plagiarismThreshold);
    this._assertPlagiarismCleared(journal, 'journal', plagiarismThreshold);

    project.projectStatus = PROJECT_STATUSES.ARCHIVED;
    project.isArchived = true;
    project.archivedAt = new Date();
    if (data.completionNotes) {
      project.completionNotes = data.completionNotes;
    }
    await project.save();

    // Notify team members
    await this._notifyTeamMembers(project.teamId, {
      type: 'project_archived',
      title: 'Project Archived',
      message: `Your project "${project.title}" has been archived. Congratulations!`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Search the archive for past capstone projects.
   * Students can only see journal versions; faculty can see both.
   * Supports text search by title/keywords, filtered by year, keyword, and topic.
   * @param {Object} query - { page, limit, search?, academicYear?, courseId?, keyword? }
   * @param {Object} user - The requesting user (for role-based visibility)
   * @returns {Object} { projects, pagination }
   */
  async searchArchive(query, user) {
    const {
      page = 1,
      limit = 10,
      search,
      scope = 'all',
      minYear,
      maxYear,
      academicYear,
      sortBy = 'relevance',
      doi,
      author,
      courseId,
      program,
      keyword,
    } = query;
    const skip = (page - 1) * limit;

    const escapeRegex = (val) => String(val || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = { isArchived: true };
    if (academicYear) filter.academicYear = academicYear;
    if (courseId) {
      filter.courseId = courseId;
    } else if (program && program !== 'all') {
      if (mongoose.Types.ObjectId.isValid(program)) {
        filter.courseId = program;
      } else {
        const escapedProgram = escapeRegex(program.trim());
        const matchedCourse = await Course.findOne({
          $or: [
            { code: new RegExp(`^${escapedProgram}$`, 'i') },
            { name: new RegExp(`^${escapedProgram}$`, 'i') },
          ],
        })
          .select('_id')
          .lean();

        if (matchedCourse) {
          filter.courseId = matchedCourse._id;
        } else {
          filter.courseId = new mongoose.Types.ObjectId();
        }
      }
    }
    if (keyword) filter.keywords = { $in: [keyword] };

    // Exact or partial DOI filter
    if (doi) {
      const cleanDoi = doi
        .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
        .replace(/^doi:\s*/i, '')
        .trim();
      filter['archiveMetadata.doi'] = new RegExp(escapeRegex(cleanDoi), 'i');
    }

    // Specific author filter
    if (author) {
      filter['archiveMetadata.authors'] = new RegExp(escapeRegex(author), 'i');
    }

    // Year range filters across publicationYear or academicYear
    if (minYear || maxYear) {
      const yearConditions = [];
      if (minYear && maxYear) {
        yearConditions.push({
          'archiveMetadata.publicationYear': { $gte: Number(minYear), $lte: Number(maxYear) },
        });
      } else if (minYear) {
        yearConditions.push({
          'archiveMetadata.publicationYear': { $gte: Number(minYear) },
        });
      } else if (maxYear) {
        yearConditions.push({
          'archiveMetadata.publicationYear': { $lte: Number(maxYear) },
        });
      }
      if (yearConditions.length > 0) {
        filter.$and = filter.$and ? [...filter.$and, ...yearConditions] : yearConditions;
      }
    }

    // Search query resolution based on scope
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const escapedSearch = escapeRegex(trimmedSearch);

      if (scope === 'title') {
        filter.title = new RegExp(escapedSearch, 'i');
      } else if (
        scope === 'doi' ||
        trimmedSearch.startsWith('10.') ||
        trimmedSearch.includes('doi.org')
      ) {
        const cleanSearchDoi = trimmedSearch
          .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
          .replace(/^doi:\s*/i, '')
          .trim();
        filter['archiveMetadata.doi'] = new RegExp(escapeRegex(cleanSearchDoi), 'i');
      } else if (scope === 'metadata') {
        filter.$or = [
          { 'archiveMetadata.authors': new RegExp(escapedSearch, 'i') },
          { keywords: new RegExp(escapedSearch, 'i') },
          { title: new RegExp(escapedSearch, 'i') },
        ];
      } else {
        // 'all' scope: sparse keyword + regex across text & metadata
        const searchRegex = new RegExp(escapedSearch, 'i');
        filter.$or = [
          { title: searchRegex },
          { abstract: searchRegex },
          { keywords: searchRegex },
          { 'archiveMetadata.authors': searchRegex },
          { 'archiveMetadata.doi': searchRegex },
        ];
      }
    }

    // Sorting resolution
    let sort = { archivedAt: -1 };
    if (sortBy === 'date') {
      sort = { 'archiveMetadata.publicationYear': -1, archivedAt: -1, createdAt: -1 };
    }

    const [rawProjects, total] = await Promise.all([
      Project.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('teamId', 'name members githubLink')
        .populate('adviserId', 'firstName middleName lastName')
        .select(
          'title abstract keywords academicYear capstonePhase archivedAt adviserId teamId completionNotes isArchived archiveMetadata originalityScore certificateStorageKey githubRepoUrl prototypes courseId',
        ),
      Project.countDocuments(filter),
    ]);

    const projectIds = rawProjects.map((p) => p._id);
    const archiveSubmissions = await Submission.find({
      projectId: { $in: projectIds },
      storageKey: { $exists: true, $ne: null },
    })
      .select('projectId type')
      .lean();

    const submissionByProject = new Map();
    for (const sub of archiveSubmissions) {
      const pid = String(sub.projectId);
      if (!submissionByProject.has(pid)) {
        submissionByProject.set(pid, { hasAcademic: false, hasJournal: false });
      }
      const entry = submissionByProject.get(pid);
      if (sub.type === 'final_journal') {
        entry.hasJournal = true;
      } else {
        entry.hasAcademic = true;
      }
    }

    // Format & enrich project records for Google Scholar academic layout
    const projects = rawProjects.map((p) => {
      const obj = p.toObject ? p.toObject() : { ...p };
      const subInfo = submissionByProject.get(String(obj._id)) || {
        hasAcademic: true,
        hasJournal: false,
      };

      // Determine scannable proponents line
      let proponents = 'BukSU Research Team';
      if (Array.isArray(obj.archiveMetadata?.authors) && obj.archiveMetadata.authors.length > 0) {
        proponents = obj.archiveMetadata.authors.join(', ');
      } else if (obj.teamId?.name) {
        proponents = obj.teamId.name;
      }

      // Determine publication year
      let publicationYear = obj.archiveMetadata?.publicationYear;
      if (!publicationYear && obj.academicYear) {
        const match = String(obj.academicYear).match(/\d{4}/);
        if (match) publicationYear = parseInt(match[0], 10);
      }
      if (!publicationYear && obj.archivedAt) {
        publicationYear = new Date(obj.archivedAt).getFullYear();
      }
      if (!publicationYear) {
        publicationYear = 2025;
      }

      // Publisher / Venue
      const publisher =
        obj.archiveMetadata?.publicationVenue || 'Bukidnon State University Studies Center';

      // Canonical DOI string
      let doiString = obj.archiveMetadata?.doi || null;
      if (doiString && !doiString.startsWith('http')) {
        doiString = `https://doi.org/${doiString}`;
      }

      // Calculate originality and similarity percentage (>= 75% passing threshold)
      let originality = obj.originalityScore;
      if (!Number.isFinite(originality)) {
        const audit = obj.archiveMetadata?.similarityAudit;
        const allConflicts = [
          ...(Array.isArray(audit?.titleConflicts) ? audit.titleConflicts : []),
          ...(Array.isArray(audit?.abstractConflicts) ? audit.abstractConflicts : []),
        ];
        if (allConflicts.length > 0) {
          const topSimilarity = Math.max(
            ...allConflicts.map(
              (c) =>
                Number(c?.similarityScore ?? c?.similarityPct ?? (c?.score ? c.score * 100 : 0)) ||
                0,
            ),
          );
          originality = Math.max(10, Math.min(100, Math.round(100 - topSimilarity)));
        } else {
          originality = 100;
        }
      }
      const similarity = Math.max(0, Math.min(100, Math.round((100 - originality) * 10) / 10));

      return {
        ...obj,
        proponents,
        publicationYear,
        publisher,
        doi: doiString,
        originalityScore: originality,
        similarityScore: similarity,
        hasAcademicPaper: subInfo.hasAcademic,
        hasJournalPaper: subInfo.hasJournal,
        githubRepoUrl: obj.githubRepoUrl || obj.teamId?.githubLink || null,
        prototypes: Array.isArray(obj.prototypes) ? obj.prototypes : [],
      };
    });

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      canViewAcademic: user?.role !== ROLES.STUDENT,
    };
  }

  /**
   * Upload a completion certificate for a project (instructor-only).
   * @param {string} projectId
   * @param {string} instructorId
   * @param {Object} file - Multer file object
   * @returns {Object} { project }
   */
  async uploadCertificate(projectId, instructorId, file) {
    const project = await this._getProjectOrFail(projectId);

    if (!project.isArchived && project.projectStatus !== PROJECT_STATUSES.ARCHIVED) {
      throw new AppError(
        'Project must be archived before uploading a certificate.',
        400,
        'NOT_ARCHIVED',
      );
    }

    const storageKey = storageService.buildCertificateKey(projectId, file.originalname);
    try {
      await storageService.uploadFile(file.buffer, storageKey, file.mimetype);
    } catch (error) {
      if (error.isOperational) {
        console.error('[ProjectService] Certificate upload failed:', error.code, error.message);
        throw error;
      }
      console.error('[ProjectService] Unexpected certificate upload error:', error);
      throw new AppError(
        'Failed to upload certificate. Please try again later.',
        500,
        'CERTIFICATE_UPLOAD_ERROR',
      );
    }

    project.certificateStorageKey = storageKey;
    await project.save();

    // Notify team
    await this._notifyTeamMembers(project.teamId, {
      type: 'certificate_uploaded',
      title: 'Certificate Uploaded',
      message: `A completion certificate has been uploaded for your project "${project.title}".`,
      metadata: { projectId: project._id },
    });

    return { project };
  }

  /**
   * Get the signed download URL for the completion certificate.
   * @param {string} projectId
   * @returns {Object} { url }
   */
  async getCertificateUrl(projectId) {
    const project = await this._getProjectOrFail(projectId);

    if (!project.certificateStorageKey) {
      throw new AppError(
        'No certificate has been uploaded for this project.',
        404,
        'NO_CERTIFICATE',
      );
    }

    try {
      const url = await storageService.getSignedUrl(project.certificateStorageKey, 3600);
      return { url };
    } catch (error) {
      if (error.isOperational) {
        console.error(
          '[ProjectService] Certificate URL generation failed:',
          error.code,
          error.message,
        );
        throw error;
      }
      console.error('[ProjectService] Unexpected certificate URL error:', error);
      throw new AppError(
        'Failed to retrieve certificate. Please try again later.',
        500,
        'CERTIFICATE_URL_ERROR',
      );
    }
  }

  /**
   * Generate a report of archived projects by academic year.
   * Instructor only. Returns counts and metadata.
   * @param {Object} query - report filters, sort, and pagination options
   * @returns {Object} { report }
   */
  async generateReport(query) {
    const {
      academicYear: academicYearFilter,
      year,
      sectionId,
      section,
      status,
      adviserId,
      title,
      author,
      courseId,
      keyword,
      sortBy = 'archivedAt',
      sortOrder = 'desc',
      page: pageRaw = 1,
      limit: limitRaw = 10,
    } = query ?? {};

    const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
    const limit = Math.max(1, Math.min(100, Number.parseInt(limitRaw, 10) || 10));
    const skip = (page - 1) * limit;

    const effectiveAcademicYear = academicYearFilter || year;
    const matchStage = {};
    if (status === 'archived') {
      matchStage.isArchived = true;
    } else if (status === 'active') {
      matchStage.isArchived = { $ne: true };
    } else if (!status) {
      matchStage.isArchived = true;
    }
    const postLookupMatchStage = {};

    if (effectiveAcademicYear) matchStage.academicYear = effectiveAcademicYear;
    if (adviserId && mongoose.Types.ObjectId.isValid(adviserId)) {
      matchStage.adviserId = new mongoose.Types.ObjectId(adviserId);
    }
    if (title) {
      matchStage.title = { $regex: title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (keyword) {
      matchStage.keywords = {
        $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }

    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      postLookupMatchStage.courseResolvedId = new mongoose.Types.ObjectId(courseId);
    }

    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      postLookupMatchStage['teamDoc.sectionId'] = new mongoose.Types.ObjectId(sectionId);
    } else if (section && section !== 'All Sections' && section !== 'All') {
      const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      postLookupMatchStage.$or = [
        { 'sectionDoc.name': { $regex: escapedSection, $options: 'i' } },
        { 'sectionDoc.code': { $regex: escapedSection, $options: 'i' } },
      ];
    }

    if (author) {
      const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      postLookupMatchStage.$expr = {
        $gt: [
          {
            $size: {
              $filter: {
                input: '$authorsNames',
                as: 'authorName',
                cond: {
                  $regexMatch: {
                    input: '$$authorName',
                    regex: escapedAuthor,
                    options: 'i',
                  },
                },
              },
            },
          },
          0,
        ],
      };
    }

    const plagiarismFlagThreshold = Number.isFinite(
      Number(process.env.PLAGIARISM_WARNING_THRESHOLD),
    )
      ? Number(process.env.PLAGIARISM_WARNING_THRESHOLD)
      : 30;

    const sortFieldMap = {
      title: 'title',
      academicYear: 'academicYear',
      archivedAt: 'archivedAt',
      status: 'status',
    };

    const sortField = sortFieldMap[sortBy] || 'archivedAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortSpec = {
      [sortField]: sortDirection,
      archivedAt: -1,
      title: 1,
      _id: 1,
    };

    const [result] = await Project.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: Team.collection.name,
          localField: 'teamId',
          foreignField: '_id',
          as: 'teamDoc',
        },
      },
      {
        $lookup: {
          from: Section.collection.name,
          localField: 'teamDoc.sectionId',
          foreignField: '_id',
          as: 'sectionDoc',
        },
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'adviserId',
          foreignField: '_id',
          as: 'adviserDoc',
        },
      },
      {
        $lookup: {
          from: User.collection.name,
          localField: 'teamDoc.members',
          foreignField: '_id',
          as: 'teamMemberDocs',
        },
      },
      {
        $lookup: {
          from: Submission.collection.name,
          let: { projectId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$projectId', '$$projectId'] },
              },
            },
            {
              $project: {
                _id: 0,
                plagiarismResult: 1,
              },
            },
          ],
          as: 'submissionDocs',
        },
      },
      {
        $lookup: {
          from: 'courses',
          let: {
            directCourseId: '$courseId',
            teamCourseId: { $first: '$teamDoc.courseId' },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    '$_id',
                    {
                      $setDifference: [['$$directCourseId', '$$teamCourseId'], [null]],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                code: 1,
              },
            },
          ],
          as: 'courseDoc',
        },
      },
      {
        $addFields: {
          adviserDoc: { $first: '$adviserDoc' },
          courseDoc: { $first: '$courseDoc' },
          sectionDoc: { $first: '$sectionDoc' },
          archiveAuthors: {
            $filter: {
              input: { $ifNull: ['$archiveMetadata.authors', []] },
              as: 'archiveAuthor',
              cond: {
                $gt: [{ $strLenCP: { $trim: { input: '$$archiveAuthor' } } }, 0],
              },
            },
          },
          teamMemberNames: {
            $map: {
              input: '$teamMemberDocs',
              as: 'member',
              in: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ['$$member.firstName', ''] },
                      ' ',
                      { $ifNull: ['$$member.middleName', ''] },
                      ' ',
                      { $ifNull: ['$$member.lastName', ''] },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          authorsNames: {
            $cond: [
              { $gt: [{ $size: '$archiveAuthors' }, 0] },
              '$archiveAuthors',
              {
                $filter: {
                  input: '$teamMemberNames',
                  as: 'memberName',
                  cond: { $gt: [{ $strLenCP: '$$memberName' }, 0] },
                },
              },
            ],
          },
          adviserName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$adviserDoc.firstName', ''] },
                  ' ',
                  { $ifNull: ['$adviserDoc.middleName', ''] },
                  ' ',
                  { $ifNull: ['$adviserDoc.lastName', ''] },
                ],
              },
            },
          },
          courseResolvedId: '$courseDoc._id',
          courseResolvedName: '$courseDoc.name',
          courseResolvedCode: '$courseDoc.code',
          courseResolvedLabel: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$courseDoc.name', ''] },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ifNull: ['$courseDoc.name', false] },
                          { $ifNull: ['$courseDoc.code', false] },
                        ],
                      },
                      ' (',
                      '',
                    ],
                  },
                  { $ifNull: ['$courseDoc.code', ''] },
                  {
                    $cond: [
                      {
                        $and: [
                          { $ifNull: ['$courseDoc.name', false] },
                          { $ifNull: ['$courseDoc.code', false] },
                        ],
                      },
                      ')',
                      '',
                    ],
                  },
                ],
              },
            },
          },
          categoryLabel: {
            $let: {
              vars: {
                firstMetadata: {
                  $first: { $ifNull: ['$titleProposalMetadata', []] },
                },
              },
              in: {
                $ifNull: [
                  {
                    $cond: [
                      { $isArray: '$$firstMetadata.capstoneType' },
                      { $first: '$$firstMetadata.capstoneType' },
                      '$$firstMetadata.capstoneType',
                    ],
                  },
                  'Uncategorized',
                ],
              },
            },
          },
          isPlagiarismFlagged: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$submissionDocs',
                    as: 'submission',
                    cond: {
                      $and: [
                        {
                          $eq: [
                            '$$submission.plagiarismResult.status',
                            PLAGIARISM_STATUSES.COMPLETED,
                          ],
                        },
                        {
                          $gte: [
                            {
                              $ifNull: ['$$submission.plagiarismResult.similarityPercentage', 0],
                            },
                            plagiarismFlagThreshold,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
          status: {
            $cond: ['$isArchived', 'Archived', { $ifNull: ['$projectStatus', 'Active'] }],
          },
          keywords: {
            $ifNull: ['$keywords', []],
          },
        },
      },
      ...(Object.keys(postLookupMatchStage).length > 0 ? [{ $match: postLookupMatchStage }] : []),
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCapstonesArchived: { $sum: 1 },
                flaggedByPlagiarism: {
                  $sum: { $cond: ['$isPlagiarismFlagged', 1, 0] },
                },
                authorBuckets: {
                  $addToSet: '$authorsNames',
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalCapstonesArchived: 1,
                flaggedByPlagiarism: 1,
                totalAuthorsStudents: {
                  $size: {
                    $reduce: {
                      input: '$authorBuckets',
                      initialValue: [],
                      in: { $setUnion: ['$$value', '$$this'] },
                    },
                  },
                },
              },
            },
          ],
          byYear: [
            {
              $group: {
                _id: { $ifNull: ['$academicYear', 'Unspecified'] },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1, _id: -1 },
            },
          ],
          trend: [
            {
              $group: {
                _id: { $ifNull: ['$academicYear', 'Unspecified'] },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
            {
              $project: {
                _id: 0,
                year: '$_id',
                count: 1,
              },
            },
          ],
          categoryBreakdown: [
            {
              $group: {
                _id: { $ifNull: ['$categoryLabel', 'Uncategorized'] },
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1, _id: 1 },
            },
            {
              $project: {
                _id: 0,
                category: '$_id',
                count: 1,
              },
            },
          ],
          filterAcademicYears: [
            {
              $group: {
                _id: '$academicYear',
              },
            },
            {
              $match: { _id: { $ne: null } },
            },
            {
              $sort: { _id: -1 },
            },
          ],
          filterAuthors: [
            {
              $unwind: {
                path: '$authorsNames',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: '$authorsNames',
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],
          filterAdvisers: [
            {
              $match: {
                adviserDoc: { $ne: null },
              },
            },
            {
              $group: {
                _id: '$adviserDoc._id',
                fullName: { $first: '$adviserName' },
              },
            },
            {
              $match: {
                fullName: { $ne: '' },
              },
            },
            {
              $sort: { fullName: 1 },
            },
          ],
          filterPrograms: [
            {
              $match: {
                courseResolvedId: { $ne: null },
              },
            },
            {
              $group: {
                _id: '$courseResolvedId',
                name: { $first: '$courseResolvedName' },
                code: { $first: '$courseResolvedCode' },
                label: { $first: '$courseResolvedLabel' },
              },
            },
            {
              $sort: { label: 1 },
            },
          ],
          filterKeywords: [
            {
              $unwind: {
                path: '$keywords',
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $group: {
                _id: '$keywords',
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],
          table: [
            { $sort: sortSpec },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                title: 1,
                academicYear: 1,
                archivedAt: 1,
                keywords: 1,
                status: 1,
                category: '$categoryLabel',
                isPlagiarismFlagged: 1,
                authors: {
                  $map: {
                    input: '$authorsNames',
                    as: 'authorName',
                    in: {
                      _id: null,
                      fullName: '$$authorName',
                    },
                  },
                },
                adviser: {
                  $cond: [
                    {
                      $and: [{ $ne: ['$adviserDoc', null] }, { $ne: ['$adviserName', ''] }],
                    },
                    {
                      _id: '$adviserDoc._id',
                      fullName: '$adviserName',
                    },
                    null,
                  ],
                },
                course: {
                  $cond: [
                    { $ne: ['$courseResolvedId', null] },
                    {
                      _id: '$courseResolvedId',
                      name: { $ifNull: ['$courseResolvedName', ''] },
                      code: { $ifNull: ['$courseResolvedCode', ''] },
                      label: { $ifNull: ['$courseResolvedLabel', ''] },
                    },
                    null,
                  ],
                },
              },
            },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]).allowDiskUse(true);

    const summary = result?.summary?.[0] || {
      totalCapstonesArchived: 0,
      totalAuthorsStudents: 0,
      flaggedByPlagiarism: 0,
    };

    const byYear = (result?.byYear || []).map((item) => ({
      _id: item._id,
      academicYear: item._id,
      count: item.count,
      projects: [],
    }));

    const mostActiveYear = byYear.length > 0 ? byYear[0].academicYear : null;
    const totalCount = result?.totalCount?.[0]?.count || 0;

    // Gather cohort telemetry across Sections, Teams, Students, and Projects
    const cohortAcademicYear = effectiveAcademicYear || mostActiveYear;
    const cohortYearFilter = cohortAcademicYear ? { academicYear: cohortAcademicYear } : {};

    const [allSections, allTeams, allStudents, allCohortProjects] = await Promise.all([
      Section.find(cohortYearFilter).lean(),
      Team.find(cohortYearFilter).lean(),
      User.find({
        role: 'student',
        ...(cohortAcademicYear ? { academicYear: cohortAcademicYear } : {}),
      }).lean(),
      Project.find(cohortYearFilter)
        .select('currentMilestone projectStatus isArchived teamId title')
        .lean(),
    ]);

    const canonicalSectionNames =
      allSections.length > 0
        ? allSections.map((s) => s.name || s.code)
        : ['BSIT 4A', 'BSIT 4B', 'BSIT 4C', 'BSIT 4D'];

    // Map teams to member count
    const teamMemberCountMap = new Map();
    for (const team of allTeams) {
      teamMemberCountMap.set(String(team._id), (team.members || []).length);
    }

    // Milestone distribution
    let c1Students = 0,
      c1Teams = 0;
    let c2Students = 0,
      c2Teams = 0;
    let c3Students = 0,
      c3Teams = 0;

    for (const proj of allCohortProjects) {
      const teamSize = teamMemberCountMap.get(String(proj.teamId)) || 4;
      const ms = String(proj.currentMilestone || '').toLowerCase();
      const st = String(proj.projectStatus || '').toLowerCase();
      if (
        ms.includes('1') ||
        st === 'draft' ||
        st === 'proposed' ||
        st === 'under_review' ||
        st === 'approved'
      ) {
        c1Students += teamSize;
        c1Teams += 1;
      } else if (ms.includes('2') || st === 'in_progress') {
        c2Students += teamSize;
        c2Teams += 1;
      } else {
        c3Students += teamSize;
        c3Teams += 1;
      }
    }

    // Section allocation breakdown
    const sectionAllocation = canonicalSectionNames.map((secName) => {
      const secObj = allSections.find((s) => s.name === secName || s.code === secName);
      const secIdStr = secObj ? String(secObj._id) : null;

      const secStudents = secIdStr
        ? allStudents.filter((st) => String(st.sectionId) === secIdStr)
        : allStudents.filter((st) => st.sectionName === secName);

      const assigned = secStudents.filter((st) => Boolean(st.teamId)).length;
      const unassigned = Math.max(0, secStudents.length - assigned);
      const secTeams = secIdStr
        ? allTeams.filter((t) => String(t.sectionId) === secIdStr).length
        : 0;
      const ratio = secTeams > 0 ? (assigned / secTeams).toFixed(1) : '0.0';

      return {
        section: secName,
        enrolled: secStudents.length,
        assigned,
        unassigned,
        teams: secTeams,
        ratio,
      };
    });

    const rosterSum = sectionAllocation.reduce((acc, s) => acc + s.enrolled, 0);
    const auditWarnings = [];

    if (allStudents.length > 0 && rosterSum !== allStudents.length) {
      auditWarnings.push({
        code: 'ROSTER_SUM_MISMATCH',
        message: `Section rosters sum (${rosterSum}) does not equal total enrolled proponents count (${allStudents.length}). ${Math.abs(allStudents.length - rosterSum)} proponent(s) have unassigned or un-synced section records.`,
      });
    }

    if (
      allStudents.length > 0 &&
      canonicalSectionNames.length >= 4 &&
      allStudents.length / canonicalSectionNames.length < 2.0
    ) {
      auditWarnings.push({
        code: 'LOW_COHORT_DENSITY',
        message: `The system records ${allStudents.length} enrolled proponents across ${canonicalSectionNames.length} academic sections (${canonicalSectionNames[0]} - ${canonicalSectionNames[canonicalSectionNames.length - 1]}), averaging ${(allStudents.length / canonicalSectionNames.length).toFixed(1)} student per section. This indicates active scoping filters, un-synced enrollment tables, or seed-data truncation.`,
      });
    }

    const yieldCompleted = allCohortProjects.filter(
      (p) => p.isArchived || p.projectStatus === 'completed' || p.currentMilestone === 'Capstone 4',
    ).length;
    const yieldTotal = Math.max(allCohortProjects.length, 1);
    const yieldRate = Math.round((yieldCompleted / yieldTotal) * 100);

    if (yieldTotal <= 3 && allCohortProjects.length > 0) {
      auditWarnings.push({
        code: 'SMALL_SAMPLE_SIZE',
        message: `ADM Yield Rate is computed from a sample size of only ${yieldTotal} team(s) (${yieldCompleted}/${yieldTotal} Teams Completed). Interpret compliance profiles with contextual caution.`,
      });
    }

    return {
      report: {
        totalProjects: totalCount,
        matchingCount: totalCount,
        summary: {
          totalCapstonesArchived: summary.totalCapstonesArchived,
          totalCapstonesActive: allCohortProjects.filter((p) => !p.isArchived).length,
          totalTeams: allTeams.length || summary.totalCapstonesArchived || 0,
          totalAuthorsStudents: summary.totalAuthorsStudents,
          totalEnrolledStudents: allStudents.length || summary.totalAuthorsStudents || 0,
          totalSections: canonicalSectionNames.length,
          sectionsCount: canonicalSectionNames.length,
          flaggedByPlagiarism: summary.flaggedByPlagiarism,
          mostActiveYear,
          yieldRate,
          yieldCompleted,
          yieldTotal,
          sampleDenominator: `${yieldCompleted}/${yieldTotal} Teams Completed`,
          isArchivedCohort: status === 'archived',
        },
        milestoneDistribution: [
          {
            milestone: 'Capstone 1 (Proposal)',
            label: 'Capstone 1 (Proposal)',
            students: c1Students,
            teams: c1Teams,
            phase: 'Phase 1',
          },
          {
            milestone: 'Capstone 2 (Development)',
            label: 'Capstone 2 (Development)',
            students: c2Students,
            teams: c2Teams,
            phase: 'Phase 2',
          },
          {
            milestone: 'Capstone 3 (Final Defense)',
            label: 'Capstone 3 (Final Defense)',
            students: c3Students,
            teams: c3Teams,
            phase: 'Phase 3',
          },
        ],
        sectionAllocation,
        auditWarnings,
        trend: result?.trend || [],
        categoryBreakdown: result?.categoryBreakdown || [],
        byYear,
        records: result?.table || [],
        table: {
          rows: result?.table || [],
          page,
          limit,
          total: totalCount,
          totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        },
        filterOptions: {
          academicYears: (result?.filterAcademicYears || []).map((item) => item._id),
          sections: canonicalSectionNames.map((name) => ({
            name,
            label: name,
          })),
          authors: (result?.filterAuthors || []).map((item) => item._id),
          advisers: (result?.filterAdvisers || []).map((item) => ({
            _id: String(item._id),
            fullName: item.fullName,
          })),
          programs: (result?.filterPrograms || []).map((item) => ({
            _id: String(item._id),
            name: item.name || '',
            code: item.code || '',
            label: item.label || item.name || item.code || '',
          })),
          keywords: (result?.filterKeywords || []).map((item) => item._id),
        },
      },
    };
  }

  async _computeArchiveSimilarityAudit(title, abstract) {
    let titleThreshold = DEFAULT_SIMILARITY_THRESHOLD;
    try {
      const settings = await settingsService.getSettings();
      titleThreshold = toBoundedThreshold(
        settings?.titleSimilarityThreshold,
        DEFAULT_SIMILARITY_THRESHOLD,
      );
    } catch {
      // Keep default threshold when settings lookup fails.
    }

    const abstractThreshold = toBoundedThreshold(
      process.env.ARCHIVE_ABSTRACT_SIMILARITY_THRESHOLD,
      DEFAULT_ABSTRACT_SIMILARITY_THRESHOLD,
    );

    const archivedProjects = await Project.find({ isArchived: true })
      .select('_id title abstract academicYear archiveMetadata.publicationYear')
      .lean();

    const titleConflicts = rankFuzzyConflicts({
      candidateText: title,
      rows: archivedProjects,
      threshold: titleThreshold,
      maxResults: MAX_ARCHIVE_SIMILARITY_CONFLICTS,
      getText: (project) => project?.title || '',
      mapRow: (project) => ({
        projectId: project._id,
        title: project.title,
        academicYear: project.academicYear || '',
        publicationYear: project.archiveMetadata?.publicationYear ?? null,
      }),
    });

    const abstractConflicts = abstract
      ? rankFuzzyConflicts({
          candidateText: abstract,
          rows: archivedProjects,
          threshold: abstractThreshold,
          maxResults: MAX_ARCHIVE_SIMILARITY_CONFLICTS,
          getText: (project) => project?.abstract || '',
          mapRow: (project) => ({
            projectId: project._id,
            title: project.title,
            academicYear: project.academicYear || '',
            publicationYear: project.archiveMetadata?.publicationYear ?? null,
          }),
        })
      : [];

    return {
      checkedAt: new Date(),
      titleThreshold,
      abstractThreshold,
      titleConflicts,
      abstractConflicts,
    };
  }

  /* ═══════════════════ Bulk Upload (Instructor) ═══════════════════ */

  /**
   * Bulk-upload an archived capstone bundle in one request.
   * Creates one archived project record linked to:
   * - required final_academic (academic paper)
   * - optional final_journal (journal paper)
   *
   * @param {string} instructorId - The instructor performing the bulk upload
   * @param {Object} data - { title, abstract?, keywords?, academicYear }
   * @param {Object} files - { academicPaperFile, academicJournalFile? }
   * @returns {Object} { project, submissions }
   */
  async bulkUploadArchive(instructorId, data, files) {
    const academicPaperFile = files?.academicPaperFile;
    const academicJournalFile = files?.academicJournalFile;

    if (!academicPaperFile && !academicJournalFile) {
      throw new AppError(
        'At least one document (Academic Paper or Academic Journal) is required.',
        400,
        'ARCHIVE_DOCUMENT_REQUIRED',
      );
    }

    const [defaultProfessionalTitle] = Object.keys(CAPSTONE_TITLE_MAPPING);
    const defaultRoleMapping = CAPSTONE_TITLE_MAPPING[defaultProfessionalTitle];

    if (!defaultProfessionalTitle || !defaultRoleMapping) {
      throw new AppError(
        'Unable to initialize bulk archive role mappings.',
        500,
        'BULK_ARCHIVE_MAPPING_MISSING',
      );
    }

    let normalizedTitle = (data.title || '').trim();
    let normalizedAbstract = (data.abstract || '').trim();
    const normalizedKeywords = Array.isArray(data.keywords)
      ? data.keywords.map((item) => item?.trim()).filter(Boolean)
      : [];
    let resolvedKeywords = normalizedKeywords;
    let resolvedAuthors = Array.isArray(data.authors)
      ? data.authors.map((item) => item?.trim()).filter(Boolean)
      : [];
    let resolvedPublicationYear = Number.isInteger(data.publicationYear)
      ? data.publicationYear
      : null;
    let resolvedDoi = (data.doi || '').trim();
    let resolvedPublicationVenue = (data.publicationVenue || '').trim();
    let metadataExtractedAt = null;
    let metadataReview = {
      required: false,
      reasons: [],
      fieldSources: {},
    };
    let similarityAudit = {
      checkedAt: null,
      titleThreshold: DEFAULT_SIMILARITY_THRESHOLD,
      abstractThreshold: DEFAULT_ABSTRACT_SIMILARITY_THRESHOLD,
      titleConflicts: [],
      abstractConflicts: [],
    };

    let archiveTeam;
    let project;
    const uploadedKeys = [];

    try {
      const instructorObjectId = new mongoose.Types.ObjectId(instructorId);

      const metadataTarget = data?.metadataTarget || 'academic_journal';
      const primaryExtractionBuffer =
        metadataTarget === 'academic_journal'
          ? academicJournalFile?.buffer || academicPaperFile?.buffer
          : academicPaperFile?.buffer || academicJournalFile?.buffer;
      if (
        (!normalizedTitle ||
          !normalizedAbstract ||
          resolvedAuthors.length === 0 ||
          !resolvedPublicationYear ||
          resolvedKeywords.length === 0) &&
        primaryExtractionBuffer
      ) {
        try {
          const extracted = await extractPdfMetadata(primaryExtractionBuffer);
          if (!normalizedTitle && extracted?.title?.trim()) {
            normalizedTitle = extracted.title.trim();
          }
          if (!normalizedAbstract && extracted?.abstract?.trim()) {
            normalizedAbstract = extracted.abstract.trim();
          }
          if (resolvedAuthors.length === 0 && Array.isArray(extracted?.authors)) {
            resolvedAuthors = extracted.authors
              .map((item) => item?.trim())
              .filter(Boolean)
              .slice(0, 20);
          }
          if (!resolvedPublicationYear && Number.isInteger(extracted?.publicationYear)) {
            resolvedPublicationYear = extracted.publicationYear;
          }
          if (resolvedKeywords.length === 0 && Array.isArray(extracted?.keywords)) {
            resolvedKeywords = extracted.keywords
              .map((item) => item?.trim())
              .filter(Boolean)
              .slice(0, 10);
          }
          if (!resolvedDoi && extracted?.doi) {
            resolvedDoi = String(extracted.doi).trim();
          }
          if (!resolvedPublicationVenue && extracted?.publicationVenue) {
            resolvedPublicationVenue = String(extracted.publicationVenue).trim();
          }
          if (extracted?.review && typeof extracted.review === 'object') {
            metadataReview = {
              required: Boolean(extracted.review.required),
              reasons: Array.isArray(extracted.review.reasons) ? extracted.review.reasons : [],
              fieldSources:
                extracted.fieldSources && typeof extracted.fieldSources === 'object'
                  ? extracted.fieldSources
                  : {},
            };
          }
          metadataExtractedAt = new Date();
        } catch (error) {
          console.warn(
            '[ProjectService] PDF metadata extraction failed during archive upload:',
            error?.message,
          );
        }
      }

      if (!normalizedTitle) {
        throw new AppError(
          'A project title is required. Please provide one or upload a PDF with detectable metadata.',
          400,
          'TITLE_REQUIRED',
        );
      }

      similarityAudit = await this._computeArchiveSimilarityAudit(
        normalizedTitle,
        normalizedAbstract,
      );

      const currentYear = new Date().getFullYear();
      const resolvedAcademicYear =
        (data.academicYear || '').trim() ||
        (resolvedPublicationYear
          ? `${resolvedPublicationYear}-${resolvedPublicationYear + 1}`
          : `${currentYear}-${currentYear + 1}`);

      const resolvedCourseId = data?.courseId
        ? new mongoose.Types.ObjectId(data.courseId)
        : new mongoose.Types.ObjectId();

      const mergedKeywords = Array.from(
        new Set([
          ...resolvedKeywords,
          ...(Array.isArray(data?.tags) ? data.tags.map((t) => t?.trim()).filter(Boolean) : []),
        ]),
      );

      // Create an internal placeholder team to satisfy project schema invariants.
      archiveTeam = await Team.create({
        name: `Archive ${Date.now()}`,
        leaderId: instructorObjectId,
        members: [instructorObjectId],
        isLocked: true,
        academicYear: resolvedAcademicYear,
        courseId: data?.courseId ? resolvedCourseId : null,
      });

      project = await Project.create({
        teamId: archiveTeam._id,
        title: normalizedTitle,
        titleProposals: [
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
          normalizedTitle,
        ],
        abstract: normalizedAbstract,
        keywords: mergedKeywords,
        archiveMetadata: {
          authors: resolvedAuthors,
          publicationYear: resolvedPublicationYear,
          doi: resolvedDoi,
          publicationVenue: resolvedPublicationVenue,
          extractedAt: metadataExtractedAt,
          review: metadataReview,
          similarityAudit,
        },
        academicYear: resolvedAcademicYear,
        courseId: resolvedCourseId,
        sectionId: new mongoose.Types.ObjectId(),
        memberRoleAssignments: [
          {
            userId: instructorObjectId,
            professionalTitle: defaultProfessionalTitle,
            traditionalRole: defaultRoleMapping.traditionalRole,
            responsibilities: defaultRoleMapping.responsibilities,
          },
        ],
        capstonePhase: 3,
        capstoneCourse: 'Capstone 3',
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.ARCHIVED,
        isArchived: true,
        archivedAt: new Date(),
        completionNotes: 'Bulk-uploaded archived capstone bundle.',
        originalityScore: (() => {
          if (data?.originalityScore !== undefined && data?.originalityScore !== null) {
            return Number(data.originalityScore);
          }
          const allConflicts = [
            ...(Array.isArray(similarityAudit?.titleConflicts)
              ? similarityAudit.titleConflicts
              : []),
            ...(Array.isArray(similarityAudit?.abstractConflicts)
              ? similarityAudit.abstractConflicts
              : []),
          ];
          if (allConflicts.length > 0) {
            const topSimilarity = Math.max(
              ...allConflicts.map(
                (c) =>
                  Number(
                    c?.similarityScore ?? c?.similarityPct ?? (c?.score ? c.score * 100 : 0),
                  ) || 0,
              ),
            );
            return Math.max(10, Math.min(100, Math.round(100 - topSimilarity)));
          }
          return 100;
        })(),
      });

      const finalAcademicStorageKey = academicPaperFile
        ? storageService.buildFinalAcademicKey(project._id, 1, academicPaperFile.originalname)
        : null;
      const finalJournalStorageKey = academicJournalFile
        ? storageService.buildFinalJournalKey(project._id, 1, academicJournalFile.originalname)
        : null;

      const extractionTasks = [];
      if (academicPaperFile) {
        extractionTasks.push(
          this._extractArchiveSubmissionText(academicPaperFile).then((text) => ({
            type: 'final_academic',
            text,
          })),
        );
      }
      if (academicJournalFile) {
        extractionTasks.push(
          this._extractArchiveSubmissionText(academicJournalFile).then((text) => ({
            type: 'final_journal',
            text,
          })),
        );
      }

      const extractedResults = await Promise.all(extractionTasks);
      const textByType = Object.fromEntries(extractedResults.map((item) => [item.type, item.text]));
      const finalAcademicExtractedText = textByType.final_academic || null;
      const finalJournalExtractedText = textByType.final_journal || null;

      try {
        if (academicPaperFile && finalAcademicStorageKey) {
          await storageService.uploadFile(
            academicPaperFile.buffer,
            finalAcademicStorageKey,
            academicPaperFile.validatedMime || academicPaperFile.mimetype,
          );
          uploadedKeys.push(finalAcademicStorageKey);
        }

        if (academicJournalFile && finalJournalStorageKey) {
          await storageService.uploadFile(
            academicJournalFile.buffer,
            finalJournalStorageKey,
            academicJournalFile.validatedMime || academicJournalFile.mimetype,
          );
          uploadedKeys.push(finalJournalStorageKey);
        }
      } catch (error) {
        // Clean up the project record if upload failed
        await Project.findByIdAndDelete(project._id);
        if (archiveTeam?._id) {
          await Team.findByIdAndDelete(archiveTeam._id).catch(() => {});
        }
        if (error.isOperational) {
          console.error('[ProjectService] Bulk archive upload failed:', error.code, error.message);
          throw error;
        }
        console.error('[ProjectService] Unexpected bulk archive upload error:', error);
        throw new AppError(
          'Failed to upload archive documents. Please try again later.',
          500,
          'BULK_ARCHIVE_UPLOAD_ERROR',
        );
      }

      const submissionsToCreate = [];
      if (academicPaperFile && finalAcademicStorageKey) {
        submissionsToCreate.push({
          projectId: project._id,
          submittedBy: instructorObjectId,
          type: 'final_academic',
          chapter: null,
          version: 1,
          fileName: academicPaperFile.originalname,
          fileType: academicPaperFile.validatedMime || academicPaperFile.mimetype,
          fileSize: academicPaperFile.size,
          storageKey: finalAcademicStorageKey,
          extractedText: finalAcademicExtractedText,
          status: 'approved',
        });
      }

      if (academicJournalFile && finalJournalStorageKey) {
        submissionsToCreate.push({
          projectId: project._id,
          submittedBy: instructorObjectId,
          type: 'final_journal',
          chapter: null,
          version: 1,
          fileName: academicJournalFile.originalname,
          fileType: academicJournalFile.validatedMime || academicJournalFile.mimetype,
          fileSize: academicJournalFile.size,
          storageKey: finalJournalStorageKey,
          extractedText: finalJournalExtractedText,
          status: 'approved',
        });
      }

      const createdSubmissions = await Submission.create(submissionsToCreate);
      const finalAcademicSubmission =
        createdSubmissions.find((entry) => entry.type === 'final_academic') || null;
      const finalJournalSubmission =
        createdSubmissions.find((entry) => entry.type === 'final_journal') || null;

      return {
        project,
        submissions: {
          finalAcademic: finalAcademicSubmission,
          finalJournal: finalJournalSubmission,
        },
        similarity: {
          checkedAt: similarityAudit.checkedAt,
          titleThreshold: similarityAudit.titleThreshold,
          abstractThreshold: similarityAudit.abstractThreshold,
          titleConflicts: similarityAudit.titleConflicts,
          abstractConflicts: similarityAudit.abstractConflicts,
          warning:
            similarityAudit.titleConflicts.length > 0 ||
            similarityAudit.abstractConflicts.length > 0
              ? 'High similarity detected!'
              : null,
        },
      };
    } catch (error) {
      await Promise.all(
        uploadedKeys.map((key) => storageService.deleteFile(key).catch(() => null)),
      );

      if (project?._id) {
        await Submission.deleteMany({ projectId: project._id });
        await Project.deleteOne({ _id: project._id });
      }

      if (archiveTeam?._id) {
        await Team.deleteOne({ _id: archiveTeam._id });
      }

      throw error;
    }
  }

  /* ═══════════════════ Helpers ═══════════════════ */

  /**
   * Stream or download the canonical manuscript for a project.
   * If the project is archived, any authenticated user can access it.
   * If in-progress, only the team and assigned committee/instructor can access it.
   *
   * @param {string} projectId
   * @param {Object} user
   * @param {Object} [options]
   * @param {boolean} [options.isDownload=false]
   * @param {string} [options.type=null]
   * @returns {Promise<{ buffer: Buffer, fileName: string, fileType: string, fileSize: number, isConverted?: boolean }>}
   */
  async getProjectManuscript(
    projectId,
    user,
    { isDownload = false, type = null, allowFallback = false } = {},
  ) {
    const project = await Project.findById(projectId).populate('teamId', 'members leaderId');
    if (!project) {
      throw new AppError('Project not found.', 404, 'PROJECT_NOT_FOUND');
    }

    const isArchived = Boolean(
      project.isArchived || project.projectStatus === PROJECT_STATUSES.ARCHIVED,
    );
    const userId = String(user?._id || user);

    if (!isArchived) {
      const isInstructor = user?.role === ROLES.INSTRUCTOR;
      const isTeamMember =
        project.teamId?.members?.some((m) => String(m?._id || m) === userId) ||
        String(project.teamId?.leaderId?._id || project.teamId?.leaderId) === userId;
      const isAdviser =
        project.adviserId && String(project.adviserId?._id || project.adviserId) === userId;
      const isPanelist =
        Array.isArray(project.panelistIds) &&
        project.panelistIds.some((p) => String(p?._id || p) === userId);
      const isSecretary =
        project.secretaryId && String(project.secretaryId?._id || project.secretaryId) === userId;

      if (!isInstructor && !isTeamMember && !isAdviser && !isPanelist && !isSecretary) {
        throw new AppError(
          'You do not have permission to access this project manuscript.',
          403,
          'FORBIDDEN',
        );
      }
    }

    // Determine target submission with comprehensive fallbacks
    let submission = null;
    if (type === 'final_academic' || type === 'academic' || type === 'paper') {
      submission = await Submission.findOne({
        projectId: project._id,
        type: { $in: ['final_academic', 'final_paper'] },
        storageKey: { $exists: true, $ne: null },
      }).sort({ version: -1, createdAt: -1 });

      if (!submission) {
        // Fallback to chapter/proposal if legacy project
        submission = await Submission.findOne({
          projectId: project._id,
          type: { $nin: ['final_journal'] },
          storageKey: { $exists: true, $ne: null },
        }).sort({ chapter: -1, version: -1, createdAt: -1 });
      }

      // Further fallback to journal if paper wasn't found
      if (!submission) {
        submission = await Submission.findOne({
          projectId: project._id,
          type: 'final_journal',
          storageKey: { $exists: true, $ne: null },
        }).sort({ version: -1, createdAt: -1 });
      }
    } else if (type === 'final_journal' || type === 'journal') {
      submission = await Submission.findOne({
        projectId: project._id,
        type: 'final_journal',
        storageKey: { $exists: true, $ne: null },
      }).sort({ version: -1, createdAt: -1 });

      // Fallback to academic paper if journal not found
      if (!submission) {
        submission = await Submission.findOne({
          projectId: project._id,
          type: { $in: ['final_academic', 'final_paper'] },
          storageKey: { $exists: true, $ne: null },
        }).sort({ version: -1, createdAt: -1 });
      }
    } else if (type) {
      submission = await Submission.findOne({
        projectId: project._id,
        type,
        storageKey: { $exists: true, $ne: null },
      }).sort({ version: -1, createdAt: -1 });
    }

    if (!submission) {
      // Default / Ultimate Fallback: Prioritize final_academic, then final_journal, then any submission
      submission = await Submission.findOne({
        projectId: project._id,
        type: { $in: ['final_academic', 'final_journal', 'final_paper'] },
        storageKey: { $exists: true, $ne: null },
      }).sort({ version: -1, createdAt: -1 });

      if (!submission) {
        submission = await Submission.findOne({
          projectId: project._id,
          storageKey: { $exists: true, $ne: null },
        }).sort({ chapter: -1, version: -1, createdAt: -1 });
      }
    }

    if (!submission) {
      if (!allowFallback) {
        throw new AppError(
          'Manuscript file is not available for this project.',
          404,
          'MANUSCRIPT_NOT_FOUND',
        );
      }
    }

    // Attempt to retrieve existing submission file buffer from storage
    if (submission) {
      try {
        const fileData = await submissionService.getSubmissionFileBuffer(
          submission._id,
          user?._id || user,
          { isDownload },
        );
        if (fileData && fileData.buffer) {
          return fileData;
        }
      } catch (_storageErr) {
        // Fall through to dynamic PDF synthesis so user is never blocked
      }
    }

    // Dynamic High-Fidelity Fallback PDF Generation (Guarantees Manuscript is ALWAYS viewable)
    const pdfBuffer = await this._generateFallbackManuscriptPdf(project, type);
    const safeTitle = (project.title || 'Manuscript').slice(0, 45).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeTitle}_${type === 'final_journal' ? 'Journal' : 'Manuscript'}.pdf`;

    return {
      buffer: pdfBuffer,
      fileName,
      fileType: 'application/pdf',
      fileSize: pdfBuffer.length,
      isGeneratedFallback: true,
    };
  }

  /**
   * Generates a valid, institutional BukSU Capstone Manuscript PDF on the fly.
   * Ensures that archived and active projects can always be read even if storage binaries are unlinked.
   */
  async _generateFallbackManuscriptPdf(project, requestedType = 'final_academic') {
    return pdfGeneratorService.generateFallbackManuscriptPdf(project, requestedType);
  }
}

export default new ProjectArchiveService();
