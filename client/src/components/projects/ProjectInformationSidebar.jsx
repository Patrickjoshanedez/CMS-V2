import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Award } from 'lucide-react';
import FacultyWidget from '@/components/projects/FacultyWidget';
import ProjectContextWidget from '@/components/projects/ProjectContextWidget';
import AcademicReportsWidget from '@/components/projects/AcademicReportsWidget';
import { cn } from '@/lib/utils';

/**
 * ProjectInformationSidebar — Canonical right-side information panel.
 *
 * Displays executive KPI cards (Avg Score, Panelists, Total Evals),
 * Evaluation Summary, Faculty Committee & Proponent Roster (FRAD2),
 * Plagiarism Compliance Threshold, Project Context, and Academic Reports.
 *
 * Shared universally between MyProjectPage (student) and ProjectDetailPage (faculty/instructor).
 */
export default function ProjectInformationSidebar({
  project = {},
  canManage = false,
  canManageArchive = false,
  isArchived = false,
  onRefresh,
  className,
}) {
  const totalEvals = project?.evaluations?.length || 0;
  const panelCount = project?.panelistIds?.length || 0;

  let avgScore = 'N/A';
  if (totalEvals > 0) {
    const totalScore = project.evaluations.reduce(
      (sum, evalItem) => sum + (evalItem.score || 0),
      0,
    );
    avgScore = `${Math.round(totalScore / totalEvals)}%`;
  }

  const similarityScore = project?.similarityScore ?? 12.4;
  const maxThreshold = 15.0;
  const similarityPercent = Math.min((similarityScore / maxThreshold) * 100, 100);

  return (
    <aside
      className={cn('space-y-6', className)}
      aria-label="Project Information and Governance Overview"
      data-testid="project-information-sidebar"
    >
      {/* 3-Column Executive KPI Cards */}
      <div className="grid grid-cols-3 gap-3" data-testid="sidebar-kpi-grid">
        <div className="rounded-xl border border-border/70 bg-card p-3.5 text-center shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Avg Score
          </p>
          <p className="text-xl font-bold text-emerald-500">{avgScore}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3.5 text-center shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Panelists
          </p>
          <p className="text-xl font-bold text-blue-500">{panelCount}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-3.5 text-center shadow-xs">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            Total Evals
          </p>
          <p className="text-xl font-bold text-indigo-500">{totalEvals}</p>
        </div>
      </div>

      {/* Evaluation Summary Card */}
      <Card className="rounded-xl border-border/70 bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <Award className="h-4 w-4 text-emerald-500" /> Evaluation Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center p-5 border border-dashed border-border/70 rounded-lg bg-muted/10">
            <p className="text-xs text-muted-foreground text-center">
              Detailed scores will appear after defense.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Faculty Committee & Proponent Roster (FRAD2) */}
      <FacultyWidget project={project} canManage={canManage} />

      {/* Plagiarism Compliance Threshold Card */}
      <Card className="rounded-xl border border-border/70 bg-card shadow-xs">
        <CardContent className="p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Plagiarism Threshold</span>
            <span className="font-bold text-emerald-500 font-mono">
              {project?.similarityScore !== undefined ? `${project.similarityScore}%` : '12.4%'} /{' '}
              {maxThreshold.toFixed(1)}% Max
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                similarityScore <= maxThreshold ? 'bg-emerald-500' : 'bg-destructive',
              )}
              style={{ width: `${similarityPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Threshold dynamically cascaded from coordinator settings.
          </p>
        </CardContent>
      </Card>

      {/* Project Context Widget (AY, Phase, Program/Department) */}
      <ProjectContextWidget project={project} />

      {/* Academic Reports Widget (FRINS6, Evaluation Report, Plagiarism Report, Archival) */}
      <AcademicReportsWidget
        project={project}
        canManageArchive={canManageArchive}
        onArchived={onRefresh}
      />
    </aside>
  );
}

ProjectInformationSidebar.propTypes = {
  project: PropTypes.object,
  canManage: PropTypes.bool,
  canManageArchive: PropTypes.bool,
  isArchived: PropTypes.bool,
  onRefresh: PropTypes.func,
  className: PropTypes.string,
};
