/**
 * Database Seed Script — Clears ALL collections then populates the CMS
 * database with test users, teams, projects, and archived projects.
 *
 * Run via: npm run seed (from /server directory)
 *
 * Default password for ALL seeded users: Password123!
 *
 * ─── 2025-2026 (Current Year) ───────────────────────────────────
 * Team Alpha  (student1–4)   locked, approved + panelists → Capstone 1 unlocked
 * Team Beta   (student5–8)   locked, submitted            → Proposal only
 * Team Gamma  (student9–12)  not locked, draft            → no project yet
 * student13                  orphaned
 *
 * ─── 2024-2025 (Previous Year — Archived) ────────────────────────
 * 5 completed teams (alumni1–20), each with:
 *   - capstonePhase 4, projectStatus archived, isArchived true
 *   - Full evaluations (proposal, midterm, paper, final) — status released
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import User from '../modules/users/user.model.js';
import Team from '../modules/teams/team.model.js';
import TeamInvite from '../modules/teams/teamInvite.model.js';
import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';
import { DocTemplate, ProjectDocument } from '../modules/documents/document.model.js';
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
const CURRENT_YEAR = '2025-2026';
const PREV_YEAR = '2024-2025';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────────
// Capstone title → role mapping (mirrors CAPSTONE_TITLE_MAPPING)
// ──────────────────────────────────────────────────────────────────

const TITLE_MAP = {
  'Lead Developer': {
    traditionalRole: 'Programmer',
    responsibilities: 'System Logic, Database, and Deployment.',
  },
  'Technical Lead / Analyst': {
    traditionalRole: 'Documentor',
    responsibilities: 'Research, Documentation, and Plagiarism Checks.',
  },
  'Project Manager / QA': {
    traditionalRole: 'Pitcher',
    responsibilities: 'Presentation, Testing, and Team Coordination.',
  },
  'UI/UX Designer & Researcher': {
    traditionalRole: 'All-Around',
    responsibilities: 'Frontend Design, Graphics, and Manual/User Guide.',
  },
};
const TITLES = Object.keys(TITLE_MAP);

// ──────────────────────────────────────────────────────────────────
// Evaluation rubric definitions (mirrors evaluation.service.js defaults)
// ──────────────────────────────────────────────────────────────────

const RUBRICS = {
  proposal: [
    { name: 'Problem Definition and Objectives', maxScore: 3 },
    { name: 'Presentation and Writing Quality', maxScore: 3 },
    { name: 'Originality and Innovation', maxScore: 3 },
    { name: 'Independence', maxScore: 3 },
  ],
  midterm: [
    { name: 'Completeness of Report', maxScore: 4 },
    { name: 'System Development Progress', maxScore: 4 },
    { name: 'Alignment with Objectives', maxScore: 4 },
    { name: 'Technical Quality', maxScore: 4 },
    { name: 'Documentation of Progress', maxScore: 4 },
    { name: 'Adherence to Timeline', maxScore: 4 },
    { name: 'Problem Identification and Resolution', maxScore: 4 },
    { name: 'Presentation Quality', maxScore: 4 },
  ],
  paper: [
    { name: 'Presentation of Results', maxScore: 3 },
    { name: 'Analysis and Interpretation', maxScore: 3 },
    { name: 'Summary, Conclusions and Recommendations', maxScore: 3 },
    { name: 'Presentation and Writing Quality', maxScore: 3 },
    { name: 'Independence', maxScore: 3 },
  ],
  final: [
    { name: 'System Functionality & Completeness', maxScore: 25 },
    { name: 'Technical Implementation', maxScore: 20 },
    { name: 'Documentation Quality', maxScore: 15 },
    { name: 'Innovation & Creativity', maxScore: 15 },
    { name: 'Presentation & Communication', maxScore: 15 },
    { name: 'Q&A Response', maxScore: 10 },
  ],
};

/**
 * Scores per archived team (teamIdx 0-4), panelist (pIdx 0-1), and defenseType.
 * Arrays must match the length of RUBRICS[defenseType].
 */
