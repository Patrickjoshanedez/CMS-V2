import { SearchCheck } from 'lucide-react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Spinner } from '@/components/ui/Spinner';

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
        aria-busy={scanning}
        size="lg"
        className="w-full gap-2 whitespace-normal text-center font-semibold disabled:bg-muted disabled:text-muted-foreground disabled:border-border/60 disabled:opacity-100 disabled:cursor-not-allowed min-h-[44px]"
      >
        {scanning ? (
          <>
            <Spinner className="h-4 w-4" />
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
          <Progress
            indeterminate
            aria-label="Manuscript scan progress"
            className="h-1 bg-muted/70"
          />
          <div
            role="status"
            aria-live="polite"
            className="flex items-center justify-between text-xs text-muted-foreground"
          >
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

ScanButton.propTypes = {
  disabled: PropTypes.bool,
  scanning: PropTypes.bool,
  elapsedSeconds: PropTypes.number,
  onClick: PropTypes.func.isRequired,
};
