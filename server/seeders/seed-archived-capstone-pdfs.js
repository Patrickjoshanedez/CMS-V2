/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';
import Team from '../modules/teams/team.model.js';
import User from '../modules/users/user.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const STORAGE_LOCAL_PATH = process.env.STORAGE_LOCAL_PATH || '';
const TEMPLATE_PATH = process.env.ARCHIVE_PDF_TEMPLATE_PATH || '/app/server/seeders/_template.pdf';
const ARCHIVE_YEAR = '2024-2025';

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

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const resolveUploadsRoot = () => {
  if (path.isAbsolute(STORAGE_LOCAL_PATH) && STORAGE_LOCAL_PATH.trim()) {
    return STORAGE_LOCAL_PATH;
  }

  const repoRoot = path.resolve(process.cwd(), '..');
  if (!STORAGE_LOCAL_PATH.trim()) {
    return path.join(repoRoot, 'uploads');
  }

  return path.join(repoRoot, STORAGE_LOCAL_PATH);
};

const toSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);

const ensureTemplatePdf = () => {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template PDF not found: ${TEMPLATE_PATH}`);
  }

  const head = fs.readFileSync(TEMPLATE_PATH).subarray(0, 5).toString('ascii');
  if (!head.startsWith('%PDF-')) {
    throw new Error(`Template file is not a valid PDF header: ${TEMPLATE_PATH}`);
  }
};

const seedBaselineArchivedProject = async () => {
  const adviser = await User.findOne({ role: 'adviser' }).select('_id').lean();
  const panelist = await User.findOne({ role: 'panelist' }).select('_id').lean();
  const students = await User.find({ role: 'student' }).select('_id').limit(4).lean();
  const createdBy =
    (await User.findOne({ role: { $in: ['instructor', 'adviser'] } })
      .select('_id')
      .lean()) || adviser;

  if (!adviser || !panelist || students.length === 0 || !createdBy) {
    throw new Error(
      'Cannot bootstrap archived capstone: missing adviser/panelist/student/instructor users.',
    );
  }

  const studentIds = students.map((u) => u._id);
  const leaderId = studentIds[0];

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
    { upsert: true, new: true },
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
    { upsert: true, new: true },
  ).lean();

  const team = await Team.create({
    name: `Archived Seed Team ${new Date().toISOString().slice(0, 10)}`,
    leaderId,
    members: studentIds,
    isLocked: true,
    academicYear: ARCHIVE_YEAR,
    courseId: course._id,
    sectionId: section._id,
  });

  await User.updateMany(
    { _id: { $in: studentIds } },
    { $set: { teamId: team._id, sectionId: section._id, instructorId: adviser._id } },
  );

  const now = new Date();
  const archivedAt = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
  const memberRoleAssignments = studentIds.map((userId, index) => ({
    userId,
    ...DEFAULT_ROLE_ASSIGNMENTS[index % DEFAULT_ROLE_ASSIGNMENTS.length],
  }));

  const project = await Project.create({
    teamId: team._id,
    title: 'Archived Capstone Seed Project for Verification and Document Access',
    titleProposals: [
      'Archived Capstone Seed Project for Verification and Document Access',
      'Archived Capstone Platform with Filesystem-backed PDF Evidence',
      'Capstone Archive Lifecycle Seeder and Verification Toolkit',
      'Academic Archive Management with Persisted Final Submissions',
      'Historical Capstone Repository with Valid PDF Fixtures',
    ],
    abstract:
      'Seeded archived capstone used to verify archive retrieval, submission metadata integrity, and persistent PDF availability.',
    keywords: ['archive', 'capstone', 'pdf', 'seeder', 'verification'],
    academicYear: ARCHIVE_YEAR,
    courseId: course._id,
    sectionId: section._id,
    memberRoleAssignments,
    capstonePhase: 4,
    titleStatus: 'approved',
    projectStatus: 'archived',
    isArchived: true,
    archivedAt,
    completionNotes: 'Auto-seeded archived capstone with valid final PDF submissions.',
    adviserId: adviser._id,
    panelistIds: [panelist._id],
    deadlines: {
      chapter1: new Date(archivedAt.getTime() - 200 * 24 * 60 * 60 * 1000),
      chapter2: new Date(archivedAt.getTime() - 180 * 24 * 60 * 60 * 1000),
      chapter3: new Date(archivedAt.getTime() - 160 * 24 * 60 * 60 * 1000),
      proposal: new Date(archivedAt.getTime() - 140 * 24 * 60 * 60 * 1000),
      chapter4: new Date(archivedAt.getTime() - 120 * 24 * 60 * 60 * 1000),
      chapter5: new Date(archivedAt.getTime() - 100 * 24 * 60 * 60 * 1000),
      defense: new Date(archivedAt.getTime() - 90 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Bootstrapped archived project: ${project.title}`);
  return project;
};