const ARCHIVE_SCORES = [
  // ── Team 0: Valenzuela — Online Enrollment ──
  {
    proposal: [
      [3, 3, 3, 3],
      [3, 2, 3, 3],
    ],
    midterm: [
      [4, 4, 4, 4, 4, 3, 4, 4],
      [4, 3, 4, 4, 3, 4, 3, 4],
    ],
    paper: [
      [3, 3, 3, 3, 3],
      [3, 3, 2, 3, 3],
    ],
    final: [
      [24, 18, 14, 13, 14, 9],
      [23, 19, 14, 14, 13, 10],
    ],
  },
  // ── Team 1: Balagtas — Barangay MIS ──
  {
    proposal: [
      [3, 2, 3, 2],
      [2, 3, 2, 3],
    ],
    midterm: [
      [3, 4, 3, 4, 3, 3, 4, 3],
      [4, 3, 4, 3, 4, 3, 3, 4],
    ],
    paper: [
      [3, 3, 3, 2, 3],
      [2, 3, 3, 3, 2],
    ],
    final: [
      [22, 17, 13, 12, 13, 9],
      [21, 18, 14, 11, 12, 8],
    ],
  },
  // ── Team 2: Capiz — Smart Attendance ──
  {
    proposal: [
      [3, 3, 2, 3],
      [3, 3, 3, 2],
    ],
    midterm: [
      [4, 4, 3, 4, 4, 4, 3, 4],
      [3, 4, 4, 4, 3, 4, 4, 3],
    ],
    paper: [
      [3, 3, 3, 3, 3],
      [3, 3, 3, 2, 3],
    ],
    final: [
      [23, 19, 14, 14, 13, 9],
      [24, 18, 13, 13, 14, 10],
    ],
  },
  // ── Team 3: Magalong — Agricultural Advisory ──
  {
    proposal: [
      [2, 2, 3, 3],
      [3, 2, 2, 3],
    ],
    midterm: [
      [3, 3, 4, 3, 3, 4, 3, 3],
      [3, 4, 3, 3, 4, 3, 3, 3],
    ],
    paper: [
      [3, 2, 3, 3, 3],
      [2, 3, 3, 3, 2],
    ],
    final: [
      [21, 16, 13, 12, 12, 8],
      [20, 17, 12, 13, 11, 9],
    ],
  },
  // ── Team 4: Ilagan — Library System ──
  {
    proposal: [
      [3, 3, 3, 2],
      [3, 3, 2, 3],
    ],
    midterm: [
      [4, 4, 4, 3, 4, 3, 4, 4],
      [3, 4, 3, 4, 4, 4, 3, 4],
    ],
    paper: [
      [3, 3, 3, 3, 3],
      [3, 3, 3, 3, 2],
    ],
    final: [
      [23, 18, 14, 14, 13, 9],
      [22, 19, 13, 13, 14, 8],
    ],
  },
];

// ──────────────────────────────────────────────────────────────────
// User Definitions
// ──────────────────────────────────────────────────────────────────

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

/** Indices 0-12 used by current teamDefinitions. */
const currentStudents = [
  // ── Team Alpha (0-3) ──
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
  // ── Team Beta (4-7) ──
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
  // ── Team Gamma (8-11) ──
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
  // ── Orphaned (12) ──
  {
    firstName: 'Kevin',
    middleName: 'Paul',
    lastName: 'Tan',
    email: 'student13@buksu.edu.ph',
    role: 'student',
  },
];

