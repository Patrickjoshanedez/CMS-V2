import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Sparkles,
  FileCheck,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { resolveAdmStatus } from '@/components/projects/adm/admWorkflow';
import { DOCUMENT_TYPES } from '@cms/shared';
import { cn } from '@/lib/utils';

const APPROVED_SUBMISSION_STATUSES = new Set(['approved', 'accepted', 'locked']);
const PASSED_DECISIONS = new Set(['passed', 'passed_with_revisions']);

function unwrapSubmissions(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.submissions)) return raw.submissions;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function getLatestSubmission(submissions, type, chapter = null) {
  const isChapterType = type === 'chapter';
  const matches = submissions.filter((s) => {
    if (isChapterType) {
      const normalizedType = String(s.type || 'chapter').toLowerCase();
      if (normalizedType !== 'chapter' && !normalizedType.startsWith('chapter_')) {
        return false;
      }
      const suffixChapter = normalizedType.startsWith('chapter_')
        ? normalizedType.split('_')[1]
        : undefined;
      return Number(s.chapter ?? s.chapterNumber ?? suffixChapter) === Number(chapter);
    }
    return s.type === type;
  });
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => (b.version || 0) - (a.version || 0))[0];
}

function isApprovedSubmission(sub) {
  return Boolean(sub && APPROVED_SUBMISSION_STATUSES.has(sub.status));
}

function hasReleasedPassingEvaluations(project, evaluations, targetTypes) {
  if (Array.isArray(evaluations) && evaluations.length > 0) {
    const matching = evaluations.filter((e) =>
      targetTypes.includes(String(e.defenseType || '').toLowerCase()),
    );
    if (matching.length === 0) return false;
    const assignedCount = (project?.panelistIds || []).length;
    const releasedPassing = matching.filter(
      (e) =>
        e.status === 'released' && PASSED_DECISIONS.has(String(e.decision || '').toLowerCase()),
    );
    return assignedCount > 0 ? releasedPassing.length >= assignedCount : releasedPassing.length > 0;
  }
  return false;
}

