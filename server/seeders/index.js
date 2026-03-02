/**
 * Database Seed Script — Populates the CMS database with test users,
 * teams, and projects to enable full workflow testing.
 *
 * Run via: npm run seed (from /server directory)
 *
 * Default password for ALL seeded users: Password123!
 *
 * This script is idempotent — it clears existing seeded data before inserting.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env before anything else
dotenv.config();

import User from '../modules/users/user.model.js';
import Team from '../modules/teams/team.model.js';
import Project from '../modules/projects/project.model.js';

// ──────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI;
const DEFAULT_PASSWORD = 'Password123!';
const ACADEMIC_YEAR = '2025-2026';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────
// Seed Data Definitions
// ──────────────────────────────────────────────────────────────────

/**
 * Instructor (Research Coordinator / Admin)
 * Full system oversight: manage users, archive, reports.
 */
const instructors = [
  {
    firstName: 'Maria',
    middleName: 'Cruz',
    lastName: 'Santos',
    email: 'instructor@buksu.edu.ph',
    role: 'instructor',
  },
  {
    firstName: 'Roberto',
    middleName: 'Lim',
    lastName: 'Garcia',
    email: 'instructor2@buksu.edu.ph',
    role: 'instructor',
  },
];

/**
 * Advisers — Review chapter drafts, approve/reject submissions,
 * highlight & comment on documents.
 */
const advisers = [
  {
    firstName: 'Ana',
    middleName: 'Reyes',
    lastName: 'Dela Cruz',
    email: 'adviser1@buksu.edu.ph',
    role: 'adviser',
  },
  {
    firstName: 'Jose',
    middleName: 'Bautista',
    lastName: 'Mendoza',
    email: 'adviser2@buksu.edu.ph',
    role: 'adviser',
  },
];

/**
 * Panelists (Co-Panel) — View drafted topics, select groups,
 * grade/evaluate defenses.
 */
const panelists = [
  {
    firstName: 'Elena',
    middleName: 'Villanueva',
    lastName: 'Ramos',
    email: 'panelist1@buksu.edu.ph',
    role: 'panelist',
  },
  {
    firstName: 'Carlos',
    middleName: 'Aquino',
    lastName: 'Torres',
    email: 'panelist2@buksu.edu.ph',
    role: 'panelist',
  },
  {
    firstName: 'Patricia',
    middleName: 'Luna',
    lastName: 'Fernandez',
    email: 'panelist3@buksu.edu.ph',
    role: 'panelist',
  },
];

/**
 * Students — 12 total, enough for 3 full teams of 4.
 * Team Alpha (students 1–4), Team Beta (students 5–8), Team Gamma (students 9–12).
 */
const students = [
  // ── Team Alpha ──
  {
    firstName: 'Juan',
    middleName: 'Miguel',
    lastName: 'Reyes',
    email: 'student1@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Maria',
    middleName: 'Clara',
    lastName: 'Lopez',
    email: 'student2@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Pedro',
    middleName: 'Jose',
    lastName: 'Alvarez',
    email: 'student3@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Angela',
    middleName: 'Rose',
    lastName: 'Castillo',
    email: 'student4@buksu.edu.ph',
    role: 'student',
  },

  // ── Team Beta ──
  {
    firstName: 'Marco',
    middleName: 'Luis',
    lastName: 'Rivera',
    email: 'student5@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Sofia',
    middleName: 'Grace',
    lastName: 'Navarro',
    email: 'student6@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Diego',
    middleName: 'Antonio',
    lastName: 'Romero',
    email: 'student7@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Isabel',
    middleName: 'Marie',
    lastName: 'Santos',
    email: 'student8@buksu.edu.ph',
    role: 'student',
  },

  // ── Team Gamma ──
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

  // ── Orphaned student (no team — for testing adoption/invite flow) ──
  {
    firstName: 'Kevin',
    middleName: 'Paul',
    lastName: 'Tan',
    email: 'student13@buksu.edu.ph',
    role: 'student',
  },
];

// ──────────────────────────────────────────────────────────────────
// Team & Project definitions (populated with ObjectIds after user creation)
// ──────────────────────────────────────────────────────────────────

