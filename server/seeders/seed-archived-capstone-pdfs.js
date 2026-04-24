/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';
import Team from '../modules/teams/team.model.js';
import User from '../modules/users/user.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';
import {
  PROJECT_STATUSES,
  TITLE_STATUSES,
  PLAGIARISM_STATUSES,
  SUBMISSION_STATUSES,
} from '@cms/shared';

dotenv.config();

const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
const STORAGE_LOCAL_PATH = process.env.STORAGE_LOCAL_PATH || '';
const TEMPLATE_PATH = process.env.ARCHIVE_PDF_TEMPLATE_PATH || '/app/server/seeders/_template.pdf';
const SOURCE_PDF_DIR = process.env.ARCHIVE_SOURCE_PDF_DIR || 'sampleacademicpdf';
const ARCHIVE_YEAR = '2024-2025';
const BASE_ARCHIVED_TITLE = 'Archived Capstone Seed Project for Verification and Document Access';

const SIMILARITY_FIXTURE_DEFS = [
  {
    key: 'archived',
    title: 'Barangay Incident Tracking and Response Management System Archive Case Study',
    teamName: 'Seed Similarity Archive Team',
    projectStatus: PROJECT_STATUSES.ARCHIVED,
    isArchived: true,
    capstonePhase: 4,
  },
  {
    key: 'active',
    title: 'Barangay Incident Tracking and Response Management Platform with Analytics',
    teamName: 'Seed Similarity Active Team',
    projectStatus: PROJECT_STATUSES.ACTIVE,
    isArchived: false,
    capstonePhase: 2,
  },
  {
    key: 'pending',
    title: 'Barangay Incident Response and Tracking Management Workflow Suite',
    teamName: 'Seed Similarity Pending Team',
    projectStatus: PROJECT_STATUSES.PROPOSAL_SUBMITTED,
    isArchived: false,
    capstonePhase: 2,
  },
];

const MATCH_SOURCE_TITLES = [
  'Barangay Emergency Dispatch and Alerting Platform',
  'Community Incident Ticketing and Escalation Tracker',
  'Neighborhood Response Workflow with Predictive Prioritization',
  'Municipal Public Safety Case Management Portal',
  'Smart Incident Routing and Resolution Knowledge Base',
];

const DEFAULT_ROLE_ASSIGNMENTS = [
  {
    professionalTitle: 'Lead Developer',
    traditionalRole: 'Programmer',
    responsibilities: 'System Logic, Database, and Deployment.',
  },
  {
    professionalTitle: 'Technical Lead / Analyst',
    traditionalRole: 'Documentor',
    responsibilities: 'Research, Documentation, and Plagiarism Checks.',
  },
  {
    professionalTitle: 'Project Manager / QA',
    traditionalRole: 'Pitcher',
    responsibilities: 'Presentation, Testing, and Team Coordination.',
  },
  {
    professionalTitle: 'UI/UX Designer & Researcher',
    traditionalRole: 'All-Around',
    responsibilities: 'Frontend Design, Graphics, and Manual/User Guide.',
  },
];

const FIXTURE_STUDENT_COUNT = 12;
const FIXTURE_EMAIL_PREFIX = 'archive.seed.student';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

const isTransientMongoConnectionError = (error) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const errorCodes = [error?.code, error?.cause?.code]
    .filter((code) => typeof code === 'string')
    .map((code) => code.toUpperCase());

  if (errorCodes.some((code) => ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code))) {
    return true;
  }

  return /econnrefused|enotfound|eai_again|etimedout|ehostunreach|network error/i.test(message);
};