export default function PhaseGateChecklistCard({
  project,
  submissions: rawSubmissions = [],
  evaluations: rawEvaluations,
  isStudent = false,
  isInstructor = false,
  onTabChange,
  onNavigate,
  onAdvancePhase,
  isAdvancing = false,
  className,
}) {
  const capstonePhase = Number(project?.capstonePhase ?? 1);
  const submissions = useMemo(() => unwrapSubmissions(rawSubmissions), [rawSubmissions]);
  const evaluations = useMemo(
    () => (Array.isArray(rawEvaluations) ? rawEvaluations : project?.evaluations || []),
    [rawEvaluations, project?.evaluations],
  );

  const checklistConfig = useMemo(() => {
    if (!project || project.titleStatus !== 'approved' || project.isArchived) {
      return null;
    }

    const goSubmissions = () =>
      onNavigate?.(
        isStudent
          ? '/project/submissions'
          : `/projects/${project._id}?tab=capstone_${capstonePhase}`,
      );
    const goTab = (tab) => onTabChange?.(tab);

    if (capstonePhase === 1) {
      const ch1Done = isApprovedSubmission(getLatestSubmission(submissions, 'chapter', 1));
      const ch2Done = isApprovedSubmission(getLatestSubmission(submissions, 'chapter', 2));
      const ch3Done = isApprovedSubmission(getLatestSubmission(submissions, 'chapter', 3));
      const chaptersDone = ch1Done && ch2Done && ch3Done;
      const proposalDone = isApprovedSubmission(
        getLatestSubmission(submissions, DOCUMENT_TYPES.PROPOSAL),
      );
      const admDone = resolveAdmStatus(project, 'CAPSTONE_1').key === 'approved';
      const evalsDone = hasReleasedPassingEvaluations(project, evaluations, ['proposal']);

      return {
        title: 'Capstone 1 → Capstone 2 Transition Gates',
        subtitle: 'Complete all four gates before Capstone 2 (System Development & Gantt) unlocks.',
        nextPhaseLabel: 'Capstone 2',
        steps: [
          {
            id: 'ch1-3',
            label: 'Chapters 1–3 Approved',
            done: chaptersDone,
            ctaLabel: isStudent ? 'Upload Chapters' : 'Review Chapters',
            onAction: goSubmissions,
          },
          {
            id: 'proposal',
            label: 'Compiled Proposal Endorsed',
            done: proposalDone,
            ctaLabel: isStudent ? 'Compile Proposal' : 'Check Proposal',
            onAction: goSubmissions,
          },
          {
            id: 'evals-1',
            label: 'Proposal Grades Released',
            done: evalsDone,
            ctaLabel: 'Open Capstone 1',
            onAction: () => goTab('capstone_1'),
          },
          {
            id: 'adm-1',
            label: 'ADM v1 Signed & Approved',
            done: admDone,
            ctaLabel: 'Open ADM',
            onAction: () => goTab('adm'),
          },
        ],
      };
    }

    if (capstonePhase === 2) {
      const ganttDone = Boolean(
        project.ganttApproval?.approved && (project.ganttPlan?.tasks || []).length > 0,
      );
      const artifactsDone = Boolean(
        project.githubRepoUrl && ((project.prototypes || []).length > 0 || project.demoVideoUrl),
      );
      const clearanceAndEvalsDone =
        Boolean(project.systemDefenseApproval?.approved) &&
        hasReleasedPassingEvaluations(project, evaluations, ['progress', 'midterm']);
      const admDone = resolveAdmStatus(project, 'CAPSTONE_2').key === 'approved';

      return {
        title: 'Capstone 2 → Capstone 3 Transition Gates',
        subtitle:
          'Complete system deliverables, defense clearance, and ADM v2 sign-off to unlock Chapters 4–5.',
        nextPhaseLabel: 'Capstone 3',
        steps: [
          {
            id: 'gantt',
            label: 'Gantt Schedule Approved',
            done: ganttDone,
            ctaLabel: 'Open Capstone 2',
            onAction: () => goTab('capstone_2'),
          },
          {
            id: 'artifacts',
            label: 'GitHub Repo & Prototype Added',
            done: artifactsDone,
            ctaLabel: isStudent ? 'Manage Assets' : 'Open Capstone 2',
            onAction: isStudent ? goSubmissions : () => goTab('capstone_2'),
          },
          {
            id: 'evals-2',
            label: 'Clearance & System Grades Released',
            done: clearanceAndEvalsDone,
            ctaLabel: 'Open Capstone 2',
            onAction: () => goTab('capstone_2'),
          },
          {
            id: 'adm-2',
            label: 'ADM v2 Signed & Approved',
            done: admDone,
            ctaLabel: 'Open ADM',
            onAction: () => goTab('adm'),
          },
        ],
      };
    }

    const ch4Done = isApprovedSubmission(getLatestSubmission(submissions, 'chapter', 4));
    const ch5Done = isApprovedSubmission(getLatestSubmission(submissions, 'chapter', 5));
    const finalAcadDone = isApprovedSubmission(
      getLatestSubmission(submissions, DOCUMENT_TYPES.FINAL_ACADEMIC),
    );
    const finalJourDone = isApprovedSubmission(
      getLatestSubmission(submissions, DOCUMENT_TYPES.FINAL_JOURNAL),
    );
    const evalsDone =
      String(project?.defenseSchedule?.verdict || '').toLowerCase() === 'passed' ||
      hasReleasedPassingEvaluations(project, evaluations, ['final', 'paper']);
    const admDone = resolveAdmStatus(project, 'CAPSTONE_3').key === 'approved';

    return {
      title: 'Capstone 3 → Final Institutional Archival Gates',
      subtitle:
        'Complete final manuscripts, oral defense grade release, and 3-tier ADM v3 signatures.',
      nextPhaseLabel: 'Archive',
      steps: [
        {
          id: 'ch4-5',
          label: 'Chapters 4–5 Approved',
          done: ch4Done && ch5Done,
          ctaLabel: isStudent ? 'Upload Ch. 4–5' : 'Review Ch. 4–5',
          onAction: goSubmissions,
        },
        {
          id: 'final-papers',
          label: 'Full Manuscript & Journal Cleared',
          done: finalAcadDone && finalJourDone,
          ctaLabel: isStudent ? 'Final Papers' : 'Review Finals',
          onAction: goSubmissions,
        },
        {
          id: 'evals-3',
          label: 'Final Defense Grades Released',
          done: evalsDone,
          ctaLabel: 'Open Capstone 3',
          onAction: () => goTab('capstone_3'),
        },
        {
          id: 'adm-3',
          label: 'ADM v3 Signed (Sec. + Tier 1–3)',
          done: admDone,
          ctaLabel: 'Open ADM',
          onAction: () => goTab('adm'),
        },
      ],
    };
  }, [project, capstonePhase, submissions, evaluations, isStudent, onNavigate, onTabChange]);

  if (!checklistConfig) return null;

  const doneCount = checklistConfig.steps.filter((s) => s.done).length;
  const totalCount = checklistConfig.steps.length;
  const allReady = doneCount === totalCount;
  const firstPendingStep = checklistConfig.steps.find((s) => !s.done);

  return (
    <Card
      data-testid="phase-gate-checklist-card"
      className={cn(
        'rounded-xl border shadow-xs transition-colors',
        allReady ? 'border-success/40 bg-success/5' : 'border-border/70 bg-card',
        className,
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {allReady ? (
                <Sparkles className="h-4 w-4 text-success-foreground shrink-0" aria-hidden="true" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <h3 className="text-sm font-semibold text-foreground">{checklistConfig.title}</h3>
              <Badge
                variant={allReady ? 'success' : 'outline'}
                className="font-mono text-[10px] font-semibold"
              >
                {doneCount}/{totalCount} Ready
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {checklistConfig.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isInstructor && capstonePhase < 3 && onAdvancePhase && allReady && (
              <Button
                type="button"
                size="sm"
                onClick={onAdvancePhase}
                disabled={isAdvancing}
                data-testid="advance-phase-action-btn"
                className="min-h-11 sm:min-h-9 gap-1.5 text-xs font-semibold"
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isAdvancing ? 'Advancing...' : `Advance to ${checklistConfig.nextPhaseLabel}`}
                </span>
              </Button>
            )}
            {firstPendingStep?.onAction && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={firstPendingStep.onAction}
                className="min-h-11 sm:min-h-9 gap-1.5 text-xs font-medium"
              >
                <span>{firstPendingStep.ctaLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label={checklistConfig.title}>
          {checklistConfig.steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs',
                step.done
                  ? 'border-success/35 bg-success/10 text-success-foreground'
                  : 'border-border/60 bg-muted/30 text-muted-foreground',
              )}
            >
              <span className="flex items-center gap-2 min-w-0 font-medium">
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span className="min-w-0 break-words">{step.label}</span>
              </span>
              <span className="text-[10px] font-mono uppercase shrink-0">
                {step.done ? 'Done' : 'Pending'}
              </span>
            </li>
          ))}
        </ul>

        {isStudent && capstonePhase < 3 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <FileCheck className="h-3 w-3 inline mr-1" aria-hidden="true" />
              Once committee signatures and released grades are complete, the Course Instructor
              releases grades and advances your workspace automatically.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

PhaseGateChecklistCard.propTypes = {
  project: PropTypes.object,
  submissions: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  evaluations: PropTypes.array,
  isStudent: PropTypes.bool,
  isInstructor: PropTypes.bool,
  onTabChange: PropTypes.func,
  onNavigate: PropTypes.func,
  onAdvancePhase: PropTypes.func,
  isAdvancing: PropTypes.bool,
  className: PropTypes.string,
};
