import { describe, expect, it } from 'vitest';
import storageService from '../../services/storage.service.js';

describe('StorageService key routing', () => {
  it('builds avatar keys under avatars root', () => {
    const key = storageService.buildAvatarKey('507f1f77bcf86cd799439011');
    expect(key).toBe('avatars/507f1f77bcf86cd799439011/profile');
  });

  it('builds chapter keys under archives/projects root', () => {
    const key = storageService.buildKey('project123', 3, 2, 'Chapter 3 Final.pdf');
    expect(key).toBe('archives/projects/project123/chapters/3/v2/Chapter_3_Final.pdf');
  });

  it('builds proposal keys under archives/projects root', () => {
    const key = storageService.buildProposalKey('project123', 4, 'Compiled Proposal.pdf');
    expect(key).toBe('archives/projects/project123/proposal/v4/Compiled_Proposal.pdf');
  });

  it('builds prototype keys under archives/projects root', () => {
    const key = storageService.buildPrototypeKey('project123', 'proto987', 'Prototype Demo.mp4');
    expect(key).toBe('archives/projects/project123/prototypes/proto987/Prototype_Demo.mp4');
  });

  it('builds final academic keys under archives/projects root', () => {
    const key = storageService.buildFinalAcademicKey('project123', 2, 'Final Paper.pdf');
    expect(key).toBe('archives/projects/project123/final-academic/v2/Final_Paper.pdf');
  });

  it('builds final journal keys under archives/projects root', () => {
    const key = storageService.buildFinalJournalKey('project123', 1, 'Journal Draft.pdf');
    expect(key).toBe('archives/projects/project123/final-journal/v1/Journal_Draft.pdf');
  });

  it('builds certificate keys under archives/projects root', () => {
    const key = storageService.buildCertificateKey('project123', 'completion-certificate.pdf');
    expect(key).toBe('archives/projects/project123/certificates/completion-certificate.pdf');
  });

  it('builds bulk archive keys under archives/bulk root', () => {
    const key = storageService.buildBulkArchiveKey('2024-2025', 'bulk archive.pdf');
    expect(key).toBe('archives/bulk/2024-2025/bulk_archive.pdf');
  });
});
