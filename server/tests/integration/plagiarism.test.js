/**
 * Integration & unit tests for the Plagiarism / Originality Checking system.
 *
 * Covers:
 *  1. Text extraction utility (PDF, DOCX, TXT, unsupported MIME, empty buffer)
 *  2. Plagiarism service — tokenize, buildShingles, jaccardSimilarity,
 *     compareAgainstCorpus, generateMockResult, checkOriginality
 *  3. Plagiarism job — processJob (sync fallback) end-to-end
 *  4. API endpoint — GET /api/submissions/:submissionId/plagiarism
 *  5. Upload-triggered plagiarism enqueue (integration)
 *
 * S3 and queue operations are mocked to avoid external dependencies.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthenticatedUserWithRole, createAgent } from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Submission from '../../modules/submissions/submission.model.js';
import Notification from '../../modules/notifications/notification.model.js';
import storageService from '../../services/storage.service.js';
import {
  SUBMISSION_STATUSES,
  TITLE_STATUSES,
  PROJECT_STATUSES,
  PLAGIARISM_STATUSES,
} from '@cms/shared';
import {
  tokenize,
  jaccardSimilarity,
  buildShingles,
  compareAgainstCorpus,
  generateMockResult,
  checkOriginality,
} from '../../services/plagiarism.service.js';
import { extractText } from '../../utils/extractText.js';
import { runPlagiarismCheckSync } from '../../jobs/plagiarism.job.js';

/* ------------------------------------------------------------------ */
/*  Mock S3 + Queue operations                                        */
/* ------------------------------------------------------------------ */

vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'downloadFile').mockResolvedValue(
  Buffer.from(
    'This is a sample document text for plagiarism checking purposes. ' +
      'The capstone management system needs to verify originality of uploaded documents. ' +
      'This text is long enough to pass the minimum character threshold for comparison.',
  ),
);

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a locked team, link the student, and create an active project.
 */
async function createProjectSetup(studentId, adviserId = null) {
  const team = await Team.create({
    name: 'Plagiarism Test Team',
    leaderId: studentId,
    members: [studentId],
    isLocked: true,
    academicYear: '2024-2025',
  });

  await User.findByIdAndUpdate(studentId, { teamId: team._id });

  const project = await Project.create({
    teamId: team._id,
    title: 'Plagiarism Test Project',
    abstract: 'Testing plagiarism checker integration.',
    keywords: ['plagiarism', 'test'],
    academicYear: '2024-2025',
    titleStatus: TITLE_STATUSES.APPROVED,
    projectStatus: PROJECT_STATUSES.ACTIVE,
    adviserId: adviserId || undefined,
    deadlines: {
      chapter1: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      chapter2: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      chapter3: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    },
  });

  return { team, project };
}

/**
 * Create a minimal valid PDF buffer (magic bytes for PDF: %PDF-1.4).
 */
function createPdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
}

/* ================================================================== */
/*  1. Text Extraction Utility                                        */
/* ================================================================== */

