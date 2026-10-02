import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock, Award, FileText, Layers, Activity, Archive } from 'lucide-react';

const KPICards = ({ kpis }) => {
  const totals = kpis?.totals || {};
  const performance = kpis?.performance || {};
  const pipeline = kpis?.pipeline || {};

  const cards = [
    {
      label: 'Completion Rate',
      value: `${performance.completionRatePercent || 0}%`,
      hint: 'Archived projects over total',
      icon: CheckCircle2,
      accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Avg Review Turnaround',
      value: `${performance.avgReviewTurnaroundHours || 0}h`,
      hint: 'Submission to review latency',
      icon: Clock,
      accent: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      label: 'Avg Evaluation Score',
      value: performance.avgEvaluationScore || 0,
      hint: 'Across all active evaluations',
      icon: Award,
      accent: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Pending Submissions',
      value: pipeline.pendingSubmissions || 0,
      hint: `${pipeline.underReview || 0} currently under review`,
      icon: FileText,
      accent: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Primary Performance KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-colors hover:border-border"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </span>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${card.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-normal">{card.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Project Volume Breakdown - Balanced 3-Column Equal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
        <div className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
              Total Projects
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/40 text-muted-foreground border border-border/50">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {totals.totalProjects || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Enrolled capstone teams</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-primary/25 bg-primary/5 p-4 shadow-xs transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-primary">
              Active Pipeline
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold tracking-tight text-primary tabular-nums">
              {totals.activeProjects || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              In manuscript &amp; development
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-xs transition-colors hover:border-emerald-500/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Archived &amp; Completed
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Archive className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totals.completedProjects || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Final defense certified</p>
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
