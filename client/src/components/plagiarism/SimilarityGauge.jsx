import { getSimilarityBand, toPercent } from '@/utils/similarityColor';

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SimilarityGauge({ value }) {
  const percent = toPercent(value);
  const band = getSimilarityBand(percent);
  const strokeOffset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;

  return (
    <div
      className="score-summary flex items-center gap-3"
      title="Computed from matched character intervals across all sources"
    >
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="color-mix(in srgb, var(--color-border) 75%, white)"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke={band.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center [font-family:var(--font-body)]">
          <span className="text-2xl font-bold text-white">{Math.round(percent)}%</span>
          <span className="text-xs text-[var(--color-sidebar-text)]">Overall</span>
        </div>
      </div>

      <div className="space-y-0.5 text-right [font-family:var(--font-body)]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-sidebar-text)]">
          Similarity Band
        </p>
        <p className="text-sm font-semibold" style={{ color: band.color }}>
          {band.label}
        </p>
      </div>
    </div>
  );
}
