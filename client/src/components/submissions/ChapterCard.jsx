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

function isValidDeadline(val) {
  if (!val) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (!s || s === 'unscheduled' || s === 'none' || s === 'cancelled' || s === 'tbd') {
      return false;
    }
  }
  const d = new Date(val);
  return !isNaN(d.getTime());
}

function formatDeadline(dateStr) {
  if (!isValidDeadline(dateStr)) return null;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDeadlineStatus(dateStr) {
  if (!isValidDeadline(dateStr)) return 'none';
  const now = Date.now();
  const deadline = new Date(dateStr).getTime();
  const diff = deadline - now;
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'approaching';
  return 'ok';
}

function DeadlineBadge({ dateStr, allowLateSubmission = true }) {
  const status = getDeadlineStatus(dateStr);
  const formatted = formatDeadline(dateStr);
  if (!formatted) return <span className="text-xs text-muted-foreground">No deadline</span>;
  const isLateClosed = status === 'overdue' && !allowLateSubmission;

  const variants = {
    overdue: 'destructive',
    urgent: 'warning',
    approaching: 'warning',
    ok: 'secondary',
  };

  return (
    <Badge
      variant={variants[status]}
      className="gap-1 text-[11px]"
      data-testid="chapter-deadline-status"
      data-status={status}
    >
      <Clock aria-hidden="true" className="size-3" />
      {isLateClosed ? 'Late submissions closed' : status === 'overdue' ? 'Overdue' : formatted}
    </Badge>
  );
}

function StatusIcon({ status }) {
  if (status === 'locked')
    return <Lock aria-hidden="true" className="size-4 text-success-foreground" />;
  if (status === 'approved' || status === 'accepted')
    return <CheckCircle2 aria-hidden="true" className="size-4 text-success-foreground" />;
  if (status === 'revisions_required')
    return <AlertTriangle aria-hidden="true" className="size-4 text-warning-foreground" />;
  if (status === 'rejected')
    return <AlertTriangle aria-hidden="true" className="size-4 text-destructive" />;
  if (status === 'pending' || status === 'under_review')
    return <Clock aria-hidden="true" className="size-4 text-info" />;
  return <FileText aria-hidden="true" className="size-4 text-muted-foreground" />;
}

/**
 * ChapterCard — displays a single chapter's status, deadline, and latest submission info.
 */
export default function ChapterCard({
  chapterNumber,
  submission,
  deadline,
  allowLateSubmission = true,
  isLocked,
  canUpload,
  isStudent,
  isReadOnly,
  searchSuffix = '',
  onUpload,
  onRevise,
}) {
  const navigate = useNavigate();
  const hasSubmission = Boolean(submission);
  const status = submission?.status || null;
  const title = CHAPTER_TITLES[chapterNumber] || '';
  const isPastDeadline = getDeadlineStatus(deadline) === 'overdue';
  const isLateSubmissionClosed = isPastDeadline && !allowLateSubmission;

  const handleViewSubmission = () => {
    if (submission?._id) {
      navigate(`/project/submissions/${submission._id}${searchSuffix}`);
    }
  };

  const canUploadRevision =
    isStudent &&
    !isReadOnly &&
    canUpload &&
    !isLateSubmissionClosed &&
    submission?.status === 'revisions_required';
  const canUploadNew =
    isStudent && !isReadOnly && canUpload && !isLateSubmissionClosed && !hasSubmission;

  const handleUpload = (e) => {
    e.stopPropagation();
    if (canUploadRevision) {
      if (onRevise) {
        onRevise(chapterNumber, submission);
      } else {
        navigate(`/project/submissions/upload?chapter=${chapterNumber}&locked=true&mode=revise`);
      }
    } else if (canUploadNew) {
      if (onUpload) {
        onUpload(chapterNumber, submission);
      } else {
        navigate(`/project/submissions/upload?chapter=${chapterNumber}`);
      }
    } else {
      navigate(`/project/submissions/upload?chapter=${chapterNumber}`);
    }
  };

  return (
    <Card
      className={[
        'group relative overflow-hidden transition-all hover:shadow-md',
        isLocked ? 'border-success/30 bg-success/5' : '',
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
                  ? 'bg-success/10 text-success-foreground'
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
          <DeadlineBadge dateStr={deadline} allowLateSubmission={allowLateSubmission} />
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
