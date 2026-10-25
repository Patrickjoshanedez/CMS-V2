import { describe, expect, it } from 'vitest';
import {
  getSimilarityBand,
  getSimilarityColor,
  getSourceColor,
  toPercent,
} from './similarityColor';

describe('similarityColor', () => {
  it('maps similarity bands to shared status tokens', () => {
    expect(getSimilarityBand(80)).toMatchObject({ label: 'Critical', cssVar: '--destructive' });
    expect(getSimilarityBand(60)).toMatchObject({ label: 'High', cssVar: '--warning' });
    expect(getSimilarityBand(30)).toMatchObject({ label: 'Moderate', cssVar: '--warning' });
    expect(getSimilarityBand(10)).toMatchObject({ label: 'Low', cssVar: '--success' });
  });

  it('normalizes fractional scores and clamps invalid or out-of-range values', () => {
    expect(toPercent(0.45678)).toBe(45.7);
    expect(toPercent(140)).toBe(100);
    expect(toPercent(-10)).toBe(0);
    expect(toPercent('not-a-score')).toBe(0);
  });

  it('returns theme-driven similarity and source colors', () => {
    expect(getSimilarityColor(90)).toBe('hsl(var(--destructive))');
    expect(getSourceColor(0)).toBe('hsl(var(--chart-1))');
    expect(getSourceColor(7)).toBe('hsl(var(--chart-8))');
    expect(getSourceColor(8)).toBe('hsl(var(--chart-1))');
    expect(getSourceColor(-1)).toBe('hsl(var(--chart-1))');
  });
});