/** 20 alumni students for 5 archived teams (4 each). */
const archivedStudents = [
  // ── Archived Team 0: Valenzuela (0-3) ──
  {
    firstName: 'Bea',
    middleName: 'Marie',
    lastName: 'Valenzuela',
    email: 'alumni1@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Allan',
    middleName: 'Jose',
    lastName: 'Soriano',
    email: 'alumni2@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Krizzia',
    middleName: 'Ann',
    lastName: 'Lim',
    email: 'alumni3@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Renzo',
    middleName: 'Paul',
    lastName: 'Valdez',
    email: 'alumni4@buksu.edu.ph',
    role: 'student',
  },
  // ── Archived Team 1: Balagtas (4-7) ──
  {
    firstName: 'Joanna',
    middleName: 'Grace',
    lastName: 'Balagtas',
    email: 'alumni5@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Bryan',
    middleName: 'Luis',
    lastName: 'Quizon',
    email: 'alumni6@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Hannah',
    middleName: 'Rose',
    lastName: 'Chua',
    email: 'alumni7@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Erika',
    middleName: 'Faith',
    lastName: 'Punzalan',
    email: 'alumni8@buksu.edu.ph',
    role: 'student',
  },
  // ── Archived Team 2: Capiz (8-11) ──
  {
    firstName: 'Rex',
    middleName: 'Aaron',
    lastName: 'Capiz',
    email: 'alumni9@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Leah',
    middleName: 'Joy',
    lastName: 'Palacio',
    email: 'alumni10@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Adrian',
    middleName: 'Mark',
    lastName: 'Dela Torre',
    email: 'alumni11@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Kim',
    middleName: 'Nicole',
    lastName: 'Ocampo',
    email: 'alumni12@buksu.edu.ph',
    role: 'student',
  },
  // ── Archived Team 3: Magalong (12-15) ──
  {
    firstName: 'Vincent',
    middleName: 'Carlo',
    lastName: 'Magalong',
    email: 'alumni13@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Trisha',
    middleName: 'Louise',
    lastName: 'Alcantara',
    email: 'alumni14@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Ronnie',
    middleName: 'James',
    lastName: 'Espiritu',
    email: 'alumni15@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Maricel',
    middleName: 'Theresa',
    lastName: 'Bautista',
    email: 'alumni16@buksu.edu.ph',
    role: 'student',
  },
  // ── Archived Team 4: Ilagan (16-19) ──
  {
    firstName: 'Jayson',
    middleName: 'Philip',
    lastName: 'Ilagan',
    email: 'alumni17@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Liza',
    middleName: 'Anne',
    lastName: 'Peralta',
    email: 'alumni18@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Gerald',
    middleName: 'Francis',
    lastName: 'Estrada',
    email: 'alumni19@buksu.edu.ph',
    role: 'student',
  },
  {
    firstName: 'Jenny',
    middleName: 'Claire',
    lastName: 'Santiago',
    email: 'alumni20@buksu.edu.ph',
    role: 'student',
  },
];

// ──────────────────────────────────────────────────────────────────
// Team Definitions
// ──────────────────────────────────────────────────────────────────

const currentTeamDefs = [
  {
    name: 'Team Alpha',
    leaderIndex: 0,
    memberIndices: [0, 1, 2, 3],
    isLocked: true,
    sectionKey: 'A',
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
      adviserIndex: 0,
      panelistIndices: [0, 1],
    },
  },
  {
    name: 'Team Beta',
    leaderIndex: 4,
    memberIndices: [4, 5, 6, 7],
    isLocked: true,
    sectionKey: 'B',
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
      adviserIndex: 1,
      panelistIndices: [],
    },
  },
  {
    name: 'Team Gamma',
    leaderIndex: 8,
    memberIndices: [8, 9, 10, 11],
    isLocked: false,
    sectionKey: 'A',
    project: null,
  },
];

