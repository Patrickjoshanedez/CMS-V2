#!/usr/bin/env node
/**
 * BukSU CMS-V2: Live Demonstration State Seeder
 * Populates MongoDB with a realistic 4-person capstone team, committee members
 * (Louie Jay Labastida, Raul Lecaros, Joseph Abella), dual-layer plagiarism metrics
 * (Winnowing + MiniLM), and Action Done Matrix digital signatures.
 *
 * Usage: node scripts/seed_demo_state.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import env from '../server/config/env.js';
import User from '../server/modules/users/user.model.js';
import Team from '../server/modules/teams/team.model.js';
import Project from '../server/modules/projects/project.model.js';

const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';
const MONGODB_URI = env.MONGODB_URI || env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;

const runSeeder = async () => {
  console.log('======================================================================');
  console.log(' CMS-V2 Live Demonstration State Seeder');
  console.log('======================================================================');
  console.log(`Connecting to database at: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(' Connected to MongoDB successfully.');
  } catch (err) {
    console.warn(`Could not connect to live MongoDB: ${err.message}. Skipping live mutation.`);
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create or upsert Faculty Committee Members
  console.log('\n[1/4] Seeding Faculty & Panel Committee accounts...');
  const facultyMembers = [
    {
      email: 'llabastida@buksu.edu.ph',
      name: 'Louie Jay Labastida',
      role: 'instructor',
      department: 'College of Technologies',
      designation: 'REC Chair / Associate Professor',
    },
    {
      email: 'rlecaros@buksu.edu.ph',
      name: 'Raul Lecaros',
      role: 'instructor',
      department: 'College of Technologies',
      designation: 'Panel Member / Assistant Professor',
    },
    {
      email: 'jabella@buksu.edu.ph',
      name: 'Joseph Abella',
      role: 'instructor',
      department: 'College of Technologies',
      designation: 'Panel Member / Assistant Professor',
    },
    {
      email: 'adviser.demo@buksu.edu.ph',
      name: 'Dr. Maria Santos',
      role: 'instructor',
      department: 'College of Technologies',
      designation: 'Capstone Adviser / Full Professor',
    },
    {
      email: 'secretary.demo@buksu.edu.ph',
      name: 'Engr. Sarah Jenkins',
      role: 'instructor',
      department: 'College of Technologies',
      designation: 'Defense Secretary / Instructor',
    },
  ];

  const seededFaculty = [];
  for (const f of facultyMembers) {
    let u = await User.findOne({ email: f.email });
    if (!u) {
      u = await User.create({
        ...f,
        password: passwordHash,
        isEmailVerified: true,
        isActive: true,
      });
    }
    seededFaculty.push(u);
  }
  const [chairUser, lecarosUser, abellaUser, adviserUser, secretaryUser] = seededFaculty;

  // 2. Create 4-Person Student Capstone Team
  console.log('\n[2/4] Seeding 4-Person Student Capstone Team...');
  const studentData = [
    {
      email: 'patrick.josh@student.buksu.edu.ph',
      name: 'Patrick Josh Anedez',
      studentId: '2022-00101',
    },
    { email: 'jane.doe@student.buksu.edu.ph', name: 'Jane Doe', studentId: '2022-00102' },
    { email: 'john.smith@student.buksu.edu.ph', name: 'John Smith', studentId: '2022-00103' },
    { email: 'alice.johnson@student.buksu.edu.ph', name: 'Alice Johnson', studentId: '2022-00104' },
  ];

  const seededStudents = [];
  for (const s of studentData) {
    let u = await User.findOne({ email: s.email });
    if (!u) {
      u = await User.create({
        ...s,
        role: 'student',
        password: passwordHash,
        department: 'Information Technology',
        isEmailVerified: true,
        isActive: true,
      });
    }
    seededStudents.push(u);
  }

  // Create Team
  const leader = seededStudents[0];
  let team = await Team.findOne({ name: 'InnovateIT Capstone Group' });
  if (!team) {
    team = await Team.create({
      name: 'InnovateIT Capstone Group',
      leader: leader._id,
      members: seededStudents.map((s) => s._id),
      githubUrl: 'https://github.com/Patrickjoshanedez/CMS-V2',
      status: 'active',
    });
  }

  // 3. Seed Capstone Project with Dual-Layer Plagiarism Metrics & ADM Signatures
  console.log('\n[3/4] Seeding Capstone 4 Project with Plagiarism & ADM Signatures...');
  const projectTitle =
    'BukSU Capstone Management System V2: Intelligent Workflow Automation with Dual-Engine Plagiarism Analysis';

  let project = await Project.findOne({ title: projectTitle });
  const admItems = [
    {
      panelName: 'Louie Jay Labastida (Chair)',
      suggestion:
        'Include comparative complexity metrics between Winnowing exact matching and MiniLM-L6 dense embeddings in Chapter 3.',
      expectedAction:
        'Add asymptotic complexity analysis table and memory footprint comparison in Section 3.4.',
      actionDone:
        'Added Table 3.2 comparing Winnowing O(N) fingerprinting against MiniLM O(N*D) dense vector inference with benchmark chart on page 48.',
      status: 'verified',
      remarks: 'Fulfillment thoroughly verified with empirical benchmarks.',
      signatures: [
        {
          userId: chairUser._id,
          name: chairUser.name,
          role: 'REC Chair',
          signedAt: new Date(),
          signatureDataUrl: 'data:image/svg+xml;utf8,<svg><text>Louie Jay Labastida</text></svg>',
        },
      ],
    },
    {
      panelName: 'Raul Lecaros (Panel Member)',
      suggestion:
        'Ensure the Action Done Matrix renders multi-signatory digital approvals for all defense stages.',
      expectedAction:
        'Implement role-based signatory workflow with electronic signature capture for Chair, Adviser, and Secretary.',
      actionDone:
        'Integrated multi-signature tabs with cryptographic SHA-256 state tracking in client/src/components/projects/ActionDoneMatrixTab.jsx.',
      status: 'verified',
      remarks: 'Excellent UI/UX execution and signature workflow validation.',
      signatures: [
        {
          userId: lecarosUser._id,
          name: lecarosUser.name,
          role: 'Panel Member',
          signedAt: new Date(),
          signatureDataUrl: 'data:image/svg+xml;utf8,<svg><text>Raul Lecaros</text></svg>',
        },
      ],
    },
    {
      panelName: 'Joseph Abella (Panel Member)',
      suggestion: 'Provide automated fallback for offline LAN deployments without internet access.',
      expectedAction:
        'Document and bundle standalone Docker Compose production files with pre-cached sentence-transformer weights.',
      actionDone:
        'Created docker-compose.prod.yml and scripts/lan-deploy.ps1 with offline PyTorch model caching inside container volume.',
      status: 'addressed',
      remarks: 'Ready for final verification.',
      signatures: [
        {
          userId: abellaUser._id,
          name: abellaUser.name,
          role: 'Panel Member',
          signedAt: null,
          signatureDataUrl: null,
        },
      ],
    },
    {
      panelName: 'Dr. Maria Santos (Adviser)',
      suggestion:
        'Format all APA 7th edition bibliographic entries in Chapter 2 and verify reference integrity.',
      expectedAction: 'Review and standardize all references with DOIs where applicable.',
      actionDone: 'Audited 42 references; formatted according to APA 7 guidelines on pages 88-94.',
      status: 'verified',
      remarks: 'All citations verified.',
      signatures: [
        {
          userId: adviserUser._id,
          name: adviserUser.name,
          role: 'Adviser',
          signedAt: new Date(),
          signatureDataUrl: 'data:image/svg+xml;utf8,<svg><text>Dr. Maria Santos</text></svg>',
        },
      ],
    },
  ];

  const plagiarismReportData = {
    overallSimilarityScore: 11.2,
    winnowingExactOverlap: 8.4,
    semanticCosineScore: 11.2,
    status: 'PASSED',
    scannedAt: new Date(),
    thresholdAllowed: 20.0,
    matchedSources: [
      {
        sourceTitle: 'Automated Academic Manuscript Evaluation Framework (2024)',
        author: 'BukSU Repository',
        similarityPercentage: 4.1,
        matchType: 'semantic_cosine',
      },
      {
        sourceTitle: 'Document Winnowing Algorithm Implementations (IEEE 2023)',
        author: 'Computer Science Journal',
        similarityPercentage: 4.3,
        matchType: 'winnowing_exact',
      },
    ],
  };

  if (!project) {
    project = await Project.create({
      title: projectTitle,
      team: team._id,
      adviser: adviserUser._id,
      capstoneCourse: 'Capstone 4',
      status: 'in_progress',
      currentPhase: 'final_defense',
      similarityScore: 11.2,
      similarityReport: plagiarismReportData,
      actionDoneMatrix: admItems,
      admStatus: 'in_progress',
      panel: {
        chair: chairUser._id,
        members: [lecarosUser._id, abellaUser._id],
        secretary: secretaryUser._id,
      },
    });
  } else {
    project.actionDoneMatrix = admItems;
    project.similarityScore = 11.2;
    project.similarityReport = plagiarismReportData;
    await project.save();
  }

  console.log('\n[4/4] Seeded Demonstration State Summary:');
  console.log(`- Project ID: ${project._id}`);
  console.log(`- Project Title: "${project.title}"`);
  console.log(`- 4-Person Team: Patrick Josh Anedez, Jane Doe, John Smith, Alice Johnson`);
  console.log(`- REC Chair: Louie Jay Labastida`);
  console.log(`- Panel Members: Raul Lecaros, Joseph Abella`);
  console.log(
    `- Dual Plagiarism Scores: Winnowing Exact: 8.4% | MiniLM Semantic: 11.2% (Passed threshold < 20%)`,
  );
  console.log(`- ADM Status: 4 Rows populated with partial and completed signatures.`);
  console.log('======================================================================');
  console.log(' Live demonstration database seeding complete!');
  console.log('======================================================================\n');

  await mongoose.disconnect();
};

runSeeder().catch((err) => {
  console.error('Seeder execution error:', err);
  process.exit(1);
});
