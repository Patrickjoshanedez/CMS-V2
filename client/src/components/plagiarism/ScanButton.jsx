import { Loader2, SearchCheck } from 'lucide-react';

function formatElapsed(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ScanButton({ disabled, scanning, elapsedSeconds, onClick }) {
  return (
    <div className="space-y-2 [font-family:var(--font-body)]">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || scanning}
        className={[
          'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-neutral)]/40',
          disabled || scanning
            ? 'cursor-not-allowed bg-[color-mix(in_srgb,var(--color-sidebar)_70%,black)] text-white/80'
            : 'bg-[var(--color-sidebar)] text-white hover:bg-[color-mix(in_srgb,var(--color-sidebar)_85%,black)]',
        ].join(' ')}
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing document...
          </>
        ) : (
          <>
            <SearchCheck className="h-4 w-4" />
            Scan for Similarities
          </>
        )}
      </button>

      {scanning ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-neutral)_16%,white)]">
            <div className="archive-scan-progress h-full w-1/3 rounded-full bg-[var(--color-neutral)]" />
          </div>
          <p className="text-right text-xs font-medium text-[var(--color-text-secondary)]">
            Elapsed: {formatElapsed(elapsedSeconds)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