const connectWithFallback = async () => {
  const fallbackUri = process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
  const candidates = [MONGODB_URI, fallbackUri].filter(
    (uri, index, list) => uri && list.indexOf(uri) === index,
  );

  let lastError;
  for (const uri of candidates) {
    try {
      console.log(`Connecting to MongoDB: ${uri}`);
      await mongoose.connect(uri, { autoIndex: false });
      return;
    } catch (error) {
      lastError = error;

      if (isTransientMongoConnectionError(error)) {
        console.warn(`Mongo connection failed for ${uri}: ${error.message}`);
        continue;
      }

      if (/Invalid scheme/i.test(error?.message || '')) {
        console.warn(`Mongo URI scheme invalid for ${uri}, trying fallback if available...`);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

const resolveRepoRoot = () => {
  const candidateRoot = path.resolve(SCRIPT_DIR, '..', '..');
  if (fs.existsSync(path.join(candidateRoot, 'package.json'))) {
    return candidateRoot;
  }

  return process.cwd();
};

const resolveUploadsRoot = () => {
  const repoRoot = resolveRepoRoot();

  if (path.isAbsolute(STORAGE_LOCAL_PATH) && STORAGE_LOCAL_PATH.trim()) {
    return STORAGE_LOCAL_PATH;
  }

  if (!STORAGE_LOCAL_PATH.trim()) {
    return path.join(repoRoot, 'uploads');
  }

  return path.join(repoRoot, STORAGE_LOCAL_PATH);
};

const resolveSourcePdfRoot = () => {
  if (path.isAbsolute(SOURCE_PDF_DIR)) {
    return SOURCE_PDF_DIR;
  }

  return path.join(resolveRepoRoot(), SOURCE_PDF_DIR);
};

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);

const escapePdfText = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const hashString = (value) => {
  let hash = 0;
  for (const char of String(value || '')) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000003;
  }
  return hash;
};

const buildMinimalPdfBuffer = ({ project, type }) => {
  const generatedAt = new Date().toISOString();
  const lines = [
    'Archived Capstone Seed Document',
    `Title: ${project.title}`,
    `Document Type: ${type}`,
    `Project ID: ${project._id}`,
    `Generated: ${generatedAt}`,
  ];

  let y = 760;
  const textOperations = lines
    .map((line) => {
      const op = `1 0 0 1 50 ${y} Tm (${escapePdfText(line)}) Tj`;
      y -= 18;
      return op;
    })
    .join('\n');

  const stream = `BT\n/F1 12 Tf\n14 TL\n${textOperations}\nET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}endstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index <= objects.length; index += 1) {
    const offset = String(offsets[index]).padStart(10, '0');
    pdf += `${offset} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
};

const readTemplatePdfBuffer = () => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.warn(`Template PDF not found, using generated fallback: ${TEMPLATE_PATH}`);
    return null;
  }

  const templateBuffer = fs.readFileSync(TEMPLATE_PATH);
  const head = templateBuffer.subarray(0, 5).toString('ascii');
  if (!head.startsWith('%PDF-')) {
    console.warn(
      `Template file has invalid PDF header, using generated fallback: ${TEMPLATE_PATH}`,
    );
    return null;
  }

  return templateBuffer;
};

const humanizeFileStem = (fileName) => {
  const stem = path.parse(fileName).name;
  const cleaned = stem
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Seeded Archived Capstone Document';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const listProvidedPdfFixtures = () => {
  const sourceRoot = resolveSourcePdfRoot();
  if (!fs.existsSync(sourceRoot)) {
    console.warn(`Source PDF directory not found: ${sourceRoot}`);
    return [];
  }

  return fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => ({
      sourceRoot,
      fileName: entry.name,
      absolutePath: path.join(sourceRoot, entry.name),
      title: humanizeFileStem(entry.name),
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, 'en', { sensitivity: 'base' }));
};

const buildTitleProposals = (title) => [
  title,
  `${title} and Predictive Prioritization`,
  `${title} with Queue-aware Escalation`,
  `${title} for Institutional Archive Intelligence`,
  `${title} with Integrated Similarity Detection`,
];

const ensureFixtureStudents = async (count = FIXTURE_STUDENT_COUNT) => {
  const existing = await User.find({
    email: { $regex: `^${FIXTURE_EMAIL_PREFIX}\\d+@buksu\\.edu\\.ph$`, $options: 'i' },
  })
    .select('_id email')
    .sort({ email: 1 })
    .lean();

  const existingEmailSet = new Set(existing.map((entry) => entry.email.toLowerCase()));

  for (let index = 1; index <= count; index += 1) {
    const email = `${FIXTURE_EMAIL_PREFIX}${index}@buksu.edu.ph`;
    if (existingEmailSet.has(email)) {
      continue;
    }

    await User.create({
      firstName: 'Archive',
      middleName: '',
      lastName: `Fixture ${index}`,
      email,
      password: 'Password123',
      role: 'student',
      isVerified: true,
      isActive: false,
      teamId: null,
      sectionId: null,
      instructorId: null,
    });
  }

  return User.find({
    email: { $regex: `^${FIXTURE_EMAIL_PREFIX}\\d+@buksu\\.edu\\.ph$`, $options: 'i' },
  })
    .select('_id email')
    .sort({ email: 1 })
    .limit(count)
    .lean();
};