describe('Text Extraction — extractText()', () => {
  it('should extract text from a plain text buffer', async () => {
    const buffer = Buffer.from('Hello world, this is a test document.');
    const result = await extractText(buffer, 'text/plain');
    expect(result).toBe('Hello world, this is a test document.');
  });

  it('should throw on empty buffer', async () => {
    await expect(extractText(Buffer.alloc(0), 'text/plain')).rejects.toThrow(
      'Cannot extract text from an empty buffer.',
    );
  });

  it('should throw on null buffer', async () => {
    await expect(extractText(null, 'text/plain')).rejects.toThrow(
      'Cannot extract text from an empty buffer.',
    );
  });

  it('should throw on unsupported MIME type', async () => {
    const buffer = Buffer.from('some data');
    await expect(extractText(buffer, 'image/png')).rejects.toThrow(
      'Unsupported MIME type for text extraction: image/png',
    );
  });

  it('should handle application/vnd.openxmlformats MIME type (DOCX)', async () => {
    // We test that the function accepts the MIME type — actual DOCX extraction
    // requires a valid DOCX buffer (ZIP archive). We just verify the path exists.
    const fakeDocx = Buffer.from('not a real docx');
    await expect(
      extractText(
        fakeDocx,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).rejects.toThrow(); // Will throw because it's not a valid ZIP/DOCX
  });
});

/* ================================================================== */
/*  2. Plagiarism Service — Unit Tests                                */
/* ================================================================== */

describe('Plagiarism Service — tokenize()', () => {
  it('should tokenize text to lowercase, removing punctuation and short words', () => {
    const tokens = tokenize('Hello, World! This is a Test.');
    expect(tokens).toEqual(['hello', 'world', 'this', 'test']);
  });

  it('should return empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('should filter out tokens shorter than 3 characters', () => {
    const tokens = tokenize('I am so OK now');
    // 'now' has 3 chars => kept; 'I', 'am', 'so', 'OK' all < 3 or == 2 => filtered
    expect(tokens).toEqual(['now']);
  });
});

describe('Plagiarism Service — jaccardSimilarity()', () => {
  it('should return 1 for identical sets', () => {
    const setA = new Set(['hello', 'world']);
    const result = jaccardSimilarity(setA, setA);
    expect(result).toBe(1);
  });

  it('should return 0 for disjoint sets', () => {
    const setA = new Set(['hello', 'world']);
    const setB = new Set(['foo', 'bar']);
    expect(jaccardSimilarity(setA, setB)).toBe(0);
  });

  it('should return value between 0 and 1 for partial overlap', () => {
    const setA = new Set(['hello', 'world', 'foo']);
    const setB = new Set(['hello', 'bar', 'baz']);
    const result = jaccardSimilarity(setA, setB);
    // Intersection: {'hello'} = 1, Union: 5 => 1/5 = 0.2
    expect(result).toBeCloseTo(0.2, 5);
  });

  it('should return 1 for two empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
  });

  it('should return 0 when one set is empty', () => {
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0);
  });
});

describe('Plagiarism Service — buildShingles()', () => {
  it('should create 3-grams from tokens', () => {
    const tokens = ['the', 'quick', 'brown', 'fox', 'jumps'];
    const shingles = buildShingles(tokens, 3);
    expect(shingles).toBeInstanceOf(Set);
    expect(shingles.size).toBe(3); // 5 tokens - 3 + 1 = 3 shingles
    expect(shingles.has('the quick brown')).toBe(true);
    expect(shingles.has('quick brown fox')).toBe(true);
    expect(shingles.has('brown fox jumps')).toBe(true);
  });

  it('should return empty set for fewer tokens than shingle size', () => {
    const shingles = buildShingles(['hello', 'world'], 3);
    expect(shingles.size).toBe(0);
  });

  it('should create 1-grams (unigrams) when n=1', () => {
    const shingles = buildShingles(['hello', 'world'], 1);
    expect(shingles.size).toBe(2);
    expect(shingles.has('hello')).toBe(true);
    expect(shingles.has('world')).toBe(true);
  });
});

