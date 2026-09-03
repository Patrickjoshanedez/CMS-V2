import { getSimilarityBand, toPercent } from '@/utils/similarityColor';

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function SimilarityGauge({ value }) {
  const percent = toPercent(value);
  const band = getSimilarityBand(percent);
  const strokeOffset = CIRCUMFERENCE - (CIRCUMFERENCE * percent) / 100;

  return (
    <div
      className="flex items-center gap-3"
      title="Computed from matched character intervals across all sources"
    >
      {/* SVG ring */}
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {/* Track */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-white/15"
          />
          {/* Fill */}
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
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold leading-none text-white">{Math.round(percent)}%</span>
        </div>
      </div>

      {/* Band label */}
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
          Similarity
        </p>
        <p className="text-sm font-bold" style={{ color: band.color }}>
          {band.label}
        </p>
      </div>
    </div>
  );
}
