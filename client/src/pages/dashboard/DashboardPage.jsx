import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import FacultyDashboardV2 from '@/components/dashboards/FacultyDashboard';
import InstructorDashboardV2 from '@/components/dashboards/InstructorDashboard';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';
import PageSkeleton from '@/components/ui/PageSkeleton';
import DefenseScheduleCalendar from '@/components/calendar/DefenseScheduleCalendar';

/**
 * DashboardPage — role-based dashboard shell.
 * Shows different summary cards depending on the user's role.
 */

function StudentDashboard({ user }) {
  const navigate = useNavigate();
  const { data: dashboardData, isLoading, isError, error } = useDashboard();

  const team = dashboardData?.team;
  const project = dashboardData?.project;
  const progressReport = dashboardData?.progressReport;
  const chapterProgress = dashboardData?.chapterProgress || [];
  const submissionHistory = dashboardData?.submissionHistory || [];
  const teamActivityTrail = dashboardData?.teamActivityTrail || [];
  const recentNotifications = dashboardData?.recentNotifications || [];

  const chapterStatusByNumber = new Map(
    chapterProgress.map((chapter) => [chapter.chapter, chapter]),
  );

  const derivedChapterProgress = [1, 2, 3, 4, 5].map((chapterNumber) => {
    const latestChapter = chapterStatusByNumber.get(chapterNumber);

    if (latestChapter?.status && latestChapter.status !== 'not_started') {
      return latestChapter;
    }

    if (project?.titleStatus !== 'approved') {
      return {
        chapter: chapterNumber,
        status: 'waiting_title_approval',
        version: 0,
        updatedAt: null,
      };
    }

    if (chapterNumber >= 4 && (project?.capstonePhase || 1) < 3) {
      return {
        chapter: chapterNumber,
        status: 'locked_capstone_phase',
        version: 0,
        updatedAt: null,
      };
    }

    if (chapterNumber > 1) {
      const previousChapter = chapterStatusByNumber.get(chapterNumber - 1);
      if (!isChapterApprovedLike(previousChapter?.status)) {
        return {
          chapter: chapterNumber,
          status: 'blocked_previous_chapter',
          version: 0,
          updatedAt: null,
        };
      }
    }

    return {
      chapter: chapterNumber,
      status: 'ready_to_upload',
      version: 0,
      updatedAt: null,
    };
  });

  const completedChapters = derivedChapterProgress.filter(
    (chapter) => chapter.status === 'approved',
  ).length;
  const chaptersInReview = derivedChapterProgress.filter((chapter) =>
    ['pending', 'under_review', 'revisions_required'].includes(chapter.status),
  ).length;
  const completionPercent =
    progressReport?.completionPercent ??
    (derivedChapterProgress.length
      ? Math.round((completedChapters / derivedChapterProgress.length) * 100)
      : 0);

  const calendarEvents = useMemo(() => {
    const events = [];
    if (project?.defenseSchedule?.scheduledAt) {
      events.push({
        id: `defense-${project._id}`,
        title: `${
          project.defenseSchedule.defenseType === 'proposal'
            ? 'Proposal Defense'
            : project.defenseSchedule.defenseType === 'midterm'
              ? 'Prototype Review'
              : 'Final Oral Defense'
        } — ${project.title || 'Capstone Project'}`,
        type: project.defenseSchedule.defenseType || 'proposal',
        date: new Date(project.defenseSchedule.scheduledAt).toISOString().split('T')[0],
        time: project.defenseSchedule.scheduledAt
          ? new Date(project.defenseSchedule.scheduledAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Scheduled Hearing',
        venue: project.defenseSchedule.venue || 'COT Defense Room / Virtual Meet',
        panel: project.defenseSchedule.panelists || [],
        status: 'scheduled',
      });
    }

    if (project?.deadlines) {
      const deadlineMap = [
        { key: 'proposalDeadline', label: 'Proposal Submission Deadline' },
        { key: 'chapter1Deadline', label: 'Chapter 1 Submission Deadline' },
        { key: 'chapter2Deadline', label: 'Chapter 2 Submission Deadline' },
        { key: 'chapter3Deadline', label: 'Chapter 3 Submission Deadline' },
        { key: 'chapter4Deadline', label: 'Chapter 4 Submission Deadline' },
        { key: 'chapter5Deadline', label: 'Chapter 5 Submission Deadline' },
        { key: 'finalDefenseDeadline', label: 'Final Defense Submission Deadline' },
      ];
      deadlineMap.forEach(({ key, label }) => {
        if (project.deadlines[key]) {
          events.push({
            id: `dl-${key}-${project._id}`,
            title: `${label} — ${project.title || 'Capstone Project'}`,
            type: 'deadline',
            date: new Date(project.deadlines[key]).toISOString().split('T')[0],
            time: '11:59 PM',
            venue: 'CMS Portal Submission',
            panel: [],
            status: 'scheduled',
          });
        }
      });
    }

    return events;
  }, [project]);

  useEffect(() => {
    if (user.role === ROLES.STUDENT && (!user.sectionId || !user.instructorId)) {
      toast.info('Complete your profile', {
        description: 'Please set your section and instructor to get started.',
        action: { label: 'Go to Profile', onClick: () => navigate('/profile') },
        duration: 8000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Linear-Grade Command Header */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user.firstName}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {team
                ? 'Team highlights, project status, and the next actions for your capstone journey.'
                : 'Phase 0: Team Formation & Academic Onboarding'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!team && (
              <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Phase 0 Active
              </Badge>
            )}
            {project?.projectStatus && (
              <Badge variant="info">{formatProjectStatus(project.projectStatus)}</Badge>
            )}
            {project?.titleStatus && (
              <Badge variant={getTitleStatusVariant(project.titleStatus)}>
                {formatTitleStatus(project.titleStatus)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <Card className="rounded-xl border-border/60">
          <CardContent className="flex items-center gap-3 p-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading student dashboard insights...</p>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="rounded-xl border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                Unable to load complete dashboard data.
              </p>
              <p className="text-sm text-destructive/80 mt-0.5">
                {error?.response?.data?.error?.message || error?.message || 'Please try again.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !team && (
        <>
          {/* Phase 0 Onboarding Stepper - Balanced 4-Column Grid */}
          <Card className="overflow-hidden rounded-xl border-border/60 bg-card shadow-xs">
            <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Capstone Phase 0: Getting Started
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Follow these steps to unlock team collaboration, title defense proposals, and
                      project tracking.
                    </CardDescription>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/teams')} className="gap-1.5 shadow-xs">
                  <UsersRound className="h-4 w-4" />
                  Assemble Team
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                {/* Step 1: Profile Setup */}
                <div
                  className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-xs ${
                    user.sectionId && user.instructorId
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-amber-500/40 bg-amber-500/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Step 1
                      </span>
                      {user.sectionId && user.instructorId ? (
                        <Badge variant="success" className="gap-1 text-[10px]">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          Action Required
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 shadow-2xs">
                        <UserCheck className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">Profile Binding</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Set your Academic Year, Section, and assigned Capstone Instructor.
                    </p>
                  </div>
                  {(!user.sectionId || !user.instructorId) && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => navigate('/profile')}
                      className="mt-5 w-full"
                    >
                      Complete Profile
                    </Button>
                  )}
                </div>

                {/* Step 2: Assemble Team */}
                <div className="relative flex flex-col justify-between rounded-xl border-2 border-primary/40 bg-primary/5 p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Step 2 • Active
                      </span>
                      <Badge variant="info" className="text-[10px]">
                        Current Step
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 shadow-2xs">
                        <UsersRound className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">Team Formation</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Form a group of 2–4 members, assign 5 standardized project roles, and lock
                      your roster.
                    </p>
                  </div>
                  <Button
                    size="xs"
                    onClick={() => navigate('/teams')}
                    className="mt-5 w-full gap-1"
                  >
                    Go to Teams <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Step 3: Title Proposal */}
                <div className="relative flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Step 3
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Phase 1
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 shadow-2xs">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">Title Defense</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Draft 1–10 title proposals tagged with SDGs &amp; IT disciplines with
                      similarity pre-scan.
                    </p>
                  </div>
                  <span className="mt-5 text-[11px] font-medium text-muted-foreground italic">
                    Unlocks after team roster lock
                  </span>
                </div>

                {/* Step 4: Committee & Defense */}
                <div className="relative flex flex-col justify-between rounded-xl border border-border/60 bg-muted/20 p-5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Step 4
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        Phase 1–4
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 shadow-2xs">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">Committee Defense</h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Adviser, Chair, Secretary, and Panelists appointed by Instructor to evaluate
                      milestones.
                    </p>
                  </div>
                  <span className="mt-5 text-[11px] font-medium text-muted-foreground italic">
                    Appointed by Course Instructor
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Announcements (if any) */}
          {recentNotifications.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Recent Announcements &amp; Updates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentNotifications.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-2xs"
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {note.title || 'Notification'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {note.message || 'No details provided.'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <DefenseScheduleCalendar events={calendarEvents} />
        </>
      )}

      {!isLoading && team && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              icon={UsersRound}
              title="Team Members"
              metric={team?.memberCount ?? team?.members?.length ?? 0}
              description={team.name}
              accent="text-sky-600 dark:text-sky-400"
            />
            <Card className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-colors hover:border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Progress
                  </span>
                </div>
                <Badge variant="success" className="text-[10px] font-semibold">
                  {completedChapters}/5 Approved
                </Badge>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {completionPercent}%
                  </p>
                  <span className="text-xs text-muted-foreground font-medium">
                    {completedChapters}/{derivedChapterProgress.length || 5} chapters approved
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-3">
                  {[1, 2, 3, 4, 5].map((ch) => {
                    const chapterInfo = derivedChapterProgress.find((c) => c.chapter === ch);
                    const isApproved = isChapterApprovedLike(chapterInfo?.status);
                    const isInProgress = [
                      'pending',
                      'under_review',
                      'revisions_required',
                      'ready_to_upload',
                    ].includes(chapterInfo?.status);
                    return (
                      <div
                        key={ch}
                        className={`h-2 rounded-full transition-all ${
                          isApproved
                            ? 'bg-emerald-500 shadow-2xs shadow-emerald-500/20'
                            : isInProgress
                              ? 'bg-amber-500/80 animate-pulse'
                              : 'bg-muted/70'
                        }`}
                        title={`Chapter ${ch}: ${formatChapterStatus(chapterInfo?.status || 'not_started')}`}
                      />
                    );
                  })}
                </div>
              </div>
            </Card>
            <DashboardCard
              icon={Bell}
              title="Recent Updates"
              metric={recentNotifications.length}
              description="Latest announcements and status changes"
              accent="text-amber-600 dark:text-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Team Highlights & Important Information (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Team Highlights */}
              <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Team Highlights
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Key details about your group and collaboration readiness.
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={team.isLocked ? 'warning' : 'success'}>
                      {team.isLocked ? 'Locked Team' : 'Open Team'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Current Team
                      </p>
                      <p className="text-base font-bold text-foreground mt-0.5">{team.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                      {team?.memberCount ?? team?.members?.length ?? 0} Members Enrolled
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Team Members
                      </p>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Standardized Capstone Roles
                      </span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {team.members?.map((member) => {
                        const memberId = String(member._id || member.id || '');
                        const assignedRole =
                          project?.memberRoleAssignments?.find(
                            (ra) => String(ra.userId?._id || ra.userId) === memberId,
                          )?.professionalTitle || 'Team Member';
                        return (
                          <div
                            key={member._id}
                            className="flex flex-col justify-between gap-1.5 rounded-lg border border-border/60 bg-background/50 p-3 shadow-2xs transition-colors hover:border-primary/40"
                          >
                            <span className="text-sm font-semibold text-foreground truncate">
                              {member.firstName} {member.lastName}
                            </span>
                            <span className="inline-flex w-fit items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {assignedRole}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Important Information */}
              <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Important Information
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Prioritized updates that may require action from your team.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatusPill
                      label="Chapters In Review"
                      value={chaptersInReview}
                      variant={chaptersInReview > 0 ? 'warning' : 'success'}
                    />
                    <StatusPill
                      label="Profile Setup"
                      value={user.sectionId && user.instructorId ? 'Complete' : 'Needs action'}
                      variant={user.sectionId && user.instructorId ? 'success' : 'destructive'}
                    />
                    <StatusPill
                      label="Team Readiness"
                      value={team?.isLocked ? 'Ready' : 'Still forming'}
                      variant={team?.isLocked ? 'success' : 'outline'}
                    />
                  </div>

                  {recentNotifications.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {recentNotifications.map((note) => (
                        <div
                          key={note._id}
                          className="rounded-lg border border-border/60 bg-background/50 p-3 shadow-2xs"
                        >
                          <p className="text-sm font-semibold text-foreground">
                            {note.title || 'Notification'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {note.message || 'No details provided.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-1">
                      No recent notifications yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Project Status & Defense Calendar (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Project Status */}
              <Card className="rounded-xl border border-border/60 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Clock3 className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        Project Status
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Live snapshot of your capstone project and chapter pipeline.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {project ? (
                    <>
                      <div className="space-y-1 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Project Title
                        </p>
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">
                          {project.title}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">
                            Completion Progress
                          </span>
                          <span className="font-mono font-bold text-foreground tabular-nums">
                            {completionPercent}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${completionPercent}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 pt-1">
                        {derivedChapterProgress.map((chapter) => (
                          <div
                            key={chapter.chapter}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-foreground">
                              Chapter {chapter.chapter}
                            </span>
                            <Badge
                              variant={getChapterStatusVariant(chapter.status)}
                              className="text-[10px] font-semibold"
                            >
                              {formatChapterStatus(chapter.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            project?.titleStatus === 'approved' ? '/project' : '/project/approval',
                          )
                        }
                        className="w-full mt-2 shadow-xs"
                      >
                        View Project Workspace
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 py-2">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your team has no project registered yet. Once your title is submitted, this
                        panel will show milestone progress and submission status.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/projects')}
                        className="w-full shadow-xs"
                      >
                        Go to Projects
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Defense Schedule Calendar */}
              <DefenseScheduleCalendar events={calendarEvents} />
            </div>
          </div>
        </>
      )}

      {!isLoading && project && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-7 rounded-xl border border-border/60 bg-card shadow-xs">
            <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Submission History With Versioning
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Full version history for your team project submissions, including plagiarism
                    status.
                  </CardDescription>
                </div>
                {submissionHistory.length > 0 && (
                  <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                    {submissionHistory.length} total
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {submissionHistory.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No submissions recorded yet.
                  </p>
                )}

                {submissionHistory.slice(0, 12).map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-lg border border-border/60 bg-background/50 p-3.5 shadow-2xs hover:border-border transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {formatSubmissionLabel(entry)}
                      </Badge>
                      <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                        v{entry.version}
                      </Badge>
                      <Badge
                        variant={getChapterStatusVariant(entry.status)}
                        className="text-[10px]"
                      >
                        {formatChapterStatus(entry.status)}
                      </Badge>
                      {entry.plagiarismStatus && (
                        <Badge variant="info" className="text-[10px]">
                          Plagiarism: {formatChapterStatus(entry.plagiarismStatus)}
                        </Badge>
                      )}
                      {typeof entry.originalityScore === 'number' && (
                        <Badge variant="success" className="font-mono text-[10px] tabular-nums">
                          Originality: {Math.round(entry.originalityScore)}%
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-muted-foreground">
                      {entry.fileName || 'Untitled file'} •{' '}
                      {formatDateTime(entry.submittedAt || entry.updatedAt)}
                    </div>
                  </div>
                ))}

                {submissionHistory.length > 12 && (
                  <p className="text-xs font-medium text-muted-foreground pt-1 text-center">
                    Showing latest 12 entries out of {submissionHistory.length}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5 rounded-xl border border-border/60 bg-card shadow-xs">
            <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Team Action Audit Trail
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Team/project actions only. Private user and administrative events are excluded.
                  </CardDescription>
                </div>
                {teamActivityTrail.length > 0 && (
                  <Badge variant="outline" className="font-mono text-[11px] tabular-nums">
                    {teamActivityTrail.length} events
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {teamActivityTrail.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No team audit entries recorded yet.
                  </p>
                )}

                {teamActivityTrail.slice(0, 12).map((entry) => (
                  <div
                    key={entry._id}
                    className="rounded-lg border border-border/60 bg-background/50 p-3.5 shadow-2xs hover:border-border transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {formatAuditAction(entry.action)}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {entry.actorRole || 'unknown'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-foreground leading-relaxed">
                      {entry.description || 'No action description.'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatActorName(entry.actor)} • {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                ))}

                {teamActivityTrail.length > 12 && (
                  <p className="text-xs text-muted-foreground pt-1 text-center">
                    Showing latest 12 entries out of {teamActivityTrail.length}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InstructorDashboard({ user: _user }) {
  return <InstructorDashboardV2 />;
}

function FacultyDashboard({ user }) {
  return <FacultyDashboardV2 user={user} />;
}

function DashboardCard({ icon: Icon, title, metric, description, accent = 'text-primary' }) {
  return (
    <Card className="rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-colors hover:border-border">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 ${accent}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      <div>
        <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {metric}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}

function StatusPill({ label, value, variant }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/50 p-3 shadow-2xs">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">
        <Badge variant={variant} className="font-medium text-xs">
          {value}
        </Badge>
      </div>
    </div>
  );
}

function formatTitleStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatProjectStatus(status) {
  return String(status || 'not_started')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatChapterStatus(status) {
  const workflowLabels = {
    waiting_title_approval: 'Waiting Title Approval',
    locked_capstone_phase: 'Locked by Capstone Phase',
    blocked_previous_chapter: 'Blocked by Previous Chapter',
    ready_to_upload: 'Ready to Upload',
    not_started: 'Not Started',
  };

  if (workflowLabels[status]) {
    return workflowLabels[status];
  }

  return String(status || 'not_started')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTitleStatusVariant(status) {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'submitted':
      return 'info';
    default:
      return 'outline';
  }
}

function getChapterStatusVariant(status) {
  switch (status) {
    case 'approved':
    case 'accepted':
    case 'locked':
      return 'success';
    case 'rejected':
      return 'destructive';
    case 'pending':
    case 'under_review':
    case 'waiting_title_approval':
      return 'warning';
    case 'revisions_required':
    case 'ready_to_upload':
      return 'info';
    case 'locked_capstone_phase':
    case 'blocked_previous_chapter':
      return 'secondary';
    default:
      return 'outline';
  }
}

function isChapterApprovedLike(status) {
  return ['approved', 'accepted', 'locked'].includes(status);
}

function formatSubmissionLabel(entry) {
  if (entry?.chapter) return `Chapter ${entry.chapter}`;
  return formatChapterStatus(entry?.type || 'submission');
}

function formatAuditAction(action) {
  return String(action || 'event')
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActorName(actor) {
  if (!actor) return 'System';
  const fullName = `${actor.firstName || ''} ${actor.lastName || ''}`.trim();
  return fullName || 'Unknown actor';
}

function formatDateTime(value) {
  if (!value) return 'Unknown time';
  return new Date(value).toLocaleString();
}

export default function DashboardPage() {
  const { user, fetchUser } = useAuthStore();

  // Restore session on mount if user isn't loaded yet
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  if (!user) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case ROLES.INSTRUCTOR:
        return <InstructorDashboard user={user} />;
      case ROLES.FACULTY:
      case ROLES.ADVISER:
      case ROLES.PANELIST:
        return <FacultyDashboard user={user} />;
      case ROLES.STUDENT:
      default:
        return <StudentDashboard user={user} />;
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
}