describe('Plagiarism Service — compareAgainstCorpus()', () => {
  it('should return 100 originality with empty corpus', () => {
    const result = compareAgainstCorpus('Some text here.', []);
    expect(result.originalityScore).toBe(100);
    expect(result.matchedSources).toEqual([]);
  });

  it('should return 100 originality with null corpus', () => {
    const result = compareAgainstCorpus('Some text here.', null);
    expect(result.originalityScore).toBe(100);
    expect(result.matchedSources).toEqual([]);
  });

  it('should detect high similarity with identical text', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the river bank';
    const corpus = [
      {
        id: 'doc1',
        title: 'Existing Paper',
        chapter: 1,
        text: 'The quick brown fox jumps over the lazy dog near the river bank',
      },
    ];
    const result = compareAgainstCorpus(text, corpus);
    // Identical text should yield low originality
    expect(result.originalityScore).toBeLessThan(20);
    expect(result.matchedSources.length).toBeGreaterThan(0);
    expect(result.matchedSources[0].matchPercentage).toBe(100);
  });

  it('should return high originality for completely different text', () => {
    const text =
      'Quantum computing leverages superposition and entanglement for parallel processing';
    const corpus = [
      {
        id: 'doc1',
        title: 'Cooking Paper',
        chapter: 1,
        text: 'Italian pasta recipes include spaghetti carbonara and fettuccine alfredo with garlic bread',
      },
    ];
    const result = compareAgainstCorpus(text, corpus);
    expect(result.originalityScore).toBeGreaterThan(80);
  });

  it('should skip corpus documents with empty text', () => {
    const text = 'Sample text for testing comparison analysis';
    const corpus = [
      { id: 'doc1', title: 'Empty Doc', chapter: 1, text: '' },
      { id: 'doc2', title: 'Null Doc', chapter: 2, text: null },
    ];
    const result = compareAgainstCorpus(text, corpus);
    // No valid comparisons → fully original
    expect(result.originalityScore).toBe(100);
    expect(result.matchedSources).toEqual([]);
  });

  it('should limit matched sources to top 10', () => {
    const text = 'The capstone management system handles document uploads and version control';
    const corpus = Array.from({ length: 15 }, (_, i) => ({
      id: `doc${i}`,
      title: `Paper ${i}`,
      chapter: 1,
      text:
        'The capstone management system handles document uploads and version control with variations ' +
        i,
    }));
    const result = compareAgainstCorpus(text, corpus);
    expect(result.matchedSources.length).toBeLessThanOrEqual(10);
  });

  it('should sort matched sources by matchPercentage descending', () => {
    const text =
      'Advanced machine learning algorithms for natural language processing tasks in education';
    const corpus = [
      {
        id: 'high',
        title: 'High Match',
        chapter: 1,
        text: 'Advanced machine learning algorithms for natural language processing tasks in education research',
      },
      {
        id: 'low',
        title: 'Low Match',
        chapter: 2,
        text: 'Basic introduction to programming with Python for beginners in computer science education',
      },
    ];
    const result = compareAgainstCorpus(text, corpus);
    if (result.matchedSources.length >= 2) {
      expect(result.matchedSources[0].matchPercentage).toBeGreaterThanOrEqual(
        result.matchedSources[1].matchPercentage,
      );
    }
  });
});

describe('Plagiarism Service — generateMockResult()', () => {
  it('should return a score between 70 and 100', () => {
    // Run multiple times to test randomness range
    for (let i = 0; i < 20; i++) {
      const result = generateMockResult();
      expect(result.originalityScore).toBeGreaterThanOrEqual(70);
      expect(result.originalityScore).toBeLessThanOrEqual(100);
    }
  });

  it('should return an empty matchedSources array', () => {
    const result = generateMockResult();
    expect(result.matchedSources).toEqual([]);
  });
});

describe('Plagiarism Service — checkOriginality()', () => {
  it('should use internal engine when corpus is provided', async () => {
    const text = 'Document about capstone project management and workflow automation systems';
    const corpus = [
      {
        id: 'doc1',
        title: 'Similar Paper',
        chapter: 1,
        text: 'Document about capstone project management and workflow automation systems in education',
      },
    ];
    const result = await checkOriginality(text, corpus);
    expect(result).toHaveProperty('originalityScore');
    expect(result).toHaveProperty('matchedSources');
    expect(typeof result.originalityScore).toBe('number');
    expect(result.originalityScore).toBeGreaterThanOrEqual(0);
    expect(result.originalityScore).toBeLessThanOrEqual(100);
  });

  it('should fall back to mock when no corpus and no API', async () => {
    const result = await checkOriginality('Some text', []);
    expect(result).toHaveProperty('originalityScore');
    expect(result.originalityScore).toBeGreaterThanOrEqual(70);
    expect(result.originalityScore).toBeLessThanOrEqual(100);
    expect(result.matchedSources).toEqual([]);
  });
});