const archivedTeamDefs = [
  {
    name: 'Team Valenzuela',
    leaderIndex: 0,
    memberIndices: [0, 1, 2, 3],
    sectionKey: 'A_prev',
    project: {
      title: 'Online Enrollment System with Automated Section Balancing for State Universities',
      abstract:
        'A web-based enrollment platform that uses an automated load-balancing algorithm to evenly distribute students across available sections, reducing manual scheduling conflicts.',
      keywords: [
        'enrollment system',
        'section balancing',
        'state university',
        'academic scheduling',
        'automation',
      ],
      adviserIndex: 0,
      panelistIndices: [0, 1],
      archivedAt: new Date('2025-05-15'),
      completionNotes:
        'Project successfully passed all capstone phases. Deployed to the university intranet for pilot testing.',
    },
  },
  {
    name: 'Team Balagtas',
    leaderIndex: 4,
    memberIndices: [4, 5, 6, 7],
    sectionKey: 'B_prev',
    project: {
      title: 'Barangay Information Management System with Geo-Mapping and Resident Profiling',
      abstract:
        'A desktop-based information management system for barangay officials that digitizes resident records, blotter logs, and certificate issuances with integrated geo-mapping.',
      keywords: [
        'barangay MIS',
        'geo-mapping',
        'resident profiling',
        'local government',
        'document management',
      ],
      adviserIndex: 1,
      panelistIndices: [1, 2],
      archivedAt: new Date('2025-05-16'),
      completionNotes:
        'Delivered to partner barangay in Valencia City. End-user training conducted.',
    },
  },
  {
    name: 'Team Capiz',
    leaderIndex: 8,
    memberIndices: [8, 9, 10, 11],
    sectionKey: 'A_prev',
    project: {
      title: 'Smart Attendance Monitoring System Using QR Code and Facial Recognition Technology',
      abstract:
        'An AI-assisted attendance system combining QR code scanning and facial recognition to provide tamper-proof, real-time attendance tracking for classrooms and events.',
      keywords: ['attendance monitoring', 'QR code', 'facial recognition', 'AI', 'smart classroom'],
      adviserIndex: 0,
      panelistIndices: [0, 2],
      archivedAt: new Date('2025-05-18'),
      completionNotes:
        'Prototype approved for adoption by the IT department for faculty attendance tracking.',
    },
  },
  {
    name: 'Team Magalong',
    leaderIndex: 12,
    memberIndices: [12, 13, 14, 15],
    sectionKey: 'B_prev',
    project: {
      title:
        'Mobile-Based Agricultural Advisory System for Bukidnon Farmers Using Machine Learning',
      abstract:
        'A mobile app that provides crop disease diagnosis and soil health advisory to smallholder farmers in Bukidnon using machine learning models trained on regional agricultural data.',
      keywords: [
        'agricultural advisory',
        'machine learning',
        'crop disease',
        'Bukidnon',
        'mobile app',
      ],
      adviserIndex: 1,
      panelistIndices: [0, 1],
      archivedAt: new Date('2025-05-20'),
      completionNotes:
        'Awarded Best Capstone Project for Academic Year 2024-2025. Partnered with DA Region X for validation.',
    },
  },
  {
    name: 'Team Ilagan',
    leaderIndex: 16,
    memberIndices: [16, 17, 18, 19],
    sectionKey: 'A_prev',
    project: {
      title: 'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
      abstract:
        'A full-featured library management system offering a digital catalog, RFID-based book check-in/out, overdue tracking, and an online reservation portal for students and faculty.',
      keywords: [
        'library management',
        'RFID',
        'digital catalog',
        'book tracking',
        'reservation system',
      ],
      adviserIndex: 0,
      panelistIndices: [1, 2],
      archivedAt: new Date('2025-05-22'),
      completionNotes:
        'System deployed at the main campus library. All 5,000+ catalog entries migrated.',
    },
  },
];

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function buildRoleAssignments(memberIds) {
  return memberIds.map((userId, i) => {
    const title = TITLES[i % TITLES.length];
    return { userId, professionalTitle: title, ...TITLE_MAP[title] };
  });
}

function deadlineFrom(base, daysOffset) {
  const d = new Date(base);
  d.setDate(d.getDate() + daysOffset);
  return d;
}

/** Build scored criteria array for an evaluation. */
function buildCriteria(defenseType, scores) {
  return RUBRICS[defenseType].map((c, i) => ({
    name: c.name,
    maxScore: c.maxScore,
    score: scores[i],
    comment: '',
  }));
}

/** Sum an array of numbers. */
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

