import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Loader2, CheckCircle2, FileSearch, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PlagiarismProgressModal — floating live progress indicator for plagiarism scans.
 * Listens to Socket.IO `plagiarism:progress` events emitted from BullMQ worker.
 */
export function PlagiarismProgressModal() {
  const socket = useSocket();
  const [activeScan, setActiveScan] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (!data) return;

      setActiveScan({
        submissionId: data.submissionId,
        percent: Math.min(100, Math.max(0, Number(data.percent) || 0)),
        stage: data.stage || 'Processing document scan...',
      });
      setIsVisible(true);

      // Auto dismiss 4 seconds after 100% completion
      if (data.percent >= 100) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    socket.on('plagiarism:progress', handleProgress);

    return () => {
      socket.off('plagiarism:progress', handleProgress);
    };
  }, [socket]);

  if (!isVisible || !activeScan) return null;

  const isComplete = activeScan.percent >= 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur-md">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'rounded-lg p-2',
              isComplete
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/10 text-primary',
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </div>

          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <FileSearch className="h-3.5 w-3.5 text-primary" />
              Plagiarism Scan
            </h4>
            <p className="line-clamp-1 text-xs text-muted-foreground">{activeScan.stage}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono text-[11px] font-semibold text-foreground">
            {activeScan.percent}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              isComplete ? 'bg-emerald-500' : 'bg-primary',
            )}
            style={{ width: `${activeScan.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default PlagiarismProgressModal;