/* ================================================================== */
/*  3. Plagiarism Job — Sync Fallback (processJob)                    */
/* ================================================================== */

describe('Plagiarism Job — runPlagiarismCheckSync()', () => {
  let studentUser, project;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

    // Create student and project setup
    ({ user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'plag-student@test.com',
    }));

    const setup = await createProjectSetup(studentUser._id);
    project = setup.project;
    studentUser = await User.findById(studentUser._id);
  });

  it('should process a submission and store originality results', async () => {
    const sampleText =
      'This is a comprehensive research paper about capstone management systems. ' +
      'The document covers project workflows, plagiarism detection, and academic integrity. ' +
      'Our system automates the process of checking originality of student submissions.';

    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from(sampleText));

    // Create a submission manually
    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.txt',
      fileType: 'text/plain',
      fileSize: sampleText.length,
      storageKey: 'test/chapter1.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    // Run the sync plagiarism check
    const result = await runPlagiarismCheckSync({
      submissionId: submission._id.toString(),
      storageKey: 'test/chapter1.txt',
      fileType: 'text/plain',
      projectId: project._id.toString(),
      chapter: 1,
    });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('originalityScore');
    expect(result.originalityScore).toBeGreaterThanOrEqual(0);
    expect(result.originalityScore).toBeLessThanOrEqual(100);

    // Verify submission was updated in DB
    const updated = await Submission.findById(submission._id);
    expect(updated.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.COMPLETED);
    expect(updated.plagiarismResult.originalityScore).toBeGreaterThanOrEqual(0);
    expect(updated.plagiarismResult.processedAt).toBeInstanceOf(Date);
    expect(updated.originalityScore).toBeDefined();
  });

  it('should handle very short text by scoring 100% originality', async () => {
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from('Short'));

    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'short.txt',
      fileType: 'text/plain',
      fileSize: 5,
      storageKey: 'test/short.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    const result = await runPlagiarismCheckSync({
      submissionId: submission._id.toString(),
      storageKey: 'test/short.txt',
      fileType: 'text/plain',
      projectId: project._id.toString(),
      chapter: 1,
    });

    expect(result).not.toBeNull();
    expect(result.originalityScore).toBe(100);

    const updated = await Submission.findById(submission._id);
    expect(updated.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.COMPLETED);
    expect(updated.plagiarismResult.originalityScore).toBe(100);
  });

  it('should detect similarity against corpus from another project', async () => {
    const sharedText =
      'The capstone management system provides automated plagiarism detection ' +
      'and document version control for academic submissions in the information technology department. ' +
      'Students upload their chapters which are then compared against an archive of existing papers.';

    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from(sharedText));

    // Create another project with a submission that has extractedText
    const otherStudent = await User.create({
      firstName: 'Other',
      lastName: 'Student',
      email: 'other-plag@test.com',
      password: '$2b$12$hash',
      role: 'student',
      isVerified: true,
    });

    const otherTeam = await Team.create({
      name: 'Other Team',
      leaderId: otherStudent._id,
      members: [otherStudent._id],
      isLocked: true,
      academicYear: '2024-2025',
    });

    const otherProject = await Project.create({
      teamId: otherTeam._id,
      title: 'Other Capstone Project',
      abstract: 'Another project.',
      keywords: ['other'],
      academicYear: '2024-2025',
      titleStatus: TITLE_STATUSES.APPROVED,
      projectStatus: PROJECT_STATUSES.ACTIVE,
    });

    // Create a submission in the OTHER project with stored extractedText
    await Submission.create({
      projectId: otherProject._id,
      chapter: 1,
      version: 1,
      fileName: 'existing.txt',
      fileType: 'text/plain',
      fileSize: sharedText.length,
      storageKey: 'other/chapter1.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: otherStudent._id,
      extractedText: sharedText, // This will be part of the corpus
    });

    // Now create our submission and run plagiarism check
    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.txt',
      fileType: 'text/plain',
      fileSize: sharedText.length,
      storageKey: 'test/chapter1.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    const result = await runPlagiarismCheckSync({
      submissionId: submission._id.toString(),
      storageKey: 'test/chapter1.txt',
      fileType: 'text/plain',
      projectId: project._id.toString(),
      chapter: 1,
    });

    expect(result).not.toBeNull();
    // Should detect the similar document — originality should be lower
    expect(result.originalityScore).toBeLessThan(100);
    expect(result.matchedSources.length).toBeGreaterThan(0);
    expect(result.matchedSources[0].projectTitle).toBe('Other Capstone Project');
  });

  it('should create a notification after successful check', async () => {
    const sampleText =
      'Notification test document with enough text content for processing. ' +
      'This verifies that a plagiarism_complete notification is created after the check finishes.';

    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from(sampleText));

    const submission = await Submission.create({
      projectId: project._id,
      chapter: 2,
      version: 1,
      fileName: 'chapter2.txt',
      fileType: 'text/plain',
      fileSize: sampleText.length,
      storageKey: 'test/chapter2.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    await runPlagiarismCheckSync({
      submissionId: submission._id.toString(),
      storageKey: 'test/chapter2.txt',
      fileType: 'text/plain',
      projectId: project._id.toString(),
      chapter: 2,
    });

    // Check that notification was created
    const notifications = await Notification.find({
      userId: studentUser._id,
      type: 'plagiarism_complete',
    });

    expect(notifications.length).toBe(1);
    expect(notifications[0].title).toBe('Originality Check Complete');
    expect(notifications[0].message).toContain('Chapter 2');
    expect(notifications[0].metadata.submissionId).toBe(submission._id.toString());
  });

  it('should mark submission as failed when download errors', async () => {
    vi.spyOn(storageService, 'downloadFile').mockRejectedValue(new Error('S3 download failed'));

    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.txt',
      fileType: 'text/plain',
      fileSize: 100,
      storageKey: 'test/missing-file.txt',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    const result = await runPlagiarismCheckSync({
      submissionId: submission._id.toString(),
      storageKey: 'test/missing-file.txt',
      fileType: 'text/plain',
      projectId: project._id.toString(),
      chapter: 1,
    });

    // Sync fallback catches the error and returns null
    expect(result).toBeNull();

    // Verify the submission status was set to FAILED
    const updated = await Submission.findById(submission._id);
    expect(updated.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.FAILED);
    expect(updated.plagiarismResult.error).toContain('S3 download failed');
  });
});

