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

// User Definitions: Official Institutional Accounts
const RAW_REQUESTED_USERS = [
  {
    id: 1,
    name: 'Rolando Fernandez',
    email: 'rolando.fernandez@buksu.edu.ph',
    role: 'instructor',
    status: 'active',
  },
  {
    id: 2,
    name: 'Maria Santos',
    email: 'maria.santos@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 3,
    name: 'Arnel Dela Cruz',
    email: 'arnel.delacruz@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 4,
    name: 'Grace Villanueva',
    email: 'grace.villanueva@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 5,
    name: 'Jonathan Bautista',
    email: 'jonathan.bautista@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 6,
    name: 'Catherine Mendoza',
    email: 'catherine.mendoza@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 7,
    name: 'Mark Anthony Reyes',
    email: 'markanthony.reyes@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 8,
    name: 'Leah Alcantara',
    email: 'leah.alcantara@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 9,
    name: 'Dennis Ocampo',
    email: 'dennis.ocampo@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 10,
    name: 'Sheila Mae Ramos',
    email: 'sheilamae.ramos@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 11,
    name: 'Ryan Christopher Tan',
    email: 'ryanchristopher.tan@buksu.edu.ph',
    role: 'faculty',
    status: 'active',
  },
  {
    id: 12,
    name: 'Adrian Navarro',
    email: 'adrian.navarro@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 13,
    name: 'Aira Mae Flores',
    email: 'airamae.flores@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 14,
    name: 'Allen Jake Soriano',
    email: 'allenjake.soriano@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 15,
    name: 'Alyssa Nicole Castillo',
    email: 'alyssanicole.castillo@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 16,
    name: 'Angelo Miguel Torres',
    email: 'angelomiguel.torres@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 17,
    name: 'Bea Bianca Aguilar',
    email: 'beabianca.aguilar@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 18,
    name: 'Carl Joseph Salazar',
    email: 'carljoseph.salazar@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 19,
    name: 'Charmaine Joy Cruz',
    email: 'charmainejoy.cruz@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 20,
    name: 'Christian Dave Rivera',
    email: 'christiandave.rivera@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 21,
    name: 'Christine Joy Pascual',
    email: 'christinejoy.pascual@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 22,
    name: 'Daniel Cortez',
    email: 'daniel.cortez@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 23,
    name: 'Darlene Mae Garcia',
    email: 'darlenemae.garcia@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 24,
    name: 'Dave Lawrence Lim',
    email: 'davelawrence.lim@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 25,
    name: 'Dominic Silva',
    email: 'dominic.silva@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 26,
    name: 'Ella Marie Morales',
    email: 'ellamarie.morales@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 27,
    name: 'Francis Gabriel Gomez',
    email: 'francisgabriel.gomez@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 28,
    name: 'Gabrielle Nicole Yu',
    email: 'gabriellenicole.yu@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 29,
    name: 'Gerald Paul Roxas',
    email: 'geraldpaul.roxas@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 30,
    name: 'Hannah Grace Mercado',
    email: 'hannahgrace.mercado@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 31,
    name: 'Ian James David',
    email: 'ianjames.david@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 32,
    name: 'Ivan Matthew Tolentino',
    email: 'ivanmatthew.tolentino@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 33,
    name: 'Jasmine Rose Aquino',
    email: 'jasminerose.aquino@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 34,
    name: 'Jayvee De Leon',
    email: 'jayvee.deleon@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 35,
    name: 'Jerico Manalo',
    email: 'jerico.manalo@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 36,
    name: 'Jessica Mae Valenzuela',
    email: 'jessicamae.valenzuela@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 37,
    name: 'Jhon Mark Estrada',
    email: 'jhonmark.estrada@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 38,
    name: 'John Carlo Perez',
    email: 'johncarlo.perez@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 39,
    name: 'Joshua Emmanuel Lopez',
    email: 'joshuaemmanuel.lopez@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 40,
    name: 'Justin Paul Sarmiento',
    email: 'justinpaul.sarmiento@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 41,
    name: 'Karen Denise Bernardo',
    email: 'karendenise.bernardo@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 42,
    name: 'Kevin Roy Espiritu',
    email: 'kevinroy.espiritu@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 43,
    name: 'Kimberly Ann Salvador',
    email: 'kimberlyann.salvador@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 44,
    name: 'Kyle Vincent Domingo',
    email: 'kylevincent.domingo@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 45,
    name: 'Lance Edward Guinto',
    email: 'lanceedward.guinto@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 46,
    name: 'Lorenz Matthew Padilla',
    email: 'lorenzmatthew.padilla@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 47,
    name: 'Ma. Christina Dionisio',
    email: 'machristina.dionisio@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 48,
    name: 'Mark Andrei Pineda',
    email: 'markandrei.pineda@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 49,
    name: 'Mary Jane Villanueva',
    email: 'maryjane.villanueva@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 50,
    name: 'Michael Angelo Santos',
    email: 'michaelangelo.santos@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 51,
    name: 'Nathaniel James Sy',
    email: 'nathanieljames.sy@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 52,
    name: 'Nicole Anne Cordova',
    email: 'nicoleanne.cordova@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 53,
    name: 'Patricia Mae Lozano',
    email: 'patriciamae.lozano@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 54,
    name: 'Prince Harry Serrano',
    email: 'princeharry.serrano@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 55,
    name: 'Rafael Luis Medina',
    email: 'rafaelluis.medina@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 56,
    name: 'Renz Michael Palma',
    email: 'renzmichael.palma@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 57,
    name: 'Samantha Gail Macaraeg',
    email: 'samanthagail.macaraeg@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 58,
    name: 'Sean Patrick Velasco',
    email: 'seanpatrick.velasco@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 59,
    name: 'Stephanie Marie Banzon',
    email: 'stephaniemarie.banzon@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 60,
    name: 'Trisha Joy Magno',
    email: 'trishajoy.magno@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
  {
    id: 61,
    name: 'Vince Andrei Cajucom',
    email: 'vinceandrei.cajucom@student.buksu.edu.ph',
    role: 'student',
    status: 'active',
  },
];

function splitName(fullName) {
  const trimmed = fullName.trim();
  const compoundLastNames = ['Dela Cruz', 'De Leon', 'Del Rosario', 'San Juan', 'Santa Maria'];
  for (const compound of compoundLastNames) {
    if (trimmed.endsWith(compound)) {
      const first = trimmed.slice(0, trimmed.length - compound.length).trim();
      return { firstName: first, middleName: '', lastName: compound };
    }
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: parts[0] };
  }
  const lastName = parts.pop();
  const firstName = parts.join(' ');
  return { firstName, middleName: '', lastName };
}

const USERS_ROSTER = RAW_REQUESTED_USERS.map((u) => {
  const { firstName, middleName, lastName } = splitName(u.name);
  let title = 'Student Proponent';
  if (u.role === 'instructor') {
    title = 'Course Instructor / Coordinator';
  } else if (u.role === 'faculty') {
    title = 'Faculty Committee Member';
  }

  return {
    firstName,
    middleName,
    lastName,
    email: u.email.toLowerCase().trim(),
    role: u.role,
    facultyRole: null,
    studentId: u.role === 'student' ? `230110${String(u.id).padStart(4, '0')}` : '',
    isVerified: true,
    isActive: u.status === 'active',
    title,
  };
});

async function executeWipeAndReseedUsers() {
  console.log('═'.repeat(78));
  console.log('🚨 BUKSU CMS-V2: DATABASE PURGE & COMPLETE USERS RESEEDER');
  console.log('═'.repeat(78));
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  const candidates = [
    MONGODB_URI,
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
  const primaryInstructor =
    USERS_ROSTER.find((u) => u.email === 'rolando.fernandez@buksu.edu.ph') ||
    USERS_ROSTER.find((u) => u.role === 'instructor') ||
    USERS_ROSTER[0];

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
