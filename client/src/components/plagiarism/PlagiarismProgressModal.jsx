import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Loader2, CheckCircle2, FileSearch, X } from 'lucide-react';

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
    <div
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl [font-family:var(--font-body)]"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={[
              'rounded-lg p-2',
              isComplete
                ? 'bg-[color-mix(in_srgb,var(--color-ok)_14%,white)] text-[var(--color-ok)]'
                : 'bg-[color-mix(in_srgb,var(--color-neutral)_14%,white)] text-[var(--color-neutral)]',
            ].join(' ')}
          >
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>

          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
              <FileSearch className="h-4 w-4 text-[var(--color-text-secondary)]" />
              Plagiarism Check
            </h4>
            <p className="line-clamp-1 text-xs text-[var(--color-text-secondary)]">
              {activeScan.stage}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="rounded-md p-1 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)]">
          <span>Progress</span>
          <span className="font-mono font-semibold text-[var(--color-text-primary)]">
            {activeScan.percent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_70%,white)]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${activeScan.percent}%`,
              backgroundColor: isComplete ? 'var(--color-ok)' : 'var(--color-neutral)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default PlagiarismProgressModal;
