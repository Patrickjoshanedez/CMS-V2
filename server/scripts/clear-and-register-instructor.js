import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Models
import User from '../modules/users/user.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://minio:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'cms-buksu-uploads';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'minioadmin';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'minioadmin';

const INSTRUCTOR_DATA = {
  firstName: 'Patrick Josh',
  middleName: 'S.',
  lastName: 'Añedez',
  email: 'instructor@buksu.edu.ph',
  password: 'Password123!',
  role: 'instructor',
  isVerified: true,
  isActive: true,
};

async function executePurgeAndRegister() {
  console.log('═'.repeat(70));
  console.log('🚨 BUKSU CMS-V2: DATABASE PURGE & SINGLE INSTRUCTOR REGISTRATION');
  console.log('═'.repeat(70));
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);

  // 1. Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`✅ Connected to DB: ${db.databaseName}`);

  // 2. Clear all MongoDB collections
  const collections = await db.listCollections().toArray();
  const wipeSummary = [];

  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;
    const coll = db.collection(collName);
    const countBefore = await coll.countDocuments();
    const deleteRes = await coll.deleteMany({});
    wipeSummary.push({ collection: collName, countBefore, deleted: deleteRes.deletedCount });
  }

  console.log('\n📊 MongoDB Collections Purged:');
  console.table(wipeSummary);
  const totalDeleted = wipeSummary.reduce((acc, curr) => acc + curr.deleted, 0);
  console.log(`✅ Total documents purged across all MongoDB collections: ${totalDeleted}`);

  // 3. Flush Redis
  console.log(`\n📡 Flushing Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    await redis.connect();
    const dbsizeBefore = await redis.dbsize();
    await redis.flushall();
    const dbsizeAfter = await redis.dbsize();
    console.log(`✅ Redis flushed. Keys before: ${dbsizeBefore}, after: ${dbsizeAfter}`);
    redis.disconnect();
  } catch (err) {
    console.warn(`⚠️ Warning: Redis flush encountered an issue: ${err.message}`);
  }

  // 4. Clear MinIO Storage Bucket
  console.log(`\n📡 Clearing MinIO S3 Storage Bucket: ${S3_BUCKET}...`);
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
    console.log(`✅ MinIO objects deleted: ${totalDeletedS3}`);
  } catch (err) {
    console.warn(`⚠️ Warning: MinIO S3 clear encountered an issue: ${err.message}`);
  }

  // 5. Register the 1 Instructor
  console.log('\n👤 Registering Instructor account...');
  const instructorId = new mongoose.Types.ObjectId();

  const instructor = await User.create({
    _id: instructorId,
    firstName: INSTRUCTOR_DATA.firstName,
    middleName: INSTRUCTOR_DATA.middleName,
    lastName: INSTRUCTOR_DATA.lastName,
    email: INSTRUCTOR_DATA.email,
    password: INSTRUCTOR_DATA.password, // Mongoose pre-save hook will hash this once
    role: INSTRUCTOR_DATA.role,
    facultyRole: null,
    studentId: '',
    fieldOfDiscipline: 'Software Engineering',
    section: 'BSIT-4A',
    isVerified: INSTRUCTOR_DATA.isVerified,
    isActive: INSTRUCTOR_DATA.isActive,
    authProvider: 'local',
    panelAssignments: [],
  });

  console.log(
    `✅ Instructor registered: ${instructor.firstName} ${instructor.lastName} (${instructor.email})`,
  );

  // 6. Seed Academic Baseline & Singleton SystemSettings
  console.log('\n🏛️ Initializing Academic Foundation & System Settings...');
  const acadYear = await AcademicYear.create({
    year: '2025-2026',
    isActive: true,
    startDate: new Date('2025-08-01'),
    endDate: new Date('2026-06-30'),
    createdBy: instructorId,
  });

  const course = await Course.create({
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    isActive: true,
    createdBy: instructorId,
  });

  const section = await Section.create({
    name: 'BSIT-4A',
    code: 'BSIT-4A',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
    createdBy: instructorId,
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

  console.log(`✅ Academic Year: [${acadYear.year}]`);
  console.log(`✅ Course:        [${course.code}] ${course.name}`);
  console.log(`✅ Section:       [${section.name}]`);
  console.log(`✅ Settings:      Global System Settings initialized`);

  // 7. Verify counts
  const totalUsers = await User.countDocuments();
  const totalTeams = await db.collection('teams').countDocuments();
  const totalProjects = await db.collection('projects').countDocuments();
  const totalSubmissions = await db.collection('submissions').countDocuments();

  console.log('\n' + '═'.repeat(70));
  console.log('📋 VERIFICATION REPORT');
  console.log('═'.repeat(70));
  console.log(`  Users count:       ${totalUsers} (Expected: 1)`);
  console.log(`  Teams count:       ${totalTeams} (Expected: 0)`);
  console.log(`  Projects count:    ${totalProjects} (Expected: 0)`);
  console.log(`  Submissions count: ${totalSubmissions} (Expected: 0)`);

  if (totalUsers === 1 && totalTeams === 0 && totalProjects === 0 && totalSubmissions === 0) {
    console.log('\n🎉 ALL DATABASES SUCCESSFULLY PURGED & 1 INSTRUCTOR REGISTERED!');
    console.log('\nCredentials:');
    console.log(`  Email:    ${INSTRUCTOR_DATA.email}`);
    console.log(`  Password: ${INSTRUCTOR_DATA.password}`);
    console.log(`  Role:     ${INSTRUCTOR_DATA.role}`);
  } else {
    throw new Error('Database counts did not match expected clean state!');
  }

  await mongoose.disconnect();
  process.exit(0);
}

executePurgeAndRegister().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
