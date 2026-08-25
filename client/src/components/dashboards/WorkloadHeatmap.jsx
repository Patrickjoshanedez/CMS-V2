import React from 'react';
import PropTypes from 'prop-types';

const heatClass = (score) => {
  if (score >= 18)
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50';
  if (score >= 10)
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50';
};

const WorkloadHeatmap = ({ workload }) => {
  const advisers = workload?.advisers || [];
  const summary = workload?.summary || {};

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Adviser Workload Heatmap</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live assignment pressure and review distribution across advisers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3 py-2">
          <span className="text-sm font-semibold text-foreground">{summary.adviserCount || 0}</span>
          <span className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
            Advisers
          </span>
          <span className="text-border">|</span>
          <span className="text-sm font-semibold text-foreground">{summary.averageScore || 0}</span>
          <span className="text-xs uppercase font-semibold tracking-wide text-muted-foreground">
            Avg Score
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          Low
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          Medium
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
          High
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="px-3 py-3 font-semibold">Adviser</th>
              <th className="px-3 py-3 font-semibold">Projects</th>
              <th className="px-3 py-3 font-semibold">Pending</th>
              <th className="px-3 py-3 font-semibold">Revisions</th>
              <th className="px-3 py-3 font-semibold">Overdue</th>
              <th className="px-3 py-3 font-semibold">Workload Score</th>
            </tr>
          </thead>
          <tbody>
            {advisers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  No adviser workload data yet. Once submissions begin, this heatmap will rank load
                  pressure.
                </td>
              </tr>
            )}
            {advisers.map((row) => (
              <tr key={row.adviserId} className="border-b border-border hover:bg-muted/30">
                <td className="px-3 py-3 font-medium text-foreground">{row.adviserName}</td>
                <td className="px-3 py-3">{row.projectCount}</td>
                <td className="px-3 py-3">{row.pending}</td>
                <td className="px-3 py-3">{row.revisions}</td>
                <td className="px-3 py-3">{row.overdue}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-md border font-semibold ${heatClass(row.workloadScore)}`}
                  >
                    {row.workloadScore}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

WorkloadHeatmap.propTypes = {
  workload: PropTypes.shape({
    advisers: PropTypes.arrayOf(PropTypes.object),
    summary: PropTypes.object,
  }).isRequired,
};

export default React.memo(WorkloadHeatmap);
