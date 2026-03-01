import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useMyEvaluation,
  useProjectEvaluations,
  useUpdateEvaluation,
  useSubmitEvaluation,
  useReleaseEvaluations,
} from '@/hooks/useEvaluations';
import { ROLES, EVALUATION_STATUSES } from '@cms/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Send,
  Unlock,
  ClipboardList,
} from 'lucide-react';

const STATUS_BADGE_CLASS = {
  [EVALUATION_STATUSES.DRAFT]: 'bg-muted text-muted-foreground',
  [EVALUATION_STATUSES.SUBMITTED]: 'bg-primary/10 text-primary',
  [EVALUATION_STATUSES.RELEASED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function StatusBadge({ status }) {
  return (
    <Badge className={STATUS_BADGE_CLASS[status] ?? 'bg-muted text-muted-foreground'}>
      {status}
    </Badge>
  );
}

function LoadingSpinner({ message = 'Loading evaluations…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{message}</span>
    </div>
  );
}

function ErrorAlert({ message }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

// ─── Panelist Evaluation Form ────────────────────────────────────────────────

function PanelistEvaluationForm({ projectId, defenseType }) {
  const { data: evaluation, isLoading, error } = useMyEvaluation(projectId, defenseType);
  const updateEvaluation = useUpdateEvaluation();
  const submitEvaluation = useSubmitEvaluation();

  const [criteria, setCriteria] = useState(null);
  const [overallComment, setOverallComment] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Sync server data into local state once loaded
  if (evaluation && !initialized) {
    setCriteria(evaluation.criteria.map((c) => ({ ...c })));
    setOverallComment(evaluation.overallComment ?? '');
    setInitialized(true);
  }

  const isReadOnly =
    evaluation?.status === EVALUATION_STATUSES.SUBMITTED ||
    evaluation?.status === EVALUATION_STATUSES.RELEASED;

  const handleScoreChange = useCallback((index, value) => {
    setCriteria((prev) => {
      const next = [...prev];
      const max = next[index].maxScore;
      const parsed = value === '' ? '' : Math.min(Math.max(0, Number(value)), max);
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
      });
      toast.success('Draft saved successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to save draft.');
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit? You cannot edit after submission.')) return;
    try {
      await submitEvaluation.mutateAsync(evaluation._id);
      toast.success('Evaluation submitted successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to submit evaluation.');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error.message ?? 'Could not load your evaluation.'} />;
  if (!evaluation) return <ErrorAlert message="No evaluation found for this defense." />;

  const totalScore = (criteria ?? evaluation.criteria).reduce(
    (sum, c) => sum + (Number(c.score) || 0),
    0,
  );
  const maxTotalScore = evaluation.maxTotalScore
    ?? evaluation.criteria.reduce((sum, c) => sum + c.maxScore, 0);

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
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Criterion</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">Max</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground w-28">Score</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Comment</th>
              </tr>
            </thead>
            <tbody>
              {activeCriteria.map((c, i) => (
                <tr key={c.name ?? i} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{c.maxScore}</td>
                  <td className="px-4 py-3 text-center">
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
                  </td>
                  <td className="px-4 py-3">
                    {isReadOnly ? (
                      <span className="text-muted-foreground">{c.comment || '—'}</span>
                    ) : (
                      <Textarea
                        value={c.comment ?? ''}
                        onChange={(e) => handleCommentChange(i, e.target.value)}
                        placeholder="Optional comment…"
                        rows={1}
                        className="min-h-[2.25rem] resize-y"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total Score */}
        <div className="flex items-center justify-end gap-2 text-base font-semibold">
          Total: {totalScore} / {maxTotalScore}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitEvaluation.isPending}>
              {submitEvaluation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Evaluation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Collapsible Panelist Section ────────────────────────────────────────────

function PanelistSection({ evaluation }) {
  const [open, setOpen] = useState(false);
  const total = evaluation.criteria.reduce((s, c) => s + (Number(c.score) || 0), 0);
  const max = evaluation.criteria.reduce((s, c) => s + c.maxScore, 0);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{evaluation.panelistName ?? 'Panelist'}</span>
          <StatusBadge status={evaluation.status} />
        </div>
        <span className="text-sm font-semibold text-muted-foreground">
          {total} / {max}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Criterion</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">Max</th>
                  <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">Score</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Comment</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.criteria.map((c, i) => (
                  <tr key={c.name ?? i} className="border-b last:border-0">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-center text-muted-foreground">{c.maxScore}</td>
                    <td className="px-4 py-2 text-center font-semibold">{c.score ?? '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {evaluation.overallComment && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Overall Comment</Label>
              <p className="text-sm whitespace-pre-wrap">{evaluation.overallComment}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Evaluations Summary (Instructor / Adviser / Student) ───────────────────

function EvaluationsSummary({ projectId, defenseType, role }) {
  const { data, isLoading, error } = useProjectEvaluations(projectId, defenseType);
  const releaseEvaluations = useReleaseEvaluations();

  const isInstructor = role === ROLES.INSTRUCTOR;
  const isStudent = role === ROLES.STUDENT;

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error.message ?? 'Could not load evaluations.'} />;

  const { evaluations = [], summary = {} } = data ?? {};

  // Students can only see released evaluations
  const visibleEvaluations = isStudent
    ? evaluations.filter((e) => e.status === EVALUATION_STATUSES.RELEASED)
    : evaluations;

  if (isStudent && visibleEvaluations.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Evaluations have not been released yet.
        </CardContent>
      </Card>
    );
  }

  const hasSubmittedUnreleased =
    isInstructor &&
    evaluations.some(
      (e) => e.status === EVALUATION_STATUSES.SUBMITTED,
    ) &&
    evaluations.some(
      (e) => e.status !== EVALUATION_STATUSES.RELEASED,
    );

  const handleRelease = async () => {
    if (!window.confirm('Release all submitted evaluations to the team? This cannot be undone.'))
      return;
    try {
      await releaseEvaluations.mutateAsync({ projectId, defenseType });
      toast.success('Evaluations released successfully.');
    } catch (err) {
      toast.error(err?.message ?? 'Failed to release evaluations.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Evaluation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">
                {summary.averageScore !== null && summary.averageScore !== undefined ? summary.averageScore.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                Average Score{summary.maxTotalScore ? ` / ${summary.maxTotalScore}` : ''}
              </p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{summary.panelistCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Panelists</p>
            </div>
            <div className="rounded-md border p-4 text-center">
              <p className="text-2xl font-bold">{visibleEvaluations.length}</p>
              <p className="text-xs text-muted-foreground">
                {isStudent ? 'Released' : 'Total'} Evaluations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panelist Evaluations */}
      <div className="space-y-3">
        {visibleEvaluations.map((ev) => (
          <PanelistSection key={ev._id} evaluation={ev} />
        ))}
      </div>

      {/* Release Button (Instructor only) */}
      {hasSubmittedUnreleased && (
        <div className="flex justify-end">
          <Button onClick={handleRelease} disabled={releaseEvaluations.isPending}>
            {releaseEvaluations.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Unlock className="mr-2 h-4 w-4" />
            )}
            Release All Evaluations
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function EvaluationPanel({ projectId, defenseType }) {
  const { user } = useAuthStore();

  if (!user) return null;

  if (user.role === ROLES.PANELIST) {
    return <PanelistEvaluationForm projectId={projectId} defenseType={defenseType} />;
  }

  return (
    <EvaluationsSummary
      projectId={projectId}
      defenseType={defenseType}
      role={user.role}
    />
  );
}
