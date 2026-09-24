import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import ProjectCohortCard from '@/components/projects/ProjectCohortCard';
import { useProjects } from '@/hooks/useProjects';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  RotateCcw,
  Zap,
  LayoutGrid,
  X,
} from 'lucide-react';
import { ROLES, TITLE_STATUSES } from '@cms/shared';
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
    label: 'Phase 1: Title Defense',
    phase: 1,
    icon: Sparkles,
    description: 'Title proposals, SDG mapping & proposal defense hearing',
  },
  {
    id: 'capstone_2',
    label: 'Phase 2: Manuscripts',
    phase: 2,
    icon: BookOpen,
    description: 'Chapters 1–3 manuscripts, midterm defense & ADM v1 sign-off',
  },
  {
    id: 'capstone_3',
    label: 'Phase 3: System Dev',
    phase: 3,
    icon: Layers,
    description: 'Prototype implementation, Gantt milestones & progress demo',
  },
  {
    id: 'capstone_4',
    label: 'Phase 4: Final Defense',
    phase: 4,
    icon: GraduationCap,
    description: '5-Chapter manuscript, academic journal, Dean ADM sign-off & archival',
  },
];

const KPI_METRIC_CONFIG = [
  {
    id: 'action_needed',
    label: 'Needs Action',
    countKey: 'actionNeeded',
    subtitle: 'Awaiting deliberation',
    icon: Zap,
    colorClasses: {
      active: 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30',
      hover: 'hover:border-amber-500/40',
      badgeText: 'text-amber-600 dark:text-amber-400',
      iconBox: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    },
    hasPing: true,
  },
  {
    id: 'capstone_1',
    label: 'Title Defense',
    countKey: 'phase1',
    subtitle: 'Capstone 1 proposals',
    icon: Sparkles,
    colorClasses: {
      active: 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/30',
      hover: 'hover:border-amber-500/40',
      badgeText: 'text-muted-foreground',
      iconBox: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    },
  },
  {
    id: 'capstone_2',
    label: 'Manuscripts',
    countKey: 'phase2',
    subtitle: 'Ch 1–3 & ADM v1',
    icon: BookOpen,
    colorClasses: {
      active: 'border-blue-500/60 bg-blue-500/10 ring-2 ring-blue-500/30',
      hover: 'hover:border-blue-500/40',
      badgeText: 'text-muted-foreground',
      iconBox: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    },
  },
  {
    id: 'capstone_3',
    label: 'System Dev',
    countKey: 'phase3',
    subtitle: 'Gantt & prototypes',
    icon: Layers,
    colorClasses: {
      active: 'border-indigo-500/60 bg-indigo-500/10 ring-2 ring-indigo-500/30',
      hover: 'hover:border-indigo-500/40',
      badgeText: 'text-muted-foreground',
      iconBox: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
    },
  },
  {
    id: 'capstone_4',
    label: 'Final Defense',
    countKey: 'phase4',
    subtitle: 'Oral defense & archival',
    icon: GraduationCap,
    colorClasses: {
      active: 'border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/30',
      hover: 'hover:border-emerald-500/40',
      badgeText: 'text-muted-foreground',
      iconBox: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    },
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

  // Smoothly redirect students attempting to access cohort review to their own project
  useEffect(() => {
    if (user && user.role === ROLES.STUDENT) {
      navigate('/project', { replace: true });
    }
  }, [user, navigate]);

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
    } else if (activeCategory === 'capstone_3') {
      base.capstonePhase = 3;
    } else if (activeCategory === 'capstone_4') {
      base.capstonePhase = 4;
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
  const handleSelectCategory = useCallback(
    (categoryId) => {
      setActiveCategory(categoryId);
      setPage(1);
      const newParams = new URLSearchParams(searchParams);
      if (categoryId === 'all') {
        newParams.delete('category');
      } else {
        newParams.set('category', categoryId);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearch('');
    setTitleStatus('');
    setAcademicYear('');
    setActiveCategory('all');
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleNavigateProject = useCallback(
    (id) => {
      navigate(`/projects/${id}`);
    },
    [navigate],
  );

  // Filter out any archived items defensively (memoized to prevent re-filter on renders)
  const projects = useMemo(() => {
    const raw = data?.projects || [];
    return raw.filter((project) => {
      const normalizedStatuses = [project.projectStatus, project.status]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).trim().toLowerCase());
      return project.isArchived !== true && !normalizedStatuses.includes('archived');
    });
  }, [data?.projects]);

  const pagination = data?.pagination || { page: 1, totalPages: 1 };

  // Calculate live cohort counts from allProjectsData in a single O(N) pass
  const metricCounts = useMemo(() => {
    const active = (allProjectsData?.projects || []).filter((p) => !p.isArchived);
    const initial = {
      total: active.length,
      actionNeeded: 0,
      phase1: 0,
      phase2: 0,
      phase3: 0,
      phase4: 0,
    };

    return active.reduce((acc, p) => {
      if (
        p.titleStatus === TITLE_STATUSES.SUBMITTED ||
        p.titleStatus === TITLE_STATUSES.REVISION_REQUIRED ||
        p.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION
      ) {
        acc.actionNeeded += 1;
      }
      const phaseNum = Number(p.capstonePhase ?? 1);
      if (phaseNum === 1) acc.phase1 += 1;
      else if (phaseNum === 2) acc.phase2 += 1;
      else if (phaseNum === 3) acc.phase3 += 1;
      else if (phaseNum >= 4) acc.phase4 += 1;
      return acc;
    }, initial);
  }, [allProjectsData?.projects]);

  // Available academic years for quick dropdown (memoized)
  const availableAcademicYears = useMemo(() => {
    const active = (allProjectsData?.projects || []).filter((p) => !p.isArchived);
    return Array.from(new Set(active.map((p) => p.academicYear).filter(Boolean)))
      .sort()
      .reverse();
  }, [allProjectsData?.projects]);

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
        {/* 2. EXECUTIVE KPI METRIC OVERVIEW STRIP (DECLARATIVE)      */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {KPI_METRIC_CONFIG.map((kpi) => {
            const Icon = kpi.icon;
            const count = metricCounts[kpi.countKey] || 0;
            const isActive = activeCategory === kpi.id;
            return (
              <Card
                key={kpi.id}
                onClick={() => handleSelectCategory(kpi.id)}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md border bg-card',
                  isActive
                    ? kpi.colorClasses.active
                    : cn('border-border/70', kpi.colorClasses.hover),
                )}
              >
                <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                  <div>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-[11px] font-medium',
                        kpi.colorClasses.badgeText,
                      )}
                    >
                      {kpi.hasPing && (
                        <span className="relative flex h-2 w-2">
                          {count > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          )}
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                      <span>{kpi.label}</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                      {count}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{kpi.subtitle}</p>
                  </div>
                  <div
                    className={cn(
                      'h-9 w-9 rounded-lg border flex items-center justify-center shrink-0',
                      kpi.colorClasses.iconBox,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
                    cat.id === 'capstone_3' && 'text-indigo-500',
                    cat.id === 'capstone_4' && 'text-emerald-500',
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
        {/* 5. REDESIGNED INSTITUTIONAL PROJECT CARDS (MEMOIZED)      */}
        {/* ========================================================= */}
        {!isLoading && projects.length > 0 && (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCohortCard
                key={project._id}
                project={project}
                isHighlighted={project._id === highlightedProjectId}
                highlightedRef={highlightedProjectRef}
                onNavigate={handleNavigateProject}
              />
            ))}
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
