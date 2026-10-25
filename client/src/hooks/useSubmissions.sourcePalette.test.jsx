import { describe, expect, it } from 'vitest';
import { PLAGIARISM_SOURCE_PALETTE, buildTopSourceColorMap } from './useSubmissions';

describe('plagiarism source palette', () => {
  it('assigns ten theme-token colors with semantic utility classes', () => {
    expect(PLAGIARISM_SOURCE_PALETTE).toHaveLength(10);
    for (const [index, palette] of PLAGIARISM_SOURCE_PALETTE.entries()) {
      const token = `chart-${['7', '6', '3', '2', '1', '4', '5', '8', '9', '10'][index]}`;
      expect(palette.hex).toBe(`hsl(var(--${token}))`);
      expect(palette.badgeClass).toContain(`border-${token}/30`);
      expect(palette.dotClass).toBe(`bg-${token}`);
      expect(palette.highlightClass).toBe(`bg-${token}/20 text-foreground`);
    }
  });

  it('keeps source numbering and theme-aware badges deterministic', () => {
    const { sourceMap } = buildTopSourceColorMap(
      [
        { id: 'source-b', similarity_score: 0.7, source_metadata: { title: 'Second' } },
        { id: 'source-a', similarity_score: 0.9, source_metadata: { title: 'First' } },
      ],
      10,
    );

    expect(sourceMap.get('source-a')).toMatchObject({
      sourceNumber: 1,
      colorHex: 'hsl(var(--chart-7))',
      badgeClass: 'border-chart-7/30 bg-chart-7/10 text-chart-7',
    });
    expect(sourceMap.get('source-b')).toMatchObject({
      sourceNumber: 2,
      colorHex: 'hsl(var(--chart-6))',
    });
  });
});
