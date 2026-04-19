import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createAuthenticatedUserWithRole,
  createCourseAndSection,
  createValidProjectPayload,
} from '../helpers.js';
import Team from '../../modules/teams/team.model.js';
import Project from '../../modules/projects/project.model.js';
import User from '../../modules/users/user.model.js';
import Manuscript from '../../modules/documents/document.model.js';
import storageService from '../../services/storage.service.js';
import * as pdfMetadataExtractor from '../../utils/pdfMetadataExtractor.js';
import { DOCUMENT_TYPES } from '@cms/shared';

vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
  'https://mock-s3.example.com/signed-url',
);
vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);

function createPdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
}

async function createDocumentFixture() {
  const { agent: studentAgent, user: studentUser } = await createAuthenticatedUserWithRole(
    'student',
    {
      email: 'documents-student@test.com',
    },
  );
  const { user: adviserUser, agent: adviserAgent } = await createAuthenticatedUserWithRole(
    'adviser',
    {
      email: 'documents-adviser@test.com',
    },
  );
  const { user: panelistUser, agent: panelistAgent } = await createAuthenticatedUserWithRole(
    'panelist',
    {
      email: 'documents-panelist@test.com',
    },
  );
  const { user: instructorUser } = await createAuthenticatedUserWithRole('instructor', {
    email: 'documents-instructor@test.com',
  });

  const team = await Team.create({
    name: 'Documents Team',
    leaderId: studentUser._id,
    members: [studentUser._id],
    isLocked: true,
    academicYear: '2024-2025',
  });
  await User.findByIdAndUpdate(studentUser._id, { teamId: team._id });

  const { course, section } = await createCourseAndSection(instructorUser._id);
  const payload = createValidProjectPayload(team._id, course._id, section._id, [studentUser._id]);
  delete payload.teamId;

  const createProjectRes = await studentAgent.post('/api/projects').send(payload);
  expect(createProjectRes.status).toBe(201);

  const projectId = createProjectRes.body.data.project._id;
  await Project.findByIdAndUpdate(projectId, {
    adviserId: adviserUser._id,
    panelistIds: [panelistUser._id],
  });

  return {
    studentAgent,
    adviserAgent,
    panelistAgent,
    projectId,
    studentUser,
    adviserUser,
    panelistUser,
  };
}

