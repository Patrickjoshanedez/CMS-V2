import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle2, FileSearch, X, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlagiarismScanStore } from '@/stores/plagiarismScanStore';
import { Button } from '@/components/ui/Button';

/**
 * PlagiarismProgressModal — floating live progress indicator for plagiarism scans.
 * Supports both:
 * 1. Background archive manuscript scans (via usePlagiarismScanStore).
 * 2. Asynchronous submission chapter scans (via Socket.IO `plagiarism:progress`).
 */
export function PlagiarismProgressModal() {
  const socket = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Socket scan state (for BullMQ background jobs on submission chapters)
  const [activeSocketScan, setActiveSocketScan] = useState(null);
  const [socketVisible, setSocketVisible] = useState(false);

  // Store scan state (for archive document scans)
  const {
    status: archiveStatus,
    isScanning: isArchiveScanning,
    fileName: archiveFileName,
    elapsedSeconds,
    reportData,
    isDismissed,
    dismissProgressModal,
  } = usePlagiarismScanStore();

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data) => {
      if (!data) return;

      setActiveSocketScan({
        submissionId: data.submissionId,
        percent: Math.min(100, Math.max(0, Number(data.percent) || 0)),
        stage: data.stage || 'Processing document scan...',
      });
      setSocketVisible(true);

      // Auto dismiss 5 seconds after 100% completion
      if (data.percent >= 100) {
        const timer = setTimeout(() => {
          setSocketVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    socket.on('plagiarism:progress', handleProgress);

    return () => {
      socket.off('plagiarism:progress', handleProgress);
    };
  }, [socket]);

  // Determine if archive scan should display floating modal
  // Hide when on the dedicated plagiarism page since the page itself displays the scan
  const isArchivePage =
    location.pathname === '/plagiarism' || location.pathname === '/archive/plagiarism';

  const showArchiveFloating =
    !isDismissed &&
    ((isArchiveScanning && !isArchivePage) ||
      (archiveStatus === 'completed' && !isArchivePage && Boolean(reportData)));

  const showSocket = socketVisible && Boolean(activeSocketScan);

  if (!showArchiveFloating && !showSocket) return null;

  // Handle Archive Scan Modal View
  if (showArchiveFloating) {
    const isCompleted = archiveStatus === 'completed';
    const score = reportData?.originalityScore ?? reportData?.similarity_percentage ?? null;

    return (
      <aside
        data-testid="background-plagiarism-floating-modal"
        aria-label="Background Plagiarism Scan"
        className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                'rounded-lg p-2 shrink-0',
                isCompleted
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground truncate">
                <FileSearch className="h-3.5 w-3.5 text-primary shrink-0" />
                Archive Integrity Scan
              </h4>
              <p
                className="line-clamp-1 text-xs text-muted-foreground truncate"
                title={archiveFileName || 'Document'}
              >
                {archiveFileName || 'Document'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissProgressModal}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            aria-label="Dismiss scan notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isCompleted ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">Originality Score</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {score !== null ? `${score}%` : 'Analyzed'}
              </span>
            </div>
            <Button
              size="sm"
              className="w-full text-xs font-semibold gap-1.5 shadow-xs"
              onClick={() => navigate('/plagiarism')}
            >
              View Report <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="animate-pulse">Analyzing embeddings in background…</span>
                <span className="font-mono text-[11px] font-semibold text-foreground">
                  {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                  {String(elapsedSeconds % 60).padStart(2, '0')}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div className="h-full rounded-full bg-primary animate-pulse w-full" />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-medium gap-1.5 border-border/80 hover:bg-muted/60"
              onClick={() => navigate('/plagiarism')}
            >
              Return to Scan <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </aside>
    );
  }

  // Handle Socket Scan Modal View (for chapter submission checks)
  const isComplete = activeSocketScan.percent >= 100;

  return (
    <aside
      data-testid="socket-plagiarism-floating-modal"
      aria-label="Plagiarism Progress Indicator"
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5"
    >
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
            <p className="line-clamp-1 text-xs text-muted-foreground">{activeSocketScan.stage}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSocketVisible(false)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono text-[11px] font-semibold text-foreground">
            {activeSocketScan.percent}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              isComplete ? 'bg-emerald-500' : 'bg-primary',
            )}
            style={{ width: `${activeSocketScan.percent}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

export default PlagiarismProgressModal;