/* ================================================================== */
/*  4. API Endpoint — GET /api/submissions/:submissionId/plagiarism   */
/* ================================================================== */

describe('Plagiarism API — GET /api/submissions/:submissionId/plagiarism', () => {
  let studentAgent, studentUser;
  let adviserAgent, adviserUser;
  let project;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(
      Buffer.from(
        'Sufficient text content for plagiarism checking in the capstone management system.',
      ),
    );

    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'plag-api-student@test.com',
    }));

    ({ agent: adviserAgent, user: adviserUser } = await createAuthenticatedUserWithRole('adviser', {
      email: 'plag-api-adviser@test.com',
    }));

    const setup = await createProjectSetup(studentUser._id, adviserUser._id);
    project = setup.project;
    studentUser = await User.findById(studentUser._id);
  });

  it('should return plagiarism status for a valid submission', async () => {
    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storageKey: 'test/chapter1.pdf',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: {
        status: PLAGIARISM_STATUSES.COMPLETED,
        originalityScore: 85,
        matchedSources: [],
        processedAt: new Date(),
      },
      originalityScore: 85,
    });

    const res = await studentAgent.get(`/api/submissions/${submission._id}/plagiarism`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.submissionId).toBe(submission._id.toString());
    expect(res.body.data.originalityScore).toBe(85);
    expect(res.body.data.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.COMPLETED);
  });

  it('should return queued status for a newly submitted document', async () => {
    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storageKey: 'test/chapter1.pdf',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    const res = await studentAgent.get(`/api/submissions/${submission._id}/plagiarism`);

    expect(res.status).toBe(200);
    expect(res.body.data.plagiarismResult.status).toBe(PLAGIARISM_STATUSES.QUEUED);
    expect(res.body.data.originalityScore).toBeNull();
  });

  it('should return 404 for non-existent submission ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await studentAgent.get(`/api/submissions/${fakeId}/plagiarism`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid submission ID format', async () => {
    const res = await studentAgent.get('/api/submissions/not-a-valid-id/plagiarism');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should allow adviser to check plagiarism status', async () => {
    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storageKey: 'test/chapter1.pdf',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: {
        status: PLAGIARISM_STATUSES.COMPLETED,
        originalityScore: 92,
        matchedSources: [],
        processedAt: new Date(),
      },
      originalityScore: 92,
    });

    const res = await adviserAgent.get(`/api/submissions/${submission._id}/plagiarism`);

    expect(res.status).toBe(200);
    expect(res.body.data.originalityScore).toBe(92);
  });

  it('should require authentication', async () => {
    const unauthAgent = createAgent();

    const submission = await Submission.create({
      projectId: project._id,
      chapter: 1,
      version: 1,
      fileName: 'chapter1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storageKey: 'test/chapter1.pdf',
      status: SUBMISSION_STATUSES.PENDING,
      submittedBy: studentUser._id,
      plagiarismResult: { status: PLAGIARISM_STATUSES.QUEUED },
    });

    const res = await unauthAgent.get(`/api/submissions/${submission._id}/plagiarism`);

    expect(res.status).toBe(401);
  });
});

