/**
 * Minimal Seed Script — Upserts core users + current-year scenario users
 *
 * Run via: node server/seeders/seed-users-only.js (from project root)
 * Or:      npm run seed:users (if you add the script to package.json)
 *
 * Default password for ALL seeded users: Password123!
 *
 * Non-destructive behavior:
 * - Does NOT clear any collections
 * - Updates existing users by email
 * - Creates missing users
 *
 * Includes:
 * - Core faculty accounts
 * - Current-year student accounts used in seed scenarios
 * - Edge-case scenario users (orphan complete, no section, no adviser,
 *   inactive, unverified, google oauth)
 */
/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../modules/users/user.model.js';

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
// User Definitions
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
  {
    firstName: 'Lara',
    middleName: 'Mae',
    lastName: 'Quintero',
    email: 'lara.mae.quintero@student.buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Rafael',
    middleName: 'James',
    lastName: 'Cruz',
    email: 'student9@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Camille',
    middleName: 'Anne',
    lastName: 'Morales',
    email: 'student10@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Gabriel',
    middleName: 'Mark',
    lastName: 'Diaz',
    email: 'student11@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Nicole',
    middleName: 'Faith',
    lastName: 'Aguilar',
    email: 'student12@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Kevin',
    middleName: 'Paul',
    lastName: 'Tan',
    email: 'student13@buksu.edu.ph',
    role: 'student',
  },
  // Scenario users from full seeder (current-year edge cases)
  {
    firstName: 'Lara',
    middleName: 'Mae',
    lastName: 'Quintero',
    email: 'scenario.orphan.complete@buksu.edu.ph',
    role: 'student',
    isVerified: true,
    isActive: true,
  },
  {
    firstName: 'Noel',
    middleName: 'Ivan',
    lastName: 'Misa',
    email: 'scenario.no.section@buksu.edu.ph',
    role: 'student',
    isVerified: true,
    isActive: true,
  },
  {
    firstName: 'Priya',
    middleName: 'S.',
    lastName: 'Ramos',
    email: 'scenario.no.adviser@buksu.edu.ph',
    role: 'student',
    isVerified: true,
    isActive: true,
  },
  {
    firstName: 'Tim',
    middleName: 'Alex',
    lastName: 'Uy',
    email: 'scenario.inactive@buksu.edu.ph',
    role: 'student',
    isVerified: true,
    isActive: false,
  },
  {
    firstName: 'Mika',
    middleName: 'Joy',
    lastName: 'Abarca',
    email: 'scenario.unverified@buksu.edu.ph',
    role: 'student',
    isVerified: false,
    isActive: true,
  },
  {
    firstName: 'Gio',
    middleName: 'Lee',
    lastName: 'Tan',
    email: 'scenario.google@buksu.edu.ph',
    role: 'student',
    isVerified: true,
    isActive: true,
    authProvider: 'google',
    googleId: 'google-seed-scenario-001',
  },
];

// ──────────────────────────────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\nStarting minimal user seed...\n');

  try {
    // ─── Connect to MongoDB ─────────────────────────────────────────
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    // ─── Create/Update Users (idempotent upsert flow) ──────────────
    console.log('Upserting users...');
    const createdUsers = [];
    const updatedUsers = [];

    for (const def of USERS_TO_CREATE) {
      const email = def.email.toLowerCase().trim();
      const authProvider = def.authProvider || 'local';
      const isGoogle = authProvider === 'google';

      const upsertResult = await User.updateOne(
        { email },
        {
          $set: {
            firstName: def.firstName,
            middleName: def.middleName ?? '',
            lastName: def.lastName,
            role: def.role,
            authProvider,
            isVerified: def.isVerified ?? true,
            isActive: def.isActive ?? true,
            ...(def.role === 'student' ? { teamId: null } : {}),
            ...(isGoogle ? { googleId: def.googleId } : {}),
          },
          $setOnInsert: { email },
          ...(isGoogle ? {} : { $unset: { googleId: '' } }),
        },
        { upsert: true, runValidators: true },
      );

      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new Error(`Failed to load upserted user: ${email}`);
      }

      if (isGoogle) {
        user.password = undefined;
      } else {
        user.password = DEFAULT_PASSWORD;
      }
      await user.save();

      const marker = upsertResult.upsertedCount > 0 ? 'created' : 'updated';
      if (marker === 'created') {
        createdUsers.push(user);
      } else {
        updatedUsers.push(user);
      }

      console.log(
        `  [${marker}] ${def.role.padEnd(10)} ${user.firstName} ${user.lastName} <${user.email}> ` +
          `[auth=${user.authProvider}, active=${user.isActive}, verified=${user.isVerified}]`,
      );
    }

    console.log(`\nDone. Created: ${createdUsers.length}, Updated: ${updatedUsers.length}\n`);

    // ─── Summary ────────────────────────────────────────────────────
    console.log('==========================================================');
    console.log('                    USER CREDENTIALS');
    console.log('==========================================================');
    console.log(`  Password for LOCAL users: ${DEFAULT_PASSWORD}`);
    console.log('  Google OAuth account(s) are seeded without a local password.');
    console.log('----------------------------------------------------------');

    for (const user of [...createdUsers, ...updatedUsers]) {
      console.log(
        `  ${user.role.toUpperCase().padEnd(12)} ${user.email} ` +
          `[${user.authProvider}, ${user.isActive ? 'active' : 'inactive'}, ${user.isVerified ? 'verified' : 'unverified'}]`,
      );
    }

    console.log('==========================================================\n');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.\n');
  }
}

// ──────────────────────────────────────────────────────────────────
// Execute
// ──────────────────────────────────────────────────────────────────

seed();