const getSeedContext = async () => {
  const adviser = await User.findOne({ role: 'adviser' }).select('_id').lean();
  const panelist = await User.findOne({ role: 'panelist' }).select('_id').lean();
  const students = await ensureFixtureStudents();
  const createdBy =
    (await User.findOne({ role: { $in: ['instructor', 'adviser'] } })
      .select('_id')
      .lean()) || adviser;

  if (!adviser || !panelist || students.length === 0 || !createdBy) {
    throw new Error(
      'Cannot bootstrap archived capstone: missing adviser/panelist/student/instructor users.',
    );
  }

  const course = await Course.findOneAndUpdate(
    { code: 'BSIT' },
    {
      $setOnInsert: {
        name: 'Bachelor of Science in Information Technology',
        code: 'BSIT',
        isActive: true,
        createdBy: createdBy._id,
      },
    },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  await AcademicYear.findOneAndUpdate(
    { year: ARCHIVE_YEAR },
    {
      $setOnInsert: {
        year: ARCHIVE_YEAR,
        isActive: false,
        createdBy: createdBy._id,
      },
    },
    { upsert: true },
  );

  const section = await Section.findOneAndUpdate(
    { courseId: course._id, academicYear: ARCHIVE_YEAR, name: 'A' },
    {
      $setOnInsert: {
        name: 'A',
        code: 'A',
        courseId: course._id,
        academicYear: ARCHIVE_YEAR,
        isActive: false,
        createdBy: createdBy._id,
      },
    },
    { upsert: true, returnDocument: 'after' },
  ).lean();

  return { adviser, panelist, students, course, section };
};

const pickStudentIds = (students, startIndex, count) => {
  const sourceIds = students.map((student) => student._id);
  const picked = [];
  for (let offset = 0; offset < count; offset += 1) {
    picked.push(sourceIds[(startIndex + offset) % sourceIds.length]);
  }
  return picked;
};

const ensureFixtureTeam = async ({ teamName, studentIds, courseId, sectionId }) => {
  const existingTeam = await Team.findOne({ name: teamName, academicYear: ARCHIVE_YEAR })
    .select('_id leaderId')
    .lean();

  if (existingTeam) {
    await Team.updateOne(
      { _id: existingTeam._id },
      {
        $set: {
          leaderId: studentIds[0],
          members: studentIds,
          isLocked: true,
          academicYear: ARCHIVE_YEAR,
          courseId,
          sectionId,
        },
      },
    );
    return { _id: existingTeam._id, leaderId: studentIds[0] };
  }

  const team = await Team.create({
    name: teamName,
    leaderId: studentIds[0],
    members: studentIds,
    isLocked: true,
    academicYear: ARCHIVE_YEAR,
    courseId,
    sectionId,
  });

  return { _id: team._id, leaderId: team.leaderId };
};

const ensureProjectFixture = async ({
  title,
  teamId,
  studentIds,
  courseId,
  sectionId,
  adviserId,
  panelistId,
  projectStatus,
  isArchived,
  capstonePhase,
}) => {
  const now = new Date();
  const archivedAt = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);

  const payload = {
    teamId,
    title,
    titleProposals: buildTitleProposals(title),
    abstract:
      'Seeded project fixture for archived PDF seeding and title similarity checks against non-rejected records.',
    keywords: ['barangay', 'incident', 'tracking', 'archive', 'similarity'],
    sdgTags: ['SDG 9: Industry, Innovation and Infrastructure'],
    academicYear: ARCHIVE_YEAR,
    courseId,
    sectionId,
    memberRoleAssignments: studentIds.map((userId, index) => ({
      userId,
      ...DEFAULT_ROLE_ASSIGNMENTS[index % DEFAULT_ROLE_ASSIGNMENTS.length],
    })),
    capstonePhase,
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus,
    isArchived,
    archivedAt: isArchived ? archivedAt : null,
    completionNotes: isArchived
      ? 'Auto-seeded archived capstone with valid final PDF submissions and plagiarism metadata.'
      : null,
    adviserId,
    panelistIds: [panelistId],
  };

  const existing = await Project.findOne({ title }).select('_id').lean();
  if (existing) {
    await Project.updateOne({ _id: existing._id }, { $set: payload });
    return { _id: existing._id, action: 'updated' };
  }

  const created = await Project.create(payload);
  return { _id: created._id, action: 'created' };
};

