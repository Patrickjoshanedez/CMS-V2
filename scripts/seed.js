#!/usr/bin/env node
/**
 * ==============================================================================
 * BUKSU CAPSTONE MANAGEMENT SYSTEM (CMS-V2)
 * Comprehensive Database Reset & Seeding Engine
 * ==============================================================================
 *
 * Senior Backend Engineering Standard:
 * - Drops / clears all MongoDB collections for an idempotent clean slate.
 * - Seeds academic baseline (Academic Year, BSIT Course, Class Sections).
 * - Seeds realistic multi-role user accounts:
 *     * 2 Admins / Course Instructors (Full management privileges)
 *     * 4 Faculty Advisers (Assigned to monitor & guide specific groups)
 *     * 4 Defense Panelists (Assigned for rubric evaluations & oral defenses)
 *     * 18 Students across 6 distinct Capstone Groups (Phase 0 -> Phase 4)
 * - Sets up real data relationships (Teams, Member Roles, Committee Assignments,
 *   Capstone Projects, Submissions, Versioned Manuscripts for Revision Diffs).
 * - Hashes passwords securely with bcrypt (Default password: Password123!)
 * - Displays a structured, formatted credentials directory for immediate login.
 *
 * Usage:
 *   node scripts/seed.js
 *   npm run seed (if mapped in package.json)
 * ==============================================================================
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables
dotenv.config();

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Mongoose Models
import User from '../server/modules/users/user.model.js';
import Team from '../server/modules/teams/team.model.js';
import TeamInvite from '../server/modules/teams/teamInvite.model.js';
import Project from '../server/modules/projects/project.model.js';
import Submission from '../server/modules/submissions/submission.model.js';
import DefenseMinutes from '../server/modules/submissions/defenseMinutes.model.js';
import Manuscript from '../server/modules/documents/document.model.js';
import Evaluation from '../server/modules/evaluations/evaluation.model.js';
import Notification from '../server/modules/notifications/notification.model.js';
import Plagiarism from '../server/modules/plagiarism/plagiarism.model.js';
import AuditLog from '../server/modules/audit/audit.model.js';
import OTP from '../server/modules/auth/otp.model.js';
import RefreshToken from '../server/modules/auth/refreshToken.model.js';
import AcademicYear from '../server/modules/academics/academicYear.model.js';
import Course from '../server/modules/academics/course.model.js';
import Section from '../server/modules/academics/section.model.js';
import SystemSettings from '../server/modules/settings/settings.model.js';

// Configuration
const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';
const MONGODB_URI =
  process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
const DEFAULT_PASSWORD = 'Password123!';
const BCRYPT_SALT_ROUNDS = 10;
const ACADEMIC_YEAR = '2025-2026';

// Institutional Standard Capstone Roles
const ROLES_LIST = [
  'Project Lead & Systems Analyst',
  'Frontend & UI/UX Developer',
  'Backend & Database Developer',
  'QA & Technical Documentor',
];

// Helper: Formatted Console Banner
const printBanner = (title) => {
  console.log('\n' + '═'.repeat(78));
  console.log(`  ${title.toUpperCase()}`);
  console.log('═'.repeat(78));
};

// Helper: Section Divider
const printSection = (title) => {
  console.log('\n' + '─'.repeat(78));
  console.log(`▶ ${title}`);
  console.log('─'.repeat(78));
};

async function runSeed() {
  const startTime = Date.now();
  printBanner('CMS-V2 Monorepo: Database Reset & Comprehensive Seeder');
  console.log(`  Target Database URI: ${MONGODB_URI}`);
  console.log(`  Academic Year:       ${ACADEMIC_YEAR}`);
  console.log(`  Default Password:    ${DEFAULT_PASSWORD}`);

  // 1. Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log(`  Database Status:     CONNECTED to [${mongoose.connection.name}]`);
  } catch (err) {
    console.error(`\n❌ Failed to connect to MongoDB: ${err.message}`);
    process.exit(1);
  }

  // 2. Database Reset (Complete Wipe)
  printSection('Stage 1: Complete Database Wipe & Collection Purge');
  const collections = await mongoose.connection.db.collections();
  const deleteSummary = [];

  for (const collection of collections) {
    const countBefore = await collection.countDocuments();
    await collection.deleteMany({});
    deleteSummary.push({
      collection: collection.collectionName,
      clearedDocuments: countBefore,
    });
  }

  // Print deletion table
  console.table(deleteSummary);
  console.log(`✔ Cleared ${deleteSummary.length} collections with zero residual documents.`);

  // 3. Pre-compute Password Hash
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);

  // 4. Seed Academic Foundation (Course, Academic Year, Sections)
  printSection('Stage 2: Seeding Academic Foundation & Governance Catalogs');

  // Temporary admin placeholder ID for createdBy references
  const initialAdminId = new mongoose.Types.ObjectId();

  const acadYearDoc = await AcademicYear.create({
    year: ACADEMIC_YEAR,
    isActive: true,
    createdBy: initialAdminId,
  });

  const courseDoc = await Course.create({
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionA = await Section.create({
    name: 'BSIT-4A',
    code: 'IT4A',
    courseId: courseDoc._id,
    academicYear: ACADEMIC_YEAR,
    isActive: true,
    createdBy: initialAdminId,
  });

  const sectionB = await Section.create({
    name: 'BSIT-4B',
    code: 'IT4B',
    courseId: courseDoc._id,
    academicYear: ACADEMIC_YEAR,
    isActive: true,
    createdBy: initialAdminId,
  });

  console.log(`✔ Created Academic Year: [${acadYearDoc.year}]`);
  console.log(`✔ Created Course:        [${courseDoc.code}] ${courseDoc.name}`);
  console.log(`✔ Created Sections:      [${sectionA.name}] & [${sectionB.name}]`);

  // 5. Seed Admins & Instructors
  printSection('Stage 3: Seeding System Admins & Course Instructors');

  const instructorDefs = [
    {
      _id: initialAdminId,
      firstName: 'Patrick Josh',
      middleName: 'S.',
      lastName: 'Añedez',
      email: 'instructor@buksu.edu.ph',
      role: 'instructor',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Louie Jay',
      middleName: 'M.',
      lastName: 'Labastida',
      email: 'chair.instructor@buksu.edu.ph',
      role: 'instructor',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
  ];

  const seededInstructors = await User.create(instructorDefs);
  const primaryInstructor = seededInstructors[0];
  console.log(
    `✔ Created ${seededInstructors.length} Admin/Instructor accounts with full privileges.`,
  );

  // 6. Seed Faculty Advisers & Defense Panelists
  printSection('Stage 4: Seeding Faculty Committee Accounts (Advisers & Panelists)');

  const adviserDefs = [
    {
      firstName: 'Maria',
      middleName: 'A.',
      lastName: 'Santos',
      email: 'maria.santos@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'adviser',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Alan',
      middleName: 'M.',
      lastName: 'Turing',
      email: 'alan.turing@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'adviser',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Grace',
      middleName: 'B.',
      lastName: 'Hopper',
      email: 'grace.hopper@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'adviser',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Linus',
      middleName: 'B.',
      lastName: 'Torvalds',
      email: 'linus.torvalds@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'adviser',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
  ];

  const seededAdvisers = await User.create(adviserDefs);
  console.log(`✔ Created ${seededAdvisers.length} Faculty Capstone Advisers.`);

  const panelistDefs = [
    {
      firstName: 'Ada',
      middleName: 'K.',
      lastName: 'Lovelace',
      email: 'ada.lovelace@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'panelist',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Dennis',
      middleName: 'M.',
      lastName: 'Ritchie',
      email: 'dennis.ritchie@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'panelist',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Ken',
      middleName: 'L.',
      lastName: 'Thompson',
      email: 'ken.thompson@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'panelist',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
    {
      firstName: 'Barbara',
      middleName: 'H.',
      lastName: 'Liskov',
      email: 'barbara.liskov@buksu.edu.ph',
      role: 'faculty',
      facultyRole: 'panelist',
      password: passwordHash,
      isVerified: true,
      isActive: true,
    },
  ];

  const seededPanelists = await User.create(panelistDefs);
  console.log(`✔ Created ${seededPanelists.length} Defense Panelists.`);

  // 7. Seed Student Groups & Projects across All Capstone Lifecycle Phases
  printSection('Stage 5: Seeding 6 Multi-Tenant Capstone Groups, Projects & Documents');

  const groupsConfig = [
    {
      teamName: 'Team Alpha',
      section: sectionA,
      phase: 1, // Capstone 1: Title Defense & Proposals
      adviser: seededAdvisers[0],
      panelists: [seededPanelists[0], seededPanelists[1], seededPanelists[2]],
      lead: { firstName: 'Aaron', lastName: 'Alvarez', email: 'alpha.lead@student.buksu.edu.ph' },
      members: [
        { firstName: 'Angelica', lastName: 'Aquino', email: 'alpha.dev1@student.buksu.edu.ph' },
        { firstName: 'Anthony', lastName: 'Arce', email: 'alpha.dev2@student.buksu.edu.ph' },
      ],
      project: {
        title: 'Smart Agritech Yield Forecasting & Soil Sensing Web Portal for Bukidnon',
        abstract:
          'An IoT and AI driven platform that forecasts crop yields based on telemetry data and soil sensor metrics.',
        keywords: ['IoT', 'Agriculture', 'Yield Forecasting', 'BukSU'],
        sdgGoals: [2, 9, 12],
        titleStatus: 'approved',
        projectStatus: 'active',
      },
    },
    {
      teamName: 'Team Beta',
      section: sectionA,
      phase: 2, // Capstone 2: Chapters 1-3 Manuscript & Plagiarism Check
      adviser: seededAdvisers[1],
      panelists: [seededPanelists[1], seededPanelists[2], seededPanelists[3]],
      lead: { firstName: 'Bea', lastName: 'Bernardo', email: 'beta.lead@student.buksu.edu.ph' },
      members: [
        { firstName: 'Bryan', lastName: 'Bautista', email: 'beta.dev1@student.buksu.edu.ph' },
        { firstName: 'Bianca', lastName: 'Beltran', email: 'beta.dev2@student.buksu.edu.ph' },
      ],
      project: {
        title: 'BukSU Campus Intelligent Navigation and Facility Booking Mobile Application',
        abstract:
          'Augmented reality mobile application providing indoor turn-by-turn guidance and dynamic lab booking.',
        keywords: ['Navigation', 'AR', 'Campus Facilities', 'Indoor Mapping'],
        sdgGoals: [4, 9, 11],
        titleStatus: 'approved',
        projectStatus: 'active',
      },
    },
    {
      teamName: 'Team Gamma',
      section: sectionB,
      phase: 3, // Capstone 3: Prototype & Progress Defense
      adviser: seededAdvisers[2],
      panelists: [seededPanelists[0], seededPanelists[2], seededPanelists[3]],
      lead: { firstName: 'Carlos', lastName: 'Cruz', email: 'gamma.lead@student.buksu.edu.ph' },
      members: [
        { firstName: 'Catherine', lastName: 'Castillo', email: 'gamma.dev1@student.buksu.edu.ph' },
        { firstName: 'Crisanto', lastName: 'Cortez', email: 'gamma.dev2@student.buksu.edu.ph' },
      ],
      project: {
        title: 'Automated Drone-Assisted Forest Fire Early Detection System with Edge AI',
        abstract:
          'Thermal camera edge computing units mounted on patrol drones to detect forest ignition spots in real-time.',
        keywords: ['Edge AI', 'Computer Vision', 'Fire Detection', 'Drones'],
        sdgGoals: [13, 15],
        titleStatus: 'approved',
        projectStatus: 'active',
      },
    },
    {
      teamName: 'Team Delta',
      section: sectionB,
      phase: 4, // Capstone 4: Final Defense, Secretary ADM Endorsement & Archival Ready
      adviser: seededAdvisers[3],
      panelists: [seededPanelists[0], seededPanelists[1], seededPanelists[3]],
      lead: { firstName: 'Daniel', lastName: 'Domingo', email: 'delta.lead@student.buksu.edu.ph' },
      members: [
        { firstName: 'Diana', lastName: 'David', email: 'delta.dev1@student.buksu.edu.ph' },
        { firstName: 'Dexter', lastName: 'Dela Cruz', email: 'delta.dev2@student.buksu.edu.ph' },
      ],
      project: {
        title: 'Decentralized Academic Credential Verification Engine Using Hedera Hashgraph',
        abstract:
          'Cryptographically sealed degree certification and transcript verification platform preventing diploma fraud.',
        keywords: ['Blockchain', 'Credentials', 'Verification', 'Security'],
        sdgGoals: [4, 9, 16],
        titleStatus: 'approved',
        projectStatus: 'archived',
        admEndorsed: true,
      },
    },
    {
      teamName: 'Team Epsilon',
      section: sectionA,
      phase: 0, // Phase 0: Team Formation & Roster In-Progress
      adviser: seededAdvisers[0],
      panelists: [],
      lead: {
        firstName: 'Elena',
        lastName: 'Enriquez',
        email: 'epsilon.lead@student.buksu.edu.ph',
      },
      members: [
        { firstName: 'Ethan', lastName: 'Estrella', email: 'epsilon.dev1@student.buksu.edu.ph' },
        { firstName: 'Emma', lastName: 'Espina', email: 'epsilon.dev2@student.buksu.edu.ph' },
      ],
      project: null, // Still forming team, no submitted proposal
    },
    {
      teamName: 'Team Zeta',
      section: sectionB,
      phase: 2, // Testing Revisions, Diffs, and Multi-Tenant Document Viewer
      adviser: seededAdvisers[1],
      panelists: [seededPanelists[0], seededPanelists[1], seededPanelists[2]],
      lead: { firstName: 'Zachary', lastName: 'Zuniga', email: 'zeta.lead@student.buksu.edu.ph' },
      members: [
        { firstName: 'Zoe', lastName: 'Zamora', email: 'zeta.dev1@student.buksu.edu.ph' },
        { firstName: 'Zaldy', lastName: 'Zapata', email: 'zeta.dev2@student.buksu.edu.ph' },
      ],
      project: {
        title:
          'Microservices-Based Capstone Portfolio Management with Real-Time Plagiarism Scanner',
        abstract:
          'An automated academic orchestration platform with semantic Winnowing fingerprinting and instant diffing.',
        keywords: ['Plagiarism', 'Microservices', 'Diff Viewer', 'Capstone'],
        sdgGoals: [4, 9],
        titleStatus: 'approved',
        projectStatus: 'active',
      },
    },
  ];

  const seededStudentAccounts = [];
  const seededTeams = [];
  const seededProjects = [];

  for (const grp of groupsConfig) {
    // A. Create Student Accounts
    const leadUser = await User.create({
      ...grp.lead,
      role: 'student',
      password: passwordHash,
      isVerified: true,
      isActive: true,
      sectionId: grp.section._id,
      instructorId: primaryInstructor._id,
    });
    seededStudentAccounts.push({ ...grp.lead, role: 'student (Lead)', team: grp.teamName });

    const memberUsers = [];
    for (const m of grp.members) {
      const memDoc = await User.create({
        ...m,
        role: 'student',
        password: passwordHash,
        isVerified: true,
        isActive: true,
        sectionId: grp.section._id,
        instructorId: primaryInstructor._id,
      });
      memberUsers.push(memDoc);
      seededStudentAccounts.push({ ...m, role: 'student (Member)', team: grp.teamName });
    }

    const allMemberDocs = [leadUser, ...memberUsers];
    const allMemberIds = allMemberDocs.map((u) => u._id);

    // B. Build Role Assignments
    const memberRoles = allMemberDocs.map((u, idx) => ({
      userId: u._id,
      role: ROLES_LIST[idx % ROLES_LIST.length],
    }));

    // C. Committee Structure
    const committee = {
      adviserId: grp.adviser ? grp.adviser._id : null,
      panelists: grp.panelists.map((p, idx) => ({
        panelistId: p._id,
        role: idx === 0 ? 'chair' : idx === 1 ? 'member' : 'secretary',
      })),
      assignedBy: primaryInstructor._id,
      assignedAt: new Date(),
    };

    // D. Create Team
    const teamDoc = await Team.create({
      name: grp.teamName,
      leaderId: leadUser._id,
      members: allMemberIds,
      memberRoles,
      isLocked: grp.phase > 0,
      academicYear: ACADEMIC_YEAR,
      courseId: courseDoc._id,
      sectionId: grp.section._id,
      committee: grp.phase > 0 ? committee : undefined,
    });
    seededTeams.push(teamDoc);

    // Link teamId back to users
    await User.updateMany({ _id: { $in: allMemberIds } }, { $set: { teamId: teamDoc._id } });

    // E. Create Project if applicable
    if (grp.project) {
      const panelAssignments = grp.panelists.map((p, idx) => ({
        panelistId: p._id,
        role: idx === 0 ? 'chair' : idx === 1 ? 'member' : 'secretary',
      }));

      const projectDoc = await Project.create({
        title: grp.project.title,
        abstract: grp.project.abstract,
        keywords: grp.project.keywords,
        sdgGoals: grp.project.sdgGoals,
        teamId: teamDoc._id,
        adviserId: grp.adviser._id,
        panelists: panelAssignments,
        capstonePhase: grp.phase,
        projectStatus: grp.project.projectStatus || 'active',
        titleStatus: grp.project.titleStatus || 'approved',
        admSignatures: grp.project.admEndorsed
          ? {
              secretary: {
                endorsed: true,
                endorsedBy: grp.panelists[2]._id,
                endorsedAt: new Date(),
              },
              adviser: {
                signed: true,
                signedBy: grp.adviser._id,
                signedAt: new Date(),
              },
            }
          : undefined,
      });
      seededProjects.push(projectDoc);

      // F. Create Submissions & Manuscripts (with Revisions for Diff testing)
      const chapter1Doc = await Manuscript.create({
        projectId: projectDoc._id,
        documentType: 'chapter1',
        title: `${grp.teamName} - Chapter 1: Introduction and Background`,
        originalFileName: `${grp.teamName.replace(/\s+/g, '_')}_Chapter1.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        content: `Chapter 1: Problem Statement and Rationale.\n\n${grp.project.abstract}\n\nThe proposed system addresses key operational bottlenecks in BukSU by automating academic workflows and capstone verification.`,
      });

      // Seed initial submission
      const sub1 = await Submission.create({
        projectId: projectDoc._id,
        chapter: 1,
        title: `Initial Chapter 1 Draft`,
        documentType: 'chapter1',
        manuscriptId: chapter1Doc._id,
        version: 1,
        fileUrl: `https://storage.buksu.edu.ph/capstone/${projectDoc._id}/chapter1_v1.docx`,
        fileSize: 245760,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        submittedBy: leadUser._id,
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        status: grp.phase >= 2 ? 'approved' : 'submitted',
      });

      // For Team Beta & Team Zeta: Create Version 2 to test Automated Revision Reader & Diff Mode
      if (grp.teamName === 'Team Beta' || grp.teamName === 'Team Zeta') {
        await Submission.create({
          projectId: projectDoc._id,
          chapter: 1,
          title: `Revised Chapter 1 - Committee Feedback Addressed`,
          documentType: 'chapter1',
          manuscriptId: chapter1Doc._id,
          version: 2,
          fileUrl: `https://storage.buksu.edu.ph/capstone/${projectDoc._id}/chapter1_v2.docx`,
          fileSize: 258048,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          submittedBy: leadUser._id,
          submittedAt: new Date(),
          status: 'under_review',
        });
      }

      // Seed Plagiarism Scan Record
      await Plagiarism.create({
        projectId: projectDoc._id,
        submissionId: sub1._id,
        overallSimilarity: grp.phase === 4 ? 8.4 : 14.2,
        winnowingSimilarity: grp.phase === 4 ? 6.1 : 12.0,
        semanticSimilarity: grp.phase === 4 ? 10.7 : 16.4,
        status: 'completed',
        scannedAt: new Date(),
        matchedSources: [
          {
            projectTitle: 'BukSU Archival Repository Index 2024',
            matchPercentage: 4.2,
          },
        ],
      });
    }

    console.log(`  ✔ Seeded [${grp.teamName}] (Phase ${grp.phase}) -> Leader: ${grp.lead.email}`);
  }

  // 8. Print Complete Credentials Directory
  printBanner('System User Credentials Directory (Immediate Testing Access)');
  console.log('  Default Password for ALL seeded accounts: ' + DEFAULT_PASSWORD + '\n');

  const credentialsTable = [];

  // Instructors
  for (const u of seededInstructors) {
    credentialsTable.push({
      Role: 'Admin / Instructor',
      Name: `${u.firstName} ${u.lastName}`,
      Email: u.email,
      Department: 'College of Technologies (BSIT)',
      Assignment: 'System-Wide Admin & Section Adviser',
    });
  }

  // Advisers
  for (const u of seededAdvisers) {
    credentialsTable.push({
      Role: 'Faculty Adviser',
      Name: `${u.firstName} ${u.lastName}`,
      Email: u.email,
      Department: 'Information Technology Dept.',
      Assignment: 'Assigned Capstone Adviser',
    });
  }

  // Panelists
  for (const u of seededPanelists) {
    credentialsTable.push({
      Role: 'Defense Panelist',
      Name: `${u.firstName} ${u.lastName}`,
      Email: u.email,
      Department: 'Information Technology Dept.',
      Assignment: 'Defense Evaluation & Grading Panel',
    });
  }

  // Student Leads
  for (const s of seededStudentAccounts) {
    credentialsTable.push({
      Role: s.role,
      Name: `${s.firstName} ${s.lastName}`,
      Email: s.email,
      Department: 'BSIT 4th Year',
      Assignment: `Team: ${s.team}`,
    });
  }

  console.table(credentialsTable);

  // 9. Summary Metrics
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  printBanner('Database Seeding Completed Successfully');
  console.log(`  Total Users Seeded:        ${credentialsTable.length}`);
  console.log(`    - Admins/Instructors:    ${seededInstructors.length}`);
  console.log(`    - Faculty Advisers:      ${seededAdvisers.length}`);
  console.log(`    - Defense Panelists:     ${seededPanelists.length}`);
  console.log(`    - Students (in 6 teams): ${seededStudentAccounts.length}`);
  console.log(`  Teams Seeded:              ${seededTeams.length}`);
  console.log(`  Projects Seeded:           ${seededProjects.length}`);
  console.log(`  Time Elapsed:              ${elapsed}s`);
  console.log('═'.repeat(78) + '\n');

  await mongoose.disconnect();
  console.log('📡 Disconnected cleanly from MongoDB.\n');
}

// Execute and handle runtime errors
runSeed().catch((err) => {
  console.error('\n❌ Fatal Seeding Failure:');
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
