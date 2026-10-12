import { describe, it, expect } from 'vitest';
import pdfGeneratorService from '../../services/pdfGenerator.service.js';
import projectService from '../../modules/projects/project.service.js';

describe('PDF Generator Service', () => {
  const mockProject = {
    title: 'Automated Capstone Archival System',
    abstract: 'A modern platform for managing capstone lifecycles.',
    academicYear: '2025-2026',
    teamId: {
      name: 'Team Alpha',
      members: [{ firstName: 'Juan', lastName: 'Dela Cruz' }],
    },
    adviserId: { firstName: 'Dr.', lastName: 'Smith' },
  };

  it('should generate a valid PDF buffer from project metadata', async () => {
    const pdfBuffer = await pdfGeneratorService.generateFallbackManuscriptPdf(mockProject);
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const header = Buffer.from(pdfBuffer.slice(0, 5)).toString('utf8');
    expect(header).toBe('%PDF-');
  });

  it('should allow projectService._generateFallbackManuscriptPdf to delegate to pdfGeneratorService', async () => {
    const pdfBuffer = await projectService._generateFallbackManuscriptPdf(mockProject);
    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    const header = Buffer.from(pdfBuffer.slice(0, 5)).toString('utf8');
    expect(header).toBe('%PDF-');
  });
});
