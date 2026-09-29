/**
 * ==============================================================================
 * BUKSU CAPSTONE MANAGEMENT SYSTEM (CMS-V2)
 * Complete Database Wipe & Clean Users Reseeder
 * ==============================================================================
 *
 * Senior Backend Engineering Standard:
 * 1. Purges all collections across MongoDB (Projects, Teams, Submissions,
 *    Evaluations, Defense Minutes, Team Invites, Notifications, Refresh Tokens,
 *    Audit Logs, etc.).
 * 2. Flushes Redis cache and clears MinIO S3 upload bucket.
 * 3. Initializes Academic Foundation (Academic Year 2025-2026, Course BSIT,
 *    Sections BSIT-4A to 4D) and Global SystemSettings.
 * 4. Seeds all official users (Instructor, Faculty Committee, Students) and
 *    canonical test/scenario accounts with default password: Password123!
 * 5. Guarantees ZERO projects, ZERO teams, ZERO submissions, and ZERO evaluations
 *    for a pristine, unpolluted Phase 0 start.
 * ==============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// Load environment variables
dotenv.config({ path: './server/.env' });
dotenv.config();

// Models
import User from '../modules/users/user.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

// Configuration
const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27018/cms_v2';
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
const DEFAULT_PASSWORD = 'Password123!';

const REDIS_HOST = process.env.REDIS_HOST || (process.env.DOCKER_ENV ? 'redis' : '127.0.0.1');
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const S3_ENDPOINT =
  process.env.S3_ENDPOINT ||
  (process.env.DOCKER_ENV ? 'http://minio:9000' : 'http://127.0.0.1:9000');
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'cms-buksu-uploads';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'minioadmin';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'minioadmin';

// User Definitions: Official Roster + Canonical Testing Accounts
const USERS_ROSTER = [
  // ── 1. Official Instructors ──
  {
    firstName: 'Rozanne Tuesday',
    middleName: '',
    lastName: 'Flores',
    email: 'rozanneflores1@buksu.edu.ph',
    role: 'instructor',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Course Instructor / Coordinator',
  },
  {
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    email: 'instructor@student.buksu.edu.ph',
    role: 'instructor',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Instructor / Coordinator (Alternate)',
  },
  {
    firstName: 'IT',
    middleName: 'Capstone',
    lastName: 'Coordinator',
    email: 'instructor@buksu.edu.ph',
    role: 'instructor',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'IT Department Capstone Coordinator',
  },
  {
    firstName: 'Louie Jay',
    middleName: 'M.',
    lastName: 'Labastida',
    email: 'chair.instructor@buksu.edu.ph',
    role: 'instructor',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Department Chair / Instructor',
  },

  // ── 2. Official Faculty (Adviser, Panelists, Secretary) ──
  {
    firstName: 'Glaiza Mae',
    middleName: '',
    lastName: 'Libe',
    email: 'glaizalibe1@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'adviser',
    isVerified: true,
    isActive: true,
    title: 'Faculty Adviser',
  },
  {
    firstName: 'Louie',
    middleName: '',
    lastName: 'Labastida',
    email: 'louielabastida1@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
    title: 'Faculty Panel Chair',
  },
  {
    firstName: 'Raul',
    middleName: '',
    lastName: 'Lecaros',
    email: 'raullecaros1@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
    title: 'Faculty Panel Member 2',
  },
  {
    firstName: 'Joseph',
    middleName: '',
    lastName: 'Abella',
    email: 'josephabella1@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
    title: 'Faculty Panel Member 3',
  },
  {
    firstName: 'Joan Marie',
    middleName: '',
    lastName: 'Panes',
    email: 'joanpanes1@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
    title: 'Faculty Committee Secretary',
  },
  {
    firstName: 'Leon',
    middleName: '',
    lastName: 'Mentor',
    email: 'adviser@student.buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'adviser',
    isVerified: true,
    isActive: true,
    title: 'Faculty Adviser (Canonical)',
  },
  {
    firstName: 'Leon',
    middleName: '',
    lastName: 'Mentor',
    email: 'leon.mentor.buksu@gmail.com',
    role: 'faculty',
    facultyRole: 'adviser',
    isVerified: true,
    isActive: true,
    title: 'Faculty Adviser (Gmail)',
  },
  {
    firstName: 'Steven Joe',
    middleName: '',
    lastName: 'Bautista',
    email: 'panelchair@student.buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
    title: 'Faculty Panel Chair (Canonical)',
  },

  // ── 3. Official Students ──
  {
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    email: '2301103203@student.buksu.edu.ph',
    studentId: '2301103203',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Team Lead)',
  },
  {
    firstName: 'Throylan',
    middleName: '',
    lastName: 'Antipuesto',
    email: '2301101345@student.buksu.edu.ph',
    studentId: '2301101345',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Developer)',
  },
  {
    firstName: 'Steven Joe',
    middleName: '',
    lastName: 'Bautista',
    email: '2301104051@student.buksu.edu.ph',
    studentId: '2301104051',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (QA / Documentor)',
  },
  {
    firstName: 'Chijay',
    middleName: '',
    lastName: 'Canoy',
    email: '2301103201@student.buksu.edu.ph',
    studentId: '2301103201',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Developer)',
  },
  {
    firstName: 'Test',
    middleName: '',
    lastName: 'ter',
    email: '2301106923@student.buksu.edu.ph',
    studentId: '2301106923',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Test Account)',
  },

  // ── 4. Canonical / Scenario Students ──
  {
    firstName: 'Bennettchristiangeofferdon',
    middleName: '',
    lastName: 'Student',
    email: 'student@student.buksu.edu.ph',
    studentId: '2301109901',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Canonical)',
  },
  {
    firstName: 'Bennettchristiangeofferdon',
    middleName: '',
    lastName: 'User',
    email: 'bennettchristiangeofferdon15@gmail.com',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Gmail)',
  },
  {
    firstName: 'John Jethro',
    middleName: '',
    lastName: 'Israel',
    email: 'student2@student.buksu.edu.ph',
    studentId: '2501107801',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Beta Lead)',
  },
  {
    firstName: 'John Jethro',
    middleName: '',
    lastName: 'Israel',
    email: '2501107801@student.buksu.edu.ph',
    studentId: '2501107801',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (ID Account)',
  },
  {
    firstName: 'Gabriel',
    middleName: 'Mark',
    lastName: 'Diaz',
    email: 'student3@student.buksu.edu.ph',
    studentId: '2301101111',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Gamma Lead)',
  },
  {
    firstName: 'Chris',
    middleName: '',
    lastName: 'Student',
    email: 'chris.student.buksu@gmail.com',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Gmail)',
  },
  {
    firstName: 'Yojp',
    middleName: '',
    lastName: 'Korj',
    email: 'korjyojp@gmail.com',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Gmail)',
  },
  {
    firstName: 'Lara',
    middleName: 'Mae',
    lastName: 'Quintero',
    email: 'lara.mae.quintero@student.buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student (Lara Mae)',
  },
  {
    firstName: 'Rafael',
    middleName: 'James',
    lastName: 'Cruz',
    email: 'student9@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student 9',
  },
  {
    firstName: 'Camille',
    middleName: 'Anne',
    lastName: 'Morales',
    email: 'student10@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student 10',
  },
  {
    firstName: 'Nicole',
    middleName: 'Faith',
    lastName: 'Aguilar',
    email: 'student12@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student 12',
  },
  {
    firstName: 'Kevin',
    middleName: 'Paul',
    lastName: 'Tan',
    email: 'student13@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Student 13',
  },
  {
    firstName: 'Lara',
    middleName: 'Mae',
    lastName: 'Quintero',
    email: 'scenario.orphan.complete@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Scenario: Orphan Complete',
  },
  {
    firstName: 'Noel',
    middleName: 'Ivan',
    lastName: 'Misa',
    email: 'scenario.no.section@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Scenario: No Section',
  },
  {
    firstName: 'Priya',
    middleName: 'S.',
    lastName: 'Ramos',
    email: 'scenario.no.adviser@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    title: 'Scenario: No Adviser',
  },
  {
    firstName: 'Tim',
    middleName: 'Alex',
    lastName: 'Uy',
    email: 'scenario.inactive@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: false,
    title: 'Scenario: Inactive',
  },
  {
    firstName: 'Mika',
    middleName: 'Joy',
    lastName: 'Abarca',
    email: 'scenario.unverified@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: false,
    isActive: true,
    title: 'Scenario: Unverified',
  },
  {
    firstName: 'Gio',
    middleName: 'Lee',
    lastName: 'Tan',
    email: 'scenario.google@buksu.edu.ph',
    role: 'student',
    facultyRole: null,
    isVerified: true,
    isActive: true,
    authProvider: 'google',
    googleId: 'google-seed-scenario-001',
    title: 'Scenario: Google OAuth',
  },
];

async function executeWipeAndReseedUsers() {
  console.log('═'.repeat(78));
  console.log('🚨 BUKSU CMS-V2: DATABASE PURGE & COMPLETE USERS RESEEDER');
  console.log('═'.repeat(78));
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  const candidates = [
    'mongodb://127.0.0.1:27018/cms_v2',
    'mongodb://localhost:27018/cms_v2',
    'mongodb://mongodb:27017/cms_v2',
    'mongodb://127.0.0.1:27017/cms_v2',
  ];

  let connected = false;
  for (const uri of [...new Set(candidates)]) {
    try {
      console.log(`Attempting connection: ${uri}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      connected = true;
      console.log(`✅ Connected successfully to DB: [${mongoose.connection.db.databaseName}]`);
      break;
    } catch (err) {
      console.warn(`  ✗ Failed (${uri}): ${err.message}`);
    }
  }

  if (!connected) {
    throw new Error('Unable to connect to MongoDB using any candidate URI.');
  }

  const db = mongoose.connection.db;

  // 1. Clear All MongoDB Collections
  console.log('\n' + '─'.repeat(78));
  console.log('▶ Stage 1: Purging All MongoDB Collections');
  console.log('─'.repeat(78));

  const collections = await db.listCollections().toArray();
  const wipeSummary = [];

  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;
    const coll = db.collection(collName);
    const countBefore = await coll.countDocuments();
    const deleteRes = await coll.deleteMany({});
    wipeSummary.push({
      collection: collName,
      countBefore,
      deleted: deleteRes.deletedCount,
    });
  }

  console.table(wipeSummary);
  const totalDeletedDocs = wipeSummary.reduce((acc, curr) => acc + curr.deleted, 0);
  console.log(
    `✔ Cleared ${wipeSummary.length} collections with ${totalDeletedDocs} total documents purged.`,
  );

  // 2. Flush Redis Cache
  console.log('\n' + '─'.repeat(78));
  console.log(`▶ Stage 2: Flushing Redis Cache (${REDIS_HOST}:${REDIS_PORT})`);
  console.log('─'.repeat(78));

  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    await redis.connect();
    const keysBefore = await redis.dbsize();
    await redis.flushall();
    const keysAfter = await redis.dbsize();
    console.log(`✔ Redis flushed successfully. Keys before: ${keysBefore}, after: ${keysAfter}`);
    redis.disconnect();
  } catch (err) {
    console.warn(`⚠️ Warning: Redis flush skipped or unavailable (${err.message})`);
  }

  // 3. Clear S3 / MinIO Uploads
  console.log('\n' + '─'.repeat(78));
  console.log(`▶ Stage 3: Emptying S3 / MinIO Uploads Bucket (${S3_BUCKET})`);
  console.log('─'.repeat(78));

  try {
    const s3 = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    let isTruncated = true;
    let continuationToken;
    let totalDeletedS3 = 0;

    while (isTruncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        ContinuationToken: continuationToken,
      });
      const listRes = await s3.send(listCmd);
      if (listRes.Contents && listRes.Contents.length > 0) {
        const deleteParams = {
          Bucket: S3_BUCKET,
          Delete: {
            Objects: listRes.Contents.map((obj) => ({ Key: obj.Key })),
          },
        };
        await s3.send(new DeleteObjectsCommand(deleteParams));
        totalDeletedS3 += listRes.Contents.length;
      }
      isTruncated = Boolean(listRes.IsTruncated);
      continuationToken = listRes.NextContinuationToken;
    }
    console.log(`✔ S3 / MinIO objects cleared: ${totalDeletedS3}`);
  } catch (err) {
    console.warn(`⚠️ Warning: S3 / MinIO clear skipped or unavailable (${err.message})`);
  }

  // 4. Seed Academic Baseline & System Settings
  console.log('\n' + '─'.repeat(78));
  console.log('▶ Stage 4: Seeding Academic Foundation & System Settings');
  console.log('─'.repeat(78));

  const initialAdminId = new mongoose.Types.ObjectId();

  const acadYear = await AcademicYear.create({
    year: '2025-2026',
    isActive: true,
    startDate: new Date('2025-08-01'),
    endDate: new Date('2026-06-30'),
    createdBy: initialAdminId,
  });

  const course = await Course.create({
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionA = await Section.create({
    name: 'BSIT-4A',
    code: 'BSIT-4A',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionB = await Section.create({
    name: 'BSIT-4B',
    code: 'BSIT-4B',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionC = await Section.create({
    name: 'BSIT-4C',
    code: 'BSIT-4C',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionD = await Section.create({
    name: 'BSIT-4D',
    code: 'BSIT-4D',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
    createdBy: initialAdminId,
  });

  await SystemSettings.findOneAndUpdate(
    { key: 'global' },
    {
      key: 'global',
      plagiarismThreshold: 75,
      plagiarismWarningRate: 15,
      plagiarismWarningThreshold: 15,
      plagiarismRejectionRate: 30,
      plagiarismRejectThreshold: 25,
      maxFileSize: 25 * 1024 * 1024,
      maxTeamMembers: 4,
      currentAcademicYear: '2025-2026',
      activeSemester: '1st Semester',
      allowLateJustification: true,
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  console.log(`✔ Academic Year: [${acadYear.year}]`);
  console.log(`✔ Course:        [${course.code}] ${course.name}`);
  console.log(
    `✔ Sections:      [${sectionA.name}], [${sectionB.name}], [${sectionC.name}], [${sectionD.name}]`,
  );
  console.log('✔ Settings:      Global System Settings initialized');

  // 5. Seed Users Roster
  console.log('\n' + '─'.repeat(78));
  console.log(`▶ Stage 5: Seeding ${USERS_ROSTER.length} User Accounts`);
  console.log('─'.repeat(78));

  const seededUsers = [];
  const primaryInstructor = USERS_ROSTER.find((u) => u.email === 'rozanneflores1@buksu.edu.ph');

  for (const u of USERS_ROSTER) {
    const isPrimaryInstructor = u.email === primaryInstructor?.email;
    const userId = isPrimaryInstructor ? initialAdminId : new mongoose.Types.ObjectId();

    const userDoc = new User({
      _id: userId,
      firstName: u.firstName,
      middleName: u.middleName || '',
      lastName: u.lastName,
      email: u.email.toLowerCase().trim(),
      password: DEFAULT_PASSWORD, // Pre-save hook hashes password
      role: u.role,
      facultyRole: u.facultyRole || null,
      studentId: u.studentId || '',
      fieldOfDiscipline: 'Software Engineering',
      section: u.role === 'instructor' ? 'BSIT-4A' : '',
      sectionId: null, // Left null so students can set their section or select on profile
      instructorId: null, // Left null so students can select their instructor on profile
      teamId: null, // Strictly ZERO teams
      isVerified: u.isVerified ?? true,
      isActive: u.isActive ?? true,
      authProvider: u.authProvider || 'local',
      googleId: u.googleId || undefined,
      panelAssignments: [],
    });

    await userDoc.save();
    seededUsers.push(userDoc);
    console.log(
      `  ✔ [${userDoc.role.toUpperCase().padEnd(10)}] ${(userDoc.firstName + ' ' + userDoc.lastName).padEnd(28)} <${userDoc.email}>`,
    );
  }

  // Update createdBy references on academic catalogs to the primary instructor
  acadYear.createdBy = initialAdminId;
  await acadYear.save();
  course.createdBy = initialAdminId;
  await course.save();
  sectionA.createdBy = initialAdminId;
  await sectionA.save();
  sectionB.createdBy = initialAdminId;
  await sectionB.save();
  sectionC.createdBy = initialAdminId;
  await sectionC.save();
  sectionD.createdBy = initialAdminId;
  await sectionD.save();

  // 6. Verification and Assertions
  console.log('\n' + '─'.repeat(78));
  console.log('▶ Stage 6: Deterministic Clean State Verification');
  console.log('─'.repeat(78));

  const totalUsers = await User.countDocuments();
  const totalTeams = await db.collection('teams').countDocuments();
  const totalProjects = await db.collection('projects').countDocuments();
  const totalSubmissions = await db.collection('submissions').countDocuments();
  const totalEvaluations = await db.collection('evaluations').countDocuments();
  const totalMinutes = await db.collection('defenseminutes').countDocuments();
  const totalInvites = await db.collection('teaminvites').countDocuments();
  const totalNotifications = await db.collection('notifications').countDocuments();
  const totalTokens = await db.collection('refreshtokens').countDocuments();
  const totalDeadlines = await db.collection('milestonedeadlines').countDocuments();

  const report = [
    {
      entity: 'Users (Fresh Roster)',
      count: totalUsers,
      expected: seededUsers.length,
      passed: totalUsers === seededUsers.length,
    },
    { entity: 'Teams', count: totalTeams, expected: 0, passed: totalTeams === 0 },
    { entity: 'Projects', count: totalProjects, expected: 0, passed: totalProjects === 0 },
    { entity: 'Submissions', count: totalSubmissions, expected: 0, passed: totalSubmissions === 0 },
    { entity: 'Evaluations', count: totalEvaluations, expected: 0, passed: totalEvaluations === 0 },
    { entity: 'Defense Minutes', count: totalMinutes, expected: 0, passed: totalMinutes === 0 },
    { entity: 'Team Invites', count: totalInvites, expected: 0, passed: totalInvites === 0 },
    {
      entity: 'Notifications',
      count: totalNotifications,
      expected: 0,
      passed: totalNotifications === 0,
    },
    { entity: 'Refresh Tokens', count: totalTokens, expected: 0, passed: totalTokens === 0 },
    {
      entity: 'Milestone Deadlines',
      count: totalDeadlines,
      expected: 0,
      passed: totalDeadlines === 0,
    },
  ];

  console.table(report);

  const allPassed = report.every((r) => r.passed);
  if (!allPassed) {
    throw new Error('Deterministic clean state verification failed!');
  }

  // 7. Structured Credentials Output
  console.log('\n' + '═'.repeat(78));
  console.log('                      USER CREDENTIALS DIRECTORY');
  console.log('═'.repeat(78));
  console.log(`  Default Password for ALL Accounts: ${DEFAULT_PASSWORD}`);
  console.log('─'.repeat(78));

  const credentialsTable = USERS_ROSTER.map((u) => ({
    Role: u.role.toUpperCase(),
    FacultyRole: u.facultyRole || 'N/A',
    Name: `${u.firstName} ${u.lastName}`,
    Email: u.email,
    Password: DEFAULT_PASSWORD,
  }));

  console.table(credentialsTable);
  console.log('═'.repeat(78));
  console.log('🎉 DATABASE SUCCESSFULLY PURGED & ALL USERS RESEEDED WITH CLEAN SLATE!');
  console.log('═'.repeat(78));

  await mongoose.disconnect();
  process.exit(0);
}

executeWipeAndReseedUsers().catch((err) => {
  console.error('\n❌ Fatal error executing wipe and reseed:', err);
  process.exit(1);
});
