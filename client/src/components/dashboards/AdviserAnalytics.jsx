import React from 'react';
import PropTypes from 'prop-types';

const MetricCard = ({ label, value, hint, tone = 'slate' }) => {
  const toneMap = {
    slate: 'border-slate-200 bg-white text-slate-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <p className="text-xs uppercase font-semibold opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs mt-1 opacity-70">{hint}</p>}
    </div>
  );
};

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  hint: PropTypes.string,
  tone: PropTypes.oneOf(['slate', 'green', 'blue', 'amber', 'red']),
};

const ProgressBar = ({ label, value, tone }) => {
  const colorMap = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{safeValue.toFixed(2)}%</span>
      </div>
      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[tone]}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tone: PropTypes.oneOf(['green', 'amber', 'red']).isRequired,
};

const AdviserAnalytics = ({ analytics }) => {
  const metrics = analytics?.metrics || {};
  const breakdown = analytics?.breakdown || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Reviewed"
          value={metrics.totalReviewed || 0}
          hint={analytics.period || 'Current period'}
          tone="slate"
        />
        <MetricCard
          label="Approval Rate"
          value={`${metrics.approvalRatePercent || 0}%`}
          hint="Approved / Total Reviewed"
          tone="green"
        />
        <MetricCard
          label="Avg Review Time"
          value={`${metrics.avgReviewTimeHours || 0}h`}
          hint="Submission to review completion"
          tone="blue"
        />
        <MetricCard
          label="Review Velocity"
          value={`${metrics.reviewVelocityPerDay || 0}/day`}
          hint="Average reviews per day"
          tone="amber"
        />
      </div>

      <section className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Review Outcomes</h3>
        <div className="space-y-4">
          <ProgressBar label="Approved" value={breakdown.approved?.percentage || 0} tone="green" />
          <ProgressBar
            label="Revision Requested"
            value={breakdown.revisionRequested?.percentage || 0}
            tone="amber"
          />
          <ProgressBar label="Rejected" value={breakdown.rejected?.percentage || 0} tone="red" />
        </div>
      </section>

      <section className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Interpretation</h3>
        <p className="text-sm text-slate-700 leading-relaxed">
          This panel summarizes your recent review behavior. A high approval rate with low average
          review time usually indicates smooth student submissions. If revision and rejection bars
          rise, inspect recurring issues in chapter quality or compliance before the next advising
          cycle.
        </p>
      </section>
    </div>
  );
};

AdviserAnalytics.propTypes = {
  analytics: PropTypes.shape({
    period: PropTypes.string,
    metrics: PropTypes.shape({
      totalReviewed: PropTypes.number,
      approvalRatePercent: PropTypes.number,
      avgReviewTimeHours: PropTypes.number,
      reviewVelocityPerDay: PropTypes.number,
    }),
    breakdown: PropTypes.shape({
      approved: PropTypes.shape({ percentage: PropTypes.number }),
      revisionRequested: PropTypes.shape({ percentage: PropTypes.number }),
      rejected: PropTypes.shape({ percentage: PropTypes.number }),
    }),
  }).isRequired,
};

export default React.memo(AdviserAnalytics);