const ensureSimilarityFixtures = async (context) => {
  const { students, course, section, adviser, panelist } = context;
  const results = [];

  for (let index = 0; index < SIMILARITY_FIXTURE_DEFS.length; index += 1) {
    const fixture = SIMILARITY_FIXTURE_DEFS[index];
    const studentIds = pickStudentIds(students, index * 2, Math.min(2, students.length));
    const team = await ensureFixtureTeam({
      teamName: fixture.teamName,
      studentIds,
      courseId: course._id,
      sectionId: section._id,
    });

    const project = await ensureProjectFixture({
      title: fixture.title,
      teamId: team._id,
      studentIds,
      courseId: course._id,
      sectionId: section._id,
      adviserId: adviser._id,
      panelistId: panelist._id,
      projectStatus: fixture.projectStatus,
      isArchived: fixture.isArchived,
      capstonePhase: fixture.capstonePhase,
    });

    results.push({ key: fixture.key, action: project.action, projectId: project._id });
  }

  return results;
};

const buildPlagiarismPayload = ({ project, type, submittedAt }) => {
  const seed = hashString(`${project._id}-${type}-${project.title}`);
  const originalityScore = 68 + (seed % 29);
  const matchCount = seed % 4;
  const processedAt = new Date(submittedAt.getTime() + 2 * 60 * 60 * 1000);
  const jobId = `seed-plag-${project._id.toString().slice(-6)}-${type}-${seed % 10000}`;

  const matchedSources = Array.from({ length: matchCount }, (_, index) => {
    const title = MATCH_SOURCE_TITLES[(seed + index) % MATCH_SOURCE_TITLES.length];
    const similarity = 12 + ((seed + index * 11) % 23);
    return {
      submissionId: null,
      projectTitle: title,
      chapter: null,
      matchPercentage: similarity,
      spans: [
        {
          start: 120 + index * 40,
          end: 160 + index * 40,
        },
      ],
      sourceSnippet:
        'Similarity fixture excerpt discussing incident classification, response routing, and escalation workflows.',
      winnowScore: Number((0.2 + ((seed + index * 3) % 35) / 100).toFixed(3)),
      semanticScore: Number((0.3 + ((seed + index * 5) % 40) / 100).toFixed(3)),
    };
  });

  const fullReport = {
    reportVersion: '1.0',
    source: 'archive-seeder-simulator',
    generatedAt: processedAt.toISOString(),
    summary: {
      originalityScore,
      matchedSourceCount: matchedSources.length,
      threshold: 75,
      verdict: originalityScore >= 75 ? 'PASS' : 'REVIEW',
    },
    matches: matchedSources.map((source, index) => ({
      rank: index + 1,
      sourceTitle: source.projectTitle,
      similarity: source.matchPercentage,
      winnowScore: source.winnowScore,
      semanticScore: source.semanticScore,
      snippet: source.sourceSnippet,
    })),
  };

  return {
    originalityScore,
    plagiarismResult: {
      status: PLAGIARISM_STATUSES.COMPLETED,
      originalityScore,
      matchedSources,
      processedAt,
      jobId,
      error: null,
      fullReport,
    },
  };
};

const seedBaselineArchivedProject = async (context) => {
  const { adviser, panelist, students, course, section } = context;
  const studentIds = pickStudentIds(students, 0, Math.min(4, students.length));

  const team = await ensureFixtureTeam({
    teamName: 'Archived Seed Team Stable',
    studentIds,
    courseId: course._id,
    sectionId: section._id,
  });

  const project = await ensureProjectFixture({
    title: BASE_ARCHIVED_TITLE,
    teamId: team._id,
    studentIds,
    courseId: course._id,
    sectionId: section._id,
    adviserId: adviser._id,
    panelistId: panelist._id,
    projectStatus: PROJECT_STATUSES.ARCHIVED,
    isArchived: true,
    capstonePhase: 4,
  });

  console.log(`Bootstrapped archived project fixture (${project.action}): ${BASE_ARCHIVED_TITLE}`);
  return project;
};

const buildArchivedDateForIndex = (index) => {
  const now = new Date();
  return new Date(now.getTime() - (180 + index * 2) * 24 * 60 * 60 * 1000);
};

