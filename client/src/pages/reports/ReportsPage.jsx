import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useProjectReports } from '@/hooks/useProjects';
import { ROLES } from '@cms/shared';
import {
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  Upload,
} from 'lucide-react';

/**
 * ReportsPage — Instructor-only reporting dashboard.
 *
 * Displays filtered capstone reports with year-based breakdowns
 * and expandable project lists per academic year.
 */
export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [filters, setFilters] = useState({ author: '', title: '', year: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [expanded, setExpanded] = useState({});

  const { data, isLoading, error } = useProjectReports(appliedFilters, {
    enabled: Object.values(appliedFilters).some(Boolean),
  });

  const handleGenerate = useCallback(() => {
    const cleaned = {};
    if (filters.author.trim()) cleaned.author = filters.author.trim();
    if (filters.title.trim()) cleaned.title = filters.title.trim();
    if (filters.year.trim()) cleaned.year = filters.year.trim();
    setAppliedFilters(cleaned);
  }, [filters]);

  const toggleExpand = useCallback((yearId) => {
    setExpanded((prev) => ({ ...prev, [yearId]: !prev[yearId] }));
  }, []);

  if (user?.role !== ROLES.INSTRUCTOR) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const reports = data?.reports || [];
  const totalCount = data?.totalCount ?? 0;
  const hasResults = Object.values(appliedFilters).some(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Capstone Reports</h1>
            <p className="text-muted-foreground">Generate and view reports by author, title, or year.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/reports/bulk-upload')}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  placeholder="Search by author…"
                  value={filters.author}
                  onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Search by title…"
                  value={filters.title}
                  onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  placeholder="e.g. 2024-2025"
                  value={filters.year}
                  onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message || 'Failed to load reports.'}</AlertDescription>
          </Alert>
        )}

        {/* Empty */}
        {!isLoading && !error && hasResults && reports.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No capstone records match your filters.</p>
            </CardContent>
          </Card>
        )}

        {/* Summary + Details */}
        {!isLoading && !error && reports.length > 0 && (
          <>
            {/* Total count card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-4 py-6">
                <BarChart3 className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Capstones</p>
                  <p className="text-3xl font-bold">{totalCount}</p>
                </div>
              </CardContent>
            </Card>

            {/* Year breakdown */}
            <div className="space-y-3">
              {reports.map((group) => (
                <Card key={group._id}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleExpand(group._id)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        AY {group._id}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({group.count} project{group.count !== 1 ? 's' : ''})
                        </span>
                      </CardTitle>
                      {expanded[group._id] ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>

                  {expanded[group._id] && (
                    <CardContent className="pt-0">
                      {group.projects?.length > 0 ? (
                        <ul className="divide-y">
                          {group.projects.map((p) => (
                            <li key={p._id} className="flex items-center justify-between py-2 text-sm">
                              <span className="font-medium">{p.title}</span>
                              <span className="text-muted-foreground">{p.team?.name || '—'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No project details available.</p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Prompt before first search */}
        {!isLoading && !error && !hasResults && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Ready to generate a report</p>
              <p className="text-sm text-muted-foreground">
                Use the filters above and click &ldquo;Generate Report&rdquo; to begin.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