// ──────────────────────────────────────────────────────────────────
// Main Seed Function
// ──────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱 CMS Database Seeder');
  console.log('━'.repeat(60));

  console.log('\n📡 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { autoIndex: true });
  console.log(`   ✅ Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  // ── 1. Full wipe ──────────────────────────────────────────────
  console.log('\n🗑️  Clearing all collections...');
  const toClear = [
    { model: Evaluation, name: 'Evaluations' },
    { model: Submission, name: 'Submissions' },
    { model: ProjectDocument, name: 'ProjectDocuments' },
    { model: DocTemplate, name: 'DocTemplates' },
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

  // ── 2. Create users ───────────────────────────────────────────
  console.log('\n👤 Creating users...');
  const allUserDefs = [
    ...instructors,
    ...advisers,
    ...panelists,
    ...currentStudents,
    ...archivedStudents,
  ];
  const createdUsers = [];
  for (const def of allUserDefs) {
    const u = await User.create({
      firstName: def.firstName,
      middleName: def.middleName ?? '',
      lastName: def.lastName,
      email: def.email,
      role: def.role,
      password: DEFAULT_PASSWORD,
      authProvider: 'local',
      isVerified: true,
      isActive: true,
    });
    createdUsers.push(u);
  }

  const cInstructors = createdUsers.filter((u) => u.role === 'instructor');
  const cAdvisers = createdUsers.filter((u) => u.role === 'adviser');
  const cPanelists = createdUsers.filter((u) => u.role === 'panelist');
  const cAllStudents = createdUsers.filter((u) => u.role === 'student');
  const cCurStudents = cAllStudents.slice(0, currentStudents.length);
  const cArcStudents = cAllStudents.slice(currentStudents.length);

  console.log(`   ✅ ${cInstructors.length} instructor(s)`);
  console.log(`   ✅ ${cAdvisers.length} adviser(s)`);
  console.log(`   ✅ ${cPanelists.length} panelist(s)`);
  console.log(`   ✅ ${cCurStudents.length} current student(s)`);
  console.log(`   ✅ ${cArcStudents.length} archived/alumni student(s)`);

  const adminId = cInstructors[0]._id;

  // ── 3. Academic structure ─────────────────────────────────────
  console.log('\n🏫 Creating academic structure...');

  const course = await Course.create({
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    isActive: true,
    createdBy: adminId,
  });
  console.log(`   ✅ Course: ${course.code} — ${course.name}`);

  // Current year sections
  const secAcur = await Section.create({
    name: 'BSIT 4-A',
    code: 'BSIT-4A',
    courseId: course._id,
    academicYear: CURRENT_YEAR,
    isActive: true,
    createdBy: adminId,
  });
  const secBcur = await Section.create({
    name: 'BSIT 4-B',
    code: 'BSIT-4B',
    courseId: course._id,
    academicYear: CURRENT_YEAR,
    isActive: true,
    createdBy: adminId,
  });

  // Previous year sections
  const secAprev = await Section.create({
    name: 'BSIT 4-A',
    code: 'BSIT-4A',
    courseId: course._id,
    academicYear: PREV_YEAR,
    isActive: false,
    createdBy: adminId,
  });
  const secBprev = await Section.create({
    name: 'BSIT 4-B',
    code: 'BSIT-4B',
    courseId: course._id,
    academicYear: PREV_YEAR,
    isActive: false,
    createdBy: adminId,
  });

  const sectionMap = {
    A: secAcur._id,
    B: secBcur._id,
    A_prev: secAprev._id,
    B_prev: secBprev._id,
  };
  console.log(`   ✅ ${CURRENT_YEAR}: Section A (${secAcur.name}), Section B (${secBcur.name})`);
  console.log(`   ✅ ${PREV_YEAR}:   Section A (${secAprev.name}), Section B (${secBprev.name})`);

  // ── 4. Current year: teams + projects ─────────────────────────
  console.log(`\n🏗️  Creating current teams (${CURRENT_YEAR})...`);
  const now = new Date();

  for (const td of currentTeamDefs) {
    const leader = cCurStudents[td.leaderIndex];
    const members = td.memberIndices.map((i) => cCurStudents[i]);
    const memberIds = members.map((m) => m._id);

    const team = await Team.create({
      name: td.name,
      leaderId: leader._id,
      members: memberIds,
      isLocked: td.isLocked,
      academicYear: CURRENT_YEAR,
    });
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: { teamId: team._id, sectionId: sectionMap[td.sectionKey] } },
    );

    const lockLabel = td.isLocked ? 'locked' : 'open';
    console.log(
      `   ✅ ${team.name} [${lockLabel}] — ${members.map((m) => m.firstName).join(', ')}`,
    );

    if (!td.project) {
      console.log(`   ⏭  ${td.name} — no project (team not finalized)`);
      continue;
    }

    const pd = td.project;
    const adviserId = pd.adviserIndex !== null ? cAdvisers[pd.adviserIndex]._id : null;
    const panelistIds = pd.panelistIndices.map((i) => cPanelists[i]._id);

    if (adviserId)
      await User.updateMany({ _id: { $in: memberIds } }, { $set: { instructorId: adviserId } });

    await Project.create({
      teamId: team._id,
      title: pd.title,
      abstract: pd.abstract,
      keywords: pd.keywords,
      academicYear: CURRENT_YEAR,
      courseId: course._id,
      sectionId: sectionMap[td.sectionKey],
      memberRoleAssignments: buildRoleAssignments(memberIds),
      capstonePhase: pd.capstonePhase,
      titleStatus: pd.titleStatus,
      projectStatus: pd.projectStatus,
      adviserId,
      panelistIds,
      deadlines: {
        chapter1: deadlineFrom(now, 14),
        chapter2: deadlineFrom(now, 28),
        chapter3: deadlineFrom(now, 42),
        proposal: deadlineFrom(now, 56),
        chapter4: deadlineFrom(now, 70),
        chapter5: deadlineFrom(now, 84),
        defense: deadlineFrom(now, 98),
      },
    });
    console.log(`   📋 "${pd.title.substring(0, 55)}..." [${pd.titleStatus}]`);
  }

  // ── 5. Archived year: teams + projects + evaluations ──────────
  console.log(`\n📦 Creating archived teams (${PREV_YEAR})...`);
  let totalEvals = 0;

  // Base date for archived deadlines — completed ~10 months ago
  const archiveBase = new Date('2024-09-01');

  for (let tIdx = 0; tIdx < archivedTeamDefs.length; tIdx++) {
    const td = archivedTeamDefs[tIdx];
    const leader = cArcStudents[td.leaderIndex];
    const members = td.memberIndices.map((i) => cArcStudents[i]);
    const memberIds = members.map((m) => m._id);

    const team = await Team.create({
      name: td.name,
      leaderId: leader._id,
      members: memberIds,
      isLocked: true,
      academicYear: PREV_YEAR,
    });
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: { teamId: team._id, sectionId: sectionMap[td.sectionKey] } },
    );

    console.log(`   ✅ ${team.name} — ${members.map((m) => m.firstName).join(', ')}`);

    const pd = td.project;
    const adviserId = cAdvisers[pd.adviserIndex]._id;
    const panelistIds = pd.panelistIndices.map((i) => cPanelists[i]._id);

    await User.updateMany({ _id: { $in: memberIds } }, { $set: { instructorId: adviserId } });

    const project = await Project.create({
      teamId: team._id,
      title: pd.title,
      abstract: pd.abstract,
      keywords: pd.keywords,
      academicYear: PREV_YEAR,
      courseId: course._id,
      sectionId: sectionMap[td.sectionKey],
      memberRoleAssignments: buildRoleAssignments(memberIds),
      capstonePhase: 4,
      titleStatus: 'approved',
      projectStatus: 'archived',
      isArchived: true,
      archivedAt: pd.archivedAt,
      completionNotes: pd.completionNotes,
      adviserId,
      panelistIds,
      deadlines: {
        chapter1: deadlineFrom(archiveBase, 14),
        chapter2: deadlineFrom(archiveBase, 28),
        chapter3: deadlineFrom(archiveBase, 42),
        proposal: deadlineFrom(archiveBase, 56),
        chapter4: deadlineFrom(archiveBase, 70),
        chapter5: deadlineFrom(archiveBase, 84),
        defense: deadlineFrom(archiveBase, 98),
      },
    });

    console.log(`   📋 "${pd.title.substring(0, 55)}..." [archived]`);

    // Create evaluations for all 4 defense types × 2 panelists
    const scores = ARCHIVE_SCORES[tIdx];
    for (const defenseType of ['proposal', 'midterm', 'paper', 'final']) {
      for (let pIdx = 0; pIdx < panelistIds.length; pIdx++) {
        const panelistId = panelistIds[pIdx];
        const rawScores = scores[defenseType][pIdx];
        const criteria = buildCriteria(defenseType, rawScores);
        const totalScore = sum(rawScores);
        const maxTotalScore = sum(RUBRICS[defenseType].map((c) => c.maxScore));
        const submittedAt = new Date(
          pd.archivedAt.getTime() - 7 * 24 * 60 * 60 * 1000 * (3 - pIdx),
        );
        const releasedAt = new Date(pd.archivedAt.getTime() - 3 * 24 * 60 * 60 * 1000);

        await Evaluation.create({
          projectId: project._id,
          panelistId,
          defenseType,
          criteria,
          totalScore,
          maxTotalScore,
          overallComment: `${defenseType.charAt(0).toUpperCase() + defenseType.slice(1)} defense successfully completed.`,
          status: 'released',
          submittedAt,
          releasedAt,
        });
        totalEvals++;
      }
    }
    console.log(
      `   🎓 ${panelistIds.length * 4} evaluations created (proposal/midterm/paper/final × ${panelistIds.length} panelists)`,
    );
  }

  // ── 6. Summary ────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(60));
  console.log('📋 SEEDED USER CREDENTIALS');
  console.log('━'.repeat(60));
  console.log(`   Password for ALL users: ${DEFAULT_PASSWORD}`);
  console.log('━'.repeat(60));

  console.log('\n   INSTRUCTORS (Admin):');
  for (const u of cInstructors)
    console.log(`   📧 ${u.email.padEnd(34)} ${u.firstName} ${u.lastName}`);
  console.log('\n   ADVISERS:');
  for (const u of cAdvisers)
    console.log(`   📧 ${u.email.padEnd(34)} ${u.firstName} ${u.lastName}`);
  console.log('\n   PANELISTS:');
  for (const u of cPanelists)
    console.log(`   📧 ${u.email.padEnd(34)} ${u.firstName} ${u.lastName}`);

  console.log('\n   CURRENT STUDENTS (2025-2026):');
  const refreshedCur = await User.find({ _id: { $in: cCurStudents.map((s) => s._id) } }).sort({
    email: 1,
  });
  for (const u of refreshedCur) {
    console.log(
      `   📧 ${u.email.padEnd(34)} ${u.firstName} ${u.lastName} ${u.teamId ? '(in team)' : '(orphaned)'}`,
    );
  }

  console.log('\n   ALUMNI STUDENTS (2024-2025):');
  const refreshedArc = await User.find({ _id: { $in: cArcStudents.map((s) => s._id) } }).sort({
    email: 1,
  });
  for (const u of refreshedArc) {
    console.log(`   📧 ${u.email.padEnd(34)} ${u.firstName} ${u.lastName} (archived)`);
  }

  const currentProjects = currentTeamDefs.filter((t) => t.project).length;
  const archivedProjects = archivedTeamDefs.length;

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Seeding complete!');
  console.log(`   Total users:              ${createdUsers.length}`);
  console.log(`   Current teams (${CURRENT_YEAR}):  ${currentTeamDefs.length}`);
  console.log(`   Current projects:          ${currentProjects}`);
  console.log(`   Archived teams (${PREV_YEAR}): ${archivedTeamDefs.length}`);
  console.log(`   Archived projects:         ${archivedProjects}`);
  console.log(`   Evaluations (released):    ${totalEvals}`);
  console.log('━'.repeat(60) + '\n');

  await mongoose.disconnect();
  console.log('📡 Disconnected from MongoDB.\n');
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  console.error(err);
  mongoose.disconnect();
  process.exit(1);
});
