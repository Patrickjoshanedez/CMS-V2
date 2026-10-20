import { afterEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

process.env.CLIENT_URL ||= 'http://localhost:43211';

const [
  { default: Project },
  { default: Team },
  { default: Submission },
  { default: projectArchiveService },
  { default: storageService },
] = await Promise.all([
  import('../../modules/projects/project.model.js'),
  import('../../modules/teams/team.model.js'),
  import('../../modules/submissions/submission.model.js'),
  import('../../modules/projects/services/projectArchive.service.js'),
  import('../../services/storage.index.js'),
]);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Project archive indexing and QR certificate', () => {
  it('returns viewable media URLs and the GitHub link in archived project results', async () => {
    const archivedProject = {
      _id: 'project-archive-1',
      title: 'Synthetic Archive Gallery Project',
      academicYear: '2025-2026',
      archivedAt: new Date('2026-10-16T00:00:00.000Z'),
      isArchived: true,
      archiveMetadata: { authors: ['Synthetic Team'], publicationYear: 2026 },
      originalityScore: 98,
      teamId: {
        name: 'Synthetic Team',
        githubUrl: 'https://github.com/example/cms-v2-seeded-e2e',
      },
      prototypes: [
        {
          title: 'Synthetic Architecture Diagram',
          type: 'image',
          storageKey: 'archive/diagram.png',
        },
        { title: 'Synthetic Demo', type: 'link', url: 'https://example.test/demo' },
      ],
    };
    const projectQuery = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue([archivedProject]),
    };
    const submissionQuery = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(Project, 'find').mockReturnValue(projectQuery);
    vi.spyOn(Project, 'countDocuments').mockResolvedValue(1);
    vi.spyOn(Submission, 'find').mockReturnValue(submissionQuery);
    const signedUrl = 'https://storage.example.test/signed/diagram.png';
    const getSignedUrl = vi.spyOn(storageService, 'getSignedUrl').mockResolvedValue(signedUrl);

    const result = await projectArchiveService.searchArchive({}, { role: 'faculty' });

    expect(result.projects[0].githubRepoUrl).toBe('https://github.com/example/cms-v2-seeded-e2e');
    expect(result.projects[0].prototypes[0].signedUrl).toBe(signedUrl);
    expect(result.projects[0].prototypes[1].url).toBe('https://example.test/demo');
    expect(getSignedUrl).toHaveBeenCalledWith('archive/diagram.png', 900);
  });

  it('confirms both final papers are synchronously indexed with stable document identifiers', async () => {
    vi.spyOn(Team, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ name: 'Synthetic Test Team' }),
    });
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from('synthetic paper'));
    vi.spyOn(projectArchiveService, '_extractArchiveSubmissionText').mockResolvedValue(
      'Synthetic final paper text '.repeat(4),
    );
    vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    const save = vi.fn().mockResolvedValue(undefined);
    const project = {
      _id: 'project-1',
      teamId: 'team-1',
      title: 'Synthetic Capstone Test Project',
      academicYear: '2025-2026',
      archiveIndexing: {
        status: 'queued',
        documentIds: ['academic-1', 'journal-1'],
        queuedAt: new Date('2026-10-16T00:00:00.000Z'),
        completedAt: null,
        lastError: '',
      },
      save,
    };
    const fetch = vi.fn(async (_url, options) => ({
      ok: true,
      json: async () => ({
        document_id: JSON.parse(options.body).document_id,
        segments_indexed: 3,
      }),
    }));
    vi.stubGlobal('fetch', fetch);

    await projectArchiveService._indexArchiveCorpus(project, [
      { _id: 'academic-1', storageKey: 'academic.pdf', fileType: 'application/pdf' },
      { _id: 'journal-1', storageKey: 'journal.pdf', fileType: 'application/pdf' },
    ]);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(options.body).document_id)).toEqual([
      'academic-1',
      'journal-1',
    ]);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/index\/sync$/),
      expect.stringMatching(/\/index\/sync$/),
    ]);
    expect(project.archiveIndexing.status).toBe('completed');
    expect(project.archiveIndexing.documentIds).toEqual(['academic-1', 'journal-1']);
    expect(project.archiveIndexing.completedAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalledTimes(4);
  });

  it('does not report indexing complete when the engine stores no segments', async () => {
    vi.spyOn(Team, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({ name: 'Synthetic Test Team' }),
    });
    vi.spyOn(storageService, 'downloadFile').mockResolvedValue(Buffer.from('synthetic paper'));
    vi.spyOn(projectArchiveService, '_extractArchiveSubmissionText').mockResolvedValue(
      'Synthetic final paper text '.repeat(4),
    );
    const save = vi.fn().mockResolvedValue(undefined);
    const project = {
      _id: 'project-1',
      teamId: 'team-1',
      title: 'Synthetic Capstone Test Project',
      academicYear: '2025-2026',
      archiveIndexing: {
        status: 'not_started',
        documentIds: [],
        queuedAt: null,
        completedAt: null,
        lastError: '',
      },
      save,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ document_id: 'academic-1', segments_indexed: 0 }),
      })),
    );

    await expect(
      projectArchiveService._indexArchiveCorpus(project, [
        { _id: 'academic-1', storageKey: 'academic.pdf', fileType: 'application/pdf' },
      ]),
    ).rejects.toMatchObject({ code: 'ARCHIVE_INDEX_UNAVAILABLE' });
    expect(project.archiveIndexing.status).toBe('failed');
    expect(project.archiveIndexing.documentIds).toEqual([]);
    expect(project.archiveIndexing.completedAt).toBeNull();
  });

  it('generates a readable PDF certificate and embeds a QR verification URL', async () => {
    const uploadFile = vi.spyOn(storageService, 'uploadFile').mockResolvedValue(undefined);
    vi.spyOn(storageService, 'buildCertificateKey').mockReturnValue(
      'archive/project-1/completion-certificate.pdf',
    );
    const project = {
      _id: 'project-1',
      title: 'Synthetic Capstone Completion',
      academicYear: '2025-2026',
      archivedAt: new Date('2026-10-16T00:00:00.000Z'),
    };
    const hash = 'a'.repeat(64);

    const result = await projectArchiveService._generateCompletionCertificate(project, hash);
    const [bytes, key, contentType, metadata] = uploadFile.mock.calls[0];
    const document = await PDFDocument.load(bytes);

    expect(result.storageKey).toBe(key);
    expect(contentType).toBe('application/pdf');
    expect(document.getPageCount()).toBe(1);
    expect(metadata.verificationHash).toBe(hash);
    expect(metadata.verificationUrl).toContain(`/certificate/verify/${hash}`);
  });

  it('verifies only an archived certificate with the matching 64-character hash', async () => {
    const verificationHash = 'b'.repeat(64);
    const project = {
      _id: 'project-1',
      title: 'Synthetic Capstone Completion',
      academicYear: '2025-2026',
      archivedAt: new Date('2026-10-16T00:00:00.000Z'),
      projectStatus: 'archived',
      isArchived: true,
      certificateStorageKey: 'certificate.pdf',
      certificateVerificationHash: verificationHash,
    };
    vi.spyOn(Project, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue(project),
    });

    await expect(
      projectArchiveService.verifyCertificate('project-1', verificationHash),
    ).resolves.toMatchObject({
      valid: true,
      projectId: 'project-1',
      verificationHash,
    });
    await expect(
      projectArchiveService.verifyCertificate('project-1', 'c'.repeat(64)),
    ).rejects.toMatchObject({
      code: 'CERTIFICATE_NOT_VERIFIED',
    });
  });
});
