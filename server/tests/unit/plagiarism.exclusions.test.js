import { describe, it, expect } from 'vitest';
import { applyExclusions } from '../../services/plagiarism.service.js';

describe('plagiarism.service applyExclusions (ISO Accuracy & Alignment)', () => {
  it('excludes straight quotes while preserving character offsets', () => {
    const raw = 'The study stated "AI optimizes crop yield" in the final chapter.';
    const result = applyExclusions(raw);
    expect(result.length).toBe(raw.length);
    expect(result).not.toContain('AI optimizes crop yield');
    expect(result).toContain('The study stated');
    expect(result).toContain('in the final chapter.');
  });

  it('excludes curly/smart quotes while preserving character offsets', () => {
    const raw =
      'The authors noted “smart irrigation minimizes water runoff” according to recent trials.';
    const result = applyExclusions(raw);
    expect(result.length).toBe(raw.length);
    expect(result).not.toContain('smart irrigation minimizes water runoff');
    expect(result).toContain('The authors noted');
    expect(result).toContain('according to recent trials.');
  });

  it('excludes single curly/smart quotes while preserving character offsets', () => {
    const raw = 'The document cited ‘deep learning algorithms’ extensively.';
    const result = applyExclusions(raw);
    expect(result.length).toBe(raw.length);
    expect(result).not.toContain('deep learning algorithms');
    expect(result).toContain('The document cited');
    expect(result).toContain('extensively.');
  });

  it('excludes BukSU institutional capstone template headings and boilerplate', () => {
    const raw =
      'Bukidnon State University\n' +
      'College of Technologies\n' +
      'Department of Information Technology\n' +
      'Bachelor of Science in Information Technology\n' +
      'Approval Sheet\n' +
      'Panel of Examiners\n' +
      'Certificate of Originality\n' +
      'Action Done Matrix\n' +
      'in partial fulfillment of the requirements for the degree of Bachelor of Science in Information Technology\n' +
      'This study presents a real-world prototype for soil moisture telemetry.';
    const result = applyExclusions(raw);
    expect(result.length).toBe(raw.length);
    expect(result).not.toContain('Bukidnon State University');
    expect(result).not.toContain('College of Technologies');
    expect(result).not.toContain('Department of Information Technology');
    expect(result).not.toContain('Approval Sheet');
    expect(result).not.toContain('Panel of Examiners');
    expect(result).not.toContain('Certificate of Originality');
    expect(result).not.toContain('Action Done Matrix');
    expect(result).toContain(
      'This study presents a real-world prototype for soil moisture telemetry.',
    );
  });

  it('excludes bibliography while preserving character offsets', () => {
    const raw = 'Main content here.\n\nReferences\n1. Doe, J. (2025). Smart Agriculture.';
    const result = applyExclusions(raw);
    expect(result.length).toBe(raw.length);
    expect(result).toContain('Main content here.');
    expect(result).not.toContain('Doe, J. (2025)');
  });
});
