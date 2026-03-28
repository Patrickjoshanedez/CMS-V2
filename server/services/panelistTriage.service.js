/* eslint-disable no-console */
/**
 * PanelistTriageService — Automated Agentic Triage Pipeline for Panelist Defense Preparation.
 *
 * Implements a sequential, deterministic orchestration pipeline that intercepts
 * student manuscript submissions before they are made available in the panelist
 * self-service market. This protects high-value panelist time by ensuring only
 * structurally sound, academically compliant documents reach human review.
 *
 * Pipeline Stages:
 *   1. Intake Service         — Extracts text and initializes the evaluation payload.
 *   2. Context Validator      — Guardian Agent: verifies structural completeness,
 *                               word count, and title consistency.
 *   3. Sentiment Analyzer     — Evaluates scholarly tone and academic formality.
 *   4. Router Service         — Deterministic action executor: promotes to DEFENSE_READY
 *                               or routes back to student/adviser with revision notes.
 *
 * Architecture:
 *   - Each agent is a single-responsibility, narrow-scope validator.
 *   - Agents operate in READ-ONLY mode: they cannot directly mutate MongoDB state.
 *   - Only the Router Service (deterministic layer) executes state mutations.
 *   - All actions are logged to the AuditLog for compliance and auditability.
 *
 * @module services/panelistTriage.service
 */
import Project from '../modules/projects/project.model.js';
import Submission from '../modules/submissions/submission.model.js';
import Notification from '../modules/notifications/notification.model.js';
import auditService from '../modules/audit/audit.service.js';
import { emitToUser } from './socket.service.js';
import { PROJECT_STATUSES } from '@cms/shared';

/* ─────────────── Constants ─────────────── */

/** Minimum word count required for a manuscript to pass structural validation. */
const MINIMUM_WORD_COUNT = 500;

/** Required academic section headers (case-insensitive). */
const REQUIRED_SECTIONS = ['abstract', 'methodology', 'conclusion', 'bibliography'];

/** Colloquial/non-academic phrase patterns that flag tone violations. */
const COLLOQUIAL_PATTERNS = [
  /\bgonna\b/i,
  /\bwanna\b/i,
  /\bgotta\b/i,
  /\bkinda\b/i,
  /\bstuff\b/i,
  /\blots of\b/i,
  /\ba lot of\b/i,
  /\bbasically\b/i,
  /\bactually\b/i,
  /\blike,?\s/i,
  /\byou know\b/i,
];

/* ─────────────── Stage 1: Intake Service ─────────────── */

/**
 * Extracts and normalizes the raw text payload from a submission document.
 * Initializes the structured evaluation event for downstream agents.
 *
 * @param {string} submissionId - Submission MongoDB _id.
 * @param {string} projectId    - Owning project _id.
 * @returns {Promise<Object|null>} Evaluation event payload, or null if intake fails.
 */
async function intakeService(submissionId, projectId) {
  const [submission, project] = await Promise.all([
    Submission.findById(submissionId).lean(),
    Project.findById(projectId).populate('teamId', 'name').lean(),
  ]);

  if (!submission || !project) {
    console.warn(`[PanelistTriage] Intake failed: submission or project not found.`);
    return null;
  }

  const rawText = submission.extractedText || '';

  return {
    submissionId: submissionId.toString(),
    projectId: projectId.toString(),
    projectTitle: project.title,
    approvedTitle: project.title,
    teamId: project.teamId?._id?.toString(),
    teamName: project.teamId?.name || 'Unknown',
    panelistIds: project.panelistIds || [],
    adviserId: project.adviserId?.toString(),
    rawText,
    wordCount: rawText.split(/\s+/).filter(Boolean).length,
    validationResult: null,
    sentimentResult: null,
  };
}

/* ─────────────── Stage 2: Context Validator (Guardian Agent) ─────────────── */

/**
 * Guardian Agent — Performs structural compliance analysis.
 *
 * Operates in READ-ONLY mode against the extracted text payload.
 * Verifies: required section presence, minimum word count, and title consistency.
 *
 * @param {Object} event - Evaluation event from intakeService.
 * @returns {Object} Validation result: { passed, failures }
 */