const teamDefinitions = [
  {
    name: 'Team Alpha',
    leaderIndex: 0, // student1 = leader
    memberIndices: [0, 1, 2, 3],
    project: {
      title: 'Capstone Management System with Integrated Plagiarism Checker',
      abstract:
        'A web-based platform for managing capstone projects across multiple phases with built-in originality checking and document archiving for academic institutions.',
      keywords: [
        'capstone management',
        'plagiarism checker',
        'document archiving',
        'MERN stack',
        'academic workflow',
      ],
      capstonePhase: 1,
      titleStatus: 'approved',
      projectStatus: 'active',
      adviserIndex: 0, // adviser1
      panelistIndices: [0, 1], // panelist1, panelist2
    },
  },
  {
    name: 'Team Beta',
    leaderIndex: 4, // student5 = leader
    memberIndices: [4, 5, 6, 7],
    project: {
      title: 'Smart Campus Navigation Application Using Indoor Positioning Technology',
      abstract:
        'A mobile application that assists students and visitors in navigating the campus using Bluetooth beacons and augmented reality for indoor wayfinding.',
      keywords: [
        'indoor navigation',
        'augmented reality',
        'BLE beacons',
        'mobile app',
        'campus mapping',
      ],
      capstonePhase: 1,
      titleStatus: 'submitted',
      projectStatus: 'active',
      adviserIndex: 1, // adviser2
      panelistIndices: [1, 2], // panelist2, panelist3
    },
  },
  {
    name: 'Team Gamma',
    leaderIndex: 8, // student9 = leader
    memberIndices: [8, 9, 10, 11],
    project: {
      title: 'Automated Class Scheduling System Using Genetic Algorithm Optimization',
      abstract:
        'An intelligent scheduling tool that optimizes classroom allocation and instructor timetabling using genetic algorithms to minimize conflicts and maximize resource utilization.',
      keywords: [
        'class scheduling',
        'genetic algorithm',
        'optimization',
        'timetabling',
        'resource allocation',
      ],
      capstonePhase: 1,
      titleStatus: 'draft',
      projectStatus: 'active',
      adviserIndex: null, // not yet assigned
      panelistIndices: [],
    },
  },
];

