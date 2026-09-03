const BANDS = [
  {
    min: 71,
    max: 100,
    label: 'Critical',
    cssVar: '--color-accent',
    fallbackColor: '#E63946',
  },
  {
    min: 41,
    max: 70,
    label: 'High',
    cssVar: '--color-high',
    fallbackColor: '#E07B39',
  },
  {
    min: 16,
    max: 40,
    label: 'Moderate',
    cssVar: '--color-warn',
    fallbackColor: '#F4A261',
  },
  {
    min: 0,
    max: 15,
    label: 'Low',
    cssVar: '--color-ok',
    fallbackColor: '#2A9D8F',
  },
];

const SOURCE_COLOR_CYCLE = [
  '#2D6A9F',
  '#1B8A78',
  '#C2703D',
  '#A83E3E',
  '#3A8F6D',
  '#476C9B',
  '#8C6A2F',
  '#5A7F95',
];

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
    color: `var(${band.cssVar}, ${band.fallbackColor})`,
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
