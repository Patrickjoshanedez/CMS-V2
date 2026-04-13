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
      title:
        'Capstone Management and Plagiarism CheckerCapstone Management and Plagiarism Checker',
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
});
