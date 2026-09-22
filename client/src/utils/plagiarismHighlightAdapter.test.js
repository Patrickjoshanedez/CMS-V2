import { describe, it, expect, vi } from 'vitest';
import {
  normalizeText,
  areRectsOverlapping,
  annotateOverlappingHighlights,
  resolvePlagiarismHighlights,
} from './plagiarismHighlightAdapter';

describe('plagiarismHighlightAdapter', () => {
  describe('normalizeText', () => {
    it('returns empty string for non-string or falsy input', () => {
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
      expect(normalizeText(123)).toBe('');
    });

    it('strips soft hyphens (\\u00ad) and zero-width spaces', () => {
      const input = 'multi\u00adplatform archi\u200btecture';
      expect(normalizeText(input)).toBe('multiplatform architecture');
    });

    it('collapses line-end dual-column hyphens', () => {
      const input = 'This algo-\n  rithm processes telemetry data';
      expect(normalizeText(input)).toBe('this algorithm processes telemetry data');
    });

    it('normalizes typographic ligatures to ASCII sequences', () => {
      const input = 'The \uFB01rst \uFB02ight and e\uFB03cient \u00E6sthetics';
      expect(normalizeText(input)).toBe('the first flight and efficient aesthetics');
    });

    it('normalizes typographic quotes and en/em dashes', () => {
      const input = '\u201CSmart IoT\u201D \u2014 \u2018BukSU\u2019';
      expect(normalizeText(input)).toBe('"smart iot" - \'buksu\'');
    });

    it('collapses redundant newlines and whitespace', () => {
      const input = '   Autonomous   \r\n\r\n  Irrigation  \t System   ';
      expect(normalizeText(input)).toBe('autonomous irrigation system');
    });
  });

  describe('areRectsOverlapping', () => {
    it('returns false for null or undefined rectangles', () => {
      expect(areRectsOverlapping(null, { x1: 0, y1: 0, x2: 10, y2: 10 })).toBe(false);
      expect(areRectsOverlapping({ x1: 0, y1: 0, x2: 10, y2: 10 }, null)).toBe(false);
    });

    it('detects intersecting rectangles correctly', () => {
      const r1 = { x1: 50, y1: 100, x2: 200, y2: 150 };
      const r2 = { x1: 150, y1: 120, x2: 300, y2: 180 };
      expect(areRectsOverlapping(r1, r2)).toBe(true);
    });

    it('detects disjoint rectangles correctly', () => {
      const r1 = { x1: 50, y1: 100, x2: 200, y2: 150 };
      const r2 = { x1: 250, y1: 200, x2: 400, y2: 250 };
      expect(areRectsOverlapping(r1, r2)).toBe(false);
    });
  });

  describe('annotateOverlappingHighlights', () => {
    it('returns empty array if given empty list', () => {
      expect(annotateOverlappingHighlights([])).toEqual([]);
    });

    it('returns unmodified single highlight with overlap flags initialized', () => {
      const h = [
        {
          id: 'h1',
          type: 'faculty_comment',
          position: { pageNumber: 1, boundingRect: { x1: 10, y1: 10, x2: 50, y2: 50 } },
        },
      ];
      expect(annotateOverlappingHighlights(h)).toEqual(h);
    });

    it('marks colliding highlights on the same page as overlapping', () => {
      const h1 = {
        id: 'h1',
        type: 'faculty_comment',
        position: { pageNumber: 1, boundingRect: { x1: 50, y1: 100, x2: 200, y2: 150 } },
      };
      const h2 = {
        id: 'h2',
        type: 'plagiarism_exact',
        position: { pageNumber: 1, boundingRect: { x1: 150, y1: 120, x2: 300, y2: 180 } },
      };

      const result = annotateOverlappingHighlights([h1, h2]);
      expect(result[0].isOverlap).toBe(true);
      expect(result[0].isCrossLayerOverlap).toBe(true);
      expect(result[0].overlappingHighlights).toHaveLength(1);
      expect(result[1].isOverlap).toBe(true);
      expect(result[1].isCrossLayerOverlap).toBe(true);
    });

    it('does not mark highlights on different pages as overlapping even if coordinates collide', () => {
      const h1 = {
        id: 'h1',
        type: 'faculty_comment',
        position: { pageNumber: 1, boundingRect: { x1: 50, y1: 100, x2: 200, y2: 150 } },
      };
      const h2 = {
        id: 'h2',
        type: 'plagiarism_exact',
        position: { pageNumber: 2, boundingRect: { x1: 50, y1: 100, x2: 200, y2: 150 } },
      };

      const result = annotateOverlappingHighlights([h1, h2]);
      expect(result[0].isOverlap).toBe(false);
      expect(result[1].isOverlap).toBe(false);
    });
  });

  describe('resolvePlagiarismHighlights', () => {
    it('returns empty array when no matches or document provided', async () => {
      expect(await resolvePlagiarismHighlights(null, [])).toEqual([]);
      expect(await resolvePlagiarismHighlights({}, [])).toEqual([]);
    });
  });
});