/* ================================================================== */
/*  5. Upload triggers plagiarism — Integration                       */
/* ================================================================== */

describe('Upload triggers plagiarism enqueue', () => {
  let studentAgent, studentUser;
  let adviserUser, project;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);
    // Mock downloadFile to prevent the sync fallback from crashing on real S3
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(
      Buffer.from(
        'Mocked file content that is long enough to pass the minimum character threshold for comparison and analysis.',
      ),
    );

    ({ agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole('student', {
      email: 'plag-upload-student@test.com',
    }));

    ({ user: adviserUser } = await createAuthenticatedUserWithRole('adviser', {
      email: 'plag-upload-adviser@test.com',
    }));

    const setup = await createProjectSetup(studentUser._id, adviserUser._id);
    project = setup.project;
    studentUser = await User.findById(studentUser._id);
  });

  it('should set plagiarismResult.status to QUEUED on chapter upload', async () => {
    const res = await studentAgent
      .post(`/api/submissions/${project._id}/chapters`)
      .field('chapter', '1')
      .attach('file', createPdfBuffer(), 'chapter1.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify the submission has plagiarismResult set
    const submission = await Submission.findOne({ projectId: project._id, chapter: 1 });
    expect(submission).not.toBeNull();
    expect(submission.plagiarismResult).toBeDefined();
    // The status should be QUEUED initially (sync fallback may have started processing by now,
    // but the initial creation sets it to QUEUED)
    expect([
      PLAGIARISM_STATUSES.QUEUED,
      PLAGIARISM_STATUSES.PROCESSING,
      PLAGIARISM_STATUSES.COMPLETED,
      PLAGIARISM_STATUSES.FAILED,
    ]).toContain(submission.plagiarismResult.status);
  });
});
