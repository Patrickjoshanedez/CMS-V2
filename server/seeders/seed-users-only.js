/**
 * Minimal Seed Script — Creates ONLY the 8 specific user accounts
 *
 * Run via: node server/seeders/seed-users-only.js (from project root)
 * Or:      npm run seed:users (if you add the script to package.json)
 *
 * Default password for ALL seeded users: Password123!
 *
 * ─── Users Created ───────────────────────────────────────────────
 * 1. Instructor: Patrick Josh Añedez
 * 2. Adviser: Leon Mentor
 * 3. Panelist: Steven Joe Bautista
 * 4. Student: Bennettchristiangeofferdon
 * 5. Student: Throylan Antipuesto
 * 6. Student: Chris
 * 7. Student: Yojp Korj
 * 8. Student: John Jethro Israel
 */
/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../modules/users/user.model.js';
import Team from '../modules/teams/team.model.js';
import TeamInvite from '../modules/teams/teamInvite.model.js';
import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';
import Manuscript from '../modules/documents/document.model.js';
import Evaluation from '../modules/evaluations/evaluation.model.js';
import Notification from '../modules/notifications/notification.model.js';
import Plagiarism from '../modules/plagiarism/plagiarism.model.js';
import AuditLog from '../modules/audit/audit.model.js';
import OTP from '../modules/auth/otp.model.js';
import RefreshToken from '../modules/auth/refreshToken.model.js';
import AcademicYear from '../modules/academics/academicYear.model.js';
import Course from '../modules/academics/course.model.js';
import Section from '../modules/academics/section.model.js';
import SystemSettings from '../modules/settings/settings.model.js';

// ──────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = 'Password123!';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────
// User Definitions — 8 Specific Users
// ──────────────────────────────────────────────────────────────────

const USERS_TO_CREATE = [
  // Instructor
  {
    firstName: 'Patrick Josh',
    lastName: 'Añedez',
    email: '2301103203@student.buksu.edu.ph',
    role: 'instructor',
  },
  // Adviser
  {
    firstName: 'Leon',
    lastName: 'Mentor',
    email: 'leon.mentor.buksu@gmail.com',
    role: 'adviser',
  },
  // Panelist
  {
    firstName: 'Steven Joe',
    lastName: 'Bautista',
    email: '2301105311@student.buksu.edu.ph',
    role: 'panelist',
  },
  // Students
  {
    firstName: 'Bennettchristiangeofferdon',
    lastName: 'User', // lastName required, using placeholder
    email: 'bennettchristiangeofferdon15@gmail.com',
    role: 'student',
  },
  {
    firstName: 'Throylan',
    lastName: 'Antipuesto',
    email: '2301106923@student.buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Chris',
    lastName: 'Student', // lastName required, using placeholder
    email: 'chris.student.buksu@gmail.com',
    role: 'student',
  },
  {
    firstName: 'Yojp',
    lastName: 'Korj',
    email: 'korjyojp@gmail.com',
    role: 'student',
  },
  {
    firstName: 'John Jethro',
    lastName: 'Israel',
    email: '2501107801@student.buksu.edu.ph',
    role: 'student',
  },
];

// ──────────────────────────────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 Starting Minimal User Seed...\n');

  try {
    // ─── Connect to MongoDB ─────────────────────────────────────────
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log(`   ✅ Connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    // ─── Clear ALL Collections ──────────────────────────────────────
    console.log('🗑  Clearing all collections...');
    const toClear = [
      { model: Evaluation, name: 'Evaluations' },
      { model: Submission, name: 'Submissions' },
      { model: Manuscript, name: 'Manuscripts' },
      { model: Plagiarism, name: 'PlagiarismResults' },
      { model: Notification, name: 'Notifications' },
      { model: AuditLog, name: 'AuditLogs' },
      { model: TeamInvite, name: 'TeamInvites' },
      { model: Project, name: 'Projects' },
      { model: Team, name: 'Teams' },
      { model: User, name: 'Users' },
      { model: OTP, name: 'OTPs' },
      { model: RefreshToken, name: 'RefreshTokens' },
      { model: Section, name: 'Sections' },
      { model: Course, name: 'Courses' },
      { model: AcademicYear, name: 'AcademicYears' },
      { model: SystemSettings, name: 'Settings' },
    ];

    for (const { model, name } of toClear) {
      const r = await model.deleteMany({});
      console.log(`   🗑  ${name.padEnd(22)} removed ${r.deletedCount}`);
    }
    console.log('');

    // ─── Create Users ───────────────────────────────────────────────
    console.log('👤 Creating users...');
    const createdUsers = [];

    for (const def of USERS_TO_CREATE) {
      const userDoc = {
        firstName: def.firstName,
        middleName: def.middleName ?? '',
        lastName: def.lastName,
        email: def.email,
        role: def.role,
        authProvider: 'local',
        isVerified: true, // Important: set to true so they can login immediately
        isActive: true,
        password: DEFAULT_PASSWORD, // Will be hashed by pre-save hook
      };

      const user = await User.create(userDoc);
      createdUsers.push(user);
      console.log(
        `   ✅ Created ${def.role.padEnd(10)} ${user.firstName} ${user.lastName} <${user.email}>`,
      );
    }

    console.log(`\n✨ Successfully created ${createdUsers.length} users!\n`);

    // ─── Summary ────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    USER CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Password for ALL users: ${DEFAULT_PASSWORD}`);
    console.log('───────────────────────────────────────────────────────────');

    for (const user of createdUsers) {
      console.log(`  ${user.role.toUpperCase().padEnd(12)} ${user.email}`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB.\n');
  }
}

// ──────────────────────────────────────────────────────────────────
// Execute
// ──────────────────────────────────────────────────────────────────

seed();
