import React from 'react';
import PropTypes from 'prop-types';

const KPICards = ({ kpis }) => {
  const totals = kpis?.totals || {};
  const performance = kpis?.performance || {};
  const pipeline = kpis?.pipeline || {};

  const cards = [
    {
      label: 'Completion Rate',
      value: `${performance.completionRatePercent || 0}%`,
      hint: 'Archived projects over total',
      tone: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Avg Review Turnaround',
      value: `${performance.avgReviewTurnaroundHours || 0}h`,
      hint: 'Submission to review',
      tone: 'border-primary/20 bg-primary/5 text-primary',
    },
    {
      label: 'Avg Evaluation Score',
      value: performance.avgEvaluationScore || 0,
      hint: 'Across all evaluations',
      tone: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Pending Submissions',
      value: pipeline.pendingSubmissions || 0,
      hint: `${pipeline.underReview || 0} currently under review`,
      tone: 'border-border bg-muted/40 text-foreground',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${card.tone}`}
          >
            <p className="text-[11px] uppercase font-semibold tracking-wide opacity-75">
              {card.label}
            </p>
            <p className="text-3xl font-bold mt-2">{card.value}</p>
            <p className="text-xs mt-2 opacity-75">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-muted/40 border border-border p-4">
            <p className="text-[11px] uppercase text-muted-foreground font-semibold tracking-wide">
              Projects
            </p>
            <p className="text-3xl font-bold text-foreground mt-1">{totals.totalProjects || 0}</p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-[11px] uppercase text-primary font-semibold tracking-wide">Active</p>
            <p className="text-3xl font-bold text-primary mt-1">{totals.activeProjects || 0}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <p className="text-[11px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide">
              Archived
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {totals.completedProjects || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

KPICards.propTypes = {
  kpis: PropTypes.shape({
    totals: PropTypes.object,
    performance: PropTypes.object,
    pipeline: PropTypes.object,
  }).isRequired,
};

export default React.memo(KPICards);
