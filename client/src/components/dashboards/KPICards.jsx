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
      tone: 'border-green-200 bg-green-50 text-green-900',
    },
    {
      label: 'Avg Review Turnaround',
      value: `${performance.avgReviewTurnaroundHours || 0}h`,
      hint: 'Submission to review',
      tone: 'border-blue-200 bg-blue-50 text-blue-900',
    },
    {
      label: 'Avg Evaluation Score',
      value: performance.avgEvaluationScore || 0,
      hint: 'Across all evaluations',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
    },
    {
      label: 'Pending Submissions',
      value: pipeline.pendingSubmissions || 0,
      hint: `${pipeline.underReview || 0} currently under review`,
      tone: 'border-slate-200 bg-white text-slate-900',
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

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-[11px] uppercase text-slate-500 font-semibold tracking-wide">
              Projects
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totals.totalProjects || 0}</p>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-[11px] uppercase text-blue-700 font-semibold tracking-wide">
              Active
            </p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{totals.activeProjects || 0}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-100 p-4">
            <p className="text-[11px] uppercase text-green-700 font-semibold tracking-wide">
              Archived
            </p>
            <p className="text-3xl font-bold text-green-700 mt-1">
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