describe('Documents API — /api/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(
      'https://mock-s3.example.com/signed-url',
    );
    vi.spyOn(storageService, 'deleteFile').mockResolvedValue(undefined);
  });

  it('extracts metadata from an uploaded PDF', async () => {
    const { agent } = await createAuthenticatedUserWithRole('student', {
      email: 'documents-metadata@test.com',
    });

    const metadataSpy = vi.spyOn(pdfMetadataExtractor, 'extractPdfMetadata').mockResolvedValue({
      title: 'Document Automation for Capstone Projects',
      abstract: 'This paper validates the document metadata pipeline.',
      publicationYear: 2025,
      authors: ['Jane Doe', 'John Smith'],
      keywords: ['document automation', 'metadata pipeline'],
      extractionProvider: 'heuristic',
      confidence: {
        title: 0.93,
        abstract: 0.88,
        publicationYear: 0.82,
        authors: 0.76,
        keywords: 0.79,
      },
    });

    const res = await agent
      .post('/api/documents/extract-pdf-metadata')
      .attach('file', createPdfBuffer(), 'paper.pdf');

    expect(res.status).toBe(200);
    expect(res.body.metadata.title).toBe('Document Automation for Capstone Projects');
    expect(res.body.metadata.abstract).toContain('document metadata pipeline');
    expect(res.body.metadata.year).toBe('2025');
    expect(res.body.metadata.authors).toBe('Jane Doe, John Smith');
    expect(res.body.metadata.keywords).toBe('document automation, metadata pipeline');
    expect(res.body.metadata.venue).toBe('');
    expect(res.body.confidence.title).toBe(93);
    expect(res.body.confidence.abstract).toBe(88);
    expect(res.body.confidence.year).toBe(82);
    expect(res.body.confidence.authors).toBe(76);
    expect(res.body.confidence.keywords).toBe(79);
    expect(metadataSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to filename title when extractor returns empty metadata', async () => {
    const { agent } = await createAuthenticatedUserWithRole('student', {
      email: 'documents-metadata-fallback@test.com',
    });

    const metadataSpy = vi.spyOn(pdfMetadataExtractor, 'extractPdfMetadata').mockResolvedValue({
      title: '',
      abstract: '',
      publicationYear: null,
      authors: [],
      keywords: [],
      extractionProvider: 'heuristic',
      confidence: {
        title: 0,
        abstract: 0,
        publicationYear: 0,
        authors: 0,
        keywords: 0,
      },
    });

    const res = await agent
      .post('/api/documents/extract-pdf-metadata')
      .attach('file', createPdfBuffer(), 'Project Workspace_ Capstone Management System.pdf');

    expect(res.status).toBe(200);
    expect(res.body.metadata.title).toBe('Project Workspace Capstone Management System');
    expect(res.body.confidence.title).toBe(35);
    expect(metadataSpy).toHaveBeenCalledTimes(1);
  });

  it('uploads a manuscript and lists it with a resolved edit link', async () => {
    const { studentAgent, projectId } = await createDocumentFixture();

    const externalDocUrl = 'https://docs.google.com/document/d/mock-manuscript/edit?embedded=true';
    const uploadRes = await studentAgent
      .post(`/api/documents/projects/${projectId}/manuscripts`)
      .send({
        documentType: DOCUMENT_TYPES.CHAPTER_1,
        title: 'Chapter 1 - Introduction',
        externalDocUrl,
        externalDocProvider: 'google_docs',
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.manuscript.documentType).toBe(DOCUMENT_TYPES.CHAPTER_1);
    expect(uploadRes.body.data.manuscript.externalDocUrl).toBe(externalDocUrl);

    const listRes = await studentAgent.get(`/api/documents/projects/${projectId}/manuscripts`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.manuscripts).toHaveLength(1);
    expect(listRes.body.data.manuscripts[0].title).toBe('Chapter 1 - Introduction');
    expect(listRes.body.data.manuscripts[0].openLink).toBe(externalDocUrl);
  });

  it('returns a preview link for panelists', async () => {
    const { studentAgent, panelistAgent, projectId } = await createDocumentFixture();

    await studentAgent.post(`/api/documents/projects/${projectId}/manuscripts`).send({
      documentType: DOCUMENT_TYPES.PROPOSAL,
      title: 'Project Proposal',
      externalDocUrl: 'https://docs.google.com/document/d/mock-proposal/edit?embedded=true',
      externalDocProvider: 'google_docs',
    });

    const res = await panelistAgent.get(
      `/api/documents/projects/${projectId}/manuscripts/${DOCUMENT_TYPES.PROPOSAL}/open-link`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('preview');
    expect(res.body.data.openLink).toContain('/preview');
  });

  it('syncs permissions and review state for an uploaded manuscript', async () => {
    const { studentAgent, adviserAgent, projectId, adviserUser, panelistUser } =
      await createDocumentFixture();

    await studentAgent.post(`/api/documents/projects/${projectId}/manuscripts`).send({
      documentType: DOCUMENT_TYPES.FINAL_ACADEMIC,
      title: 'Final Academic Paper',
      externalDocUrl: 'https://docs.google.com/document/d/mock-final/edit?embedded=true',
      externalDocProvider: 'google_docs',
    });

    const permissionsRes = await studentAgent.post(
      `/api/documents/projects/${projectId}/manuscripts/${DOCUMENT_TYPES.FINAL_ACADEMIC}/sync-permissions`,
    );

    expect(permissionsRes.status).toBe(200);
    expect(permissionsRes.body.data.manuscript.permissionSnapshot.students).toHaveLength(1);
    expect(permissionsRes.body.data.manuscript.permissionSnapshot.adviser).toHaveLength(1);
    expect(permissionsRes.body.data.manuscript.permissionSnapshot.panelists).toHaveLength(1);
    expect(permissionsRes.body.data.manuscript.permissionSnapshot.adviser[0].email).toBe(
      adviserUser.email.toLowerCase(),
    );
    expect(permissionsRes.body.data.manuscript.permissionSnapshot.panelists[0].email).toBe(
      panelistUser.email.toLowerCase(),
    );

    const reviewRes = await adviserAgent.post(
      `/api/documents/projects/${projectId}/manuscripts/${DOCUMENT_TYPES.FINAL_ACADEMIC}/submit-review`,
    );

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.manuscript.reviewStatus).toBe('review_submitted');
    expect(reviewRes.body.data.manuscript.reviewSubmittedBy).toBe(adviserUser._id.toString());

    const syncCommentsRes = await adviserAgent.post(
      `/api/documents/projects/${projectId}/manuscripts/${DOCUMENT_TYPES.FINAL_ACADEMIC}/sync-comments`,
    );

    expect(syncCommentsRes.status).toBe(200);
    expect(syncCommentsRes.body.data.manuscript.commentsLastSyncedAt).toBeTruthy();
  });

  it('returns archived comments for authorized viewers', async () => {
    const { studentAgent, panelistAgent, projectId } = await createDocumentFixture();

    await studentAgent.post(`/api/documents/projects/${projectId}/manuscripts`).send({
      documentType: DOCUMENT_TYPES.CHAPTER_2,
      title: 'Chapter 2 - Review Notes',
      externalDocUrl: 'https://docs.google.com/document/d/mock-comments/edit?embedded=true',
      externalDocProvider: 'google_docs',
    });

    await Manuscript.findOneAndUpdate(
      { projectId, documentType: DOCUMENT_TYPES.CHAPTER_2 },
      {
        archivedComments: [
          {
            externalCommentId: 'comment-1',
            content: 'Please expand the methodology section.',
            quotedText: 'Methodology',
            authorName: 'Adviser One',
            authorEmail: 'documents-adviser@test.com',
            createdAtExternal: new Date('2025-01-10T10:00:00.000Z'),
            modifiedAtExternal: new Date('2025-01-10T11:00:00.000Z'),
            resolved: false,
            deleted: false,
            replies: [],
          },
        ],
        commentsLastSyncedAt: new Date('2025-01-11T10:00:00.000Z'),
      },
    );

    const res = await panelistAgent.get(
      `/api/documents/projects/${projectId}/manuscripts/${DOCUMENT_TYPES.CHAPTER_2}/comments`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.comments).toHaveLength(1);
    expect(res.body.data.comments[0]).toMatchObject({
      externalCommentId: 'comment-1',
      authorName: 'Adviser One',
      content: 'Please expand the methodology section.',
    });
    expect(res.body.data.commentsLastSyncedAt).toBeTruthy();
  });
});