// ──────────────────────────────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 CMS Database Seeder');
  console.log('━'.repeat(60));

  // 1. Connect to MongoDB
  console.log(`\n📡 Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI, { autoIndex: true });
  console.log(`   ✅ Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  // 2. Collect all seeded emails for cleanup
  const allEmails = [
    ...instructors.map((u) => u.email),
    ...advisers.map((u) => u.email),
    ...panelists.map((u) => u.email),
    ...students.map((u) => u.email),
  ];

  // 3. Clean up previous seed data
  console.log('\n🧹 Cleaning previous seed data...');

  // Find existing seeded users to clean up their teams and projects
  const existingUsers = await User.find({ email: { $in: allEmails } }).select('_id teamId');
  const existingUserIds = existingUsers.map((u) => u._id);
  const existingTeamIds = existingUsers.map((u) => u.teamId).filter(Boolean);

  if (existingTeamIds.length > 0) {
    // Delete projects tied to these teams
    const deletedProjects = await Project.deleteMany({ teamId: { $in: existingTeamIds } });
    console.log(`   Removed ${deletedProjects.deletedCount} project(s)`);

    // Delete the teams themselves
    const deletedTeams = await Team.deleteMany({ _id: { $in: existingTeamIds } });
    console.log(`   Removed ${deletedTeams.deletedCount} team(s)`);
  }

  // Delete the users
  const deletedUsers = await User.deleteMany({ email: { $in: allEmails } });
  console.log(`   Removed ${deletedUsers.deletedCount} user(s)`);

  // 4. Create users
  console.log('\n👤 Creating users...');

  const allUserDefs = [...instructors, ...advisers, ...panelists, ...students];

  const createdUsers = [];
  for (const userDef of allUserDefs) {
    const user = await User.create({
      ...userDef,
      password: DEFAULT_PASSWORD,
      authProvider: 'local',
      isVerified: true,
      isActive: true,
    });
    createdUsers.push(user);
  }

  // Map created users by role for easy access
  const createdInstructors = createdUsers.filter((u) => u.role === 'instructor');
  const createdAdvisers = createdUsers.filter((u) => u.role === 'adviser');
  const createdPanelists = createdUsers.filter((u) => u.role === 'panelist');
  const createdStudents = createdUsers.filter((u) => u.role === 'student');

  console.log(`   ✅ ${createdInstructors.length} instructor(s)`);
  console.log(`   ✅ ${createdAdvisers.length} adviser(s)`);
  console.log(`   ✅ ${createdPanelists.length} panelist(s)`);
  console.log(`   ✅ ${createdStudents.length} student(s)`);

  // 5. Create teams and projects
  console.log('\n🏗️  Creating teams and projects...');

  for (const teamDef of teamDefinitions) {
    const leader = createdStudents[teamDef.leaderIndex];
    const members = teamDef.memberIndices.map((i) => createdStudents[i]);
    const memberIds = members.map((m) => m._id);

    // Create team
    const team = await Team.create({
      name: teamDef.name,
      leaderId: leader._id,
      members: memberIds,
      isLocked: false,
      academicYear: ACADEMIC_YEAR,
    });

    // Update each member's teamId
    await User.updateMany({ _id: { $in: memberIds } }, { $set: { teamId: team._id } });

    console.log(
      `   ✅ ${team.name} — ${members.map((m) => m.firstName).join(', ')} (leader: ${leader.firstName})`,
    );

    // Create project for this team
    const projectDef = teamDef.project;
    const adviserId =
      projectDef.adviserIndex !== null ? createdAdvisers[projectDef.adviserIndex]._id : null;
    const panelistIds = projectDef.panelistIndices.map((i) => createdPanelists[i]._id);

    // Set realistic deadlines (30-day intervals from now)
    const now = new Date();
    const deadline = (daysFromNow) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysFromNow);
      return d;
    };

    const project = await Project.create({
      teamId: team._id,
      title: projectDef.title,
      abstract: projectDef.abstract,
      keywords: projectDef.keywords,
      academicYear: ACADEMIC_YEAR,
      capstonePhase: projectDef.capstonePhase,
      titleStatus: projectDef.titleStatus,
      projectStatus: projectDef.projectStatus,
      adviserId,
      panelistIds,
      deadlines: {
        chapter1: deadline(14),
        chapter2: deadline(28),
        chapter3: deadline(42),
        proposal: deadline(56),
        chapter4: deadline(70),
        chapter5: deadline(84),
        defense: deadline(98),
      },
    });

    console.log(
      `   📋 Project: "${project.title.substring(0, 50)}..." [${projectDef.titleStatus}]`,
    );
  }

  // 6. Print credentials table
  console.log('\n' + '━'.repeat(60));
  console.log('📋 SEEDED USER CREDENTIALS');
  console.log('━'.repeat(60));
  console.log(`   Password for ALL users: ${DEFAULT_PASSWORD}`);
  console.log('━'.repeat(60));

  console.log('\n   INSTRUCTORS (Admin):');
  for (const u of createdInstructors) {
    console.log(`   📧 ${u.email.padEnd(32)} ${u.firstName} ${u.lastName}`);
  }

  console.log('\n   ADVISERS:');
  for (const u of createdAdvisers) {
    console.log(`   📧 ${u.email.padEnd(32)} ${u.firstName} ${u.lastName}`);
  }

  console.log('\n   PANELISTS:');
  for (const u of createdPanelists) {
    console.log(`   📧 ${u.email.padEnd(32)} ${u.firstName} ${u.lastName}`);
  }

  console.log('\n   STUDENTS:');
  // Re-fetch students to capture teamId set during team creation
  const refreshedStudents = await User.find({
    _id: { $in: createdStudents.map((s) => s._id) },
  }).sort({ email: 1 });
  for (const u of refreshedStudents) {
    const teamLabel = u.teamId ? '(in team)' : '(orphaned)';
    console.log(`   📧 ${u.email.padEnd(32)} ${u.firstName} ${u.lastName} ${teamLabel}`);
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Seeding complete!');
  console.log(`   Total users:    ${createdUsers.length}`);
  console.log(`   Total teams:    ${teamDefinitions.length}`);
  console.log(`   Total projects: ${teamDefinitions.length}`);
  console.log('━'.repeat(60) + '\n');

  // 7. Disconnect
  await mongoose.disconnect();
  console.log('📡 Disconnected from MongoDB.\n');
}

// ──────────────────────────────────────────────────────────────────
// Execute
// ──────────────────────────────────────────────────────────────────

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
