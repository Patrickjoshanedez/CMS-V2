import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import SubmissionStatusBadge from '@/components/submissions/SubmissionStatusBadge';

const CHAPTER_LABELS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];

function toChapterLabel(chapter) {
  if (!chapter || chapter < 1 || chapter > CHAPTER_LABELS.length) {
    return `Chapter ${chapter || 'N/A'}`;
  }
  return CHAPTER_LABELS[chapter - 1];
}

function TeamSubmissionCard({ item }) {
  const navigate = useNavigate();

  return (
    <article className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.teamName}</p>
          <p className="text-sm text-muted-foreground">{item.projectTitle}</p>
        </div>
        <SubmissionStatusBadge status={item.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">{toChapterLabel(item.chapter)}</Badge>
        <Badge variant="outline">v{item.version}</Badge>
        <Badge variant="secondary">{item.annotationCount || 0} note(s)</Badge>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>Submitted by: {item.submittedBy}</p>
        {item.reviewedAt && <p>Reviewed at: {new Date(item.reviewedAt).toLocaleString()}</p>}
        {typeof item.daysRemaining === 'number' && (
          <p>
            Revision window:{' '}
            {item.daysRemaining < 0
              ? `${Math.abs(item.daysRemaining)} day(s) overdue`
              : `${item.daysRemaining} day(s) remaining`}
          </p>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => navigate(`/project/submissions/${item._id}`)}>
          Open Review Workspace
        </Button>
      </div>
    </article>
  );
}

TeamSubmissionCard.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    teamName: PropTypes.string,
    projectTitle: PropTypes.string,
    chapter: PropTypes.number,
    version: PropTypes.number,
    status: PropTypes.string,
    submittedBy: PropTypes.string,
    reviewedAt: PropTypes.string,
    daysRemaining: PropTypes.number,
    annotationCount: PropTypes.number,
  }).isRequired,
};

export default function AdviserTeamInteractionPanel({ workload }) {
  const awaiting = workload?.awaitingReview || [];
  const underReview = workload?.underReview || [];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Awaiting Your Decision</h3>
          <span className="text-sm text-muted-foreground">{awaiting.length} submission(s)</span>
        </div>
        {awaiting.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No team submissions are waiting for review right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {awaiting.map((item) => (
              <TeamSubmissionCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Revision Follow-ups</h3>
          <span className="text-sm text-muted-foreground">{underReview.length} submission(s)</span>
        </div>
        {underReview.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No ongoing revision cycles at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {underReview.map((item) => (
              <TeamSubmissionCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

AdviserTeamInteractionPanel.propTypes = {
  workload: PropTypes.shape({
    awaitingReview: PropTypes.arrayOf(PropTypes.object),
    underReview: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};
