import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import { useProjects } from '@/hooks/useProjects';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  ArrowRight,
  RotateCcw,
  Zap,
  LayoutGrid,
  X,
} from 'lucide-react';
import { ROLES, PROJECT_STATUSES } from '@cms/shared';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

/**
 * Task Categories for Institutional Review
 *
 * Replaces legacy flat titleStatus filter with workflow-driven queues:
 * - action_needed: Critical queue — pending proposal deliberation, defense endorsement, or revision
 * - all: Complete active cohort directory
 * - capstone_1: Phase 1 — Title Proposals & Proposal Defense
 * - capstone_2: Phase 2 — Chapters 1–3 Manuscripts & Midterm Defense
 * - capstone_3: Phase 3 — System Dev, Interactive Gantt & Prototype Progress
 * - capstone_4: Phase 4 — Final Defense, Dean ADM Sign-off & Archival
 */
const TASK_CATEGORIES = [
  {
    id: 'action_needed',
    label: 'Needs Action',
    icon: Zap,
    badgeVariant: 'warning',
    description: 'Awaiting instructor deliberation, review, or revision',
  },
  {
    id: 'all',
    label: 'All Capstones',
    icon: LayoutGrid,
    description: 'Complete active cohort directory',
  },
  {
    id: 'capstone_1',
    label: 'Phase 1: Title & Ch 1–3',
    phase: 1,
    icon: Sparkles,
    description: 'Title proposals, SDG mapping & proposal defense hearing',
  },
  {
    id: 'capstone_2',
    label: 'Phase 2: System Dev',
    phase: 2,
    icon: Layers,
    description: 'Prototype implementation, Gantt milestones & progress demo',
  },
  {
    id: 'capstone_3',
    label: 'Phase 3: Final & Journal',
    phase: 3,
    icon: GraduationCap,
    description: '5-Chapter manuscript, academic journal, Dean ADM sign-off & archival',
  },
];