const ensureProjectFromPdfFixture = async ({ context, fixture, index }) => {
  const { adviser, panelist, students, course, section } = context;
  const studentIds = pickStudentIds(students, index * 2, Math.min(4, students.length));
  const teamName = `Seed Archive Team ${String(index + 1).padStart(2, '0')}`;

  const team = await ensureFixtureTeam({
    teamName,
    studentIds,
    courseId: course._id,
    sectionId: section._id,
  });

  const projectTitle = fixture.title;
  const archivedAt = buildArchivedDateForIndex(index);

  const payload = {
    teamId: team._id,
    title: projectTitle,
    titleProposals: buildTitleProposals(projectTitle),
    abstract: `Archived seed project generated from source PDF: ${fixture.fileName}`,
    keywords: ['archive', 'seed', 'pdf', 'capstone'],
    sdgTags: ['SDG 9: Industry, Innovation and Infrastructure'],
    academicYear: ARCHIVE_YEAR,
    courseId: course._id,
    sectionId: section._id,
    memberRoleAssignments: studentIds.map((userId, roleIndex) => ({
      userId,
      ...DEFAULT_ROLE_ASSIGNMENTS[roleIndex % DEFAULT_ROLE_ASSIGNMENTS.length],
    })),
    capstonePhase: 4,
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus: PROJECT_STATUSES.ARCHIVED,
    isArchived: true,
    archivedAt,
    completionNotes: `Auto-seeded from provided PDF fixture ${fixture.fileName}`,
    adviserId: adviser._id,
    panelistIds: [panelist._id],
  };

  const existing = await Project.findOne({ title: projectTitle }).select('_id').lean();
  if (existing) {
    await Project.updateOne({ _id: existing._id }, { $set: payload });
    return { _id: existing._id, action: 'updated', title: projectTitle, teamLeaderId: team.leaderId };
  }

  const created = await Project.create(payload);
  return { _id: created._id, action: 'created', title: projectTitle, teamLeaderId: team.leaderId };
};

const ensureArchivedSubmissionPdf = async ({
  project,
  teamLeaderId,
  uploadsRoot,
  templatePdfBuffer,
  type,
  suffix,
  sourcePdfPath,
  sourceFileName,
  explicitVersion,
}) => {
  const titleSlug = toSlug(project.title || project._id.toString()) || project._id.toString();
  const nextVersion =
    explicitVersion ||
    ((await Submission.countDocuments({ projectId: project._id, type })) + 1);
  const sourceStem = sourceFileName
    ? toSlug(path.parse(sourceFileName).name)
    : null;
  const fileName = sourceStem
    ? `${titleSlug}_${suffix}_${sourceStem}.pdf`
    : `${titleSlug}_${suffix}_v${nextVersion}.pdf`;
  const storageKey = `archives/projects/${project._id}/final/${type}/v${nextVersion}/${fileName}`;
  const absolutePath = path.join(uploadsRoot, storageKey);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  if (sourcePdfPath && fs.existsSync(sourcePdfPath)) {
    fs.copyFileSync(sourcePdfPath, absolutePath);
  } else if (templatePdfBuffer) {
    fs.writeFileSync(absolutePath, templatePdfBuffer);
  } else {
    const fallbackBuffer = buildMinimalPdfBuffer({ project, type });
    fs.writeFileSync(absolutePath, fallbackBuffer);
  }

  const fileStat = fs.statSync(absolutePath);
  const submittedAt = new Date(
    (project.archivedAt || new Date()).getTime() - 5 * 24 * 60 * 60 * 1000,
  );
  const approvedAt = project.archivedAt || new Date();
  const plagiarismPayload = buildPlagiarismPayload({ project, type, submittedAt });

  const existing = await Submission.findOne({
    projectId: project._id,
    type,
    version: nextVersion,
  }).select('_id');

  const payload = {
    projectId: project._id,
    type,
    chapter: null,
    version: nextVersion,
    revisionRound: 0,
    fileName,
    fileType: 'application/pdf',
    fileSize: fileStat.size,
    storageKey,
    submittedBy: teamLeaderId,
    status: SUBMISSION_STATUSES.APPROVED,
    submittedAt,
    approvedAt,
    originalityScore: plagiarismPayload.originalityScore,
    plagiarismResult: plagiarismPayload.plagiarismResult,
  };

  if (existing) {
    await Submission.updateOne({ _id: existing._id }, { $set: payload });
    return { action: 'updated', storageKey, absolutePath, fileSize: fileStat.size };
  }

  await Submission.create(payload);
  return { action: 'created', storageKey, absolutePath, fileSize: fileStat.size };
};

