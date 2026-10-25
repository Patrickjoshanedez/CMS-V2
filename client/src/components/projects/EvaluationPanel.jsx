import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useMyEvaluation,
  useProjectEvaluations,
  useUpdateEvaluation,
  useSubmitEvaluation,
  useUnlockEvaluation,
  useReleaseEvaluations,
} from '@/hooks/useEvaluations';
import {
  ROLES,
  EVALUATION_STATUSES,
  DEFENSE_DECISIONS,
  computeBukSUGrade,
  BUKSU_GRADE_SCALE,
} from '@cms/shared';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  Save,
  Send,
  Unlock,
  ClipboardList,
  Download,
  Lock,
  Clock,
} from 'lucide-react';

const STATUS_BADGE_VARIANT = {
  [EVALUATION_STATUSES.DRAFT]: 'secondary',
  [EVALUATION_STATUSES.SUBMITTED]: 'info',
  [EVALUATION_STATUSES.RELEASED]: 'success',
};

function StatusBadge({ status }) {
  return <Badge variant={STATUS_BADGE_VARIANT[status] ?? 'secondary'}>{status}</Badge>;
}

function LoadingSpinner({ message = 'Loading evaluations…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Spinner className="size-5" />
      <span>{message}</span>
    </div>
  );
}

function ErrorAlert({ message }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// ─── Panelist Evaluation Form ────────────────────────────────────────────────

const DECISION_OPTIONS = [
  {
    value: DEFENSE_DECISIONS.PASSED,
    label: 'Passed',
    variant: 'success',
  },
  {
    value: DEFENSE_DECISIONS.PASSED_WITH_REVISIONS,
    label: 'Passed with Revisions',
    variant: 'warning',
  },
  {
    value: DEFENSE_DECISIONS.RE_DEFENSE_REQUIRED,
    label: 'Re-Defense Required',
    variant: 'warning',
  },
  {
    value: DEFENSE_DECISIONS.FAILED,
    label: 'Failed',
    variant: 'destructive',
  },
];

function DecisionBadge({ decision }) {
  const opt = DECISION_OPTIONS.find((o) => o.value === decision);
  if (!opt) return null;
  return <Badge variant={opt.variant}>{opt.label}</Badge>;
}

/**
 * BukSUGradeChip — renders standardized BukSU 1.00–5.00 grade pill
 */
function BukSUGradeChip({ grade, percentage, className = '' }) {
  let gradeObj = null;
  if (grade && typeof grade === 'object' && grade.grade) {
    gradeObj = grade;
  } else if (grade && typeof grade === 'string' && BUKSU_GRADE_SCALE[grade]) {
    gradeObj = BUKSU_GRADE_SCALE[grade];
  } else if (percentage !== undefined && percentage !== null && !isNaN(percentage)) {
    gradeObj = computeBukSUGrade(percentage);
  }

  if (!gradeObj || !gradeObj.grade) return null;

  const gradeDescription = gradeObj.descriptor ?? gradeObj.meaning ?? 'Grade';
  const gradeVariant =
    gradeObj.status === 'failed' || gradeObj.isPassing === false
      ? 'destructive'
      : gradeObj.status === 'passed' || gradeObj.isPassing === true
        ? 'success'
        : gradeObj.status === 'conditional_pass' || gradeObj.status === 'borderline_pass'
          ? 'warning'
          : 'secondary';

  return (
    <Badge
      variant={gradeVariant}
      className={cn('gap-1 px-2 py-0.5 font-mono text-xs font-bold shadow-2xs', className)}
      title={`BukSU Grade: ${gradeObj.grade} (${gradeDescription})`}
      data-testid="buksu-grade-chip"
    >
      <span>BukSU {gradeObj.grade}</span>
      <span className="opacity-80 text-[10px] font-normal hidden sm:inline">
        ({gradeDescription})
      </span>
    </Badge>
  );
}

function PanelistEvaluationForm({ projectId, defenseType }) {
  const { data: evaluation, isLoading, error } = useMyEvaluation(projectId, defenseType);
  const updateEvaluation = useUpdateEvaluation();
  const submitEvaluation = useSubmitEvaluation();

  const [criteria, setCriteria] = useState(null);
  const [overallComment, setOverallComment] = useState('');
  const [decision, setDecision] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [submitConfirmationOpen, setSubmitConfirmationOpen] = useState(false);

  // Sync server data into local state once loaded
  if (evaluation && !initialized) {
    setCriteria(evaluation.criteria.map((c) => ({ ...c })));
    setOverallComment(evaluation.overallComment ?? '');
    setDecision(evaluation.decision ?? null);
    setInitialized(true);
  }

  const isReadOnly =
    evaluation?.status === EVALUATION_STATUSES.SUBMITTED ||
    evaluation?.status === EVALUATION_STATUSES.RELEASED;

  const handleScoreChange = useCallback((index, value) => {
    setCriteria((prev) => {
      const next = [...prev];
      const max = next[index].maxScore;
      const parsed = value === '' ? null : Math.min(Math.max(0, Number(value)), max);
      next[index] = { ...next[index], score: parsed };
      return next;
    });
  }, []);

  const handleCommentChange = useCallback((index, value) => {
    setCriteria((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], comment: value };
      return next;
    });
  }, []);

  const handleSaveDraft = async () => {
    try {
      await updateEvaluation.mutateAsync({
        evaluationId: evaluation._id,
        criteria,
        overallComment,
        decision,
      });
      toast.success('Draft saved successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to save draft.');
    }
  };

  const handleSubmit = async () => {
    try {
      // Save draft first to ensure the backend has the latest scores and decision
      await updateEvaluation.mutateAsync({
        evaluationId: evaluation._id,
        criteria,
        overallComment,
        decision,
      });

      await submitEvaluation.mutateAsync(evaluation._id);
      setSubmitConfirmationOpen(false);
      toast.success('Evaluation submitted successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to submit evaluation.');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error?.response?.status === 403) {
    return (
      <EvaluationsSummary projectId={projectId} defenseType={defenseType} role={ROLES.FACULTY} />
    );
  }
  if (error) return <ErrorAlert message={error.message ?? 'Could not load your evaluation.'} />;
  if (!evaluation) return <ErrorAlert message="No evaluation found for this defense." />;

  const totalScore = (criteria ?? evaluation.criteria).reduce(
    (sum, c) => sum + (Number(c.score) || 0),
    0,
  );
  const maxTotalScore =
    evaluation.maxTotalScore ?? evaluation.criteria.reduce((sum, c) => sum + c.maxScore, 0);

  const activeCriteria = criteria ?? evaluation.criteria;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Your Evaluation
        </CardTitle>
        <StatusBadge status={evaluation.status} />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Criteria Table */}
        <div className="hidden rounded-md border sm:block">
          <Table className="min-w-[38rem]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 text-foreground">Criterion</TableHead>
                <TableHead className="w-24 px-4 text-center">Max</TableHead>
                <TableHead className="w-28 px-4 text-center">Score</TableHead>
                <TableHead className="px-4">Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCriteria.map((c, i) => (
                <TableRow key={c.name ?? i}>
                  <TableCell className="px-4 font-medium">{c.name}</TableCell>
                  <TableCell className="px-4 text-center text-muted-foreground">
                    {c.maxScore}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    {isReadOnly ? (
                      <span className="font-semibold">{c.score ?? '—'}</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={c.maxScore}
                        value={c.score ?? ''}
                        onChange={(e) => handleScoreChange(i, e.target.value)}
                        className="w-20 mx-auto text-center"
                      />
                    )}
                  </TableCell>
                  <TableCell className="px-4">
                    {isReadOnly ? (
                      <span className="text-muted-foreground">{c.comment || '—'}</span>
                    ) : (
                      <Textarea
                        value={c.comment ?? ''}
                        onChange={(e) => handleCommentChange(i, e.target.value)}
                        placeholder="Optional comment…"
                        rows={1}
                        className="min-h-[2.25rem] min-w-48 resize-y"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="grid gap-3 sm:hidden">
          {activeCriteria.map((criterion, index) => (
            <Card key={criterion.name ?? index} className="shadow-none">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium leading-snug">{criterion.name}</p>
                  <Badge variant="outline" className="shrink-0">
                    Max {criterion.maxScore}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`mobile-evaluation-score-${index}`}>Score</Label>
                    {isReadOnly ? (
                      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 font-semibold">
                        {criterion.score ?? '—'} / {criterion.maxScore}
                      </p>
                    ) : (
                      <Input
                        id={`mobile-evaluation-score-${index}`}
                        type="number"
                        min={0}
                        max={criterion.maxScore}
                        value={criterion.score ?? ''}
                        onChange={(event) => handleScoreChange(index, event.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`mobile-evaluation-comment-${index}`}>Comment</Label>
                    {isReadOnly ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {criterion.comment || '—'}
                      </p>
                    ) : (
                      <Textarea
                        id={`mobile-evaluation-comment-${index}`}
                        value={criterion.comment ?? ''}
                        onChange={(event) => handleCommentChange(index, event.target.value)}
                        placeholder="Optional comment…"
                        rows={2}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total Score & BukSU Grade */}
        <div className="flex flex-wrap items-center justify-end gap-3 text-base font-semibold">
          <BukSUGradeChip percentage={maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0} />
          <span>
            Total: {totalScore} / {maxTotalScore}
          </span>
        </div>

        {/* Decision */}
        <div className="space-y-2">
          <Label>Decision</Label>
          {isReadOnly ? (
            <div>
              <DecisionBadge decision={evaluation.decision} />
            </div>
          ) : (
            <div>
              <RadioGroup
                value={decision ?? ''}
                onValueChange={setDecision}
                aria-label="Evaluation decision"
                className="flex flex-wrap gap-2"
              >
                {DECISION_OPTIONS.map((opt) => (
                  <Label
                    key={opt.value}
                    htmlFor={`decision-${opt.value}`}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
                  >
                    <RadioGroupItem id={`decision-${opt.value}`} value={opt.value} />
                    <Badge variant={opt.variant}>{opt.label}</Badge>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        {/* Overall Comment */}
        <div className="space-y-2">
          <Label htmlFor="overallComment">Overall Comment</Label>
          {isReadOnly ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {overallComment || evaluation.overallComment || '—'}
            </p>
          ) : (
            <Textarea
              id="overallComment"
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="General remarks about the project…"
              rows={3}
            />
          )}
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={updateEvaluation.isPending}
            >
              {updateEvaluation.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button
              onClick={() => setSubmitConfirmationOpen(true)}
              disabled={submitEvaluation.isPending}
            >
              {submitEvaluation.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Evaluation
            </Button>
          </div>
        )}
      </CardContent>
      <AlertDialog open={submitConfirmationOpen} onOpenChange={setSubmitConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your evaluation?</AlertDialogTitle>
            <AlertDialogDescription>You cannot edit after submission.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitEvaluation.isPending}>
              Submit Evaluation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Collapsible Panelist Section ────────────────────────────────────────────

function PanelistSection({ evaluation, role }) {
  const [open, setOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const total = evaluation.criteria.reduce((s, c) => s + (Number(c.score) || 0), 0);
  const max = evaluation.criteria.reduce((s, c) => s + c.maxScore, 0);
  const unlockEvaluation = useUnlockEvaluation();
  const explicitName =
    typeof evaluation.panelistName === 'string' ? evaluation.panelistName.trim() : '';
  const derivedName = [evaluation.panelistId?.firstName, evaluation.panelistId?.lastName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
  const emailName =
    typeof evaluation.panelistId?.email === 'string' ? evaluation.panelistId.email.trim() : '';
  const panelistName = explicitName || derivedName || emailName || 'Panelist';
  const canUnlock = role === ROLES.INSTRUCTOR && evaluation.status !== EVALUATION_STATUSES.DRAFT;

  const handleUnlock = async () => {
    if (!unlockReason.trim()) return;

    try {
      await unlockEvaluation.mutateAsync({
        evaluationId: evaluation._id,
        reason: unlockReason.trim(),
      });
      setUnlockDialogOpen(false);
      setUnlockReason('');
      toast.success('Evaluation unlocked successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to unlock evaluation.');
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 hover:bg-muted/50">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
          <CollapsibleTrigger className="inline-flex min-w-0 items-center gap-2 text-left">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="truncate font-medium">{panelistName}</span>
          </CollapsibleTrigger>
          <StatusBadge status={evaluation.status} />
          {evaluation.decision && <DecisionBadge decision={evaluation.decision} />}
          {evaluation.status !== EVALUATION_STATUSES.DRAFT && (
            <BukSUGradeChip
              grade={evaluation.buksuGrade}
              percentage={max > 0 ? (total / max) * 100 : 0}
            />
          )}
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <span className="text-sm font-semibold text-muted-foreground">
            {total} / {max}
          </span>
          {canUnlock && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUnlockDialogOpen(true)}
              disabled={unlockEvaluation.isPending}
            >
              {unlockEvaluation.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              Unlock
            </Button>
          )}
        </div>
      </div>

      <CollapsibleContent>
        <div className="border-t px-4 py-4 space-y-4">
          <div className="rounded-md border">
            <Table className="min-w-[38rem]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="px-4 text-foreground">Criterion</TableHead>
                  <TableHead className="w-24 px-4 text-center">Max</TableHead>
                  <TableHead className="w-24 px-4 text-center">Score</TableHead>
                  <TableHead className="px-4">Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluation.criteria.map((c, i) => (
                  <TableRow key={c.name ?? i}>
                    <TableCell className="px-4">{c.name}</TableCell>
                    <TableCell className="px-4 text-center text-muted-foreground">
                      {c.maxScore}
                    </TableCell>
                    <TableCell className="px-4 text-center font-semibold">
                      {c.score ?? '—'}
                    </TableCell>
                    <TableCell className="px-4 text-muted-foreground">{c.comment || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {evaluation.overallComment && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Overall Comment</Label>
              <p className="text-sm whitespace-pre-wrap">{evaluation.overallComment}</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock evaluation</DialogTitle>
            <DialogDescription>
              Enter a reason for unlocking this evaluation. The reason will be recorded.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor={`unlock-reason-${evaluation._id}`}>Reason for unlocking</Label>
          <Textarea
            id={`unlock-reason-${evaluation._id}`}
            autoFocus
            value={unlockReason}
            onChange={(event) => setUnlockReason(event.target.value)}
            placeholder="Reason for unlocking"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={!unlockReason.trim() || unlockEvaluation.isPending}
            >
              {unlockEvaluation.isPending && <Spinner className="mr-2" />}
              Unlock evaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}

// ─── Evaluations Summary (Instructor / Adviser / Student) ───────────────────

function EvaluationsSummary({ projectId, defenseType, role }) {
  const { data, isLoading, error } = useProjectEvaluations(projectId, defenseType);
  const releaseEvaluations = useReleaseEvaluations();
  const [releaseConfirmationOpen, setReleaseConfirmationOpen] = useState(false);

  const isInstructor = role === ROLES.INSTRUCTOR;
  const isStudent = role === ROLES.STUDENT;

  if (isLoading) return <LoadingSpinner />;

  if (
    isStudent &&
    (error?.response?.status === 403 ||
      error?.response?.data?.error?.code === 'GRADES_LOCKED_PENDING_PANEL_COMPLETION')
  ) {
    return (
      <Card className="border-warning/30 bg-warning/5 shadow-sm">
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Grades Pending Panel Sign-Off</h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground">
            Defense results, grading criteria scores, and final evaluation rubrics will unlock once
            all assigned panel members have completely submitted and released their official
            evaluations.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Panel review in progress</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) return <ErrorAlert message={error.message ?? 'Could not load evaluations.'} />;

  const { evaluations = [], summary = {} } = data ?? {};

  // Students can only see released evaluations
  const visibleEvaluations = isStudent
    ? evaluations.filter((e) => e.status === EVALUATION_STATUSES.RELEASED)
    : evaluations;

  const averageMaxScore = summary.averageMaxScore ?? summary.maxTotalScore;
  const panelistCount =
    summary.totalPanelists ?? summary.panelistCount ?? visibleEvaluations.length;

  if (isStudent && visibleEvaluations.length === 0) {
    return (
      <Card className="border-warning/30 bg-warning/5 shadow-sm">
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning-foreground">
            <Lock className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">Grades Pending Panel Sign-Off</h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground">
            Defense results, grading criteria scores, and final evaluation rubrics will unlock once
            all assigned panel members have completely submitted and released their official
            evaluations.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Panel review in progress</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unsubmittedEvaluations = evaluations.filter(
    (e) => e.status !== EVALUATION_STATUSES.SUBMITTED && e.status !== EVALUATION_STATUSES.RELEASED,
  );
  const allPanelistsSubmitted = evaluations.length > 0 && unsubmittedEvaluations.length === 0;

  const hasSubmittedUnreleased =
    isInstructor &&
    evaluations.some((e) => e.status === EVALUATION_STATUSES.SUBMITTED) &&
    evaluations.some((e) => e.status !== EVALUATION_STATUSES.RELEASED);

  const handleRelease = async () => {
    if (!allPanelistsSubmitted) {
      toast.error(
        'Grade Leakage Gate: All assigned panelists must submit their evaluations before grades can be released.',
      );
      return;
    }
    try {
      await releaseEvaluations.mutateAsync({ projectId, defenseType });
      setReleaseConfirmationOpen(false);
      toast.success('Evaluations released successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to release evaluations.');
    }
  };

  const handleDownloadReport = async () => {
    try {
      window.open(`/api/evaluations/project/${projectId}/${defenseType}/report`, '_blank');
      toast.success('Opening defense evaluation report...');
    } catch {
      toast.error('Failed to download evaluation report.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Grade Leakage Warning for Instructor */}
      {isInstructor && unsubmittedEvaluations.length > 0 && (
        <Alert variant="warning">
          <AlertDescription className="text-xs">
            <span className="font-semibold">Grade Leakage Prevention Active:</span>{' '}
            {unsubmittedEvaluations.length} panel member(s) have not yet completed their
            evaluations. Grading scores and remarks are locked and cannot be released until all
            assigned committee members submit their rubrics.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Evaluation Summary
          </CardTitle>
          {!isStudent && (
            <Button size="sm" variant="outline" onClick={handleDownloadReport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Defense Report
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-center shadow-2xs">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {allPanelistsSubmitted &&
                summary.averageScore !== null &&
                summary.averageScore !== undefined
                  ? summary.averageScore.toFixed(1)
                  : 'Pending Details'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Average Score
                {averageMaxScore && allPanelistsSubmitted ? ` / ${averageMaxScore}` : ''}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-center shadow-2xs flex flex-col justify-center items-center">
              {allPanelistsSubmitted ? (
                <BukSUGradeChip
                  grade={summary.buksuGrade}
                  percentage={
                    summary.percentage ||
                    (averageMaxScore > 0 ? (summary.averageScore / averageMaxScore) * 100 : 0)
                  }
                />
              ) : (
                <span className="text-sm text-muted-foreground font-medium">Pending Release</span>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">BukSU Grade (1.00–5.00)</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-center shadow-2xs">
              <p className="text-xl sm:text-2xl font-bold text-foreground">{panelistCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Panelists</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 text-center shadow-2xs">
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {visibleEvaluations.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isStudent ? 'Released' : 'Total'} Evaluations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panelist Evaluations */}
      <div className="space-y-3">
        {visibleEvaluations.map((ev) => (
          <PanelistSection key={ev._id} evaluation={ev} role={role} />
        ))}
      </div>

      {/* Release Button (Instructor only) */}
      {hasSubmittedUnreleased && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setReleaseConfirmationOpen(true)}
            disabled={releaseEvaluations.isPending || !allPanelistsSubmitted}
            className={!allPanelistsSubmitted ? 'opacity-60 cursor-not-allowed' : ''}
          >
            {releaseEvaluations.isPending ? (
              <Spinner className="mr-2" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            Release All Evaluations
          </Button>
        </div>
      )}
      <AlertDialog open={releaseConfirmationOpen} onOpenChange={setReleaseConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release evaluations to the team?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All panel members must submit before release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} disabled={releaseEvaluations.isPending}>
              Release evaluations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function EvaluationPanel({ projectId, defenseType }) {
  const authState = useAuthStore((s) => s?.user);
  const user = authState?.user ?? authState;

  if (!user) return null;

  const canHavePanelAssignment = user.role === ROLES.PANELIST || user.role === ROLES.FACULTY;

  if (canHavePanelAssignment) {
    return <PanelistEvaluationForm projectId={projectId} defenseType={defenseType} />;
  }

  return <EvaluationsSummary projectId={projectId} defenseType={defenseType} role={user.role} />;
}
