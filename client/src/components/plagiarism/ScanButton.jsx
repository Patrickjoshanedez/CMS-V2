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
            Analyzing document with BAAI/bge-m3 & Winnowing…
          </>
        ) : (
          <>
            <SearchCheck className="h-4 w-4" />
            Scan for Similarities
          </>
        )}
      </Button>

      {scanning && (
        <div className="space-y-2 pt-1">
          {/* Subtle compact progress track */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/70">
            <div className="archive-scan-progress h-full w-1/3 rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <span>Comparing against archive (Winnowing + BAAI/bge-m3)</span>
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
