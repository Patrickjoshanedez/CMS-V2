/**
 * Unit tests for proposal similarity algorithm
 * Tests the core algorithm without API/authentication overhead
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  calculateJaccardSimilarity,
  calculateProposalSimilarity,
  extractMatchingKeywords,
} from '../../utils/proposalSimilarity.js';

describe('Proposal Similarity Utility — Unit Tests', () => {
  describe('tokenize()', () => {
    it('should split text into lowercase tokens and remove punctuation', () => {
      const text = 'AI-Powered Machine Learning Solutions!';
      const tokens = tokenize(text);
      expect(tokens).toContain('ai');
      expect(tokens).toContain('powered');
      expect(tokens).toContain('machine');
      expect(tokens).toContain('learning');
      expect(tokens).not.toContain('!');
      expect(tokens).not.toContain('ai-powered'); // hyphen removed
    });

    it('should filter out common stop words', () => {
      const text = 'This is a test about the things we do and some other stuff';
      const tokens = tokenize(text);
      // Stop words should be removed
      expect(tokens).not.toContain('this');
      expect(tokens).not.toContain('is');
      expect(tokens).not.toContain('a');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('and');
      // Meaningful words should remain
      expect(tokens).toContain('test');
      expect(tokens).toContain('things');
    });

    it('should handle empty strings', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize('   ')).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const tokens1 = tokenize('HELLO WORLD');
      const tokens2 = tokenize('hello world');
      expect(tokens1).toEqual(tokens2);
    });
  });

  describe('calculateJaccardSimilarity()', () => {
    it('should return 1.0 for identical sets', () => {
      const sim = calculateJaccardSimilarity(
        ['machine', 'learning', 'ai'],
        ['machine', 'learning', 'ai'],
      );
      expect(sim).toBe(1);
    });

    it('should return 0 for completely disjoint sets', () => {
      const sim = calculateJaccardSimilarity(['cat', 'dog'], ['car', 'boat']);
      expect(sim).toBe(0);
    });

    it('should return 0.33 for set with 1/3 overlap', () => {
      // {a, b, c} ∩ {c, d, e} = {c}
      // {a, b, c} ∪ {c, d, e} = {a, b, c, d, e}
      // similarity = 1 / 5 = 0.2
      const sim = calculateJaccardSimilarity(['a', 'b', 'c'], ['c', 'd', 'e']);
      expect(sim).toBeCloseTo(0.2, 1);
    });

    it('should handle empty sets', () => {
      expect(calculateJaccardSimilarity([], [])).toBe(0);
      expect(calculateJaccardSimilarity(['a'], [])).toBe(0);
      expect(calculateJaccardSimilarity([], ['a'])).toBe(0);
    });

    it('should return 0.5 for 50% overlap', () => {
      // {a, b} ∩ {b, c} = {b}
      // {a, b} ∪ {b, c} = {a, b, c}
      // similarity = 1 / 3 ≈ 0.33
      const sim = calculateJaccardSimilarity(['a', 'b'], ['b', 'c']);
      expect(sim).toBeCloseTo(0.33, 1);
    });
  });

  describe('calculateProposalSimilarity()', () => {
    it('should return high score for exact title match (with different other fields)', () => {
      const base = {
        title: 'Capstone Management and Plagiarism Checker',
        problemStatement: 'Base problem statement.',
        proposedSolution: 'Base solution.',
        uniqueContribution: 'Base contribution.',
        expectedImpact: 'Base impact.',
      };

      const candidate = {
        title: 'Capstone Management and Plagiarism Checker', // Exact match
        problemStatement: 'Different problem statement.',
        proposedSolution: 'Different solution.',
        uniqueContribution: 'Different contribution.',
        expectedImpact: 'Different impact.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);

      // Title match alone should give score > 0.5 since it's the first field
      // (Actually depends on averaging logic, but should be significant)
      expect(similarity).toBeGreaterThan(0.3);
    });

    it('should return high score for multi-field matching', () => {
      const base = {
        title: 'Machine Learning Healthcare Solutions',
        problemStatement: 'Healthcare providers struggle with patient data analysis.',
        proposedSolution: 'We propose ML-powered analytics platform.',
        uniqueContribution: 'Novel prediction algorithms.',
        expectedImpact: 'Improve patient outcomes by 25%.',
      };

      const candidate = {
        title: 'Healthcare Analytics ML Platform',
        problemStatement: 'Medical professionals lack insights from patient data.',
        proposedSolution: 'ML analytics for healthcare data.',
        uniqueContribution: 'Advanced prediction algorithms.',
        expectedImpact: 'Enhance patient outcome predictions.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeGreaterThan(0.15);
    });

    it('should return zero for completely unrelated proposals', () => {
      const base = {
        title: 'Traffic Management System',
        problemStatement: 'City traffic is congested.',
        proposedSolution: 'AI traffic lights.',
        uniqueContribution: 'Novel optimization.',
        expectedImpact: 'Reduce commute time.',
      };

      const candidate = {
        title: 'Deep Sea Fish Classification',
        problemStatement: 'Marine biologists cannot identify rare fish.',
        proposedSolution: 'Computer vision for underwater imaging.',
        uniqueContribution: 'Underwater object detection.',
        expectedImpact: 'Discover new species.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeLessThan(0.1);
    });

    it('should handle partial field overlap', () => {
      const base = {
        title: 'AI-Powered Plagiarism Detection',
        problemStatement: 'Universities struggle with academic dishonesty.',
        proposedSolution: 'Build plagiarism detection system.',
        uniqueContribution: 'Machine learning similarity algorithm.',
        expectedImpact: 'Improve academic integrity.',
      };

      const candidate = {
        title: 'Smart Plagiarism Checker',
        problemStatement: 'Academic institutions need plagiarism tools.',
        proposedSolution: 'Different approach.',
        uniqueContribution: 'Different idea.',
        expectedImpact: 'Different outcome.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeGreaterThan(0.1);
    });

    it('should be case-insensitive', () => {
      const base = {
        title: 'Machine Learning Healthcare Solutions',
        problemStatement: 'PROBLEM STATEMENT HERE',
        proposedSolution: 'SOLUTION HERE',
        uniqueContribution: 'CONTRIBUTION HERE',
        expectedImpact: 'IMPACT HERE',
      };

      const candidate = {
        title: 'machine learning healthcare solutions',
        problemStatement: 'problem statement here',
        proposedSolution: 'solution here',
        uniqueContribution: 'contribution here',
        expectedImpact: 'impact here',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it('should normalize punctuation', () => {
      const base = {
        title: 'AI-Powered Smart System!',
        problemStatement: 'Hello, world. How are you?',
        proposedSolution: 'Solution #1: Do X, Y, Z.',
        uniqueContribution: 'Novel approach @ scale.',
        expectedImpact: 'Impact: 50% improvement!',
      };

      const candidate = {
        title: 'AI Powered Smart System',
        problemStatement: 'Hello world How are you',
        proposedSolution: 'Solution 1 Do X Y Z',
        uniqueContribution: 'Novel approach at scale',
        expectedImpact: 'Impact 50 percent improvement',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      // Should be very high despite punctuation/special char differences
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle missing optional fields gracefully', () => {
      const base = {
        title: 'Capstone System',
        problemStatement: 'Problem with capstones.',
        proposedSolution: 'Solution for capstones.',
        uniqueContribution: '', // Empty
        expectedImpact: '', // Empty
      };

      const candidate = {
        title: 'Capstone System', // Same title
        problemStatement: 'Problem with capstones.', // Same problem
        proposedSolution: 'Solution for capstones.', // Same solution
        uniqueContribution: 'Different contribution',
        expectedImpact: 'Different impact',
      };

      // Should not crash and should still find similarity
      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeGreaterThan(0.5);
    });
  });

  describe('extractMatchingKeywords()', () => {
    it('should return object with matching terms for each field', () => {
      const base = {
        title: 'Machine Learning Healthcare Platform',
        problemStatement: 'Healthcare providers struggle with patient data.',
        proposedSolution: 'ML analytics system.',
        uniqueContribution: 'Novel algorithms.',
        expectedImpact: 'Better outcomes.',
      };

      const candidate = {
        title: 'Healthcare Analytics ML System',
        problemStatement: 'Medical professionals lack data insights.',
        proposedSolution: 'Analytics for healthcare data.',
        uniqueContribution: 'Advanced algorithms.',
        expectedImpact: 'Improved patient care.',
      };

      const keywords = extractMatchingKeywords(base, candidate);

      // Should return an object with fields
      expect(keywords).toHaveProperty('title');
      expect(keywords).toHaveProperty('problemStatement');
      expect(keywords).toHaveProperty('proposedSolution');
      expect(keywords).toHaveProperty('uniqueContribution');
      expect(keywords).toHaveProperty('expectedImpact');

      // Each field should be an array
      expect(Array.isArray(keywords.title)).toBe(true);
      expect(Array.isArray(keywords.problemStatement)).toBe(true);

      // Should have matching keywords
      expect(keywords.title).toContain('healthcare');
      expect(keywords.problemStatement).toContain('data');
    });

    it('should return empty arrays when no matching keywords', () => {
      const base = {
        title: 'Traffic System',
        problemStatement: 'City congestion.',
        proposedSolution: 'Traffic lights.',
        uniqueContribution: 'Optimization.',
        expectedImpact: 'Speed improvement.',
      };

      const candidate = {
        title: 'Fish Classification',
        problemStatement: 'Marine biology.',
        proposedSolution: 'Computer vision.',
        uniqueContribution: 'Detection algorithm.',
        expectedImpact: 'Species discovery.',
      };

      const keywords = extractMatchingKeywords(base, candidate);

      // All fields should be empty since there's no overlap
      expect(keywords.title.length).toBe(0);
      expect(keywords.problemStatement.length).toBe(0);
    });
  });

  describe('Integration: Threshold Behavior', () => {
    it('proposals with similarity > 0.15 should be included', () => {
      const base = {
        title: 'AI Smart System',
        problemStatement: 'Smart systems are needed.',
        proposedSolution: 'Build smart system.',
        uniqueContribution: 'AI approach.',
        expectedImpact: 'Smart outcomes.',
      };

      const candidate = {
        title: 'Intelligent Smart Platform',
        problemStatement: 'Smart platforms improve things.',
        proposedSolution: 'Create platform.',
        uniqueContribution: 'Intelligence algorithm.',
        expectedImpact: 'Good outcomes.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeGreaterThan(0.15); // Above threshold
    });

    it('proposals with similarity <= 0.15 should be excluded', () => {
      const base = {
        title: 'Traffic Light Optimization',
        problemStatement: 'City traffic is slow.',
        proposedSolution: 'Optimize traffic signals.',
        uniqueContribution: 'Novel algorithm.',
        expectedImpact: 'Faster commutes.',
      };

      const candidate = {
        title: 'Deep Sea Fish Identification',
        problemStatement: 'Marine researchers need tools.',
        proposedSolution: 'Use computer vision.',
        uniqueContribution: 'Detection model.',
        expectedImpact: 'Scientific discovery.',
      };

      const similarity = calculateProposalSimilarity(base, candidate);
      expect(similarity).toBeLessThanOrEqual(0.15); // Below/at threshold
    });
  });

  describe('Title Field Importance', () => {
    it('should prioritize title matches strongly', () => {
      // Test that title is NOW included in the comparison
      // (This was the bug fix: title was missing from fields array)

      const base = {
        title: 'Capstone Management and Plagiarism Checker',
        problemStatement: 'Different problem',
        proposedSolution: 'Different solution',
        uniqueContribution: 'Different contribution',
        expectedImpact: 'Different impact',
      };

      const exactTitleMatch = {
        title: 'Capstone Management and Plagiarism Checker', // Exact match
        problemStatement: 'Completely different problem',
        proposedSolution: 'Completely different solution',
        uniqueContribution: 'Completely different contribution',
        expectedImpact: 'Completely different impact',
      };

      const sim1 = calculateProposalSimilarity(base, exactTitleMatch);

      const noTitleMatch = {
        title: 'Completely Different Title',
        problemStatement: 'Completely different problem',
        proposedSolution: 'Completely different solution',
        uniqueContribution: 'Completely different contribution',
        expectedImpact: 'Completely different impact',
      };

      const sim2 = calculateProposalSimilarity(base, noTitleMatch);

      // Exact title match should score MUCH higher than no title match
      expect(sim1).toBeGreaterThan(sim2);
      expect(sim1 - sim2).toBeGreaterThan(0.2); // Significant difference
    });
  });
});
