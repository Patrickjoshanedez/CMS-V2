import { describe, it, expect } from 'vitest';
import { rankFuzzyConflicts } from '../../utils/similarityAudit.js';

describe('similarityAudit', () => {
  it('returns ranked conflicts above the threshold', () => {
    const rows = [
      { _id: '1', title: 'IoT-Based Smart Farming with Sensor Networks' },
      { _id: '2', title: 'Blockchain Voting Platform for Local Elections' },
      { _id: '3', title: 'Smart Farming Using IoT Sensors and Automation' },
    ];

    const conflicts = rankFuzzyConflicts({
      candidateText: 'Smart Farming using IoT Sensors',
      rows,
      threshold: 0.4,
      getText: (row) => row.title,
      mapRow: (row) => ({ projectId: row._id, title: row.title }),
    });

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].projectId).toBeDefined();
    expect(conflicts[0].similarityPct).toBeGreaterThanOrEqual(40);
  });

  it('normalizes case and whitespace before matching', () => {
    const rows = [{ _id: '1', title: 'Capstone Metadata   Extraction Pipeline' }];

    const conflicts = rankFuzzyConflicts({
      candidateText: 'capstone metadata extraction pipeline',
      rows,
      threshold: 0.7,
      getText: (row) => row.title,
      mapRow: (row) => ({ projectId: row._id }),
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].score).toBeGreaterThan(0.95);
  });

  it('returns empty list for blank candidate text', () => {
    const conflicts = rankFuzzyConflicts({
      candidateText: '   ',
      rows: [{ _id: '1', title: 'Any title' }],
      threshold: 0.1,
      getText: (row) => row.title,
      mapRow: (row) => ({ projectId: row._id }),
    });

    expect(conflicts).toEqual([]);
  });
});
