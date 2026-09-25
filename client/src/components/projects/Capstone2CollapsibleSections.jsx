import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  FileSpreadsheet,
  Award,
  ChevronDown,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import InteractiveGanttChart from './InteractiveGanttChart';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import EvaluationPanel from './EvaluationPanel';

/**
 * Capstone2CollapsibleSections
 *
 * Compact, organized, and sectionized workspace for Capstone 2:
 * 1. System Development & Academic Gantt Chart (Prototype sprints & milestones)
 * 2. Action Done Matrix (ADM v2) (Panel recommendations & verification)
 * 3. Midterm Defense Evaluation & Grade Sign-Off (Rubrics & verdict)
 */
export default function Capstone2CollapsibleSections({
  project,
  isStudent = false,
  isFaculty = false,
  user,
  onRefresh,
}) {
  const [openSections, setOpenSections] = useState({
    gantt: true, // Default open for development tracking
    adm: false,
    evaluation: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const admRows = project?.actionDoneMatrix || [];
  const capstone2AdmRows = admRows.filter(
    (r) => !r.milestone || r.milestone === 'CAPSTONE_2' || r.milestone === 'capstone_2',
  );
  const isAdmApproved = project?.admStatus === 'approved';
  const isSecretaryEndorsed = Boolean(project?.admSignatures?.secretary?.endorsed);

  return (
    <div className="space-y-3" data-testid="capstone2-collapsible-workspace">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: SYSTEM DEVELOPMENT & GANTT CHART                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.gantt && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('gantt')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.gantt}
          data-testid="toggle-gantt-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shrink-0">
              <LineChart className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  System Development &amp; Academic Gantt Chart
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Interactive Timeline
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Sprint milestone implementation, system prototype demonstration, and late
                justifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.gantt ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.gantt && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.gantt && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 space-y-4 animate-in fade-in duration-200">
            <div className="pt-2">
              <InteractiveGanttChart project={project} isReadOnly={!isStudent && !isFaculty} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ACTION DONE MATRIX (ADM v2)                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.adm && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('adm')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.adm}
          data-testid="toggle-adm-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Action Done Matrix (ADM v2)
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  {capstone2AdmRows.length} Items
                </Badge>
                {isAdmApproved ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ratified
                  </Badge>
                ) : isSecretaryEndorsed ? (
                  <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-[10px] font-semibold gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Secretary Endorsed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] text-muted-foreground border-border/60"
                  >
                    Midterm Revisions
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Official BukSU Form RU-F-033 — Progress panel recommendations, revisions tracking,
                and committee signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.adm ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.adm && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.adm && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <ActionDoneMatrixTab
                project={project}
                isStudent={isStudent}
                isFaculty={isFaculty}
                user={user}
                onRefresh={onRefresh}
                initialMilestone="CAPSTONE_2"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: DEFENSE EVALUATION & GRADE SIGN-OFF                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.evaluation && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('evaluation')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.evaluation}
          data-testid="toggle-evaluation-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Defense Evaluation &amp; Grade Sign-Off
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Midterm Defense
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Committee rubric scoring, grade computation, and progress defense decision
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.evaluation ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.evaluation && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.evaluation && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <EvaluationPanel projectId={project?._id} defenseType="midterm" />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

Capstone2CollapsibleSections.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string,
    actionDoneMatrix: PropTypes.arrayOf(PropTypes.object),
    admStatus: PropTypes.string,
    admSignatures: PropTypes.object,
  }),
  isStudent: PropTypes.bool,
  isFaculty: PropTypes.bool,
  user: PropTypes.object,
  onRefresh: PropTypes.func,
};