const run = async () => {
  const uploadsRoot = resolveUploadsRoot();
  const sourcePdfRoot = resolveSourcePdfRoot();
  const pdfFixtures = listProvidedPdfFixtures();
  const templatePdfBuffer = readTemplatePdfBuffer();
  console.log(`Using uploads root: ${uploadsRoot}`);
  console.log(`Using source PDF root: ${sourcePdfRoot}`);
  console.log(`Source PDF fixtures discovered: ${pdfFixtures.length}`);
  console.log(`Using template PDF: ${TEMPLATE_PATH}`);
  console.log(`Template mode: ${templatePdfBuffer ? 'template-copy' : 'generated-fallback'}`);

  await connectWithFallback();

  try {
    const context = await getSeedContext();
    await ensureSimilarityFixtures(context);

    const projectsToProcess = [];

    if (pdfFixtures.length > 0) {
      for (let index = 0; index < pdfFixtures.length; index += 1) {
        const fixture = pdfFixtures[index];
        const project = await ensureProjectFromPdfFixture({ context, fixture, index });
        projectsToProcess.push({ project, fixture, index });
      }
    } else {
      console.log('No source PDF fixtures found. Falling back to baseline archived project.');
      const baseline = await seedBaselineArchivedProject(context);
      projectsToProcess.push({
        project: {
          _id: baseline._id,
          title: BASE_ARCHIVED_TITLE,
          action: baseline.action,
          teamLeaderId: null,
        },
        fixture: null,
        index: 0,
      });
    }

    let archivedProcessed = 0;
    let academicCreated = 0;
    let academicUpdated = 0;
    let journalCreated = 0;
    let journalUpdated = 0;
    let plagiarismCompleted = 0;

    for (const item of projectsToProcess) {
      const { project, fixture } = item;
      let teamLeaderId = project.teamLeaderId;

      if (!teamLeaderId) {
        const projectDoc = await Project.findById(project._id).select('teamId').lean();
        const team = projectDoc?.teamId
          ? await Team.findById(projectDoc.teamId).select('leaderId').lean()
          : null;
        teamLeaderId = team?.leaderId || null;
      }

      if (!teamLeaderId) {
        console.warn(`Skipping project ${project._id}: missing team leader`);
        continue;
      }

      const academicResult = await ensureArchivedSubmissionPdf({
        project,
        teamLeaderId,
        uploadsRoot,
        templatePdfBuffer,
        type: 'final_academic',
        suffix: 'academic',
        sourcePdfPath: fixture?.absolutePath,
        sourceFileName: fixture?.fileName,
        explicitVersion: 1,
      });

      const journalResult = await ensureArchivedSubmissionPdf({
        project,
        teamLeaderId,
        uploadsRoot,
        templatePdfBuffer,
        type: 'final_journal',
        suffix: 'journal',
        sourcePdfPath: fixture?.absolutePath,
        sourceFileName: fixture?.fileName,
        explicitVersion: 1,
      });

      archivedProcessed += 1;
      if (academicResult.action === 'created') academicCreated += 1;
      if (academicResult.action === 'updated') academicUpdated += 1;
      if (journalResult.action === 'created') journalCreated += 1;
      if (journalResult.action === 'updated') journalUpdated += 1;
      plagiarismCompleted += 2;

      console.log(`Project: ${project.title}`);
      if (fixture?.fileName) {
        console.log(`  - source PDF: ${fixture.fileName}`);
      }
      console.log(
        `  - ${academicResult.action}: ${academicResult.storageKey} (${academicResult.fileSize} bytes)`,
      );
      console.log(
        `  - ${journalResult.action}: ${journalResult.storageKey} (${journalResult.fileSize} bytes)`,
      );
    }

    const similarityFixturesPresent = await Project.countDocuments({
      title: { $in: SIMILARITY_FIXTURE_DEFS.map((fixture) => fixture.title) },
      projectStatus: { $in: [PROJECT_STATUSES.ACTIVE, PROJECT_STATUSES.PROPOSAL_SUBMITTED] },
    });

    console.log('Seed summary:');
    console.log(`  - archived projects processed: ${archivedProcessed}`);
    console.log(`  - source PDFs seeded: ${pdfFixtures.length}`);
    console.log(`  - academic PDFs created/updated: ${academicCreated}/${academicUpdated}`);
    console.log(`  - journal PDFs created/updated: ${journalCreated}/${journalUpdated}`);
    console.log(`  - submissions with plagiarism COMPLETED: ${plagiarismCompleted}`);
    console.log(`  - active/pending similarity fixtures present: ${similarityFixturesPresent}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error('Seed archived capstone PDFs failed:', error);
  process.exit(1);
});
