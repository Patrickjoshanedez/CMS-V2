import { describe, it, expect } from 'vitest';
import { stringSimilarity, findSimilarProjects } from '../../utils/titleSimilarity.js';

describe('titleSimilarity utility', () => {
  it('returns a strong score when a known title is repeated/concatenated', () => {
    const canonical = 'Capstone Management and Plagiarism Checker';
    const noisy =
      'Capstone Management and Plagiarism CheckerCapstone Management and Plagiarism Checker';

    const score = stringSimilarity(canonical, noisy);
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('flags repeated noisy title as a similar project match', () => {
    const candidate = {
      title: 'Capstone Management and Plagiarism CheckerCapstone Management and Plagiarism Checker',
      keywords: ['capstone', 'plagiarism'],
    };

    const existing = [
      {
        _id: 'p-1',
        title: 'Capstone Management and Plagiarism Checker',
        keywords: ['capstone', 'plagiarism'],
      },
      {
        _id: 'p-2',
        title: 'Barangay Incident Tracking and Response Management System Archive Case Study',
        keywords: ['incident', 'tracking'],
      },
    ];

    const matches = findSimilarProjects(candidate, existing, { threshold: 0.7 });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].projectId).toBe('p-1');
    expect(matches[0].score).toBeGreaterThanOrEqual(0.7);
  });

  it('flags keyword-overlap variants as similar even when titles are not exact', () => {
    const candidate = {
      title: 'Capstone Management System',
      keywords: [],
    };

    const existing = [
      {
        _id: 'p-1',
        title: 'Capstone Management and Plagiarism Checker',
        keywords: ['capstone', 'plagiarism'],
      },
      {
        _id: 'p-2',
        title: 'Barangay Incident Tracking and Response Management System',
        keywords: ['incident', 'tracking'],
      },
    ];

    const matches = findSimilarProjects(candidate, existing, { threshold: 0.65 });
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].projectId).toBe('p-1');
    expect(matches[0].score).toBeGreaterThanOrEqual(0.65);
  });

  it('returns enriched preview metadata (id, similarityScore, abstract, targetBeneficiary, techStack)', () => {
    const candidate = {
      title: 'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
      keywords: ['library', 'RFID'],
    };

    const existing = [
      {
        _id: 'cap-2023-042',
        title: 'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
        abstract:
          'A campus-wide automated inventory and kiosk system utilizing high-frequency RFID tags for physical collection checkout and shelf scanning.',
        academicYear: '2023-2024',
        targetBeneficiary: 'Main Campus Library',
        techStack: ['Node.js', 'Express', 'MongoDB', 'RFID RC522', 'React'],
      },
    ];

    const matches = findSimilarProjects(candidate, existing, { threshold: 0.7 });
    expect(matches.length).toBe(1);
    const top = matches[0];

    expect(top.id).toBe('cap-2023-042');
    expect(top.projectId).toBe('cap-2023-042');
    expect(top.title).toBe(
      'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
    );
    expect(top.similarityScore).toBe(100);
    expect(top.score).toBe(1);
    expect(top.academicYear).toBe('2023-2024');
    expect(top.abstract).toContain('campus-wide automated inventory and kiosk system');
    expect(top.targetBeneficiary).toBe('Main Campus Library');
    expect(top.techStack).toEqual(['Node.js', 'Express', 'MongoDB', 'RFID RC522', 'React']);
  });
});
