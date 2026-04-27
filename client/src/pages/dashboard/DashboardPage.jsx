import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import FacultyDashboardV2 from '@/components/dashboards/FacultyDashboard';
import InstructorDashboardV2 from '@/components/dashboards/InstructorDashboard';
import { AlertTriangle, Bell, CheckCircle2, Clock3, FolderKanban, UsersRound } from 'lucide-react';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (!user.sectionId || !user.instructorId) {
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
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user.firstName}!
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              Team highlights, project status, and the next actions for your capstone journey.
            </p>
          </div>
          <div className="flex items-center gap-2">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          icon={UsersRound}
          title="Team Members"
          metric={team?.memberCount ?? 0}
          description={team ? team.name : 'No team assigned yet'}
          accent="text-sky-600"
        />
        <DashboardCard
          icon={CheckCircle2}
          title="Progress"
          metric={`${completionPercent}%`}
          description={`${completedChapters}/${derivedChapterProgress.length || 5} chapters approved`}
          accent="text-emerald-600"
        />
        <DashboardCard
          icon={Bell}
          title="Recent Updates"
          metric={recentNotifications.length}
          description="Latest announcements and status changes"
          accent="text-amber-600"
        />
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading student dashboard insights...</p>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">
                Unable to load complete dashboard data.
              </p>
              <p className="text-sm text-destructive/80">
                {error?.response?.data?.error?.message || error?.message || 'Please try again.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderKanban className="h-5 w-5 text-sky-600" />
                Team Highlights
              </CardTitle>
              <CardDescription>
                Key details about your group and collaboration readiness.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {team ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Team</p>
                      <p className="text-base font-semibold">{team.name}</p>
                    </div>
                    <Badge variant={team.isLocked ? 'warning' : 'success'}>
                      {team.isLocked ? 'Locked Team' : 'Open Team'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Members</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {team.members?.map((member) => (
                        <div
                          key={member._id}
                          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          {member.firstName} {member.lastName}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    You are not assigned to a team yet. Join or create a team to unlock project
                    tracking.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/teams')}>
                    Go to Teams
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="h-5 w-5 text-violet-600" />
                Project Status
              </CardTitle>
              <CardDescription>
                Live snapshot of your capstone project and chapter pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project ? (
                <>
                  <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Project Title
                    </p>
                    <p className="line-clamp-2 text-sm font-semibold">{project.title}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold">{completionPercent}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {derivedChapterProgress.map((chapter) => (
                      <div
                        key={chapter.chapter}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span>Chapter {chapter.chapter}</span>
                        <Badge variant={getChapterStatusVariant(chapter.status)}>
                          {formatChapterStatus(chapter.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/projects')}
                    className="w-full"
                  >
                    View Project Workspace
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your team has no project registered yet. Once your title is submitted, this panel
                  will show milestone progress and submission status.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Important Information</CardTitle>
            <CardDescription>
              Prioritized updates that may require action from your team.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
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
              <div className="space-y-2">
                {recentNotifications.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-md border border-border bg-background px-3 py-2"
                  >
                    <p className="text-sm font-medium">{note.title || 'Notification'}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.message || 'No details provided.'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent notifications yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && project && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader>
              <CardTitle className="text-lg">Submission History With Versioning</CardTitle>
              <CardDescription>
                Full version history for your team project submissions, including plagiarism status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {submissionHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">No submissions recorded yet.</p>
              )}

              {submissionHistory.slice(0, 12).map((entry) => (
                <div key={entry._id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatSubmissionLabel(entry)}</Badge>
                    <Badge variant="secondary">v{entry.version}</Badge>
                    <Badge variant={getChapterStatusVariant(entry.status)}>
                      {formatChapterStatus(entry.status)}
                    </Badge>
                    {entry.plagiarismStatus && (
                      <Badge variant="info">
                        Plagiarism: {formatChapterStatus(entry.plagiarismStatus)}
                      </Badge>
                    )}
                    {typeof entry.originalityScore === 'number' && (
                      <Badge variant="success">
                        Originality: {Math.round(entry.originalityScore)}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {entry.fileName || 'Untitled file'} •{' '}
                    {formatDateTime(entry.submittedAt || entry.updatedAt)}
                  </div>
                </div>
              ))}

              {submissionHistory.length > 12 && (
                <p className="text-xs text-muted-foreground">
                  Showing latest 12 entries out of {submissionHistory.length}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Team Action Audit Trail</CardTitle>
              <CardDescription>
                Team/project actions only. Private user and administrative events are excluded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamActivityTrail.length === 0 && (
                <p className="text-sm text-muted-foreground">No team audit entries recorded yet.</p>
              )}

              {teamActivityTrail.slice(0, 12).map((entry) => (
                <div key={entry._id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatAuditAction(entry.action)}</Badge>
                    <Badge variant="secondary">{entry.actorRole || 'unknown'}</Badge>
                  </div>
                  <p className="mt-2 text-sm">{entry.description || 'No action description.'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatActorName(entry.actor)} • {formatDateTime(entry.createdAt)}
                  </p>
                </div>
              ))}

              {teamActivityTrail.length > 12 && (
                <p className="text-xs text-muted-foreground">
                  Showing latest 12 entries out of {teamActivityTrail.length}.
                </p>
              )}
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
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <div className={`rounded-md bg-muted p-2 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-1 text-2xl font-bold leading-none">{metric}</p>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StatusPill({ label, value, variant }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">
        <Badge variant={variant}>{value}</Badge>
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case ROLES.INSTRUCTOR:
        return <InstructorDashboard user={user} />;
      case ROLES.ADVISER:
        return <FacultyDashboard user={user} />;
      case ROLES.PANELIST:
        return <FacultyDashboard user={user} />;
      case ROLES.STUDENT:
      default:
        return <StudentDashboard user={user} />;
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
}
