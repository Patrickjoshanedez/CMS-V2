/**
 * =====================================================================
 * 🌱 CMS-V2 FULL WORKFLOW END-TO-END SYSTEM SEEDER
 * =====================================================================
 * Target Environment: MongoDB (Local Host / Docker Container)
 * Standard: BukSU Capstone Management System V2 (CMS-V2)
 * Scope: Seeds 100% cleared databases with a complete, realistic
 *        production workflow scenario spanning all 8 ASDLC stages,
 *        institutional settings, 4-proponent teams, submissions,
 *        inline PDF comments, plagiarism metrics, rubrics, ADM items,
 *        archived public catalog papers, and edge cases.
 * =====================================================================
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Verified bcrypt hash for password: "Password123!"
const DEFAULT_HASH = '$2b$10$giFhZR63OPApqO9/xJE59Om9KoiPmFE4dGOnPATGqJ4RxJhEGS1vG';
const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27018/cms_v2';

// --- 1. RESILIENT INLINE SCHEMAS ---

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, default: '' },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: DEFAULT_HASH },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin', 'instructor', 'adviser', 'panelist'],
      default: 'student',
    },
    facultyRole: { type: String, enum: ['adviser', 'panelist', null], default: null },
    studentId: { type: String, default: '' },
    fieldOfDiscipline: { type: String, default: 'Software Engineering' },
    section: { type: String, default: 'BSIT-4A' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', default: null },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    panelAssignments: [
      {
        projectId: Schema.Types.ObjectId,
        role: { type: String, enum: ['chair', 'member', 'secretary'] },
      },
    ],
  },
  { timestamps: true },
);

const SettingsSchema = new Schema(
  {
    key: { type: String, default: 'global', unique: true },
    plagiarismThreshold: { type: Number, default: 75 },
    plagiarismWarningRate: { type: Number, default: 15 },
    plagiarismWarningThreshold: { type: Number, default: 15 },
    plagiarismRejectionRate: { type: Number, default: 30 },
    plagiarismRejectThreshold: { type: Number, default: 25 },
    maxFileSize: { type: Number, default: 25 * 1024 * 1024 },
    maxTeamMembers: { type: Number, default: 4 },
    currentAcademicYear: { type: String, default: '2025-2026' },
    activeSemester: { type: String, default: '1st Semester' },
    allowLateJustification: { type: Boolean, default: true },
    documentTemplates: [
      {
        documentType: String,
        templateUrl: String,
        description: String,
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

const AcademicYearSchema = new Schema(
  {
    year: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: () => new Date('2025-08-01') },
    endDate: { type: Date, default: () => new Date('2026-06-30') },
  },
  { timestamps: true },
);

const CourseSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SectionSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    academicYear: { type: String, default: '2025-2026' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const DocumentTemplateSchema = new Schema(
  {
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ['Proposal', 'Manuscript', 'ADM', 'Rubric'],
      default: 'Manuscript',
    },
    fileUrl: String,
    isDynamic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const EvaluationTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    course: { type: String, enum: ['Capstone 1', 'Capstone 2'], default: 'Capstone 1' },
    dimensions: [
      {
        title: { type: String, required: true },
        weight: { type: Number, required: true },
        description: String,
      },
    ],
  },
  { timestamps: true },
);

const TeamSchema = new Schema(
  {
    name: { type: String, required: true },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    memberRoles: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
      },
    ],
    adviserId: { type: Schema.Types.ObjectId, ref: 'User' },
    secretaryId: { type: Schema.Types.ObjectId, ref: 'User' },
    panelistIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    academicYear: { type: String, default: '2025-2026' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    isLocked: { type: Boolean, default: true },
    githubUrl: { type: String, default: 'https://github.com/buksu-cms/innovate-it-capstone' },
    gitHubRepositoryUrl: {
      type: String,
      default: 'https://github.com/buksu-cms/innovate-it-capstone',
    },
  },
  { timestamps: true },
);

const CommentSchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, required: true },
    projectId: { type: Schema.Types.ObjectId, required: true },
    suggesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    suggesterName: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    commentText: { type: String, required: true },
    coordinates: {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  },
  { timestamps: true },
);

const SubmissionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chapterTitle: { type: String, required: true },
    fileUrl: { type: String, required: true },
    version: { type: Number, default: 1 },
    plagiarismResult: {
      winnowingSimilarityScore: { type: Number, default: 12 },
      semanticSimilarityScore: { type: Number, default: 8 },
      status: { type: String, enum: ['passed', 'warning', 'rejected'], default: 'passed' },
    },
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const EvaluationSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    panelistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    evaluatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    defenseType: { type: String, enum: ['proposal', 'final'], default: 'proposal', required: true },
    evaluatorRole: { type: String, enum: ['chair', 'member', 'adviser'] },
    criteria: [
      {
        name: String,
        score: Number,
        maxScore: Number,
        comment: String,
      },
    ],
    scores: [
      {
        dimensionTitle: String,
        score: Number,
        maxScore: Number,
      },
    ],
    totalGrade: Number,
    totalScore: Number,
    maxTotalScore: Number,
    comments: String,
    overallComment: String,
    status: { type: String, default: 'submitted' },
    isSubmitted: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ActionDoneMatrixItemSchema = new Schema({
  panelistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  panelistName: { type: String, required: true },
  panelistRole: { type: String, enum: ['chair', 'member', 'secretary'], required: true },
  suggestion: { type: String, required: true },
  actionTaken: { type: String, default: '' },
  pageNumbers: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'addressed', 'verified'], default: 'pending' },
  signatures: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      role: { type: String, enum: ['chair', 'member', 'secretary'], required: true },
      signedAt: { type: Date, default: Date.now },
      signatureDataUrl: { type: String, required: true },
    },
  ],
});

const ProjectSchema = new Schema(
  {
    title: { type: String, required: true, unique: true },
    fieldOfDiscipline: { type: String, default: 'Software Engineering & AI Systems' },
    abstract: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    adviserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chairId: { type: Schema.Types.ObjectId, ref: 'User' },
    secretaryId: { type: Schema.Types.ObjectId, ref: 'User' },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    panelists: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['chair', 'member', 'secretary'] },
      },
    ],
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
    titleStatus: { type: String, default: 'approved' },
    projectStatus: { type: String, default: 'active' },
    capstonePhase: { type: Number, default: 2 },
    titleProposals: [{ type: Schema.Types.Mixed }],
    status: {
      type: String,
      enum: ['proposed', 'approved', 'defended', 'archived'],
      default: 'proposed',
    },
    capstoneCourse: { type: String, enum: ['Capstone 1', 'Capstone 2'], default: 'Capstone 1' },
    academicYear: { type: String, default: '2025-2026' },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    pdfS3StreamUrl: { type: String, default: '' },
    admSignatures: { type: Schema.Types.Mixed, default: () => ({}) },
    actionDoneMatrix: [ActionDoneMatrixItemSchema],
  },
  { timestamps: true, strict: false },
);

const ConsultationSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    adviserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'completed' },
    notes: String,
  },
  { timestamps: true },
);

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Settings =
  mongoose.models.SystemSettings ||
  mongoose.model('SystemSettings', SettingsSchema, 'systemsettings');
const DocumentTemplate =
  mongoose.models.DocumentTemplate || mongoose.model('DocumentTemplate', DocumentTemplateSchema);
const EvaluationTemplate =
  mongoose.models.EvaluationTemplate ||
  mongoose.model('EvaluationTemplate', EvaluationTemplateSchema);
const AcademicYear =
  mongoose.models.AcademicYear || mongoose.model('AcademicYear', AcademicYearSchema);
const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
const Section = mongoose.models.Section || mongoose.model('Section', SectionSchema);
const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', SubmissionSchema);
const Evaluation = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);
const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
const Consultation =
  mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);

// --- 2. MAIN SEEDING ENGINE ---

async function runFullWorkflowSeeder() {
  console.log('======================================================================');
  console.log('  🚀 CMS-V2 FULL WORKFLOW SYSTEM SEEDER (100% PURGE & RE-SEED) ');
  console.log('======================================================================');
  console.log(`Connecting to Mongo: ${MONGO_URI}`);

  await mongoose.connect(MONGO_URI);
  console.log('✔ Database connection successful.');

  // STEP A: PURGE ALL EXISTING DATASETS
  console.log('\n🔥 [1/8] Executing 100% Database Purge...');
  const db = mongoose.connection.db;
  const existingCollections = await db.listCollections().toArray();
  const collectionNames = existingCollections.map((c) => c.name);

  for (const name of collectionNames) {
    if (!name.startsWith('system.')) {
      await db.collection(name).deleteMany({});
      console.log(`   🗑️  Cleared collection: ${name}`);
    }
  }
  console.log('✔ Database cleared 100%. Ready for fresh operational state.');

  // STEP B: SEED SYSTEM SETTINGS & TEMPLATES & ACADEMICS
  console.log('\n⚙️  [2/8] Seeding Institutional Settings & Academic Foundation...');
  await Settings.create({
    key: 'global',
    plagiarismThreshold: 75,
    plagiarismWarningRate: 15,
    plagiarismWarningThreshold: 15,
    plagiarismRejectionRate: 30,
    plagiarismRejectThreshold: 25,
    maxTeamMembers: 4,
    currentAcademicYear: '2025-2026',
    activeSemester: '1st Semester',
    allowLateJustification: true,
    documentTemplates: [
      {
        documentType: 'proposal_template',
        templateUrl: '/templates/BukSU-Capstone-Final-Template-2026.docx',
        description: 'Official BukSU Capstone Manuscript Template 2026',
      },
    ],
  });

  const docTemplate = await DocumentTemplate.create({
    title: 'Official BukSU Capstone Manuscript Template 2026',
    description: 'Standard thesis formatting guide with institutional headers and signature pages.',
    category: 'Manuscript',
    fileUrl: '/templates/BukSU-Capstone-Final-Template-2026.docx',
    isDynamic: true,
  });

  const evalTemplate = await EvaluationTemplate.create({
    name: 'BukSU Capstone 1 Oral Defense Rubric Schema',
    course: 'Capstone 1',
    dimensions: [
      {
        title: 'System Architecture & Technical Depth',
        weight: 30,
        description: 'Evaluates microservice isolation, API design, and DB schemas.',
      },
      {
        title: 'Plagiarism & Novelty Verification',
        weight: 25,
        description: 'Evaluates Rabin-Karp Winnowing and PyTorch vector similarity checks.',
      },
      {
        title: 'Action Done Matrix Compliance',
        weight: 25,
        description: 'Verifies complete panel revision fulfillment and signed clearance.',
      },
      {
        title: 'Oral Presentation & Q&A Defense',
        weight: 20,
        description: 'Assesses team clarity, responsiveness, and mastery.',
      },
    ],
  });

  const acadYear = await AcademicYear.create({
    year: '2025-2026',
    isActive: true,
  });

  const course = await Course.create({
    name: 'Bachelor of Science in Information Technology',
    code: 'BSIT',
    isActive: true,
  });

  const secA = await Section.create({
    name: 'BSIT 4-A',
    code: 'BSIT-4A',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
  });

  const secB = await Section.create({
    name: 'BSIT 4-B',
    code: 'BSIT-4B',
    academicYear: '2025-2026',
    courseId: course._id,
    isActive: true,
  });

  console.log(
    `✔ System Settings, Academic Foundation (BSIT, 4-A, 4-B), Document Template, and Rubric Schema configured.`,
  );

  // STEP C: SEED FACULTY, ADMINS, & COMMITTEE MEMBERS
  console.log('\n👨‍🏫 [3/8] Seeding Administrative Heads & Faculty Committee Members...');

  const adminAribe = await User.create({
    firstName: 'Sales',
    middleName: 'G.',
    lastName: 'Aribe Jr.',
    email: 'aribe@buksu.edu.ph',
    role: 'instructor',
    isVerified: true,
    isActive: true,
  });

  const coordAnedez = await User.create({
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    email: '2301103203@student.buksu.edu.ph',
    role: 'instructor',
    studentId: '2023-11032',
    isVerified: true,
    isActive: true,
  });

  const chairLabastida = await User.create({
    firstName: 'Louie Jay',
    middleName: 'S.',
    lastName: 'Labastida',
    email: 'louiejay.labastida@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
  });

  const panelLecaros = await User.create({
    firstName: 'Raul',
    lastName: 'Lecaros',
    email: 'raul.lecaros@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
  });

  const panelAbella = await User.create({
    firstName: 'Joseph',
    lastName: 'Abella',
    email: 'joseph.abella@buksu.edu.ph',
    role: 'faculty',
    facultyRole: 'panelist',
    isVerified: true,
    isActive: true,
  });

  const adviserMentor = await User.create({
    firstName: 'Leon',
    lastName: 'Mentor',
    email: 'leon.mentor.buksu@gmail.com',
    role: 'faculty',
    facultyRole: 'adviser',
    isVerified: true,
    isActive: true,
  });

  const secretaryBautista = await User.create({
    firstName: 'Steven Joe',
    lastName: 'Bautista',
    email: '2301105311@student.buksu.edu.ph',
    role: 'faculty',
    studentId: '2023-11053',
    isVerified: true,
    isActive: true,
  });

  console.log(
    '✔ Seeded 7 Institutional Faculty & Admin Users (Aribe, Añedez, Labastida, Lecaros, Abella, Mentor, Bautista).',
  );

  // STEP D: SEED 4-MEMBER STUDENT PROPONENT TEAM
  console.log("\n🎓 [4/8] Seeding 'InnovateIT Capstone Group' (4-Member Roster Limit)...");

  const leader = await User.create({
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    email: 'patrick.josh@student.buksu.edu.ph',
    role: 'student',
    studentId: '2022-00101',
    fieldOfDiscipline: 'Software Engineering & AI Systems',
    section: 'BSIT-4A',
    sectionId: secA._id,
    isVerified: true,
    isActive: true,
  });

  const m1 = await User.create({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@student.buksu.edu.ph',
    role: 'student',
    studentId: '2022-00102',
    fieldOfDiscipline: 'Software Engineering & AI Systems',
    section: 'BSIT-4A',
    sectionId: secA._id,
    isVerified: true,
    isActive: true,
  });

  const m2 = await User.create({
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@student.buksu.edu.ph',
    role: 'student',
    studentId: '2022-00103',
    fieldOfDiscipline: 'Software Engineering & AI Systems',
    section: 'BSIT-4A',
    sectionId: secA._id,
    isVerified: true,
    isActive: true,
  });

  const m3 = await User.create({
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@student.buksu.edu.ph',
    role: 'student',
    studentId: '2022-00104',
    fieldOfDiscipline: 'Software Engineering & AI Systems',
    section: 'BSIT-4A',
    sectionId: secA._id,
    isVerified: true,
    isActive: true,
  });

  const innovateTeam = await Team.create({
    name: 'InnovateIT Capstone Group',
    leaderId: leader._id,
    members: [leader._id, m1._id, m2._id, m3._id],
    memberRoles: [
      { userId: leader._id, role: 'Project Lead & Systems Analyst' },
      { userId: m1._id, role: 'Frontend & UI/UX Developer' },
      { userId: m2._id, role: 'Backend & Database Developer' },
      { userId: m3._id, role: 'QA & Technical Documentor' },
    ],
    adviserId: adviserMentor._id,
    secretaryId: secretaryBautista._id,
    panelistIds: [chairLabastida._id, panelLecaros._id, panelAbella._id],
    academicYear: '2025-2026',
    courseId: course._id,
    sectionId: secA._id,
    isLocked: true,
    githubUrl: 'https://github.com/buksu-cms/innovate-it-capstone',
    gitHubRepositoryUrl: 'https://github.com/buksu-cms/innovate-it-capstone',
  });

  // Link teamId to students
  await User.updateMany(
    { _id: { $in: [leader._id, m1._id, m2._id, m3._id] } },
    { $set: { teamId: innovateTeam._id } },
  );

  console.log(`✔ Created Locked Team: "${innovateTeam.name}" with 4 Proponents.`);

  // STEP E: SEED EDGE CASE AUDIT SCENARIO USERS
  console.log('\n🧪 [5/8] Seeding 6 Edge-Case Scenario Student Personas...');

  // Scenario 3 Team (formed without adviser)
  const noAdviserStudent = await User.create({
    firstName: 'Priya',
    middleName: 'S.',
    lastName: 'Ramos',
    email: 'scenario.no.adviser@buksu.edu.ph',
    role: 'student',
    studentId: '2022-07421',
    section: 'BSIT-4B',
    sectionId: secB._id,
    isVerified: true,
    isActive: true,
  });

  const noAdviserTeam = await Team.create({
    name: 'Team Unassigned Adviser',
    leaderId: noAdviserStudent._id,
    members: [noAdviserStudent._id],
    memberRoles: [{ userId: noAdviserStudent._id, role: 'Project Lead & Systems Analyst' }],
    adviserId: null,
    academicYear: '2025-2026',
    courseId: course._id,
    sectionId: secB._id,
    isLocked: false,
  });
  await User.updateOne({ _id: noAdviserStudent._id }, { $set: { teamId: noAdviserTeam._id } });

  await Promise.all([
    User.create({
      firstName: 'Lara Mae',
      lastName: 'Quintero',
      email: 'scenario.orphan.complete@buksu.edu.ph',
      role: 'student',
      studentId: '2022-09411',
      section: 'BSIT-4A',
      sectionId: secA._id,
      isVerified: true,
      isActive: true,
      teamId: null,
    }),
    User.create({
      firstName: 'Noel Ivan',
      lastName: 'Misa',
      email: 'scenario.no.section@buksu.edu.ph',
      role: 'student',
      studentId: '2022-08532',
      section: '',
      sectionId: null,
      isVerified: true,
      isActive: true,
      teamId: null,
    }),
    User.create({
      firstName: 'Tim Alex',
      lastName: 'Uy',
      email: 'scenario.inactive@buksu.edu.ph',
      role: 'student',
      studentId: '2022-06312',
      section: 'BSIT-4A',
      sectionId: secA._id,
      isVerified: true,
      isActive: false,
      teamId: null,
    }),
    User.create({
      firstName: 'Mika Joy',
      lastName: 'Abarca',
      email: 'scenario.unverified@buksu.edu.ph',
      role: 'student',
      studentId: '2022-05204',
      section: 'BSIT-4A',
      sectionId: secA._id,
      isVerified: false,
      isActive: true,
      teamId: null,
    }),
    User.create({
      firstName: 'Gio Lee',
      lastName: 'Tan',
      email: 'scenario.google@buksu.edu.ph',
      role: 'student',
      studentId: '2022-04195',
      authProvider: 'google',
      googleId: 'google-oauth2|scenario-gio-tan-2026',
      section: 'BSIT-4A',
      sectionId: secA._id,
      isVerified: true,
      isActive: true,
      teamId: null,
    }),
  ]);
  console.log(
    '✔ Seeded all 6 Edge-Case Scenarios (Orphan, No Section, No Adviser, Inactive, Unverified, Google OAuth).',
  );

  // STEP F: SEED ACTIVE DEFENDED CAPSTONE & ADM DIRECTIVES
  console.log(
    '\n📋 [6/8] Seeding Active Capstone Study, Submissions, Comments, & ADM Directives...',
  );

  const mainProject = await Project.create({
    title: 'Intelligent Distributed Capstone Management System V2 (CMS-V2)',
    fieldOfDiscipline: 'Software Engineering & AI Systems',
    abstract:
      'A state-bounded software engineering workflow manager featuring integrated plagiarism matching, Google-doc style annotations, and digital clearances.',
    teamId: innovateTeam._id,
    courseId: course._id,
    sectionId: secA._id,
    titleStatus: 'approved',
    projectStatus: 'active',
    capstonePhase: 2,
    titleProposals: [
      {
        title: 'Intelligent Distributed Capstone Management System V2 (CMS-V2)',
        description:
          'Problem Statement: Manual capstone routing in academic institutions suffers from severe communication latency, split-brain review remarks, uncalibrated rubric evaluation, and fragmented manuscript clearance tracking.\n\nProposed Solution: A unified, state-bounded software engineering workflow manager integrating live cosine similarity checking, collaborative Google-docs style anchored annotations, automated Turnitin-grade plagiarism verification, and multi-signatory digital Action Done Matrix sign-offs.\n\nUnique Technical Innovation: Dual-engine similarity verification (Winnowing + SentenceTransformers), real-time WebSocket state synchronizations, and role-enforced cryptographic digital signature clearance chains.\n\nTarget Users: BSIT Capstone Proponents, Faculty Advisers, Panel Chairs, Defense Panelists, Institutional Research Ethics Evaluators, and College Deans.\n\nExpected Value / Impact: Eliminates physical matrix routing overhead, guarantees zero-lost defense remarks, enforces 100% institutional plagiarism thresholds, and automates sealed completion certificate issuance.',
        pitchDeck: {
          problemStatement:
            'Manual capstone routing in academic institutions suffers from severe communication latency, split-brain review remarks, uncalibrated rubric evaluation, and fragmented manuscript clearance tracking.',
          proposedSolution:
            'A unified, state-bounded software engineering workflow manager integrating live cosine similarity checking, collaborative Google-docs style anchored annotations, automated Turnitin-grade plagiarism verification, and multi-signatory digital Action Done Matrix sign-offs.',
          uniqueContribution:
            'Dual-engine similarity verification (Winnowing + SentenceTransformers), real-time WebSocket state synchronizations, and role-enforced cryptographic digital signature clearance chains.',
          targetUsers:
            'BSIT Capstone Proponents, Faculty Advisers, Panel Chairs, Defense Panelists, Institutional Research Ethics Evaluators, and College Deans.',
          expectedImpact:
            'Eliminates physical matrix routing overhead, guarantees zero-lost defense remarks, enforces 100% institutional plagiarism thresholds, and automates sealed completion certificate issuance.',
        },
        capstoneType: ['Software Engineering & Web Applications', 'AI & Machine Learning Systems'],
        sdgTags: ['SDG 4: Quality Education', 'SDG 9: Industry, Innovation, and Infrastructure'],
        status: 'approved',
      },
      {
        title: 'Automated Multi-Signatory Academic Clearance and Action Done Matrix Tracker',
        description:
          'Problem Statement: Post-defense compliance matrices and multi-tier institutional endorsements frequently experience paper loss, forged signatures, and delayed graduation approvals.\n\nProposed Solution: A cryptographically verified endorsement workflow requiring sequential secretary verification, panelist validation, and dean digital signing.\n\nUnique Technical Innovation: In-browser HTML5 digital signature canvas with SHA-256 audit timestamps and immutable ADM row locking.\n\nTarget Users: Capstone Secretaries, Faculty Panelists, Academic Chairs, Department Heads.\n\nExpected Value / Impact: 100% digital trace of panel recommendations and zero delayed sign-off cycles.',
        pitchDeck: {
          problemStatement:
            'Post-defense compliance matrices and multi-tier institutional endorsements frequently experience paper loss, forged signatures, and delayed graduation approvals.',
          proposedSolution:
            'A cryptographically verified endorsement workflow requiring sequential secretary verification, panelist validation, and dean digital signing.',
          uniqueContribution:
            'In-browser HTML5 digital signature canvas with SHA-256 audit timestamps and immutable ADM row locking.',
          targetUsers:
            'Capstone Secretaries, Faculty Panelists, Academic Chairs, Department Heads.',
          expectedImpact:
            '100% digital trace of panel recommendations and zero delayed sign-off cycles.',
        },
        capstoneType: [
          'Software Engineering & Web Applications',
          'Cybersecurity & Information Assurance',
        ],
        sdgTags: ['SDG 4: Quality Education', 'SDG 16: Peace, Justice, and Strong Institutions'],
        status: 'pending',
      },
      {
        title: 'Deep Academic Plagiarism & Semantic Manuscript Duplicate Detector',
        description:
          'Problem Statement: Existing commercial plagiarism checkers are cost-prohibitive for university departmental adoption and lack vector-level cosine similarity indexing against internal institutional archives.\n\nProposed Solution: An on-premises hybrid plagiarism engine combining Fast K-Gram Winnowing fingerprinting with PyTorch Sentence-Transformers vector embeddings in ChromaDB.\n\nUnique Technical Innovation: HNSW vector indexing paired with localized exact-character offset token mapping and interactive document visual diffing.\n\nTarget Users: Capstone Instructors, Academic Review Boards, University Research Coordinators.\n\nExpected Value / Impact: Instantaneous institutional duplicate detection, zero licensing subscription costs, and total data privacy sovereignty.',
        pitchDeck: {
          problemStatement:
            'Existing commercial plagiarism checkers are cost-prohibitive for university departmental adoption and lack vector-level cosine similarity indexing against internal institutional archives.',
          proposedSolution:
            'An on-premises hybrid plagiarism engine combining Fast K-Gram Winnowing fingerprinting with PyTorch Sentence-Transformers vector embeddings in ChromaDB.',
          uniqueContribution:
            'HNSW vector indexing paired with localized exact-character offset token mapping and interactive document visual diffing.',
          targetUsers:
            'Capstone Instructors, Academic Review Boards, University Research Coordinators.',
          expectedImpact:
            'Instantaneous institutional duplicate detection, zero licensing subscription costs, and total data privacy sovereignty.',
        },
        capstoneType: ['AI & Machine Learning Systems', 'Data Science & Big Data Analytics'],
        sdgTags: ['SDG 4: Quality Education', 'SDG 9: Industry, Innovation, and Infrastructure'],
        status: 'pending',
      },
    ],
    titleProposalMetadata: [
      {
        title: 'Intelligent Distributed Capstone Management System V2 (CMS-V2)',
        description:
          'Problem Statement: Manual capstone routing in academic institutions suffers from severe communication latency, split-brain review remarks, uncalibrated rubric evaluation, and fragmented manuscript clearance tracking.\n\nProposed Solution: A unified, state-bounded software engineering workflow manager integrating live cosine similarity checking, collaborative Google-docs style anchored annotations, automated Turnitin-grade plagiarism verification, and multi-signatory digital Action Done Matrix sign-offs.\n\nUnique Technical Innovation: Dual-engine similarity verification (Winnowing + SentenceTransformers), real-time WebSocket state synchronizations, and role-enforced cryptographic digital signature clearance chains.\n\nTarget Users: BSIT Capstone Proponents, Faculty Advisers, Panel Chairs, Defense Panelists, Institutional Research Ethics Evaluators, and College Deans.\n\nExpected Value / Impact: Eliminates physical matrix routing overhead, guarantees zero-lost defense remarks, enforces 100% institutional plagiarism thresholds, and automates sealed completion certificate issuance.',
        pitchDeck: {
          problemStatement:
            'Manual capstone routing in academic institutions suffers from severe communication latency, split-brain review remarks, uncalibrated rubric evaluation, and fragmented manuscript clearance tracking.',
          proposedSolution:
            'A unified, state-bounded software engineering workflow manager integrating live cosine similarity checking, collaborative Google-docs style anchored annotations, automated Turnitin-grade plagiarism verification, and multi-signatory digital Action Done Matrix sign-offs.',
          uniqueContribution:
            'Dual-engine similarity verification (Winnowing + SentenceTransformers), real-time WebSocket state synchronizations, and role-enforced cryptographic digital signature clearance chains.',
          targetUsers:
            'BSIT Capstone Proponents, Faculty Advisers, Panel Chairs, Defense Panelists, Institutional Research Ethics Evaluators, and College Deans.',
          expectedImpact:
            'Eliminates physical matrix routing overhead, guarantees zero-lost defense remarks, enforces 100% institutional plagiarism thresholds, and automates sealed completion certificate issuance.',
        },
        capstoneType: ['Software Engineering & Web Applications', 'AI & Machine Learning Systems'],
        sdgTags: ['SDG 4: Quality Education', 'SDG 9: Industry, Innovation, and Infrastructure'],
        status: 'approved',
      },
      {
        title: 'Automated Multi-Signatory Academic Clearance and Action Done Matrix Tracker',
        description:
          'Problem Statement: Post-defense compliance matrices and multi-tier institutional endorsements frequently experience paper loss, forged signatures, and delayed graduation approvals.\n\nProposed Solution: A cryptographically verified endorsement workflow requiring sequential secretary verification, panelist validation, and dean digital signing.\n\nUnique Technical Innovation: In-browser HTML5 digital signature canvas with SHA-256 audit timestamps and immutable ADM row locking.\n\nTarget Users: Capstone Secretaries, Faculty Panelists, Academic Chairs, Department Heads.\n\nExpected Value / Impact: 100% digital trace of panel recommendations and zero delayed sign-off cycles.',
        pitchDeck: {
          problemStatement:
            'Post-defense compliance matrices and multi-tier institutional endorsements frequently experience paper loss, forged signatures, and delayed graduation approvals.',
          proposedSolution:
            'A cryptographically verified endorsement workflow requiring sequential secretary verification, panelist validation, and dean digital signing.',
          uniqueContribution:
            'In-browser HTML5 digital signature canvas with SHA-256 audit timestamps and immutable ADM row locking.',
          targetUsers:
            'Capstone Secretaries, Faculty Panelists, Academic Chairs, Department Heads.',
          expectedImpact:
            '100% digital trace of panel recommendations and zero delayed sign-off cycles.',
        },
        capstoneType: [
          'Software Engineering & Web Applications',
          'Cybersecurity & Information Assurance',
        ],
        sdgTags: ['SDG 4: Quality Education', 'SDG 16: Peace, Justice, and Strong Institutions'],
        status: 'pending',
      },
      {
        title: 'Deep Academic Plagiarism & Semantic Manuscript Duplicate Detector',
        description:
          'Problem Statement: Existing commercial plagiarism checkers are cost-prohibitive for university departmental adoption and lack vector-level cosine similarity indexing against internal institutional archives.\n\nProposed Solution: An on-premises hybrid plagiarism engine combining Fast K-Gram Winnowing fingerprinting with PyTorch Sentence-Transformers vector embeddings in ChromaDB.\n\nUnique Technical Innovation: HNSW vector indexing paired with localized exact-character offset token mapping and interactive document visual diffing.\n\nTarget Users: Capstone Instructors, Academic Review Boards, University Research Coordinators.\n\nExpected Value / Impact: Instantaneous institutional duplicate detection, zero licensing subscription costs, and total data privacy sovereignty.',
        pitchDeck: {
          problemStatement:
            'Existing commercial plagiarism checkers are cost-prohibitive for university departmental adoption and lack vector-level cosine similarity indexing against internal institutional archives.',
          proposedSolution:
            'An on-premises hybrid plagiarism engine combining Fast K-Gram Winnowing fingerprinting with PyTorch Sentence-Transformers vector embeddings in ChromaDB.',
          uniqueContribution:
            'HNSW vector indexing paired with localized exact-character offset token mapping and interactive document visual diffing.',
          targetUsers:
            'Capstone Instructors, Academic Review Boards, University Research Coordinators.',
          expectedImpact:
            'Instantaneous institutional duplicate detection, zero licensing subscription costs, and total data privacy sovereignty.',
        },
        capstoneType: ['AI & Machine Learning Systems', 'Data Science & Big Data Analytics'],
        sdgTags: ['SDG 4: Quality Education', 'SDG 9: Industry, Innovation, and Infrastructure'],
        status: 'pending',
      },
    ],
    adviserId: adviserMentor._id,
    chairId: chairLabastida._id,
    secretaryId: secretaryBautista._id,
    memberIds: [panelLecaros._id, panelAbella._id],
    panelists: [
      { userId: chairLabastida._id, role: 'chair' },
      { userId: panelLecaros._id, role: 'member' },
      { userId: panelAbella._id, role: 'member' },
    ],
    status: 'defended',
    capstoneCourse: 'Capstone 2',
    academicYear: '2025-2026',
    isArchived: false,
    pdfS3StreamUrl:
      'https://s3.ap-southeast-1.amazonaws.com/buksu-cms-storage/manuscripts/cms-v2-final-draft.pdf',
    actionDoneMatrix: [
      {
        panelistId: chairLabastida._id,
        panelistName: 'Louie Jay Labastida',
        panelistRole: 'chair',
        suggestion:
          'Auto-archive approved capstone projects and trigger ChromaDB vector indexing upon complete clearance.',
        actionTaken:
          'Implemented Mongoose post-save state hooks in project.service.js to transition status to archived.',
        pageNumbers: 'Page 14, 28',
        status: 'addressed',
      },
      {
        panelistId: panelLecaros._id,
        panelistName: 'Raul Lecaros',
        panelistRole: 'member',
        suggestion:
          'Reposition roster lock banner to viewport top with color-coded crimson/emerald states.',
        actionTaken: 'Updated ProposalTab.jsx and CSS positioning to absolute top ribbon banner.',
        pageNumbers: 'Page 6',
        status: 'addressed',
      },
      {
        panelistId: panelAbella._id,
        panelistName: 'Joseph Abella',
        panelistRole: 'member',
        suggestion:
          'Decouple Plagiarism Hub into two distinct tabs: Winnowing Exact Match vs PyTorch Semantic Vector Match.',
        actionTaken: 'Refactored PlagiarismChecker.jsx into dual-tab layout.',
        pageNumbers: 'Page 42-45',
        status: 'addressed',
      },
      {
        panelistId: adminAribe._id,
        panelistName: 'Sales G. Aribe Jr.',
        panelistRole: 'secretary',
        suggestion:
          'Build dynamic rubric template builder and support Light Mode with 1.5x font scaling.',
        actionTaken:
          'Created EvaluationTemplateBuilderPage.jsx and bound root font scaling multipliers.',
        pageNumbers: 'Page 50',
        status: 'pending',
      },
    ],
  });

  // Seed Submissions
  const submission1 = await Submission.create({
    projectId: mainProject._id,
    submittedBy: leader._id,
    chapterTitle: 'Chapter 1-3 Complete Defense Draft',
    fileUrl: '/uploads/manuscripts/cms-v2-defense-draft.pdf',
    version: 1,
    plagiarismResult: {
      winnowingSimilarityScore: 12,
      semanticSimilarityScore: 8,
      status: 'passed',
    },
    isFlagged: false,
  });

  // Seed Google-Doc Style PDF Comments with Coordinates
  await Comment.create({
    submissionId: submission1._id,
    projectId: mainProject._id,
    suggesterId: chairLabastida._id,
    suggesterName: 'Louie Jay Labastida',
    pageNumber: 2,
    commentText: 'Revise section header to specify IT Field of Discipline.',
    coordinates: { x: 12.5, y: 18.0, width: 75.0, height: 5.0 },
  });

  await Comment.create({
    submissionId: submission1._id,
    projectId: mainProject._id,
    suggesterId: panelLecaros._id,
    suggesterName: 'Raul Lecaros',
    pageNumber: 5,
    commentText: 'Confirm team member roster displays on right-margin sidebar.',
    coordinates: { x: 10.0, y: 40.0, width: 80.0, height: 6.5 },
  });

  console.log(
    `✔ Seeded Active Defended Project: "${mainProject.title}" with Submissions, Comments, & ADM rows.`,
  );

  // STEP G: SEED EVALUATIONS & GRADE LEAKAGE GATING
  console.log('\n📊 [7/8] Seeding Scoring Rubrics & Grade Leakage Gating State...');

  await Evaluation.create({
    projectId: mainProject._id,
    panelistId: chairLabastida._id,
    evaluatorId: chairLabastida._id,
    defenseType: 'proposal',
    evaluatorRole: 'chair',
    criteria: [
      { name: 'System Architecture & Technical Depth', score: 28, maxScore: 30 },
      { name: 'Plagiarism & Novelty Verification', score: 24, maxScore: 25 },
      { name: 'Action Done Matrix Compliance', score: 23, maxScore: 25 },
      { name: 'Oral Presentation & Q&A Defense', score: 19, maxScore: 20 },
    ],
    scores: [
      { dimensionTitle: 'System Architecture & Technical Depth', score: 28, maxScore: 30 },
      { dimensionTitle: 'Plagiarism & Novelty Verification', score: 24, maxScore: 25 },
      { dimensionTitle: 'Action Done Matrix Compliance', score: 23, maxScore: 25 },
      { dimensionTitle: 'Oral Presentation & Q&A Defense', score: 19, maxScore: 20 },
    ],
    totalGrade: 94,
    totalScore: 94,
    maxTotalScore: 100,
    comments: 'Excellent system architecture and solid state-machine governance.',
    overallComment: 'Excellent system architecture and solid state-machine governance.',
    status: 'submitted',
    isSubmitted: true,
  });

  await Evaluation.create({
    projectId: mainProject._id,
    panelistId: panelLecaros._id,
    evaluatorId: panelLecaros._id,
    defenseType: 'proposal',
    evaluatorRole: 'member',
    criteria: [
      { name: 'System Architecture & Technical Depth', score: 27, maxScore: 30 },
      { name: 'Plagiarism & Novelty Verification', score: 25, maxScore: 25 },
      { name: 'Action Done Matrix Compliance', score: 22, maxScore: 25 },
      { name: 'Oral Presentation & Q&A Defense', score: 18, maxScore: 20 },
    ],
    scores: [
      { dimensionTitle: 'System Architecture & Technical Depth', score: 27, maxScore: 30 },
      { dimensionTitle: 'Plagiarism & Novelty Verification', score: 25, maxScore: 25 },
      { dimensionTitle: 'Action Done Matrix Compliance', score: 22, maxScore: 25 },
      { dimensionTitle: 'Oral Presentation & Q&A Defense', score: 18, maxScore: 20 },
    ],
    totalGrade: 92,
    totalScore: 92,
    maxTotalScore: 100,
    comments: 'Great UI improvements and clear field of discipline alignment.',
    overallComment: 'Great UI improvements and clear field of discipline alignment.',
    status: 'submitted',
    isSubmitted: true,
  });

  // Note: Joseph Abella's rubric is left unsubmitted to trigger Grade Leakage Gating (HTTP 403 EVALUATIONS_INCOMPLETE) for students
  console.log('✔ Seeded 2/3 Panel Rubrics. Third rubric unsubmitted to test Grade Leakage Gating.');

  // STEP H: SEED ARCHIVED PUBLIC CATALOG PROJECT & CONSULTATIONS
  console.log('\n📚 [8/8] Seeding Archived Public Catalog Capstone & Consultation Logs...');

  const archivedTeam = await Team.create({
    name: 'AgriTech Capstone Group',
    leaderId: m1._id,
    members: [m1._id, m2._id],
    memberRoles: [
      { userId: m1._id, role: 'Project Lead & Systems Analyst' },
      { userId: m2._id, role: 'Backend & Database Developer' },
    ],
    adviserId: adviserMentor._id,
    academicYear: '2024-2025',
    isLocked: true,
  });

  const archivedProject = await Project.create({
    title: 'AI-Powered Smart Agriculture Crop Yield Prediction System',
    fieldOfDiscipline: 'Artificial Intelligence & Data Analytics',
    abstract:
      'A predictive analytics engine leveraging climate metrics and computer vision to forecast crop harvest volume.',
    teamId: archivedTeam._id,
    courseId: course._id,
    sectionId: secA._id,
    titleStatus: 'approved',
    projectStatus: 'archived',
    capstonePhase: 4,
    titleProposals: [
      {
        title: 'AI-Powered Smart Agriculture Crop Yield Prediction System',
        description:
          'A predictive analytics engine leveraging climate metrics and computer vision to forecast crop harvest volume.',
        status: 'approved',
      },
    ],
    adviserId: adviserMentor._id,
    chairId: chairLabastida._id,
    status: 'archived',
    capstoneCourse: 'Capstone 2',
    academicYear: '2024-2025',
    isArchived: true,
    archivedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    pdfS3StreamUrl:
      'https://s3.ap-southeast-1.amazonaws.com/buksu-cms-storage/archived/agritech-crop-yield.pdf',
  });

  await Consultation.create({
    teamId: innovateTeam._id,
    adviserId: adviserMentor._id,
    topic: 'Action Done Matrix Revision Progress & Docker Stack Verification',
    scheduledDate: new Date(),
    status: 'completed',
    notes: 'Adviser reviewed Docker setup and confirmed ADM revisions on Chapter 1-3.',
  });

  console.log(
    `✔ Seeded Archived Public Catalog Project: "${archivedProject.title}" (Direct Read-Only S3 Paper View).`,
  );

  console.log('\n======================================================================');
  console.log(' 🎉 SUCCESS: FULL WORKFLOW SYSTEM SEEDING COMPLETED!');
  console.log('======================================================================');
  console.log('  • Password for ALL accounts : Password123!');
  console.log(
    '  • Admin / Coordinator      : aribe@buksu.edu.ph / 2301103203@student.buksu.edu.ph',
  );
  console.log('  • REC Faculty Chair        : louiejay.labastida@buksu.edu.ph');
  console.log(
    '  • Panel Members             : raul.lecaros@buksu.edu.ph / joseph.abella@buksu.edu.ph',
  );
  console.log('  • Capstone Adviser          : leon.mentor.buksu@gmail.com');
  console.log('  • Student Team Leader       : patrick.josh@student.buksu.edu.ph');
  console.log('======================================================================\n');

  await mongoose.connection.close();
}

runFullWorkflowSeeder().catch((err) => {
  console.error('❌ Seeding failed with exception:', err);
  process.exit(1);
});
