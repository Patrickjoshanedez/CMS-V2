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
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isComplete ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 animate-bounce" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              Plagiarism Check
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-1">{activeScan.stage}</p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Animated Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span className="text-foreground font-mono">{activeScan.percent}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary to-brand-purple'
            }`}
            style={{ width: `${activeScan.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default PlagiarismProgressModal;
