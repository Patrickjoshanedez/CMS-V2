/**
 * Seed data — 12 realistic BukSU-style capstone project titles.
 *
 * Used by integration tests (title-similarity.test.js) and can be run
 * standalone via `node server/tests/seeds/capstone-titles.seed.js` for
 * manual QA against a running MongoDB instance.
 *
 * Each entry provides a title, keywords, academic year, and the titleStatus
 * the seeded project should be created with (so tests can exercise lock logic).
 */
import Project from '../../modules/projects/project.model.js';
import Team from '../../modules/teams/team.model.js';
import User from '../../modules/users/user.model.js';
import { TITLE_STATUSES } from '@cms/shared';

/* ------------------------------------------------------------------ */
/*  Seed Data (12 titles)                                             */
/* ------------------------------------------------------------------ */

export const CAPSTONE_TITLES = [
  {
    title: 'Capstone Management System with Integrated Plagiarism Checker',
    abstract: 'A web-based tool for managing capstone projects with plagiarism detection.',
    keywords: ['capstone', 'management', 'plagiarism', 'checker'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.APPROVED,
  },
  {
    title: 'AI-Powered Student Performance Prediction System for BukSU',
    abstract: 'Leverages machine learning to predict academic outcomes.',
    keywords: ['artificial intelligence', 'prediction', 'student', 'performance'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.DRAFT,
  },
  {
    title: 'IoT-Based Smart Classroom Attendance Monitoring System',
    abstract: 'Uses RFID and IoT sensors to automate classroom attendance tracking.',
    keywords: ['iot', 'attendance', 'monitoring', 'smart classroom'],
    academicYear: '2023-2024',
    titleStatus: TITLE_STATUSES.APPROVED,
  },
  {
    title: 'Web-Based Inventory Management System for BukSU Supply Office',
    abstract: 'Digitizes inventory tracking and procurement for the university supply office.',
    keywords: ['inventory', 'management', 'web', 'supply office'],
    academicYear: '2023-2024',
    titleStatus: TITLE_STATUSES.DRAFT,
  },
  {
    title: 'Mobile-Based Plant Disease Detection Using Convolutional Neural Networks',
    abstract: 'A mobile app using CNN to identify plant diseases from leaf images.',
    keywords: ['mobile', 'plant disease', 'cnn', 'deep learning'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.SUBMITTED,
  },
  {
    title: 'QR Code Based Library Book Borrowing and Tracking System',
    abstract: 'Simplifies library operations using QR codes for book management.',
    keywords: ['qr code', 'library', 'borrowing', 'tracking'],
    academicYear: '2023-2024',
    titleStatus: TITLE_STATUSES.APPROVED,
  },
  {
    title: 'Automated Grading System for Programming Assignments Using Code Analysis',
    abstract: 'Automates evaluation of student code submissions through static analysis.',
    keywords: ['grading', 'programming', 'code analysis', 'automated'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.DRAFT,
  },
  {
    title: 'Blockchain-Based Document Verification System for Academic Records',
    abstract: 'Uses blockchain to ensure tamper-proof verification of academic credentials.',
    keywords: ['blockchain', 'document verification', 'academic records'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.SUBMITTED,
  },
  {
    title: 'Sentiment Analysis of Student Feedback Using Natural Language Processing',
    abstract: 'Applies NLP techniques to evaluate student sentiments from course evaluations.',
    keywords: ['sentiment analysis', 'nlp', 'student feedback'],
    academicYear: '2023-2024',
    titleStatus: TITLE_STATUSES.APPROVED,
  },
  {
    title: 'e-Learning Platform with Adaptive Learning Pathways',
    abstract: 'Personalizes course content delivery based on student learning styles.',
    keywords: ['e-learning', 'adaptive', 'learning pathways', 'platform'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.DRAFT,
  },
  {
    title: 'Alumni Tracer System for Bukidnon State University Graduate Tracking',
    abstract: 'Tracks employment outcomes and career progression of BukSU alumni.',
    keywords: ['alumni', 'tracer', 'graduate', 'tracking'],
    academicYear: '2023-2024',
    titleStatus: TITLE_STATUSES.APPROVED,
  },
  {
    title: 'Disaster Risk Assessment and Mapping System Using GIS Technology',
    abstract: 'Provides geospatial disaster risk assessment for Bukidnon province.',
    keywords: ['disaster risk', 'gis', 'mapping', 'assessment'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.SUBMITTED,
  },
];

/* ------------------------------------------------------------------ */
/*  Helper — Seed all titles into the database                        */
/* ------------------------------------------------------------------ */

/**
 * Seeds CAPSTONE_TITLES into the database.
 *
 * For each title it creates a dummy student, a locked team, and then
 * the project itself.  Returns the created project documents.
 *
 * @param {Object} [options]
 * @param {string} [options.overrideStatus] - Force all projects to this titleStatus
 * @returns {Promise<import('mongoose').Document[]>} Created project documents
 */
export async function seedCapstoneProjects(options = {}) {
  const projects = [];

  for (let i = 0; i < CAPSTONE_TITLES.length; i++) {
    const seed = CAPSTONE_TITLES[i];

    // Create a dummy user
    const user = await User.create({
      firstName: `Seed`,
      lastName: `Student${i + 1}`,
      email: `seed-student-${i + 1}@test.com`,
      password: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12', // bcrypt placeholder
      isVerified: true,
      role: 'student',
    });

    // Create a locked team
    const team = await Team.create({
      name: `Seed Team ${i + 1}`,
      leaderId: user._id,
      members: [user._id],
      isLocked: true,
      academicYear: seed.academicYear,
    });

    await User.findByIdAndUpdate(user._id, { teamId: team._id });

    // Create the project
    const project = await Project.create({
      title: seed.title,
      abstract: seed.abstract,
      keywords: seed.keywords,
      academicYear: seed.academicYear,
      titleStatus: options.overrideStatus || seed.titleStatus,
      projectStatus: 'active',
      teamId: team._id,
      createdBy: user._id,
    });

    projects.push(project);
  }

  return projects;
}

/* ------------------------------------------------------------------ */
/*  Standalone execution (node tests/seeds/capstone-titles.seed.js)   */
/* ------------------------------------------------------------------ */
const isMain = process.argv[1]?.includes('capstone-titles.seed');
if (isMain) {
  const mongoose = await import('mongoose');
  const { default: dbConfig } = await import('../../config/db.js');

  await dbConfig();
  console.log('Connected to MongoDB. Seeding capstone titles…');

  const projects = await seedCapstoneProjects();
  console.log(`✓ Seeded ${projects.length} capstone projects.`);
  projects.forEach((p) => console.log(`  • [${p.titleStatus}] ${p.title}`));

  await mongoose.default.disconnect();
  console.log('Done.');
}
