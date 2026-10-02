/**
 * Batch Ingestion Script for 45 Sample Capstone Papers.
 *
 * Sorts into BSIT (25) and BSEMC (20) courses.
 * Performs text extraction, MinIO S3 upload, Team/Project/Submission record creation.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import connectDB from '../server/config/db.js';
import Project from '../server/modules/projects/project.model.js';
import Team from '../server/modules/teams/team.model.js';
import Submission from '../server/modules/submissions/submission.model.js';
import Course from '../server/modules/academics/course.model.js';
import Section from '../server/modules/academics/section.model.js';
import User from '../server/modules/users/user.model.js';
import storageService from '../server/services/storage.service.js';
import { extractText } from '../server/utils/extractText.js';
import { TITLE_STATUSES, PROJECT_STATUSES } from '@cms/shared';

const MANIFEST_PATH = path.resolve(process.cwd(), 'Sample papers/ground_truth_manifest.json');
const PAPERS_DIR = path.resolve(process.cwd(), 'Sample papers');

async function batchArchive() {
  console.log('[Batch Archival] Connecting to database...');
  await connectDB();

  console.log('[Batch Archival] Resolving Courses...');
  const bsitCourse = await Course.findOne({ code: 'BSIT' });
  const bsemcCourse = await Course.findOne({ code: 'BSEMC' });

  if (!bsitCourse || !bsemcCourse) {
    throw new Error(
      `Required courses missing: BSIT=${Boolean(bsitCourse)}, BSEMC=${Boolean(bsemcCourse)}`,
    );
  }
  console.log(`[Batch Archival] BSIT Course ID: ${bsitCourse._id}`);
  console.log(`[Batch Archival] BSEMC Course ID: ${bsemcCourse._id}`);

  // Resolve Instructor
  const instructor =
    (await User.findOne({ role: 'instructor' })) ||
    (await User.findOne({ role: 'faculty' })) ||
    (await User.findOne({}));

  if (!instructor) {
    throw new Error('No user account found to assign as archivist submitter.');
  }
  console.log(`[Batch Archival] Archivist Instructor: ${instructor.email} (${instructor._id})`);

  // Resolve Sections
  let bsitSection = await Section.findOne({ courseId: bsitCourse._id });
  if (!bsitSection) {
    bsitSection = await Section.create({
      name: 'BSIT-4A',
      code: 'BSIT-4A',
      courseId: bsitCourse._id,
      academicYear: '2025-2026',
      isActive: true,
      createdBy: instructor._id,
    });
  }

  let bsemcSection = await Section.findOne({ courseId: bsemcCourse._id });
  if (!bsemcSection) {
    bsemcSection = await Section.create({
      name: 'BSEMC-4A',
      code: 'BSEMC-4A',
      courseId: bsemcCourse._id,
      academicYear: '2025-2026',
      isActive: true,
      createdBy: instructor._id,
    });
  }
  console.log(`[Batch Archival] BSIT Section ID: ${bsitSection._id}`);
  console.log(`[Batch Archival] BSEMC Section ID: ${bsemcSection._id}`);

  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Manifest file not found at ${MANIFEST_PATH}`);
  }
  const manifestRaw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const manifest = JSON.parse(manifestRaw);
  console.log(`[Batch Archival] Loaded ${manifest.length} records from manifest.`);

  let ingestedCount = 0;
  let bsitCount = 0;
  let bsemcCount = 0;

  for (let idx = 0; idx < manifest.length; idx++) {
    const item = manifest[idx];
    const isBSIT = item.courseCode === 'BSIT';
    const targetCourse = isBSIT ? bsitCourse : bsemcCourse;
    const targetSection = isBSIT ? bsitSection : bsemcSection;

    const title = (item.canonicalTitle || item.title || '').trim();
    const authors = Array.isArray(item.canonicalAuthors || item.authors)
      ? (item.canonicalAuthors || item.authors).map((a) => String(a || '').trim()).filter(Boolean)
      : ['BukSU Capstone Proponents'];
    const pubYear = Number(item.canonicalYear || item.year) || 2024;
    const abstract =
      (item.canonicalAbstract || item.abstract || '').trim() ||
      'Archived research paper in BukSU Capstone Management System.';

    const filePath = path.join(PAPERS_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Batch Archival] Skipping missing file: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const isDocx = item.filename.endsWith('.docx');
    const mimeType = isDocx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf';

    // Extract text for submission record & corpus indexing
    let extractedPlain = '';
    try {
      extractedPlain = await extractText(fileBuffer, mimeType);
    } catch (textErr) {
      console.warn(
        `[Batch Archival] Warning: Text extraction failed for ${item.filename}: ${textErr.message}. Using fallback excerpt.`,
      );
      extractedPlain = abstract || title;
    }

    // Check if project already archived
    let project = await Project.findOne({
      title,
      isArchived: true,
      courseId: targetCourse._id,
    });

    const academicYear = `${pubYear}-${pubYear + 1}`;
    const sanitizedKeywords = Array.from(
      new Set(
        [item.courseCode, ...(Array.isArray(item.tags) ? item.tags : []), 'Capstone', 'Research']
          .map((k) => String(k || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 10);

    const sanitizedAuthors = authors.slice(0, 20);

    if (!project) {
      // Create team
      const archiveTeam = await Team.create({
        name: `Archive ${item.courseCode} ${pubYear} - ${item.filename.slice(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        leaderId: instructor._id,
        members: [instructor._id],
        isLocked: true,
        academicYear,
        courseId: targetCourse._id,
        sectionId: targetSection._id,
      });

      project = await Project.create({
        teamId: archiveTeam._id,
        title,
        titleProposals: [title, title, title, title, title],
        abstract,
        keywords: sanitizedKeywords,
        sdgTags: ['SDG 9: Industry, Innovation and Infrastructure'],
        archiveMetadata: {
          authors: sanitizedAuthors,
          publicationYear: pubYear,
          doi: item.doi || '',
          publicationVenue: item.publicationVenue || '',
          extractedAt: new Date(),
        },
        academicYear,
        courseId: targetCourse._id,
        sectionId: targetSection._id,
        capstonePhase: 3,
        stage: 'final',
        capstoneCourse: 'Capstone 3',
        titleStatus: TITLE_STATUSES.APPROVED,
        projectStatus: PROJECT_STATUSES.ARCHIVED,
        isArchived: true,
        archivedAt: new Date(),
        completionNotes: `Archived sample capstone paper for ${item.courseCode} curriculum.`,
        originalityScore: 100,
      });
    }

    // Build S3 storage key & upload
    const storageKey = storageService.buildFinalAcademicKey(project._id, 1, item.filename);
    try {
      await storageService.uploadFile(fileBuffer, storageKey, mimeType, {
        projectId: String(project._id),
        originalName: item.filename,
        title: item.title,
        courseCode: item.courseCode,
      });
    } catch (uploadErr) {
      console.warn(
        `[Batch Archival] Note: Storage upload for ${item.filename}: ${uploadErr.message}`,
      );
    }

    // Upsert Submission
    let submission = await Submission.findOne({
      projectId: project._id,
      type: 'final_academic',
      storageKey,
    });

    if (!submission) {
      submission = await Submission.create({
        projectId: project._id,
        type: 'final_academic',
        chapter: null,
        version: 1,
        fileName: item.filename,
        fileType: mimeType,
        fileSize: fileBuffer.length,
        storageKey,
        status: 'approved',
        extractedText: extractedPlain,
        documentTitle: title,
        documentAbstract: abstract,
        submittedBy: instructor._id,
        reviewedBy: instructor._id,
        approvedAt: new Date(),
        originalityScore: 100,
      });
    }

    ingestedCount++;
    if (isBSIT) bsitCount++;
    else bsemcCount++;

    console.log(
      `[${idx + 1}/45] Ingested: "${title.slice(0, 40)}..." -> ${item.courseCode} (Proj: ${project._id}, Sub: ${submission._id})`,
    );
  }

  console.log('\n=============================================');
  console.log(`[Batch Archival Completed Successfully]`);
  console.log(`Total Ingested: ${ingestedCount} / ${manifest.length}`);
  console.log(`BSIT Papers:    ${bsitCount} (Expected: 25)`);
  console.log(`BSEMC Papers:   ${bsemcCount} (Expected: 20)`);
  console.log('=============================================\n');

  process.exit(0);
}

batchArchive().catch((err) => {
  console.error('[Batch Archival Error]:', err);
  process.exit(1);
});
