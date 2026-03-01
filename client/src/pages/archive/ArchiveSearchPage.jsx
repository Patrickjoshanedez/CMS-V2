import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Archive, Loader2 } from 'lucide-react';
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

export default function ArchiveSearchPage() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const limit = 9;

  // Debounce search query by 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const searchParams = useMemo(
    () => ({
      ...(debouncedQuery && { query: debouncedQuery }),
      ...(year && { year: Number(year) }),
      page,
      limit,
    }),
    [debouncedQuery, year, page, limit]
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Research Archive
        </h1>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-base">
                      {project.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {project.academicYear}
                    </Badge>
                  </div>
                  <CardDescription>{project.team?.name ?? 'Unknown Team'}</CardDescription>
                </CardHeader>

                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    {project.abstract
                      ? project.abstract.length > 150
                        ? `${project.abstract.slice(0, 150)}…`
                        : project.abstract
                      : 'No abstract available.'}
                  </p>
                </CardContent>

                {project.keywords?.length > 0 && (
                  <CardFooter className="flex flex-wrap gap-1 pt-0">
                    {project.keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs font-normal">
                        {kw}
                      </Badge>
                    ))}
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>

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
  );
}
