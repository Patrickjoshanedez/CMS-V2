import { Loader2, SearchCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function formatElapsed(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ScanButton({ disabled, scanning, elapsedSeconds, onClick }) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled || scanning}
        size="lg"
        className="w-full gap-2 font-semibold"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing document…
          </>
        ) : (
          <>
            <SearchCheck className="h-4 w-4" />
            Scan for Similarities
          </>
        )}
      </Button>

      {scanning && (
        <div className="space-y-1.5">
          {/* Indeterminate progress track */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
            <div className="cms-fluid-track h-full w-2/5 rounded-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Running scan — large documents may take up to 60s</span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