const STATUS_FILTERS = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending Review', value: 'submitted' },
  { label: 'Approved', value: 'approved' },
  { label: 'Revision Required', value: 'revision_required' },
  { label: 'Draft', value: 'draft' },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, fetchUser } = useAuthStore();

  // Task Category Queue filter (from URL or default to 'action_needed' or 'all')
  const initialCategory = searchParams.get('category') || 'action_needed';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [titleStatus, setTitleStatus] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [page, setPage] = useState(1);
  const highlightedProjectRef = useRef(null);

  const filterParam = searchParams.get('filter');

  // Compute query payload based on active task category
  const queryFilters = useMemo(() => {
    const base = {
      excludeArchived: true,
      page,
      limit: 10,
      ...(search && { search }),
      ...(titleStatus && { titleStatus }),
      ...(academicYear && { academicYear }),
      ...(filterParam === 'advisees' && { adviserId: user?._id }),
      ...(filterParam === 'panel' && { panelistId: user?._id }),
      ...(filterParam === 'secretary' && { secretaryId: user?._id }),
    };

    if (activeCategory === 'action_needed') {
      base.actionNeeded = true;
    } else if (activeCategory === 'capstone_1') {
      base.capstonePhase = 1;
    } else if (activeCategory === 'capstone_2') {
      base.capstonePhase = 2;
    } else if (activeCategory === 'capstone_3' || activeCategory === 'capstone_4') {
      base.capstonePhase = 3;
    }

    return base;
  }, [activeCategory, search, titleStatus, academicYear, filterParam, user?._id, page]);

  // Main paginated query
  const { data, isLoading, error, refetch } = useProjects(queryFilters);

  // Background query across all projects for executive metric counters
  const { data: allProjectsData } = useProjects(
    {
      excludeArchived: true,
      limit: 100,
      ...(filterParam === 'advisees' && { adviserId: user?._id }),
      ...(filterParam === 'panel' && { panelistId: user?._id }),
      ...(filterParam === 'secretary' && { secretaryId: user?._id }),
    },
    {
      staleTime: 60 * 1000,
    },
  );

  const highlightedProjectId = searchParams.get('projectId') || '';

  useEffect(() => {
    if (!highlightedProjectId) return;
    highlightedProjectRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightedProjectId, data?.projects]);

  // Sync category in URL
  const handleSelectCategory = (categoryId) => {
    setActiveCategory(categoryId);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryId);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setTitleStatus('');
    setAcademicYear('');
    setActiveCategory('all');
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams, { replace: true });
  };

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

  // Filter out any archived items defensively
  const rawProjects = data?.projects || [];
  const projects = rawProjects.filter((project) => {
    const normalizedStatuses = [project.projectStatus, project.status]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value).trim().toLowerCase());
    return project.isArchived !== true && !normalizedStatuses.includes('archived');
  });

  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  // Calculate live cohort counts from allProjectsData
  const allProjects = (allProjectsData?.projects || []).filter((p) => !p.isArchived);
  const metricCounts = {
    total: allProjects.length,
    actionNeeded: allProjects.filter((p) =>
      ['submitted', 'revision_required', 'pending_modification'].includes(p.titleStatus),
    ).length,
    phase1: allProjects.filter((p) => Number(p.capstonePhase ?? 1) === 1).length,
    phase2: allProjects.filter((p) => Number(p.capstonePhase ?? 1) === 2).length,
    phase3: allProjects.filter((p) => Number(p.capstonePhase ?? 1) >= 3).length,
  };

  // Available academic years for quick dropdown
  const availableAcademicYears = Array.from(
    new Set(allProjects.map((p) => p.academicYear).filter(Boolean)),
  )
    .sort()
    .reverse();

  const isInstructor = user.role === ROLES.INSTRUCTOR;
  const pageTitle =
    filterParam === 'advisees'
      ? 'Adviser Reviews'
      : filterParam === 'panel'
        ? 'Panel Review'
        : filterParam === 'secretary'
          ? 'Secretary Review'
          : isInstructor
            ? 'Instructor Review'
            : 'Projects Review';

  const hasActiveFilters = Boolean(
    search || titleStatus || academicYear || activeCategory !== 'all',
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* 1. INSTITUTIONAL HEADER & TITLE BAR                       */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-amber-500/20 via-primary/15 to-primary/5 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
                >
                  Evaluation Studio
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Review candidate proposals, evaluate defense progression, and manage committee
                oversight.
              </p>
            </div>
          </div>

          {/* Quick Refresh & Cohort Count */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/50">
              <strong className="text-foreground">{metricCounts.total}</strong> active project
              {metricCounts.total !== 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-xs gap-1.5"
              title="Refresh project listings"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. EXECUTIVE KPI METRIC OVERVIEW STRIP                    */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* 1. Action Needed */}
          <Card
            onClick={() => handleSelectCategory('action_needed')}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md border',
              activeCategory === 'action_needed'
                ? 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30'
                : 'border-border/70 hover:border-amber-500/40 bg-card',
            )}
          >
            <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <span className="relative flex h-2 w-2">
                    {metricCounts.actionNeeded > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <span>Needs Action</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {metricCounts.actionNeeded}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Awaiting deliberation</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* 2. Phase 1: Title Proposals & Ch 1–3 */}
          <Card
            onClick={() => handleSelectCategory('capstone_1')}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md border',
              activeCategory === 'capstone_1'
                ? 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30'
                : 'border-border/70 hover:border-amber-500/40 bg-card',
            )}
          >
            <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Title & Ch 1–3
                </span>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {metricCounts.phase1}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Capstone 1 proposals</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* 3. Phase 2: System Development & Progress */}
          <Card
            onClick={() => handleSelectCategory('capstone_2')}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md border',
              activeCategory === 'capstone_2'
                ? 'border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/30'
                : 'border-border/70 hover:border-blue-500/40 bg-card',
            )}
          >
            <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">System Dev</span>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {metricCounts.phase2}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Gantt & prototypes</p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <Layers className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Phase 3: Final Defense & Archival */}
          <Card
            onClick={() => handleSelectCategory('capstone_3')}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md border',
              activeCategory === 'capstone_3'
                ? 'border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                : 'border-border/70 hover:border-emerald-500/40 bg-card',
            )}
          >
            <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Final & Journal
                </span>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                  {metricCounts.phase3}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Oral defense & archival
                </p>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <GraduationCap className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* 3. PRIMARY TASK CATEGORY QUEUE FILTER TABS                */}
        {/* ========================================================= */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60">
          {TASK_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                  isActive
                    ? 'bg-background text-foreground shadow-xs border border-border/80'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                )}
                title={cat.description}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    cat.id === 'action_needed' && 'text-amber-500',
                    cat.id === 'capstone_1' && 'text-amber-500',
                    cat.id === 'capstone_2' && 'text-blue-500',
                    cat.id === 'capstone_3' && 'text-emerald-500',
                  )}
                />
                <span>{cat.label}</span>
                {cat.id === 'action_needed' && metricCounts.actionNeeded > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    {metricCounts.actionNeeded}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 4. SECONDARY SEARCH, STATUS, AND COHORT CONTROLS          */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by team name, title, or keywords…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-card border-border/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Quick Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={titleStatus}
                onChange={(e) => {
                  setTitleStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 pr-8 text-xs rounded-md bg-card border border-border/70 text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year Cohort Filter (if multiple available) */}
            {availableAcademicYears.length > 1 && (
              <div className="relative">
                <select
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-3 pr-8 text-xs rounded-md bg-card border border-border/70 text-foreground shadow-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                >
                  <option value="">All Cohorts</option>
                  {availableAcademicYears.map((ay) => (
                    <option key={ay} value={ay}>
                      {ay}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Reset all search and category filters"
              >
                <RotateCcw className="h-3 w-3" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Results Counter Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            Showing <strong className="text-foreground">{projects.length}</strong> of{' '}
            <strong className="text-foreground">{pagination.total || projects.length}</strong>{' '}
            projects
            {activeCategory !== 'all' && (
              <span className="ml-1 text-primary">
                in {TASK_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
            )}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Error Alert */}
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

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading evaluation records…</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No projects found"
            description={
              hasActiveFilters
                ? 'No projects match your current category or search criteria. Try adjusting or clearing filters.'
                : 'Projects will appear here once teams initialize their capstone records.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
                  Clear Filters
                </Button>
              ) : null
            }
          />
        )}

        {/* ========================================================= */}
        {/* 5. REDESIGNED INSTITUTIONAL PROJECT CARDS                 */}
        {/* ========================================================= */}
        {!isLoading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((project) => {
              const isArchived =
                Boolean(project.isArchived) || project.projectStatus === PROJECT_STATUSES.ARCHIVED;
              const numericPhase = Number(project.capstonePhase ?? 1);
              const isProposalPhase = !isArchived && project.titleStatus !== 'approved';

              // Defensive Entity Prefix Normalization (AGENTS.md Rule 14)
              const rawTeamName = project.teamId?.name || 'Team';
              const cleanTeamName = rawTeamName.replace(/^Team\s+/i, '').trim();

              const proposalCount = Array.isArray(project.titleProposals)
                ? project.titleProposals.length
                : 0;

              // Display Title
              const displayTitle = isArchived
                ? project.title
                : isProposalPhase
                  ? `Team ${cleanTeamName} Title Proposal`
                  : project.title;

              // Priority / Action Needed Indicator
              const isActionNeeded =
                project.titleStatus === 'submitted' ||
                project.titleStatus === 'revision_required' ||
                project.titleStatus === 'pending_modification';

              // Phase Styling & Semantic Colors
              let phaseBadgeConfig = {
                label: `Capstone ${numericPhase}`,
                icon: Layers,
                className:
                  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
              };

              if (numericPhase === 1 || isProposalPhase) {
                phaseBadgeConfig = {
                  label: 'Phase 1: Title Defense',
                  icon: Sparkles,
                  className:
                    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
                };
              } else if (numericPhase === 2) {
                phaseBadgeConfig = {
                  label: 'Phase 2: Manuscripts',
                  icon: BookOpen,
                  className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
                };
              } else if (numericPhase === 3) {
                phaseBadgeConfig = {
                  label: 'Phase 3: System Dev',
                  icon: Layers,
                  className:
                    'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
                };
              } else if (numericPhase >= 4) {
                phaseBadgeConfig = {
                  label: 'Phase 4: Final Defense',
                  icon: GraduationCap,
                  className:
                    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
                };
              }

              // Contextual Callout Banner
              let calloutBanner = null;
              if (project.titleStatus === 'submitted') {
                calloutBanner = (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-xs">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>
                        {proposalCount} candidate proposal{proposalCount !== 1 ? 's' : ''} submitted
                      </strong>{' '}
                      — Awaiting instructor deliberation & rubric evaluation.
                    </span>
                  </div>
                );
              } else if (project.titleStatus === 'revision_required') {
                calloutBanner = (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 text-xs">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Title Revision Required</strong> — Awaiting updated title submission
                      from proponents.
                    </span>
                  </div>
                );
              } else if (project.titleStatus === 'approved') {
                calloutBanner = (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      <strong>Title Approved</strong> — Project unlocked for manuscript, prototype,
                      and defense workflow.
                    </span>
                  </div>
                );
              }

              // Proponent & Committee Metadata
              const members = project.teamId?.members || [];
              const leader = members.find((m) => m._id === project.teamId?.leaderId) || members[0];
              const leaderName = leader
                ? `${leader.firstName || ''} ${leader.lastName || ''}`.trim()
                : '';
              const memberCount = members.length;

              const adviser = project.adviserId;
              const adviserName = adviser
                ? `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim()
                : '';

              // Contextual Action Button Label
              let actionLabel = 'Review Project';
              if (isProposalPhase || numericPhase === 1) {
                actionLabel = 'Deliberate Proposals';
              } else if (numericPhase === 2) {
                actionLabel = 'Review Manuscript & ADM';
              } else if (numericPhase === 3) {
                actionLabel = 'Inspect Prototype & Gantt';
              } else if (numericPhase >= 4) {
                actionLabel = 'Review Final Defense';
              }

              const PhaseIcon = phaseBadgeConfig.icon;

              return (
                <Card
                  key={project._id}
                  ref={project._id === highlightedProjectId ? highlightedProjectRef : undefined}
                  onClick={() => navigate(`/projects/${project._id}`)}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer',
                    isActionNeeded && 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
                    project._id === highlightedProjectId && 'ring-2 ring-primary/40 bg-primary/5',
                  )}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
                    {/* 1. Top Badges & Metadata Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Phase Pill */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs',
                            phaseBadgeConfig.className,
                          )}
                        >
                          <PhaseIcon className="h-3 w-3 shrink-0" />
                          <span>{phaseBadgeConfig.label}</span>
                        </span>

                        {/* Academic Year & Section */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/80 text-muted-foreground border border-border/50 font-mono">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{project.academicYear || '2024-2025'}</span>
                          {project.sectionId?.name && <span>• {project.sectionId.name}</span>}
                        </span>

                        {/* Team Name */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-muted/80 text-muted-foreground border border-border/50 font-medium">
                          <Users className="h-3 w-3 shrink-0" />
                          <span>Team {cleanTeamName}</span>
                        </span>
                      </div>

                      {/* Right: Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isArchived && <TitleStatusBadge status={project.titleStatus} />}
                        <ProjectStatusBadge status={project.projectStatus} />
                      </div>
                    </div>

                    {/* 2. Main Title & Review Banner */}
                    <div className="space-y-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {displayTitle}
                        </h3>
                        {isProposalPhase && project.title && project.title !== displayTitle && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                            Candidate Focus: {project.title}
                          </p>
                        )}
                      </div>

                      {/* Review Context Callout Banner */}
                      {calloutBanner}
                    </div>

                    {/* 3. Bottom Roster, Adviser & Action Trigger Row */}
                    <div className="pt-2.5 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-muted-foreground">
                      {/* Roster & Adviser Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {/* Members */}
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          <span>
                            {leaderName ? (
                              <strong className="text-foreground">{leaderName} (Lead)</strong>
                            ) : (
                              'Team'
                            )}
                            {memberCount > 1 && (
                              <span>
                                {' '}
                                + {memberCount - 1} member{memberCount > 2 ? 's' : ''}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Adviser */}
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          {adviserName ? (
                            <span>
                              Adviser: <strong className="text-foreground">{adviserName}</strong>
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" /> Adviser Unassigned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Trigger Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-semibold gap-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0 self-end sm:self-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project._id}`);
                        }}
                      >
                        <span>{actionLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. PAGINATION CONTROLS                                    */}
        {/* ========================================================= */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <span className="text-xs font-mono text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
