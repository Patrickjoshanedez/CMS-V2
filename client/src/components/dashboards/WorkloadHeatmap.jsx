import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Users, GraduationCap, ShieldCheck } from 'lucide-react';

const heatClass = (score) => {
  if (score >= 18)
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50';
  if (score >= 10)
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50';
  return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50';
};

const VIEW_TABS = [
  { id: 'advisers', label: 'Advisers', icon: GraduationCap },
  { id: 'panelists', label: 'Panelists', icon: ShieldCheck },
  { id: 'faculty', label: 'All Faculty', icon: Users },
];

const WorkloadHeatmap = ({ workload }) => {
  const [activeTab, setActiveTab] = useState('advisers');

  const advisers = workload?.advisers || [];
  const panelists = workload?.panelists || [];
  const faculty = workload?.faculty || [];
  const summary = workload?.summary || {};

  const currentList =
    activeTab === 'panelists' ? panelists : activeTab === 'faculty' ? faculty : advisers;

  const currentCount =
    activeTab === 'panelists'
      ? (summary.panelistCount ?? panelists.length)
      : activeTab === 'faculty'
        ? (summary.facultyCount ?? faculty.length)
        : (summary.adviserCount ?? advisers.length);

  const currentAvg =
    activeTab === 'panelists'
      ? (summary.panelistAverageScore ?? 0)
      : activeTab === 'faculty'
        ? (summary.averageScore ?? 0)
        : (summary.adviserAverageScore ?? summary.averageScore ?? 0);

  return (
    <section className="bg-card border border-border/60 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Faculty Committee Workload Heatmap
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live assignment pressure and review distribution across advisers, panelists, and
            committees.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-muted/30 border border-border/60 px-3 py-1.5 shrink-0">
          <span className="font-mono text-sm font-bold text-foreground tabular-nums">
            {currentCount}
          </span>
          <span className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
            {activeTab}
          </span>
          <span className="text-border">|</span>
          <span className="font-mono text-sm font-bold text-foreground tabular-nums">
            {currentAvg}
          </span>
          <span className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
            Avg Score
          </span>
        </div>
      </div>

      {/* View Switcher Tabs & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/40 w-fit">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === id
                  ? 'bg-background text-foreground shadow-2xs border border-border/60 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Low
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Medium
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            High
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/60">
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                {activeTab === 'panelists'
                  ? 'Panelist'
                  : activeTab === 'faculty'
                    ? 'Faculty Member'
                    : 'Adviser'}
              </th>
              {activeTab === 'faculty' ? (
                <>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Advisory
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Panelist
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Total Projects
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Pending
                  </th>
                </>
              ) : activeTab === 'panelists' ? (
                <>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Panel Projects
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Pending Reviews
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Revisions
                  </th>
                  <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                    Overdue
                  </th>
                </>
              )}
              <th className="px-3 py-3 font-semibold text-xs uppercase tracking-wider">
                Workload Score
              </th>
            </tr>
          </thead>
          <tbody>
            {currentList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No {activeTab} workload data found. Once active assignments and reviews begin,
                  this heatmap will rank load pressure.
                </td>
              </tr>
            )}
            {currentList.map((row) => {
              const name = row.facultyName || row.panelistName || row.adviserName;
              const key = row.facultyId || row.panelistId || row.adviserId || name;

              return (
                <tr
                  key={key}
                  className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-3 font-medium text-foreground">{name}</td>
                  {activeTab === 'faculty' ? (
                    <>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {row.adviserProjectCount ?? 0}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">
                        {row.panelistProjectCount ?? 0}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums font-semibold">
                        {row.projectCount ?? 0}
                      </td>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.pending ?? 0}</td>
                    </>
                  ) : activeTab === 'panelists' ? (
                    <>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.projectCount ?? 0}</td>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.pending ?? 0}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.projectCount ?? 0}</td>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.pending ?? 0}</td>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.revisions ?? 0}</td>
                      <td className="px-3 py-3 font-mono tabular-nums">{row.overdue ?? 0}</td>
                    </>
                  )}
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-xs font-bold tabular-nums ${heatClass(
                        row.workloadScore,
                      )}`}
                    >
                      {row.workloadScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

WorkloadHeatmap.propTypes = {
  workload: PropTypes.shape({
    advisers: PropTypes.arrayOf(PropTypes.object),
    panelists: PropTypes.arrayOf(PropTypes.object),
    faculty: PropTypes.arrayOf(PropTypes.object),
    summary: PropTypes.object,
  }).isRequired,
};

export default React.memo(WorkloadHeatmap);
