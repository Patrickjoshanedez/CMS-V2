import { describe, it, expect, vi } from 'vitest';
import {
  normalizeText,
  areRectsOverlapping,
  annotateOverlappingHighlights,
  resolvePlagiarismHighlights,
  buildTurnitinHighlightRects,
  getTurnitinSourceColor,
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

  describe('getTurnitinSourceColor', () => {
    it('returns distinct canonical colors for sources 1 through 10', () => {
      expect(getTurnitinSourceColor(1)).toBe('#ef4444'); // Red
      expect(getTurnitinSourceColor(2)).toBe('#f97316'); // Orange
      expect(getTurnitinSourceColor(3)).toBe('#ca8a04'); // Yellow/Amber
      expect(getTurnitinSourceColor(4)).toBe('#10b981'); // Emerald
      expect(getTurnitinSourceColor(5)).toBe('#3b82f6'); // Blue
      expect(getTurnitinSourceColor(6)).toBe('#a855f7'); // Purple
      expect(getTurnitinSourceColor(7)).toBe('#14b8a6'); // Teal
      expect(getTurnitinSourceColor(8)).toBe('#ec4899'); // Pink
      expect(getTurnitinSourceColor(9)).toBe('#22c55e'); // Green
      expect(getTurnitinSourceColor(10)).toBe('#f43f5e'); // Rose
    });

    it('wraps around modulo for sources beyond 10', () => {
      expect(getTurnitinSourceColor(11)).toBe('#ef4444');
      expect(getTurnitinSourceColor(12)).toBe('#f97316');
    });

    it('handles falsy or invalid source numbers gracefully', () => {
      expect(getTurnitinSourceColor(null)).toBe('#ef4444');
      expect(getTurnitinSourceColor(0)).toBe('#ef4444');
    });
  });

  describe('buildTurnitinHighlightRects', () => {
    it('returns empty array when given empty input', () => {
      expect(buildTurnitinHighlightRects([])).toEqual([]);
      expect(buildTurnitinHighlightRects(null)).toEqual([]);
    });

    it('clusters word boxes on the same line into a single line rectangle', () => {
      const words = [
        { left: 50, top: 100, width: 40, height: 14, pageNumber: 1 },
        { left: 95, top: 101, width: 60, height: 14, pageNumber: 1 },
        { left: 160, top: 100, width: 50, height: 14, pageNumber: 1 },
      ];

      const rects = buildTurnitinHighlightRects(words);
      expect(rects).toHaveLength(1);
      expect(rects[0]).toEqual({
        left: 50,
        top: 100,
        width: 160, // 210 - 50
        height: 15, // max(114, 115) - 100
        pageNumber: 1,
      });
    });

    it('decomposes multi-line passages into discrete line rectangles', () => {
      const words = [
        // Line 1 (baseline ~100)
        { left: 50, top: 100, width: 100, height: 14, pageNumber: 1 },
        { left: 155, top: 101, width: 120, height: 14, pageNumber: 1 },
        // Line 2 (baseline ~124)
        { left: 50, top: 124, width: 90, height: 14, pageNumber: 1 },
        { left: 145, top: 125, width: 80, height: 14, pageNumber: 1 },
      ];

      const rects = buildTurnitinHighlightRects(words);
      expect(rects).toHaveLength(2);
      expect(rects[0].top).toBe(100);
      expect(rects[0].width).toBe(225); // 275 - 50
      expect(rects[1].top).toBe(124);
      expect(rects[1].width).toBe(175); // 225 - 50
    });
  });
});
