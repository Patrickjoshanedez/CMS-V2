import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Archive, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useArchiveSearch } from '@/hooks/useProjects';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);
const VIEW_STORAGE_KEY = 'archive-view-mode';
const VIEW_OPTIONS = [
  { value: 'extraLarge', label: 'Extra large icons' },
  { value: 'large', label: 'Large icons' },
  { value: 'medium', label: 'Medium icons' },
  { value: 'small', label: 'Small icons' },
  { value: 'list', label: 'List' },
  { value: 'details', label: 'Details' },
  { value: 'tiles', label: 'Tiles' },
  { value: 'content', label: 'Content' },
];
const ICON_VIEW_MODES = new Set(['extraLarge', 'large', 'medium', 'small']);

export default function ArchiveSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [urlParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(() => urlParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => urlParams.get('q') || '');
  const [year, setYear] = useState(() => urlParams.get('y') || '');
  const [page, setPage] = useState(() => Number(urlParams.get('p') || 1));
  const [viewMode, setViewMode] = useState(() => {
    const queryView = urlParams.get('view');
    if (VIEW_OPTIONS.some((option) => option.value === queryView)) return queryView;
    if (typeof window === 'undefined') return 'content';
    const savedMode = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEW_OPTIONS.some((option) => option.value === savedMode) ? savedMode : 'content';
  });
  const limit = 9;

  const openProjectDetail = (projectId) => {
    navigate(`/projects/${projectId}`, {
      state: {
        fromArchive: true,
        returnTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const iconViewConfig = {
    extraLarge: {
      grid: 'grid-cols-1 md:grid-cols-2',
      titleClass: 'text-lg',
      abstractMax: 220,
      cardPadding: 'pb-4',
    },
    large: {
      grid: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      titleClass: 'text-base',
      abstractMax: 170,
      cardPadding: 'pb-3',
    },
    medium: {
      grid: 'grid-cols-2 lg:grid-cols-4',
      titleClass: 'text-sm',
      abstractMax: 100,
      cardPadding: 'pb-2',
    },
    small: {
      grid: 'grid-cols-2 md:grid-cols-5',
      titleClass: 'text-xs',
      abstractMax: 0,
      cardPadding: 'pb-2',
    },
  };

  // Debounce search query by 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery) next.set('q', debouncedQuery);
    if (year) next.set('y', year);
    if (viewMode) next.set('view', viewMode);
    if (page > 1) next.set('p', String(page));
    setSearchParams(next, { replace: true });
  }, [debouncedQuery, year, viewMode, page, setSearchParams]);

  // Map frontend names to backend schema: search (not query), academicYear as YYYY-YYYY (not year as number)
  const searchParams = useMemo(
    () => ({
      ...(debouncedQuery && { search: debouncedQuery }),
      ...(year && { academicYear: `${Number(year) - 1}-${year}` }),
      page,
      limit,
    }),
    [debouncedQuery, year, page, limit],
  );

  const { data, isLoading, error } = useArchiveSearch(searchParams);

  const projects = data?.projects ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, pages: 1 };

  const rangeStart = (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);

  const handleYearChange = (value) => {
    setYear(value);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setDebouncedQuery(query);
    setPage(1);
  };

  const currentIconView = iconViewConfig[viewMode] ?? iconViewConfig.medium;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Research Archive</h1>
          <p className="mt-1 text-muted-foreground">
            Search and browse past capstone projects for reference and research gap analysis.
          </p>
        </div>

        {/* Search Controls */}
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, keyword, or abstract..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Years</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y - 1}–{y}
              </option>
            ))}
          </select>

          <Button type="submit">
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>

          <div className="flex min-w-[220px] flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">View</span>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Archive result view mode"
            >
              {VIEW_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message || 'Something went wrong while fetching archived projects.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Archive className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No archived projects found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && projects.length > 0 && (
          <>
            {ICON_VIEW_MODES.has(viewMode) ? (
              <div className={`grid gap-3 ${currentIconView.grid}`}>
                {projects.map((project) => (
                  <Card
                    key={project._id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => openProjectDetail(project._id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className={`line-clamp-2 ${currentIconView.titleClass}`}>
                          {project.title}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {project.academicYear}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-1">
                        {project.teamId?.name ?? 'Unknown Team'}
                      </CardDescription>
                    </CardHeader>

                    {currentIconView.abstractMax > 0 && (
                      <CardContent className={currentIconView.cardPadding}>
                        <p className="text-xs text-muted-foreground">
                          {project.abstract
                            ? project.abstract.length > currentIconView.abstractMax
                              ? `${project.abstract.slice(0, currentIconView.abstractMax)}…`
                              : project.abstract
                            : 'No abstract available.'}
                        </p>
                      </CardContent>
                    )}

                    {project.keywords?.length > 0 && (
                      <CardFooter className="flex flex-wrap gap-1 pt-0">
                        {project.keywords.slice(0, viewMode === 'small' ? 1 : 3).map((kw) => (
                          <Badge key={kw} variant="outline" className="text-xs font-normal">
                            {kw}
                          </Badge>
                        ))}
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            ) : viewMode === 'details' ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_120px] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Title</span>
                  <span>Team</span>
                  <span>Year</span>
                  <span>Keywords</span>
                </div>
                <ul className="divide-y divide-border">
                  {projects.map((project) => (
                    <li key={project._id}>
                      <button
                        type="button"
                        className="grid w-full grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_110px_120px] gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                        onClick={() => openProjectDetail(project._id)}
                      >
                        <span className="line-clamp-1 text-sm font-medium text-foreground">
                          {project.title}
                        </span>
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {project.teamId?.name ?? 'Unknown Team'}
                        </span>
                        <span className="text-sm text-muted-foreground">{project.academicYear}</span>
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {project.keywords?.slice(0, 2).join(', ') || '-'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : viewMode === 'tiles' ? (
              <div className="grid gap-3 md:grid-cols-2">
                {projects.map((project) => (
                  <button
                    key={project._id}
                    type="button"
                    onClick={() => openProjectDetail(project._id)}
                    className="rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{project.title}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {project.teamId?.name ?? 'Unknown Team'}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        {project.academicYear}
                      </Badge>
                      {project.keywords?.slice(0, 2).map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[11px] font-normal">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : viewMode === 'content' ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {projects.map((project) => (
                    <li key={project._id}>
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() => openProjectDetail(project._id)}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="line-clamp-1 text-sm font-semibold text-foreground">
                              {project.title}
                            </p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {project.teamId?.name ?? 'Unknown Team'}
                            </p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {project.abstract
                                ? project.abstract.length > 120
                                  ? `${project.abstract.slice(0, 120)}…`
                                  : project.abstract
                                : 'No abstract available.'}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {project.academicYear}
                            </Badge>
                            {project.keywords?.slice(0, 2).map((kw) => (
                              <Badge key={kw} variant="outline" className="text-[11px] font-normal">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {projects.map((project) => (
                    <li key={project._id}>
                      <button
                        type="button"
                        className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                        onClick={() => openProjectDetail(project._id)}
                      >
                        <div className="min-w-0">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">
                            {project.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {project.teamId?.name ?? 'Unknown Team'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[11px]">
                          {project.academicYear}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {pagination.total} results
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
