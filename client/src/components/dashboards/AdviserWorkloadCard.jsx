import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const StatusPill = ({ label, tone }) => {
  const toneMap = {
    blue: 'bg-primary/15 text-primary',
    amber: 'border border-warning/30 bg-warning/10 text-warning-foreground',
    red: 'bg-destructive/15 text-destructive',
    green: 'border border-success/30 bg-success/10 text-success-foreground',
  };

  return (
    <Badge variant="outline" className={`rounded-full px-3 py-1 ${toneMap[tone]}`}>
      {label}
    </Badge>
  );
};

StatusPill.propTypes = {
  label: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['blue', 'amber', 'red', 'green']).isRequired,
};

const SubmissionRow = ({ item, mode }) => {
  const submittedAtLabel = item.submittedAt
    ? formatDistanceToNow(new Date(item.submittedAt), { addSuffix: true })
    : 'N/A';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-semibold text-foreground">{item.projectTitle}</p>
        <p className="text-sm text-muted-foreground">
          Chapter {item.chapter} {item.version ? `• v${item.version}` : ''}
        </p>
        {item.submittedBy && (
          <p className="text-xs text-muted-foreground">Submitted by {item.submittedBy}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {mode === 'awaiting' && <StatusPill label={`Submitted ${submittedAtLabel}`} tone="blue" />}
        {mode === 'underReview' && item.daysRemaining !== null && (
          <StatusPill
            label={
              item.daysRemaining < 0
                ? `${Math.abs(item.daysRemaining)}d overdue`
                : `${item.daysRemaining}d left`
            }
            tone={item.daysRemaining < 0 ? 'red' : 'amber'}
          />
        )}
        {mode === 'overdue' && <StatusPill label={`${item.daysOverdue}d overdue`} tone="red" />}
        {mode === 'upcoming' && <StatusPill label={`${item.daysRemaining}d left`} tone="amber" />}
      </div>
    </div>
  );
};

SubmissionRow.propTypes = {
  item: PropTypes.shape({
    projectTitle: PropTypes.string,
    chapter: PropTypes.number,
    version: PropTypes.number,
    submittedBy: PropTypes.string,
    submittedAt: PropTypes.string,
    daysRemaining: PropTypes.number,
    daysOverdue: PropTypes.number,
  }).isRequired,
  mode: PropTypes.oneOf(['awaiting', 'underReview', 'overdue', 'upcoming']).isRequired,
};

const AdviserWorkloadCard = ({ workload }) => {
  const summary = workload?.summary || {
    totalToReview: 0,
    currentlyReviewing: 0,
    overdue: 0,
    upcomingDeadline: 0,
  };

  const sections = [
    {
      title: 'Awaiting Review',
      key: 'awaitingReview',
      mode: 'awaiting',
      empty: 'No submissions waiting for review.',
    },
    {
      title: 'Under Review',
      key: 'underReview',
      mode: 'underReview',
      empty: 'No chapters currently under review.',
    },
    {
      title: 'Overdue Revisions',
      key: 'overdue',
      mode: 'overdue',
      empty: 'No overdue revisions.',
    },
    {
      title: 'Upcoming Deadlines (7 days)',
      key: 'upcomingDeadline',
      mode: 'upcoming',
      empty: 'No upcoming revision deadlines.',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">To Review</p>
            <p className="text-3xl font-bold text-foreground">{summary.totalToReview}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">In Review</p>
            <p className="text-3xl font-bold text-primary">{summary.currentlyReviewing}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase text-destructive">Overdue</p>
            <p className="text-3xl font-bold text-destructive">{summary.overdue}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/25 bg-warning/5">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-semibold uppercase text-warning-foreground">Upcoming</p>
            <p className="text-3xl font-bold text-warning-foreground">{summary.upcomingDeadline}</p>
          </CardContent>
        </Card>
      </div>

      {sections.map((section) => {
        const items = workload?.[section.key] || [];

        return (
          <Card key={section.key}>
            <CardContent className="p-5">
              <h3 className="mb-3 text-lg font-semibold text-foreground">{section.title}</h3>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{section.empty}</p>
                ) : (
                  items.map((item) => (
                    <SubmissionRow key={item._id} item={item} mode={section.mode} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

AdviserWorkloadCard.propTypes = {
  workload: PropTypes.shape({
    summary: PropTypes.shape({
      totalToReview: PropTypes.number,
      currentlyReviewing: PropTypes.number,
      overdue: PropTypes.number,
      upcomingDeadline: PropTypes.number,
    }),
    awaitingReview: PropTypes.arrayOf(PropTypes.object),
    underReview: PropTypes.arrayOf(PropTypes.object),
    overdue: PropTypes.arrayOf(PropTypes.object),
    upcomingDeadline: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
};

export default React.memo(AdviserWorkloadCard);
