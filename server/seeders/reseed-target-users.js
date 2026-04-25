/**
 * reseed-target-users.js
 *
 * Deletes the 7 specified accounts from the database and recreates them
 * fresh with password: Password123!
 *
 * Run from project root:
 *   node server/seeders/reseed-target-users.js
 */
/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

import User from '../modules/users/user.model.js';

// ──────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────

const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
const DEFAULT_PASSWORD = 'Password123!';

// ──────────────────────────────────────────────────────────────────
// Target accounts to DELETE then RESEED
// ──────────────────────────────────────────────────────────────────

const TARGET_USERS = [
  // Faculty
  {
    firstName: 'Leon',
    lastName: 'Mentor',
    email: 'leon.mentor.buksu@gmail.com',
    role: 'adviser',
  },
  {
    firstName: 'Steven Joe',
    lastName: 'Bautista',
    email: '2301105311@student.buksu.edu.ph',
    role: 'panelist',
  },
  // Students
  {
    firstName: 'Bennettchristiangeofferdon',
    lastName: 'User',
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
    lastName: 'Student',
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

const TARGET_EMAILS = TARGET_USERS.map((u) => u.email.toLowerCase().trim());

// ──────────────────────────────────────────────────────────────────
// Connection helper
// ──────────────────────────────────────────────────────────────────

const connect = async () => {
  const fallback = process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
  const candidates = [...new Set([MONGODB_URI, fallback].filter(Boolean))];

  for (const uri of candidates) {
    try {
      console.log(`Connecting to MongoDB: ${uri}`);
      await mongoose.connect(uri);
      return;
    } catch (err) {
      console.warn(`  ✗ Failed (${uri}): ${err.message}`);
    }
  }
  throw new Error('Could not connect to MongoDB with any candidate URI.');
};

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       Targeted Delete + Reseed Script            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  try {
    await connect();
    console.log(`✔ Connected to ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    // ── Step 1: Delete existing accounts ──────────────────────────
    console.log('── Step 1: Deleting target accounts ──────────────────');
    const deleteResult = await User.deleteMany({ email: { $in: TARGET_EMAILS } });
    console.log(`  Deleted ${deleteResult.deletedCount} user(s).\n`);

    // ── Step 2: Recreate accounts ──────────────────────────────────
    console.log('── Step 2: Creating fresh accounts ───────────────────');
    const created = [];

    for (const def of TARGET_USERS) {
      const email = def.email.toLowerCase().trim();

      // Build new User document (without password so pre-save hook hashes it)
      const user = new User({
        firstName: def.firstName,
        middleName: def.middleName ?? '',
        lastName: def.lastName,
        email,
        role: def.role,
        authProvider: 'local',
        isVerified: true,
        isActive: true,
        ...(def.role === 'student' ? { teamId: null } : {}),
      });

      // Assign plain-text password — the model's pre-save hook will hash it
      user.password = DEFAULT_PASSWORD;
      await user.save();

      created.push(user);
      console.log(
        `  [created] ${def.role.padEnd(10)} ${user.firstName} ${user.lastName} <${user.email}>`,
      );
    }

    // ── Summary ────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('                    CREDENTIALS SUMMARY');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  Password for ALL recreated users: ${DEFAULT_PASSWORD}`);
    console.log('──────────────────────────────────────────────────────');

    for (const u of created) {
      console.log(`  ${u.role.toUpperCase().padEnd(12)} ${u.email}`);
    }

    console.log('══════════════════════════════════════════════════════\n');
    console.log(`✔ Done. ${created.length} accounts recreated successfully.\n`);
  } catch (err) {
    console.error('\n✗ Script failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
