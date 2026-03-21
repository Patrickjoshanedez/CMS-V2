import React from 'react';
import PropTypes from 'prop-types';

const heatClass = (score) => {
  if (score >= 18) return 'bg-red-100 text-red-800 border-red-300';
  if (score >= 10) return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-green-100 text-green-800 border-green-300';
};

const WorkloadHeatmap = ({ workload }) => {
  const advisers = workload?.advisers || [];
  const summary = workload?.summary || {};

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Adviser Workload Heatmap</h3>
          <p className="text-sm text-slate-600 mt-1">
            Live assignment pressure and review distribution across advisers.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
          <span className="text-sm font-semibold text-slate-900">{summary.adviserCount || 0}</span>
          <span className="text-xs uppercase font-semibold tracking-wide text-slate-500">
            Advisers
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-semibold text-slate-900">{summary.averageScore || 0}</span>
          <span className="text-xs uppercase font-semibold tracking-wide text-slate-500">
            Avg Score
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
          Low
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Medium
        </span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          High
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
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
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No adviser workload data yet. Once submissions begin, this heatmap will rank load
                  pressure.
                </td>
              </tr>
            )}
            {advisers.map((row) => (
              <tr key={row.adviserId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-3 font-medium text-slate-900">{row.adviserName}</td>
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
