import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock, Award, FileText, Layers, Activity, Archive } from 'lucide-react';
import { MetricGrid, StatCard } from '@/components/common';

const KPICards = ({ kpis }) => {
  const totals = kpis?.totals || {};
  const performance = kpis?.performance || {};
  const pipeline = kpis?.pipeline || {};

  return (
    <div className="space-y-4">
      <MetricGrid cols={4}>
        <StatCard
          label="Completion Rate"
          value={`${performance.completionRatePercent || 0}%`}
          hint="Archived projects over total"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Avg Review Turnaround"
          value={`${performance.avgReviewTurnaroundHours || 0}h`}
          hint="Submission to review latency"
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Avg Evaluation Score"
          value={performance.avgEvaluationScore || 0}
          hint="Across all active evaluations"
          icon={Award}
          tone="warning"
        />
        <StatCard
          label="Pending Submissions"
          value={pipeline.pendingSubmissions || 0}
          hint={`${pipeline.underReview || 0} currently under review`}
          icon={FileText}
          tone={(pipeline.pendingSubmissions || 0) > 0 ? 'warning' : 'default'}
        />
      </MetricGrid>

      <MetricGrid cols={3}>
        <StatCard
          label="Total Projects"
          value={totals.totalProjects || 0}
          hint="Enrolled capstone teams"
          icon={Layers}
        />
        <StatCard
          label="Active Pipeline"
          value={totals.activeProjects || 0}
          hint="In manuscript & development"
          icon={Activity}
          tone="primary"
        />
        <StatCard
          label="Completed"
          value={totals.completedProjects || 0}
          hint="Final defense certified"
          icon={Archive}
          tone="success"
        />
      </MetricGrid>
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
