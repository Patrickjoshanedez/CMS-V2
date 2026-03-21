import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

const StatusPill = ({ label, tone }) => {
  const toneMap = {
    blue: 'bg-primary/15 text-primary',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    red: 'bg-destructive/15 text-destructive',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${toneMap[tone]}`}>{label}</span>
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
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">To Review</p>
          <p className="text-3xl font-bold text-foreground">{summary.totalToReview}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">In Review</p>
          <p className="text-3xl font-bold text-primary">{summary.currentlyReviewing}</p>
        </div>
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
          <p className="text-xs font-semibold uppercase text-destructive">Overdue</p>
          <p className="text-3xl font-bold text-destructive">{summary.overdue}</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">
            Upcoming
          </p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {summary.upcomingDeadline}
          </p>
        </div>
      </div>

      {sections.map((section) => {
        const items = workload?.[section.key] || [];

        return (
          <section
            key={section.key}
            className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm"
          >
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
          </section>
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
