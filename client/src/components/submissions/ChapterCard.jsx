import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';
import {
  FileText,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Lock,
} from 'lucide-react';

const CHAPTER_TITLES = {
  1: 'The Problem and Its Background',
  2: 'Review of Related Literature & System Development',
  3: 'Research Methodology',
  4: 'Results and Discussion',
  5: 'Summary, Conclusions & Recommendations',
};

function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDeadlineStatus(dateStr) {
  if (!dateStr) return 'none';
  const now = Date.now();
  const deadline = new Date(dateStr).getTime();
  const diff = deadline - now;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'approaching';
  return 'ok';
}

function DeadlineBadge({ dateStr }) {
  const status = getDeadlineStatus(dateStr);
  const formatted = formatDeadline(dateStr);
  if (!formatted) return <span className="text-xs text-muted-foreground">No deadline</span>;

  const styles = {
    overdue: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    urgent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    approaching: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    ok: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      <Clock className="h-3 w-3" />
      {status === 'overdue' ? 'Overdue' : formatted}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === 'locked') return <Lock className="h-4 w-4 text-emerald-500" />;
  if (status === 'approved' || status === 'accepted')
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'revisions_required') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === 'rejected') return <AlertTriangle className="h-4 w-4 text-red-500" />;
  if (status === 'pending' || status === 'under_review')
    return <Clock className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

/**
 * ChapterCard — displays a single chapter's status, deadline, and latest submission info.
 */
export default function ChapterCard({
  chapterNumber,
  submission,
  deadline,
  isLocked,
  canUpload,
  isStudent,
  isReadOnly,
  projectId,
  searchSuffix = '',
}) {
  const navigate = useNavigate();
  const hasSubmission = Boolean(submission);
  const status = submission?.status || null;
  const title = CHAPTER_TITLES[chapterNumber] || '';

  const handleViewSubmission = () => {
    if (submission?._id) {
      navigate(`/project/submissions/${submission._id}${searchSuffix}`);
    }
  };

  const handleUpload = (e) => {
    e.stopPropagation();
    navigate(`/project/submissions/upload?chapter=${chapterNumber}`);
  };

  const canUploadRevision =
    isStudent && !isReadOnly && canUpload && submission?.status === 'revisions_required';
  const canUploadNew = isStudent && !isReadOnly && canUpload && !hasSubmission;

  return (
    <Card
      className={[
        'group relative overflow-hidden transition-all hover:shadow-md',
        isLocked ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : '',
        !hasSubmission ? 'border-dashed' : '',
      ].join(' ')}
    >
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold',
                isLocked
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : hasSubmission
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {chapterNumber}
            </div>
            <div>
              <p className="text-sm font-semibold">Chapter {chapterNumber}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{title}</p>
            </div>
          </div>
          {hasSubmission && <StatusIcon status={status} />}
        </div>

        {/* Status + deadline row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hasSubmission ? (
            <>
              <SubmissionStatusBadge status={status} />
              <Badge variant="outline" className="text-[10px]">
                v{submission.version}
              </Badge>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Not submitted</span>
          )}
          <DeadlineBadge dateStr={deadline} />
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          {hasSubmission && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleViewSubmission}
            >
              <ChevronRight className="h-3.5 w-3.5" />
              View
            </Button>
          )}
          {(canUploadNew || canUploadRevision) && (
            <Button size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleUpload}>
              <Upload className="h-3.5 w-3.5" />
              {canUploadRevision ? 'Revise' : 'Upload'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
