import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Users, GraduationCap, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

const heatClass = (score) => {
  if (score >= 18)
    return 'border-destructive/30 bg-destructive/10 text-destructive';
  if (score >= 10)
    return 'border-warning/30 bg-warning/10 text-warning-foreground';
  return 'border-success/30 bg-success/10 text-success-foreground';
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
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Faculty Workload
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assignments and pending reviews across advisers, panelists, and
            committees.
          </p>
        </div>
        <div className="inline-flex flex-wrap items-center gap-2 self-start rounded-lg bg-muted/30 border border-border/60 px-3 py-1.5 shrink-0">
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
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Faculty workload views" className="flex flex-wrap gap-1 rounded-md border border-border/60 bg-muted/40 p-1">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant={activeTab === id ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={activeTab === id}
              onClick={() => setActiveTab(id)}
              className="min-h-11 gap-1.5 px-3 py-2 text-xs"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Low</Badge>
          <Badge variant="warning">Medium</Badge>
          <Badge variant="destructive">High</Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground sm:hidden">Scroll the table horizontally to see all workload details.</p>
      <div className="max-w-full overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>
                {activeTab === 'panelists'
                  ? 'Panelist'
                  : activeTab === 'faculty'
                    ? 'Faculty Member'
                    : 'Adviser'}
              </TableHead>
              {activeTab === 'faculty' ? (
                <>
                  <TableHead>
                    Advisory
                  </TableHead>
                  <TableHead>
                    Panelist
                  </TableHead>
                  <TableHead>
                    Total Projects
                  </TableHead>
                  <TableHead>
                    Pending
                  </TableHead>
                </>
              ) : activeTab === 'panelists' ? (
                <>
                  <TableHead>
                    Panel Projects
                  </TableHead>
                  <TableHead>
                    Pending Reviews
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead>
                    Projects
                  </TableHead>
                  <TableHead>
                    Pending
                  </TableHead>
                  <TableHead>
                    Revisions
                  </TableHead>
                  <TableHead>
                    Overdue
                  </TableHead>
                </>
              )}
              <TableHead>
                Workload Score
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentList.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No {activeTab} workload data found. Once active assignments and reviews begin,
                  this heatmap will rank load pressure.
                </TableCell>
              </TableRow>
            )}
            {currentList.map((row) => {
              const name = row.facultyName || row.panelistName || row.adviserName;
              const key = row.facultyId || row.panelistId || row.adviserId || name;

              return (
                <TableRow
                  key={key}
                >
                  <TableCell className="font-medium text-foreground">{name}</TableCell>
                  {activeTab === 'faculty' ? (
                    <>
                      <TableCell className="font-mono tabular-nums">
                        {row.adviserProjectCount ?? 0}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        {row.panelistProjectCount ?? 0}
                      </TableCell>
                      <TableCell className="font-mono font-semibold tabular-nums">
                        {row.projectCount ?? 0}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">{row.pending ?? 0}</TableCell>
                    </>
                  ) : activeTab === 'panelists' ? (
                    <>
                      <TableCell className="font-mono tabular-nums">{row.projectCount ?? 0}</TableCell>
                      <TableCell className="font-mono tabular-nums">{row.pending ?? 0}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono tabular-nums">{row.projectCount ?? 0}</TableCell>
                      <TableCell className="font-mono tabular-nums">{row.pending ?? 0}</TableCell>
                      <TableCell className="font-mono tabular-nums">{row.revisions ?? 0}</TableCell>
                      <TableCell className="font-mono tabular-nums">{row.overdue ?? 0}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-xs font-bold tabular-nums ${heatClass(
                        row.workloadScore,
                      )}`}
                    >
                      {row.workloadScore}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
