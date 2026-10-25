import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { projectKeys } from '@/hooks/useProjects';
import { projectService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';

const dateLabel = (value) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  );

const EMPTY_CHECK_INS = Object.freeze([]);
const asId = (value) => String(value?._id || value?.id || value || '');

function CheckInCard({ project, checkIn, tasks, canEdit, canReview, canIssueWaiver }) {
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState(checkIn.summary || '');
  const [progressPct, setProgressPct] = useState(String(checkIn.progressPct ?? 0));
  const [completedTaskIds, setCompletedTaskIds] = useState(checkIn.completedTaskIds || []);
  const [blockerNotes, setBlockerNotes] = useState(checkIn.blockerNotes || '');
  const [commitHash, setCommitHash] = useState(checkIn.commitHash || '');
  const [justification, setJustification] = useState(checkIn.justification || '');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [waiverRemarks, setWaiverRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: ({ action, payload }) => {
      if (action === 'student')
        return projectService.updateWeeklyCheckIn(project._id, checkIn._id, payload);
      if (action === 'adviser')
        return projectService.reviewWeeklyCheckIn(project._id, checkIn._id, payload);
      return projectService.reviewWeeklyCheckInWaiver(project._id, checkIn._id, payload);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'student'
          ? variables.payload.submit === false
            ? 'Progress draft saved.'
            : 'Weekly progress submitted for adviser review.'
          : variables.action === 'adviser'
            ? 'Adviser review recorded.'
            : 'Instructor waiver decision recorded.',
      );
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(project._id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.my() });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          'Unable to update this check-in.',
      );
    },
  });

  const submit = (shouldSubmit) =>
    mutation.mutate({
      action: 'student',
      payload: {
        summary,
        progressPct: Number(progressPct),
        completedTaskIds,
        blockerNotes,
        commitHash,
        justification,
        submit: shouldSubmit,
      },
    });

  const review = (decision) => {
    if (decision === 'revision_requested' && reviewRemarks.trim().length < 5) {
      toast.error('Add at least five characters explaining the requested revision.');
      return;
    }
    mutation.mutate({ action: 'adviser', payload: { decision, remarks: reviewRemarks } });
  };

  const decideWaiver = (decision) => {
    if (decision === 'denied' && waiverRemarks.trim().length < 5) {
      toast.error('Add at least five characters explaining the waiver decision.');
      return;
    }
    mutation.mutate({ action: 'instructor', payload: { decision, remarks: waiverRemarks } });
  };

  const isOverdue = new Date(checkIn.dueAt) < new Date();
  const statusLabel = String(checkIn.status || 'scheduled').replaceAll('_', ' ');
  const fieldId = `weekly-check-in-${checkIn._id}`;

  return (
    <Card className="overflow-hidden" data-testid="weekly-check-in-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="space-y-1">
          <CardTitle className="text-base">Week of {dateLabel(checkIn.weekStart)}</CardTitle>
          <p className="text-sm text-muted-foreground">Due {dateLabel(checkIn.dueAt)}</p>
        </div>
        <Badge
          variant={
            checkIn.status === 'approved' ? 'success' : isOverdue ? 'destructive' : 'secondary'
          }
        >
          {statusLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {tasks.length > 0 && (
          <fieldset className="mt-4 space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">Scheduled tasks</legend>
            {tasks.map((task) => {
              const taskId = asId(task.id || task._id);
              return (
                <Label
                  key={taskId}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <Checkbox
                    checked={completedTaskIds.includes(taskId)}
                    disabled={!canEdit || mutation.isPending}
                    onCheckedChange={(checked) =>
                      setCompletedTaskIds((current) =>
                        checked
                          ? [...new Set([...current, taskId])]
                          : current.filter((id) => id !== taskId),
                      )
                    }
                  />
                  <span className="text-foreground">{task.title}</span>
                </Label>
              );
            })}
          </fieldset>
        )}

        {canEdit ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${fieldId}-summary`}>Progress summary</Label>
              <Textarea
                id={`${fieldId}-summary`}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Summarize work completed this week."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-progress`}>Progress percentage</Label>
              <Input
                id={`${fieldId}-progress`}
                type="number"
                min="0"
                max="100"
                value={progressPct}
                onChange={(event) => setProgressPct(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-commit`}>Commit or revision hash (optional)</Label>
              <Input
                id={`${fieldId}-commit`}
                value={commitHash}
                onChange={(event) => setCommitHash(event.target.value)}
                maxLength={64}
                placeholder="Short commit hash"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${fieldId}-blockers`}>Blockers (optional)</Label>
              <Textarea
                id={`${fieldId}-blockers`}
                value={blockerNotes}
                onChange={(event) => setBlockerNotes(event.target.value)}
                maxLength={1500}
                rows={2}
                placeholder="Describe any blockers that need adviser support."
              />
            </div>
            {(isOverdue || checkIn.isLate || checkIn.status === 'waiver_denied') && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor={`${fieldId}-justification`}>Late submission justification</Label>
                <Textarea
                  id={`${fieldId}-justification`}
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                  maxLength={2000}
                  rows={2}
                  required
                  placeholder="Explain why the check-in is late."
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => submit(false)}
              >
                Save draft
              </Button>
              <Button type="button" disabled={mutation.isPending} onClick={() => submit(true)}>
                Submit for adviser review
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm">
            {checkIn.summary && (
              <p className="whitespace-pre-wrap text-foreground">{checkIn.summary}</p>
            )}
            <p className="text-muted-foreground">Progress reported: {checkIn.progressPct ?? 0}%</p>
            {checkIn.blockerNotes && (
              <p className="text-muted-foreground">Blockers: {checkIn.blockerNotes}</p>
            )}
            {checkIn.justification && (
              <p className="text-muted-foreground">Late justification: {checkIn.justification}</p>
            )}
            {checkIn.adviserReview?.remarks && (
              <p className="text-muted-foreground">Adviser: {checkIn.adviserReview.remarks}</p>
            )}
            {checkIn.instructorWaiver?.remarks && (
              <p className="text-muted-foreground">
                Instructor: {checkIn.instructorWaiver.remarks}
              </p>
            )}
          </div>
        )}

        {canReview && checkIn.status === 'submitted' && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-review-remarks`}>Review remarks</Label>
              <Textarea
                id={`${fieldId}-review-remarks`}
                value={reviewRemarks}
                onChange={(event) => setReviewRemarks(event.target.value)}
                maxLength={1500}
                rows={2}
                placeholder="Required when requesting revisions."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => review('approved')}
              >
                Approve check-in
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => review('revision_requested')}
              >
                Request revisions
              </Button>
            </div>
          </div>
        )}

        {canIssueWaiver && checkIn.status === 'awaiting_instructor_waiver' && (
          <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Instructor waiver review
            </p>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-waiver-remarks`}>Waiver remarks</Label>
              <Textarea
                id={`${fieldId}-waiver-remarks`}
                value={waiverRemarks}
                onChange={(event) => setWaiverRemarks(event.target.value)}
                maxLength={1500}
                rows={2}
                placeholder="Required when denying the waiver."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={mutation.isPending}
                onClick={() => decideWaiver('granted')}
              >
                Grant waiver
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => decideWaiver('denied')}
              >
                Deny waiver
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WeeklyProgressCheckIns({ project, isReadOnly = false }) {
  const storedUser = useAuthStore((state) => state.user);
  const user = storedUser?.user ?? storedUser;
  const userId = asId(user);
  const role = user?.role;
  const phase = Number(project?.capstonePhase ?? project?.phase ?? 0);
  const projectId = asId(project);
  const tasks = project?.ganttPlan?.tasks || [];
  const checkIns = project?.weeklyCheckIns || EMPTY_CHECK_INS;
  const scheduleHash = project?.ganttApproval?.scheduleHash;
  const currentCheckIns = useMemo(
    () => checkIns.filter((checkIn) => !scheduleHash || checkIn.scheduleHash === scheduleHash),
    [checkIns, scheduleHash],
  );
  const isAdviser = role === 'faculty' && asId(project?.adviserId) === userId;
  const team = project?.teamId && typeof project.teamId === 'object' ? project.teamId : {};
  const leader = team.leaderId && typeof team.leaderId === 'object' ? team.leaderId : {};
  const section = team.sectionId && typeof team.sectionId === 'object' ? team.sectionId : {};
  const assignedInstructorId = asId(leader.instructorId || section.createdBy);
  const isAssignedInstructor = role === 'instructor' && assignedInstructorId === userId;
  const canEdit = role === 'student' && !isReadOnly;

  if (phase !== 2) return null;

  return (
    <section
      className="mt-6 space-y-4 rounded-2xl border border-border/60 bg-background p-4 sm:p-6"
      aria-labelledby="weekly-checkins-title"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <CalendarClock className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="weekly-checkins-title" className="text-lg font-semibold text-foreground">
            Weekly progress check-ins
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit progress against the adviser-approved Capstone 2 schedule. Due check-ins must be
            approved before phase progression.
          </p>
        </div>
      </div>

      {!project?.ganttApproval?.approved && (
        <Alert variant="info">
          <AlertDescription>
            Weekly check-ins become available after the adviser approves a dated Gantt plan.
          </AlertDescription>
        </Alert>
      )}
      {project?.ganttApproval?.approved && currentCheckIns.length === 0 && (
        <Alert variant="info">
          <AlertDescription>
            No weekly check-ins are scheduled for the approved plan yet.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4">
        {currentCheckIns.map((checkIn) => {
          const taskIds = new Set(checkIn.taskIds || []);
          const weekTasks = tasks.filter((task) => taskIds.has(asId(task.id || task._id)));
          return (
            <CheckInCard
              key={`${checkIn._id}-${checkIn.status}-${checkIn.updatedAt || ''}`}
              project={{ ...project, _id: projectId }}
              checkIn={checkIn}
              tasks={weekTasks}
              canEdit={canEdit}
              canReview={isAdviser && !isReadOnly}
              canIssueWaiver={isAssignedInstructor && !isReadOnly}
            />
          );
        })}
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Clock3 className="mt-0.5 size-3.5 shrink-0" />
        Late check-ins require adviser acceptance and a separate waiver decision from the assigned
        course instructor.
      </p>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        Changing the approved Gantt schedule creates a new check-in schedule and invalidates prior
        sign-off for progression.
      </p>
    </section>
  );
}

WeeklyProgressCheckIns.propTypes = {
  project: PropTypes.object,
  isReadOnly: PropTypes.bool,
};