function contextValidator(event) {
  const { rawText, wordCount, projectTitle } = event;
  const failures = [];

  // Check minimum word count
  if (wordCount < MINIMUM_WORD_COUNT) {
    failures.push(
      `Document word count (${wordCount}) is below the required minimum of ${MINIMUM_WORD_COUNT} words.`,
    );
  }

  // Check required academic section headers
  const lowerText = rawText.toLowerCase();
  for (const section of REQUIRED_SECTIONS) {
    if (!lowerText.includes(section)) {
      failures.push(`Missing required academic section: "${section.toUpperCase()}".`);
    }
  }

  // Check that significant keywords from the approved project title appear in the document.
  // Filters out short stop-words to avoid false positives on common conjunctions.
  if (projectTitle) {
    const titleKeywords = projectTitle
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4);
    const titleMissing =
      titleKeywords.length > 0 && !titleKeywords.some((kw) => lowerText.includes(kw));
    if (titleMissing) {
      failures.push(
        `Document does not appear to reference keywords from the approved project title: "${projectTitle}".`,
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/* ─────────────── Stage 3: Intent and Sentiment Analyzer ─────────────── */

/**
 * Sentiment/Tone Analyzer Agent — Evaluates academic formality of the manuscript.
 *
 * Operates in READ-ONLY mode. Flags documents that contain colloquial language,
 * informal phrasing, or patterns inconsistent with academic writing standards.
 *
 * @param {Object} event - Evaluation event from intakeService.
 * @returns {Object} Sentiment result: { passed, violations }
 */
function sentimentAnalyzer(event) {
  const { rawText } = event;
  const violations = [];

  for (const pattern of COLLOQUIAL_PATTERNS) {
    const match = rawText.match(pattern);
    if (match) {
      violations.push(
        `Non-academic language detected: "${match[0].trim()}" — consider formal academic phrasing.`,
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

/* ─────────────── Stage 4: Router Service (Action Executor) ─────────────── */

/**
 * Router Service — Deterministic action executor.
 *
 * Makes a binary routing decision based on the aggregated validation results.
 * This is the ONLY component in the pipeline permitted to mutate database state
 * or emit Socket.IO events.
 *
 * On PASS: Promotes the project to DEFENSE_READY, notifies registered panelists.
 * On FAIL: Routes revision notes back to the student and adviser, logs rejection.
 *
 * @param {Object} event - Evaluation event enriched with validationResult and sentimentResult.
 * @returns {Promise<Object>} Routing outcome.
 */
async function routerService(event) {
  const { validationResult, sentimentResult, projectId, submissionId } = event;

  const allPassed = validationResult.passed && sentimentResult.passed;

  if (allPassed) {
    return _handlePassedTriage(event);
  }

  return _handleFailedTriage(event, projectId, submissionId, validationResult, sentimentResult);
}

async function _handlePassedTriage(event) {
  const { projectId, panelistIds, teamId } = event;

  // Promote project to DEFENSE_READY — the only permitted state mutation in this pipeline
  await Project.findByIdAndUpdate(projectId, {
    projectStatus: PROJECT_STATUSES.DEFENSE_READY,
  });

  // Notify all registered panelists via Socket.IO
  const panelistNotifications = await Promise.all(
    (panelistIds || []).map(async (panelistId) => {
      const notif = await Notification.create({
        userId: panelistId,
        type: 'triage_passed',
        title: 'New Manuscript Ready for Review',
        message: `A manuscript for "${event.projectTitle}" has passed automated triage and is available for panelist review.`,
        metadata: {
          projectId,
          submissionId: event.submissionId,
          triagedAt: new Date().toISOString(),
        },
      });
      emitToUser(panelistId, 'notification:new', notif);
      return notif;
    }),
  );

  // Log to immutable audit trail
  await auditService.log({
    action: 'triage.passed',
    actor: teamId || 'system',
    actorRole: 'system',
    targetType: 'project',
    targetId: projectId,
    description: `Automated triage PASSED for project "${event.projectTitle}". Project promoted to DEFENSE_READY.`,
    metadata: {
      submissionId: event.submissionId,
      wordCount: event.wordCount,
      panelistsNotified: panelistNotifications.length,
    },
  });

  console.log(
    `[PanelistTriage] Project ${projectId} promoted to DEFENSE_READY after triage pass.`,
  );

  return {
    outcome: 'passed',
    projectStatus: PROJECT_STATUSES.DEFENSE_READY,
    panelistsNotified: panelistNotifications.length,
  };
}

async function _handleFailedTriage(
  event,
  projectId,
  submissionId,
  validationResult,
  sentimentResult,
) {
  const allFailures = [
    ...(validationResult.failures || []),
    ...(sentimentResult.violations || []),
  ];

  const revisionPayload = {
    submissionId,
    projectId,
    projectTitle: event.projectTitle,
    rejectedAt: new Date().toISOString(),
    requiredRevisions: allFailures,
    message:
      'Your manuscript requires the following revisions before it can be submitted to panelists.',
  };

  // Notify the team (if teamId is available)
  if (event.teamId) {
    const studentNotif = await Notification.create({
      userId: event.teamId,
      type: 'triage_failed',
      title: 'Manuscript Requires Revisions',
      message: `Your manuscript for "${event.projectTitle}" requires revisions before panelist review.`,
      metadata: revisionPayload,
    });
    emitToUser(event.teamId, 'notification:new', studentNotif);
  }

  // Notify the adviser
  if (event.adviserId) {
    const adviserNotif = await Notification.create({
      userId: event.adviserId,
      type: 'triage_failed',
      title: 'Student Manuscript Requires Revisions',
      message: `A manuscript for "${event.projectTitle}" failed automated triage and requires revision.`,
      metadata: revisionPayload,
    });
    emitToUser(event.adviserId, 'notification:new', adviserNotif);
  }

  // Log rejection to immutable audit trail
  await auditService.log({
    action: 'triage.failed',
    actor: event.teamId || 'system',
    actorRole: 'system',
    targetType: 'submission',
    targetId: submissionId,
    description: `Automated triage FAILED for project "${event.projectTitle}". Manuscript routed back for revision.`,
    metadata: {
      submissionId,
      projectId,
      requiredRevisions: allFailures,
    },
  });

  console.warn(
    `[PanelistTriage] Project ${projectId} triage FAILED — ${allFailures.length} revision(s) required.`,
  );

  return {
    outcome: 'failed',
    requiredRevisions: allFailures,
    revisionPayload,
  };
}

/* ─────────────── Public Orchestrator ─────────────── */

/**
 * Run the full Agentic Triage Pipeline for a manuscript submission.
 *
 * Orchestrates the sequential execution of all four pipeline stages:
 * Intake → Context Validator → Sentiment Analyzer → Router Service.
 *
 * The orchestrator is deterministic. If any stage fails, the pipeline halts
 * and routes the submission back to the student without escalating to panelists.
 *
 * @param {string} submissionId - Submission MongoDB _id.
 * @param {string} projectId    - Owning project MongoDB _id.
 * @returns {Promise<Object>} Final triage outcome.
 */
async function runTriagePipeline(submissionId, projectId) {
  console.log(`[PanelistTriage] Starting triage pipeline for submission ${submissionId}.`);

  // Stage 1: Intake
  const event = await intakeService(submissionId, projectId);
  if (!event) {
    return { outcome: 'error', reason: 'Intake failed: submission or project not found.' };
  }

  // Stage 2: Context Validator (Guardian Agent — read-only)
  event.validationResult = contextValidator(event);

  // Stage 3: Sentiment Analyzer (read-only)
  event.sentimentResult = sentimentAnalyzer(event);

  // Stage 4: Router Service (action executor — only this stage mutates state)
  const result = await routerService(event);

  console.log(
    `[PanelistTriage] Pipeline completed for submission ${submissionId}: outcome=${result.outcome}.`,
  );

  return result;
}

export default {
  runTriagePipeline,
  // Expose individual stages for unit testing
  intakeService,
  contextValidator,
  sentimentAnalyzer,
  routerService,
};
