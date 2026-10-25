const BANDS = [
  {
    min: 71,
    max: 100,
    label: 'Critical',
    cssVar: '--destructive',
    fallbackColor: 'hsl(var(--destructive))',
  },
  {
    min: 41,
    max: 70,
    label: 'High',
    cssVar: '--warning',
    fallbackColor: 'hsl(var(--warning))',
  },
  {
    min: 16,
    max: 40,
    label: 'Moderate',
    cssVar: '--warning',
    fallbackColor: 'hsl(var(--warning))',
  },
  {
    min: 0,
    max: 15,
    label: 'Low',
    cssVar: '--success',
    fallbackColor: 'hsl(var(--success))',
  },
];

const SOURCE_COLOR_CYCLE = Array.from(
  { length: 8 },
  (_, index) => `hsl(var(--chart-${index + 1}))`,
);

function normalizePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const scaled = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, scaled));
}

export function getSimilarityBand(value) {
  const similarity = normalizePercent(value);
  const band =
    BANDS.find((entry) => similarity >= entry.min && similarity <= entry.max) || BANDS[3];

  return {
    similarity,
    label: band.label,
    cssVar: band.cssVar,
    color: `hsl(var(${band.cssVar}))`,
    fallbackColor: band.fallbackColor,
  };
}

export function getSimilarityLabel(value) {
  return getSimilarityBand(value).label;
}

export function getSimilarityColor(value) {
  return getSimilarityBand(value).color;
}

export function getSourceColor(index) {
  if (!Number.isFinite(index) || index < 0) {
    return SOURCE_COLOR_CYCLE[0];
  }
  return SOURCE_COLOR_CYCLE[index % SOURCE_COLOR_CYCLE.length];
}

export function toPercent(value) {
  return Number(getSimilarityBand(value).similarity.toFixed(1));
}
