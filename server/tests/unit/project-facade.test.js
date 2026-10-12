import { describe, it, expect } from 'vitest';
import projectService from '../../modules/projects/project.service.js';

describe('ProjectService Facade Integrity', () => {
  it('should export all required domain methods', () => {
    const requiredMethods = [
      'createProject',
      'getProject',
      'getMyProject',
      'listProjects',
      'submitTitle',
      'approveTitle',
      'rejectTitle',
      'checkTitleSimilarity',
      'assignAdviser',
      'assignPanelist',
      'assignSecretary',
      'scheduleDefense',
      'getDefenseSchedule',
      'searchArchive',
      'archiveProject',
      'bulkUploadArchive',
      'evaluatePostApprovalUnlocks',
      'setDeadlines',
      'advancePhase',
      'addPrototype',
      'removePrototype',
      'getPrototypes',
      'getCertificateUrl',
      'uploadCertificate',
      'generateReport',
      '_generateFallbackManuscriptPdf',
    ];

    for (const methodName of requiredMethods) {
      expect(typeof projectService[methodName]).toBe('function');
    }
  });
});
