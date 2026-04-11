/**
 * Seed exactly 5 orphaned student users (non-destructive).
 *
 * Run via: npm run seed:orphans (from /server)
 * Or:      npm run seed:orphans (from repo root)
 */
/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../modules/users/user.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = 'Password123!';

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

const ORPHANED_USERS = [
  {
    firstName: 'Orphan',
    middleName: 'A',
    lastName: 'Student',
    email: 'orphan.student.1@buksu.edu.ph',
  },
  {
    firstName: 'Orphan',
    middleName: 'B',
    lastName: 'Student',
    email: 'orphan.student.2@buksu.edu.ph',
  },
  {
    firstName: 'Orphan',
    middleName: 'C',
    lastName: 'Student',
    email: 'orphan.student.3@buksu.edu.ph',
  },
  {
    firstName: 'Orphan',
    middleName: 'D',
    lastName: 'Student',
    email: 'orphan.student.4@buksu.edu.ph',
  },
  {
    firstName: 'Orphan',
    middleName: 'E',
    lastName: 'Student',
    email: 'orphan.student.5@buksu.edu.ph',
  },
];

async function seedOrphanedUsers() {
  let createdCount = 0;
  let updatedCount = 0;

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { autoIndex: true });

    for (const userDef of ORPHANED_USERS) {
      const email = userDef.email.toLowerCase().trim();

      const upsertResult = await User.updateOne(
        { email },
        {
          $set: {
            firstName: userDef.firstName,
            middleName: userDef.middleName,
            lastName: userDef.lastName,
            role: 'student',
            authProvider: 'local',
            isVerified: true,
            isActive: true,
            teamId: null,
            sectionId: null,
            instructorId: null,
          },
          $setOnInsert: { email },
          $unset: { googleId: '' },
        },
        { upsert: true, runValidators: true },
      );

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error(`Failed to load upserted user: ${email}`);
      }

      user.password = DEFAULT_PASSWORD;
      await user.save();

      if (upsertResult.upsertedCount > 0) {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }
    }

    const seededEmails = ORPHANED_USERS.map((u) => u.email.toLowerCase());
    const orphanCount = await User.countDocuments({
      email: { $in: seededEmails },
      role: 'student',
      teamId: null,
    });

    if (orphanCount !== ORPHANED_USERS.length) {
      throw new Error(
        `Invariant failed: expected ${ORPHANED_USERS.length} orphaned users, found ${orphanCount}.`,
      );
    }

    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Orphaned users ensured: ${orphanCount}`);
    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedOrphanedUsers();
