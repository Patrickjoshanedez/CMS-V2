import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import { useProjects } from '@/hooks/useProjects';
import { Search, ChevronLeft, ChevronRight, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { ROLES, PROJECT_STATUSES } from '@cms/shared';

/**
 * ProjectsPage — Faculty view of all capstone projects.
 *
 * Supports search, pagination, and filtering by title status.
 * Instructors see all projects; advisers/panelists see their assigned ones.
 */

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending Review', value: 'submitted' },
  { label: 'Draft', value: 'draft' },
  { label: 'Approved', value: 'approved' },
  { label: 'Revision Required', value: 'revision_required' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, fetchUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [titleStatus, setTitleStatus] = useState('');
  const [page, setPage] = useState(1);
  const highlightedProjectRef = useRef(null);

  const filters = {
    ...(search && { search }),
    ...(titleStatus && { titleStatus }),
    page,
    limit: 10,
  };

  const { data, isLoading, error, refetch } = useProjects(filters);
  const highlightedProjectId = searchParams.get('projectId') || '';

  useEffect(() => {
    if (!highlightedProjectId) return;
    highlightedProjectRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightedProjectId, data?.projects]);

  if (!user) {
    fetchUser();
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const projects = data?.projects || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  const pageTitle =
    user.role === ROLES.INSTRUCTOR
      ? 'Instructor Review'
      : user.role === ROLES.ADVISER
        ? 'Adviser Review'
        : 'Instructor Review';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{pageTitle}</h3>
          <p className="text-muted-foreground">
            Review proposals, submissions — approve, request revision, reject, and add remarks.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or keyword…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={titleStatus === f.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTitleStatus(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load projects'}
            </AlertDescription>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => refetch()}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No projects found</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {search || titleStatus
                ? 'Try adjusting your filters.'
                : 'Projects will appear here once students create them.'}
            </p>
          </div>
        )}

        {/* Project list */}
        {!isLoading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((project) => {
              const isArchived =
                Boolean(project.isArchived) || project.projectStatus === PROJECT_STATUSES.ARCHIVED;
              const isProposalPhase = !isArchived && project.titleStatus !== 'approved';
              const teamName = project.teamId?.name || 'Team';
              const proposalCount = Array.isArray(project.titleProposals)
                ? project.titleProposals.length
                : 0;
              const displayTitle = isArchived
                ? project.title
                : isProposalPhase
                  ? `${teamName} Title Proposal`
                  : project.title;

              return (
                <Card
                  key={project._id}
                  ref={project._id === highlightedProjectId ? highlightedProjectRef : undefined}
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    project._id === highlightedProjectId
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : ''
                  }`}
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-semibold">{displayTitle}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{project.academicYear}</span>
                        <span>•</span>
                        <span>
                          {isArchived
                            ? 'Archived'
                            : isProposalPhase
                              ? 'Proposal Phase'
                              : `Capstone ${project.capstonePhase}`}
                        </span>
                        {project.teamId?.name && (
                          <>
                            <span>•</span>
                            <span>{project.teamId.name}</span>
                          </>
                        )}
                      </div>
                      {/* Pending proposals indicator */}
                      {isProposalPhase && proposalCount > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {project.titleStatus === 'submitted'
                              ? `${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} pending review`
                              : project.titleStatus === 'draft'
                                ? `${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} in draft`
                                : project.titleStatus === 'revision_required'
                                  ? `${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} — revision required`
                                  : `${proposalCount} proposal${proposalCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-shrink-0 items-center gap-2">
                      {!isArchived && <TitleStatusBadge status={project.titleStatus} />}
                      <ProjectStatusBadge status={project.projectStatus} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
