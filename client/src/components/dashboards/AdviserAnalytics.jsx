import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';

const MetricCard = ({ label, value, hint, tone = 'slate' }) => {
  const toneMap = {
    slate: 'border-border bg-card text-card-foreground',
    green: 'border-success/30 bg-success/5 text-foreground',
    blue: 'border-primary/30 bg-primary/5 text-foreground',
    amber: 'border-warning/30 bg-warning/5 text-foreground',
    red: 'border-destructive/30 bg-destructive/5 text-foreground',
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
    green: 'bg-success',
    amber: 'bg-warning',
    red: 'bg-destructive',
  };

  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{safeValue.toFixed(2)}%</span>
      </div>
      <Progress
        value={safeValue}
        aria-label={`${label}: ${safeValue.toFixed(2)} percent`}
        className="h-3"
        indicatorClassName={colorMap[tone]}
      />
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

      <Card className="p-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Review Outcomes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ProgressBar
              label="Approved"
              value={breakdown.approved?.percentage || 0}
              tone="green"
            />
            <ProgressBar
              label="Revision Requested"
              value={breakdown.revisionRequested?.percentage || 0}
              tone="amber"
            />
            <ProgressBar label="Rejected" value={breakdown.rejected?.percentage || 0} tone="red" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            This panel summarizes your recent review behavior. A high approval rate with low average
            review time usually indicates smooth student submissions. If revision and rejection bars
            rise, inspect recurring issues in chapter quality or compliance before the next advising
            cycle.
          </p>
        </CardContent>
      </Card>
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