const ensureArchivedSubmissionPdf = async ({
  project,
  teamLeaderId,
  uploadsRoot,
  type,
  suffix,
}) => {
  const titleSlug = toSlug(project.title || project._id.toString()) || project._id.toString();
  const fileName = `${titleSlug}_${suffix}.pdf`;
  const storageKey = `archives/projects/${project._id}/final/${type}/v1/${fileName}`;
  const absolutePath = path.join(uploadsRoot, storageKey);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.copyFileSync(TEMPLATE_PATH, absolutePath);

  const fileStat = fs.statSync(absolutePath);
  const submittedAt = new Date(
    (project.archivedAt || new Date()).getTime() - 5 * 24 * 60 * 60 * 1000,
  );
  const approvedAt = project.archivedAt || new Date();

  const existing = await Submission.findOne({ projectId: project._id, type, version: 1 }).select(
    '_id',
  );

  const payload = {
    projectId: project._id,
    type,
    chapter: null,
    version: 1,
    revisionRound: 0,
    fileName,
    fileType: 'application/pdf',
    fileSize: fileStat.size,
    storageKey,
    submittedBy: teamLeaderId,
    status: 'approved',
    submittedAt,
    approvedAt,
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
  console.log(`Using uploads root: ${uploadsRoot}`);
  console.log(`Using template PDF: ${TEMPLATE_PATH}`);

  ensureTemplatePdf();

  await mongoose.connect(MONGODB_URI, { autoIndex: false });

  try {
    let archivedProjects = await Project.find({
      projectStatus: 'archived',
      isArchived: true,
      capstonePhase: 4,
    })
      .select('_id title teamId archivedAt')
      .sort({ archivedAt: -1 })
      .lean();

    if (archivedProjects.length === 0) {
      console.log('No archived capstone projects found. Bootstrapping one archived project...');
      await seedBaselineArchivedProject();
      archivedProjects = await Project.find({
        projectStatus: 'archived',
        isArchived: true,
        capstonePhase: 4,
      })
        .select('_id title teamId archivedAt')
        .sort({ archivedAt: -1 })
        .lean();
    }

    let created = 0;
    let updated = 0;

    for (const project of archivedProjects) {
      const team = await Team.findById(project.teamId).select('leaderId').lean();
      if (!team?.leaderId) {
        console.warn(`Skipping project ${project._id}: missing team leader`);
        continue;
      }

      const academicResult = await ensureArchivedSubmissionPdf({
        project,
        teamLeaderId: team.leaderId,
        uploadsRoot,
        type: 'final_academic',
        suffix: 'academic',
      });

      const journalResult = await ensureArchivedSubmissionPdf({
        project,
        teamLeaderId: team.leaderId,
        uploadsRoot,
        type: 'final_journal',
        suffix: 'journal',
      });

      for (const result of [academicResult, journalResult]) {
        if (result.action === 'created') created += 1;
        if (result.action === 'updated') updated += 1;
      }

      console.log(`Project: ${project.title}`);
      console.log(
        `  - ${academicResult.action}: ${academicResult.storageKey} (${academicResult.fileSize} bytes)`,
      );
      console.log(
        `  - ${journalResult.action}: ${journalResult.storageKey} (${journalResult.fileSize} bytes)`,
      );
    }

    console.log(`Done. Created: ${created}, Updated: ${updated}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  console.error('Seed archived capstone PDFs failed:', error);
  process.exit(1);
});
