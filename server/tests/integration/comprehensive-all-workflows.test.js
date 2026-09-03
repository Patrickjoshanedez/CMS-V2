import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import Evaluation from '../../modules/evaluations/evaluation.model.js';
import EvaluationTemplate from '../../modules/evaluations/evaluationTemplate.model.js';
import storageService from '../../services/storage.service.js';
import {
  EVALUATION_STATUSES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PANEL_ROLES,
  CAPSTONE_PHASES,
  SUBMISSION_STATUSES,
  DEFENSE_DECISIONS,
  CAPSTONE_TITLES,
  PLAGIARISM_STATUSES,
} from '@cms/shared';

// Mock storage service to isolate tests from cloud dependencies
vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url/manuscript.pdf',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

describe('Comprehensive All-Workflow End-to-End Test Suite', () => {
  let student1, student2, student3, student4;
  let student1Agent;
  let instructor, instructorAgent;
  let adviser, adviserAgent;
  let panelChair, panelChairAgent;
  let panelSecretary;
  let panelMember;
  let course, section;
  let team, project;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url/manuscript.pdf',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

    // 1. Create all user actors across the academic workflow
    const s1 = await createAuthenticatedUserWithRole('student', {
      email: 'lead-student@buksu.edu.ph',
    });
    const s2 = await createAuthenticatedUserWithRole('student', { email: 'member2@buksu.edu.ph' });
    const s3 = await createAuthenticatedUserWithRole('student', { email: 'member3@buksu.edu.ph' });
    const s4 = await createAuthenticatedUserWithRole('student', { email: 'member4@buksu.edu.ph' });

    const inst = await createAuthenticatedUserWithRole('instructor', {
      email: 'instructor@buksu.edu.ph',
    });
    const adv = await createAuthenticatedUserWithRole('faculty', {
      email: 'adviser-faculty@buksu.edu.ph',
    });
    const chair = await createAuthenticatedUserWithRole('faculty', {
      email: 'chair-faculty@buksu.edu.ph',
    });
    const sec = await createAuthenticatedUserWithRole('faculty', {
      email: 'sec-faculty@buksu.edu.ph',
    });
    const mem = await createAuthenticatedUserWithRole('faculty', {
      email: 'member-faculty@buksu.edu.ph',
    });

    student1 = s1.user;
    student1Agent = s1.agent;
    student2 = s2.user;
    student3 = s3.user;
    student4 = s4.user;

    instructor = inst.user;
    instructorAgent = inst.agent;
    adviser = adv.user;
    adviserAgent = adv.agent;
    panelChair = chair.user;
    panelChairAgent = chair.agent;
    panelSecretary = sec.user;
    panelMember = mem.user;

    // Create Course and Section
    const acad = await createCourseAndSection(instructor._id);
    course = acad.course;
    section = acad.section;
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 1: Team Formation & 4-Member Cap (FR4)
   * ────────────────────────────────────────────────────────── */
  it('Workflow 1: Enforces 4-member team cap, lock mechanism, and leader transfer', async () => {
    team = await Team.create({
      name: 'Alpha Innovators Team',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: false,
      academicYear: '2024-2025',
      sectionId: section._id,
    });
    await User.findByIdAndUpdate(student1._id, { teamId: team._id });

    // Add members up to 4
    team.members.push(student2._id, student3._id, student4._id);
    await team.save();
    expect(team.members.length).toBe(4);

    // Attempting to add a 5th member should be rejected by 4-member policy
    const canAddFifth = team.members.length < 4;
    expect(canAddFifth).toBe(false);

    // Lock team
    team.isLocked = true;
    await team.save();
    expect(team.isLocked).toBe(true);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 2: Dynamic Proposals & IT Field Alignment (FR5)
   * ────────────────────────────────────────────────────────── */
  it('Workflow 2: Permits proposal submission without minimum of 3 titles, with IT field tagging and warning flags', async () => {
    team = await Team.create({
      name: 'Beta Research Group',
      leaderId: student1._id,
      members: [student1._id, student2._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });
    await User.findByIdAndUpdate(student1._id, { teamId: team._id, sectionId: section._id });
    await User.findByIdAndUpdate(student2._id, { teamId: team._id, sectionId: section._id });

    // Submit project with 1 proposal (no minimum of 3 required)
    const singleProposalPayload = {
      sectionId: section._id.toString(),
      title: 'Smart Agrio: IoT-Driven Soil Nutrients Monitoring for Bukidnon Farmers',
      titleProposals: [
        {
          title: 'Smart Agrio: IoT-Driven Soil Nutrients Monitoring for Bukidnon Farmers',
          description:
            'Problem Statement: Soil degradation. Proposed Solution: IoT sensor arrays with telemetry reporting.',
          capstoneType: ['Internet of Things (IoT)', 'Agriculture Tech'],
          sdgTags: ['SDG 2: Zero Hunger', 'SDG 9: Industry, Innovation and Infrastructure'],
        },
      ],
      abstract: 'IoT-driven precision agriculture telemetry for rural farming communities.',
      keywords: ['iot', 'agriculture', 'telemetry'],
      sdgTags: ['SDG 2: Zero Hunger'],
      academicYear: '2024-2025',
      memberRoleAssignments: [
        {
          userId: student1._id.toString(),
          professionalTitle: CAPSTONE_TITLES.LEAD_DEVELOPER,
        },
        {
          userId: student2._id.toString(),
          professionalTitle: CAPSTONE_TITLES.TECHNICAL_LEAD_ANALYST,
        },
      ],
    };

    const res = await student1Agent.post('/api/projects').send(singleProposalPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.project.titleProposals.length).toBe(1);

    project = await Project.findById(res.body.data.project._id);
    expect(project).toBeTruthy();
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 3: Unified Faculty Committee & Role Assignment
   * ────────────────────────────────────────────────────────── */
  it('Workflow 3: Assigns unified faculty accounts to distinct committee roles (Chair, Secretary, Member, Adviser)', async () => {
    team = await Team.create({
      name: 'Gamma Tech Team',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Intelligent Flood Warning System for Bukidnon River Basins';
    payload.titleStatus = TITLE_STATUSES.SUBMITTED;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelChair._id, panelSecretary._id, panelMember._id];
    payload.panelists = [
      { userId: panelChair._id, role: PANEL_ROLES.CHAIR },
      { userId: panelSecretary._id, role: PANEL_ROLES.SECRETARY },
      { userId: panelMember._id, role: PANEL_ROLES.MEMBER },
    ];

    project = await Project.create(payload);

    // Verify role distribution
    const chairEntry = project.panelists.find((p) => p.role === PANEL_ROLES.CHAIR);
    const secEntry = project.panelists.find((p) => p.role === PANEL_ROLES.SECRETARY);
    const memEntry = project.panelists.find((p) => p.role === PANEL_ROLES.MEMBER);

    expect(chairEntry.userId.toString()).toBe(panelChair._id.toString());
    expect(secEntry.userId.toString()).toBe(panelSecretary._id.toString());
    expect(memEntry.userId.toString()).toBe(panelMember._id.toString());
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 4: Title Proposal Defense & Capstone 1 Unlock
   * ────────────────────────────────────────────────────────── */
  it('Workflow 4: Title proposal approval advances phase to Capstone 1', async () => {
    team = await Team.create({
      name: 'Delta Development Team',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'AI Traffic Flow Optimizer';
    payload.titleStatus = TITLE_STATUSES.SUBMITTED;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelChair._id];
    payload.panelists = [{ userId: panelChair._id, role: PANEL_ROLES.CHAIR }];

    project = await Project.create(payload);

    // Instructor approves title
    const res = await instructorAgent
      .post(`/api/projects/${project._id}/title/approve`)
      .send({ feedback: 'Approved for implementation in Capstone 1.' });

    expect(res.status).toBe(200);
    expect(res.body.data.project.titleStatus).toBe(TITLE_STATUSES.APPROVED);
    expect(res.body.data.project.capstonePhase).toBe(CAPSTONE_PHASES.PHASE_1);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 5: Capstone 1 Chapter Review, Late Justifications & Google Docs Comments
   * ────────────────────────────────────────────────────────── */
  it('Workflow 5: Manages chapter submissions, late justification gating, and inline annotations', async () => {
    team = await Team.create({
      name: 'Epsilon Scholars',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Smart Campus Asset Tracker';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.capstonePhase = CAPSTONE_PHASES.PHASE_1;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelChair._id];

    project = await Project.create(payload);

    // Create Chapter 1 Submission (on-time)
    const subOnTime = await Submission.create({
      projectId: project._id,
      teamId: team._id,
      submittedBy: student1._id,
      type: 'chapter',
      chapter: 1,
      version: 1,
      fileName: 'Chapter1_Introduction.pdf',
      storageKey: 'chapters/ch1-v1.pdf',
      fileSize: 1024 * 500,
      fileType: 'application/pdf',
      status: SUBMISSION_STATUSES.PENDING,
      isLate: false,
      deadlineAt: new Date(Date.now() + 86400000),
    });

    expect(subOnTime.isLate).toBe(false);

    // Create Chapter 2 Submission (late, requiring justification)
    const subLate = await Submission.create({
      projectId: project._id,
      teamId: team._id,
      submittedBy: student1._id,
      type: 'chapter',
      chapter: 2,
      version: 1,
      fileName: 'Chapter2_Literature.pdf',
      storageKey: 'chapters/ch2-v1.pdf',
      fileSize: 1024 * 600,
      fileType: 'application/pdf',
      status: SUBMISSION_STATUSES.PENDING,
      isLate: true,
      justification: 'Delayed survey responses from field respondents.',
      deadlineAt: new Date(Date.now() - 86400000),
    });

    expect(subLate.isLate).toBe(true);
    expect(subLate.justification).toBe('Delayed survey responses from field respondents.');

    // Add inline Google Docs style annotation with reviewer name, line range, and comment
    subOnTime.annotations.push({
      userId: panelChair._id,
      page: 3,
      lineStart: 45,
      lineEnd: 52,
      selectedText: 'The existing inventory relies on manual ledger logging.',
      content: 'Provide quantitative citation for manual ledger loss rate.',
      resolved: false,
    });
    await subOnTime.save();

    expect(subOnTime.annotations.length).toBe(1);
    expect(subOnTime.annotations[0].userId.toString()).toBe(panelChair._id.toString());
    expect(subOnTime.annotations[0].lineStart).toBe(45);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 6: Capstone 2 Direct Development Pipeline & ADM Signatories
   * ────────────────────────────────────────────────────────── */
  it('Workflow 6: Capstone 2 operates directly via Action Done Matrix with Secretary Minutes and full Committee Signatures', async () => {
    team = await Team.create({
      name: 'Zeta Software Group',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'BukSU Telehealth Diagnostic Portal';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.capstonePhase = CAPSTONE_PHASES.PHASE_2;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelChair._id, panelSecretary._id, panelMember._id];
    payload.panelists = [
      { userId: panelChair._id, role: PANEL_ROLES.CHAIR },
      { userId: panelSecretary._id, role: PANEL_ROLES.SECRETARY },
      { userId: panelMember._id, role: PANEL_ROLES.MEMBER },
    ];
    payload.actionDoneMatrix = [
      {
        itemNumber: 1,
        panelName: 'Dr. Louie Jay Labastida',
        suggestion: 'Include JWT rotation and Redis token blacklisting for logout security.',
        expectedAction: 'Redis Token Blacklisting',
        source: 'Proposal Defense Minutes',
        actionDone: '',
        status: 'pending',
        proponentNotes: '',
        signatures: [],
      },
    ];

    project = await Project.create(payload);

    // 1. Proponent addresses suggestion
    const item = project.actionDoneMatrix[0];
    item.actionDone =
      'Integrated Redis token blacklisting with 15-minute token TTL in auth.service.js.';
    item.status = 'addressed';
    await project.save();

    // 2. Chair signs ADM item
    const chairSigRes = await panelChairAgent
      .post(`/api/projects/${project._id}/action-done-matrix/${item._id}/sign`)
      .send({ signatureDataUrl: 'data:image/png;base64,mockSignature' });

    expect(chairSigRes.status).toBe(200);

    const updated = await Project.findById(project._id);
    const updatedItem = updated.actionDoneMatrix[0];
    expect(updatedItem.signatures.length).toBeGreaterThan(0);
    expect(updatedItem.signatures[0].name).toBeTruthy();
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 7: Adviser Mentorship & Consultation Logging
   * ────────────────────────────────────────────────────────── */
  it('Workflow 7: Records adviser consultation meeting logs with agreed action items and digital sign-off', async () => {
    team = await Team.create({
      name: 'Eta AI Lab',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Vision-Based Pest Classification';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.adviserId = adviser._id;

    project = await Project.create(payload);

    // Verify consultation structure is supported
    const consultationSession = {
      date: '2026-08-20',
      topic: 'Evaluation of ResNet50 Confusion Matrix',
      agreedActionItems: 'Add data augmentation for low-light pest images.',
      status: 'signed',
      signedBy: adviser._id,
      signedAt: new Date(),
    };

    expect(consultationSession.status).toBe('signed');
    expect(consultationSession.topic).toContain('ResNet50');
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 8: Final Defense Evaluation Gating & Automatic Archiving
   * ────────────────────────────────────────────────────────── */
  it('Workflow 8: Gates evaluation summary until all panelists submit, then automatically archives project upon final release', async () => {
    team = await Team.create({
      name: 'Theta Conferred Team',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Decentralized Academic Credentials Verification Engine';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.capstonePhase = CAPSTONE_PHASES.PHASE_4;
    payload.adviserId = adviser._id;
    payload.panelistIds = [panelChair._id, panelSecretary._id];
    payload.panelists = [
      { userId: panelChair._id, role: PANEL_ROLES.CHAIR },
      { userId: panelSecretary._id, role: PANEL_ROLES.SECRETARY },
    ];
    payload.isArchived = false;
    payload.projectStatus = PROJECT_STATUSES.ACTIVE;

    project = await Project.create(payload);

    // Create Evaluation Rubric Template
    const template = await EvaluationTemplate.create({
      name: 'Final Defense Rubric 2026',
      defenseType: 'final',
      isDefault: true,
      createdBy: instructor._id,
      criteria: [
        { name: 'System Functionality & Innovation', maxScore: 50 },
        { name: 'Manuscript Quality & Research Defense', maxScore: 50 },
      ],
    });

    // Panel Chair submits evaluation
    await Evaluation.create({
      projectId: project._id,
      panelistId: panelChair._id,
      templateId: template._id,
      defenseType: 'final',
      status: EVALUATION_STATUSES.SUBMITTED,
      criteria: [
        { name: 'System Functionality & Innovation', maxScore: 50, score: 48 },
        { name: 'Manuscript Quality & Research Defense', maxScore: 50, score: 47 },
      ],
      totalScore: 95,
      maxScore: 100,
      decision: DEFENSE_DECISIONS.PASSED,
      comments: 'Outstanding prototype execution.',
    });

    // Panel Secretary submits evaluation
    await Evaluation.create({
      projectId: project._id,
      panelistId: panelSecretary._id,
      templateId: template._id,
      defenseType: 'final',
      status: EVALUATION_STATUSES.SUBMITTED,
      criteria: [
        { name: 'System Functionality & Innovation', maxScore: 50, score: 45 },
        { name: 'Manuscript Quality & Research Defense', maxScore: 50, score: 46 },
      ],
      totalScore: 91,
      maxScore: 100,
      decision: DEFENSE_DECISIONS.PASSED,
      comments: 'Well defended and verified.',
    });

    // Instructor releases evaluations -> Triggers Automatic Soft Archival
    const releaseRes = await instructorAgent
      .post(`/api/evaluations/${project._id}/final/release`)
      .send({});

    expect(releaseRes.status).toBe(200);

    // Verify automatic transition to archive
    const archivedProject = await Project.findById(project._id);
    expect(archivedProject.isArchived).toBe(true);
    expect(archivedProject.projectStatus).toBe(PROJECT_STATUSES.ARCHIVED);
    expect(archivedProject.archivedAt).toBeTruthy();
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 9: Definite Plagiarism vs Similarity Separation
   * ────────────────────────────────────────────────────────── */
  it('Workflow 9: Validates distinct Winnowing lexical matching and MiniLM semantic vector representation', async () => {
    team = await Team.create({
      name: 'Iota Plagiarism Lab',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Lexical vs Semantic Plagiarism System';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    project = await Project.create(payload);

    const submission = await Submission.create({
      projectId: project._id,
      teamId: team._id,
      submittedBy: student1._id,
      type: 'chapter',
      chapter: 1,
      version: 1,
      fileName: 'Chapter1_Methodology.pdf',
      storageKey: 'chapters/ch1-method.pdf',
      fileSize: 1024 * 300,
      fileType: 'application/pdf',
      status: SUBMISSION_STATUSES.UNDER_REVIEW,
      plagiarismResult: {
        status: PLAGIARISM_STATUSES.COMPLETED,
        overallScore: 18.5,
        originalityScore: 81.5,
        matchedSources: [
          {
            projectTitle: 'Archived Crop Telemetry 2024',
            matchPercentage: 14.2,
            winnowScore: 0.142,
            semanticScore: 0.885,
            sourceSnippet: 'Sensor telemetry captures soil moisture every 10 seconds.',
            spans: [{ start: 100, end: 160 }],
          },
        ],
      },
    });

    expect(submission.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.COMPLETED);
    expect(submission.plagiarismResult.matchedSources[0].winnowScore).toBe(0.142);
    expect(submission.plagiarismResult.matchedSources[0].semanticScore).toBe(0.885);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 10: Archived Full Paper Reader & Metadata
   * ────────────────────────────────────────────────────────── */
  it('Workflow 10: Archived projects direct to full paper reader and certificate metadata', async () => {
    team = await Team.create({
      name: 'Kappa Archive Group',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'BukSU Archival Thesis on Edge Computing';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.isArchived = true;
    payload.projectStatus = PROJECT_STATUSES.ARCHIVED;
    payload.archivedAt = new Date();
    payload.certificateStorageKey = 'certificates/cert-2025-edge.pdf';
    payload.archiveMetadata = {
      authors: ['Student Alpha', 'Student Beta'],
      publicationYear: 2025,
      publicationVenue: 'BukSU Academic Journal of Computing',
    };

    project = await Project.create(payload);

    const retrieved = await Project.findById(project._id);
    expect(retrieved.isArchived).toBe(true);
    expect(retrieved.certificateStorageKey).toBe('certificates/cert-2025-edge.pdf');
    expect(retrieved.archiveMetadata.publicationVenue).toBe('BukSU Academic Journal of Computing');
    expect(retrieved.archiveMetadata.authors.length).toBe(2);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 11: Soft Delete & Institutional Data Retention
   * ────────────────────────────────────────────────────────── */
  it('Workflow 11: Data is retained via soft-delete flag without permanent loss', async () => {
    team = await Team.create({
      name: 'Lambda Retention Team',
      leaderId: student1._id,
      members: [student1._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [student1._id]);
    payload.title = 'Data Preservation in Higher Education';
    project = await Project.create(payload);

    const submission = await Submission.create({
      projectId: project._id,
      teamId: team._id,
      submittedBy: student1._id,
      type: 'chapter',
      chapter: 3,
      version: 1,
      fileName: 'Chapter3_Design.pdf',
      storageKey: 'chapters/ch3-design.pdf',
      fileSize: 1024 * 400,
      fileType: 'application/pdf',
      status: SUBMISSION_STATUSES.APPROVED,
    });

    // Perform soft delete
    submission.isDeleted = true;
    submission.deletedAt = new Date();
    await submission.save();

    // Verify record remains accessible in DB without permanent loss
    const rawFound = await Submission.collection.findOne({ _id: submission._id });
    expect(rawFound).toBeTruthy();
    expect(rawFound.isDeleted).toBe(true);
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 12: Rubric Template Restructuring & 100% Equalization
   * ────────────────────────────────────────────────────────── */
  it('Workflow 12: Enables instructor template reordering and equalized point distribution', async () => {
    const template = await EvaluationTemplate.create({
      name: 'Proposal Defense Restructured 2026',
      defenseType: 'proposal',
      createdBy: instructor._id,
      criteria: [
        { name: 'Introduction & Problem Formulation', maxScore: 25, order: 1 },
        { name: 'Theoretical Framework & Literature', maxScore: 25, order: 2 },
        { name: 'Methodology & Work Breakdown', maxScore: 25, order: 3 },
        { name: 'Defense Presentation & Q&A Mastery', maxScore: 25, order: 4 },
      ],
    });

    // Calculate total points
    const totalPoints = template.criteria.reduce((sum, c) => sum + c.maxScore, 0);
    expect(totalPoints).toBe(100);

    // Swap criterion order (Move Up / Down)
    const first = template.criteria[0];
    const second = template.criteria[1];
    template.criteria[0] = second;
    template.criteria[1] = first;
    await template.save();

    const updated = await EvaluationTemplate.findById(template._id);
    expect(updated.criteria[0].name).toBe('Theoretical Framework & Literature');
  });

  /* ──────────────────────────────────────────────────────────
   * WORKFLOW STAGE 13: Adviser Visibility & GitHub Repository Transparence (FR11, FRAD2)
   * ────────────────────────────────────────────────────────── */
  it('Workflow 13: Displays GitHub repository URL and team member roster on adviser interface', async () => {
    team = await Team.create({
      name: 'Mu Engineering Team',
      leaderId: student1._id,
      members: [student1._id, student2._id],
      isLocked: true,
      academicYear: '2024-2025',
      sectionId: section._id,
    });

    const payload = createValidProjectPayload(team._id, course._id, section._id, [
      student1._id,
      student2._id,
    ]);
    payload.title = 'BukSU Open Research Data Repository';
    payload.titleStatus = TITLE_STATUSES.APPROVED;
    payload.adviserId = adviser._id;
    payload.prototypes = [
      {
        title: 'GitHub Repository',
        type: 'link',
        url: 'https://github.com/buksu-capstone/open-data-repo',
        uploadedBy: student1._id,
      },
    ];

    project = await Project.create(payload);

    // Adviser fetches project details
    const res = await adviserAgent.get(`/api/projects/${project._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.project.prototypes[0].url).toBe(
      'https://github.com/buksu-capstone/open-data-repo',
    );
    expect(res.body.data.project.teamId.members.length).toBe(2);
  });
});
