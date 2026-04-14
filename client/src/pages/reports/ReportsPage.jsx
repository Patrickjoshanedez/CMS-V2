import { useState, useCallback, useMemo } from 'react';
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
  BarChart3,
  Search,
  Download,
  RefreshCcw,
  Users,
  ShieldAlert,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/**
 * ReportsPage — Instructor-only reporting dashboard.
 *
 * Layout flow: Filters -> KPI summary cards -> Charts -> Paginated data table.
 */
export default function ReportsPage() {
  const { user } = useAuthStore();
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const CHART_COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#eab308', '#a855f7', '#ef4444'];

  const [filters, setFilters] = useState({
    author: '',
    title: '',
    year: '',
    adviserId: '',
    courseId: '',
    keyword: '',
  });

  const [appliedFilters, setAppliedFilters] = useState({});
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('archivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const queryFilters = useMemo(
    () => ({ ...appliedFilters, sortBy, sortOrder, page, limit }),
    [appliedFilters, sortBy, sortOrder, page, limit],
  );

  const { data, isLoading, error } = useProjectReports(queryFilters, {
    enabled: hasGenerated,
  });

  const buildCleanFilters = useCallback((source) => {
    const cleaned = {};
    if (source.author.trim()) cleaned.author = source.author.trim();
    if (source.title.trim()) cleaned.title = source.title.trim();
    if (source.year.trim()) cleaned.year = source.year.trim();
    if (source.adviserId) cleaned.adviserId = source.adviserId;
    if (source.courseId) cleaned.courseId = source.courseId;
    if (source.keyword.trim()) cleaned.keyword = source.keyword.trim();
    return cleaned;
  }, []);

  const handleGenerate = useCallback(() => {
    setAppliedFilters(buildCleanFilters(filters));
    setPage(1);
    setHasGenerated(true);
  }, [buildCleanFilters, filters]);

  const handleReset = useCallback(() => {
    const cleared = {
      author: '',
      title: '',
      year: '',
      adviserId: '',
      courseId: '',
      keyword: '',
    };

    setFilters(cleared);
    setAppliedFilters({});
    setHasGenerated(false);
    setSortBy('archivedAt');
    setSortOrder('desc');
    setPage(1);
    setLimit(10);
  }, []);

  const summary = data?.summary || {
    totalCapstonesArchived: 0,
    mostActiveYear: null,
    totalAuthorsStudents: 0,
    flaggedByPlagiarism: 0,
  };

  const trend = data?.trend || [];
  const categoryBreakdown = data?.categoryBreakdown || [];

  const table = data?.table || {
    rows: [],
    page,
    limit,
    total: 0,
    totalPages: 1,
  };

  const records = table.rows || [];
  const filterOptions = data?.filterOptions || {
    academicYears: [],
    authors: [],
    advisers: [],
    programs: [],
    keywords: [],
  };

  const hasResults = hasGenerated;
  const hasLiveFilters = Object.values(buildCleanFilters(filters)).some(Boolean);
  const canGoPrev = table.page > 1;
  const canGoNext = table.page < table.totalPages;

  const exportCsv = useCallback(() => {
    if (!records.length) return;

    const headers = [
      'Title',
      'Authors',
      'Adviser',
      'Program',
      'Academic Year',
      'Keywords',
      'Status',
    ];
    const lines = records.map((record) => [
      record.title || '',
      record.authors?.map((authorItem) => authorItem.fullName).join('; ') || '',
      record.adviser?.fullName || '',
      record.course?.label || record.course?.name || record.course?.code || '',
      record.academicYear || '',
      (record.keywords || []).join('; '),
      record.status || '',
    ]);

    const csv = [
      headers.join(','),
      ...lines.map((line) =>
        line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `capstone-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [records]);

  const exportExcel = useCallback(() => {
    if (!records.length) return;

    const headers = [
      'Title',
      'Authors',
      'Adviser',
      'Program',
      'Academic Year',
      'Keywords',
      'Status',
    ];
    const rows = records.map((record) => [
      record.title || '',
      record.authors?.map((authorItem) => authorItem.fullName).join('; ') || '',
      record.adviser?.fullName || '',
      record.course?.label || record.course?.name || record.course?.code || '',
      record.academicYear || '',
      (record.keywords || []).join('; '),
      record.status || '',
    ]);

    const tsv = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
    const blob = new Blob([tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `capstone-report-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [records]);

  const exportPdf = useCallback(() => {
    if (!records.length) return;

    const printableRows = records
      .map(
        (record) =>
          `<tr>
            <td>${record.title || ''}</td>
            <td>${record.authors?.map((authorItem) => authorItem.fullName).join(', ') || ''}</td>
            <td>${record.adviser?.fullName || ''}</td>
            <td>${record.course?.label || record.course?.name || record.course?.code || ''}</td>
            <td>${record.academicYear || ''}</td>
          </tr>`,
      )
      .join('');

    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Capstone Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; }
            h1 { margin-bottom: 8px; }
            p { color: #555; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f6f6f6; }
          </style>
        </head>
        <body>
          <h1>Capstone Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Authors</th>
                <th>Adviser</th>
                <th>Program</th>
                <th>Academic Year</th>
              </tr>
            </thead>
            <tbody>${printableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }, [records]);

  const exportRecordInfo = useCallback((record) => {
    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(record.title || 'capstone').replace(/\s+/g, '-').toLowerCase()}-info.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, []);

  if (!isInstructor) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Capstone Reports</h1>
            <p className="text-muted-foreground">
              Analyze archived capstones with summary metrics, trend insights, and detailed records.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-1 lg:col-span-3">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  placeholder="Search by author..."
                  value={filters.author}
                  onChange={(e) => setFilters((f) => ({ ...f, author: e.target.value }))}
                />
              </div>

              <div className="space-y-1 lg:col-span-4">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Search by title..."
                  value={filters.title}
                  onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  placeholder="e.g. 2024-2025"
                  value={filters.year}
                  onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
                />
              </div>

              <div className="flex flex-wrap items-end justify-end gap-2 lg:col-span-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                >
                  {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
                </Button>

                <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>

                <Button onClick={handleGenerate} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Live filter status: {hasLiveFilters ? 'ready' : 'waiting for input'}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <Button
                  type="button"
                  size="sm"
                  variant={sortBy === 'archivedAt' ? 'default' : 'outline'}
                  onClick={() => {
                    setSortBy('archivedAt');
                    setSortOrder((prev) =>
                      sortBy === 'archivedAt' && prev === 'desc' ? 'asc' : 'desc',
                    );
                  }}
                >
                  Archived At
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={sortBy === 'title' ? 'default' : 'outline'}
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder((prev) => (sortBy === 'title' && prev === 'asc' ? 'desc' : 'asc'));
                  }}
                >
                  Title
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={sortBy === 'academicYear' ? 'default' : 'outline'}
                  onClick={() => {
                    setSortBy('academicYear');
                    setSortOrder((prev) =>
                      sortBy === 'academicYear' && prev === 'asc' ? 'desc' : 'asc',
                    );
                  }}
                >
                  Academic Year
                </Button>
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="adviserId">Adviser</Label>
                  <select
                    id="adviserId"
                    value={filters.adviserId}
                    onChange={(e) => setFilters((f) => ({ ...f, adviserId: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All advisers</option>
                    {filterOptions.advisers.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="courseId">Program</Label>
                  <select
                    id="courseId"
                    value={filters.courseId}
                    onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All programs</option>
                    {filterOptions.programs.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="keyword">Keyword</Label>
                  <Input
                    id="keyword"
                    placeholder="e.g. machine learning"
                    value={filters.keyword}
                    onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                    list="report-keywords"
                  />
                  <datalist id="report-keywords">
                    {filterOptions.keywords.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="limit">Rows per page</Label>
                  <select
                    id="limit"
                    value={String(limit)}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message || 'Failed to load reports.'}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && hasResults && records.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No capstone records match your filters.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && records.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <BarChart3 className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Capstones Archived
                    </p>
                    <p className="text-3xl font-bold">{summary.totalCapstonesArchived}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <CalendarRange className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Most Active Year</p>
                    <p className="text-3xl font-bold">{summary.mostActiveYear || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <Users className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Authors / Students
                    </p>
                    <p className="text-3xl font-bold">{summary.totalAuthorsStudents}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <ShieldAlert className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Plagiarism-Flagged Documents
                    </p>
                    <p className="text-3xl font-bold">{summary.flaggedByPlagiarism}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Capstone Submission Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" angle={-25} textAnchor="end" interval={0} height={60} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Project Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={98}
                        label
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell
                            key={`${entry.category}-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(table.page - 1) * table.limit + 1} to{' '}
                  {Math.min(table.page * table.limit, table.total)} of {table.total} records
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportExcel}>
                    <Download className="mr-2 h-4 w-4" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportPdf}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Capstone Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] table-auto border-collapse text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-3">Title</th>
                        <th className="py-2 pr-3">Authors</th>
                        <th className="py-2 pr-3">Year</th>
                        <th className="py-2 pr-3">Advisor</th>
                        <th className="py-2 pr-3">Program</th>
                        <th className="py-2 pr-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record._id} className="border-b align-top">
                          <td className="py-2 pr-3 font-medium">{record.title || '—'}</td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {record.authors?.map((item) => item.fullName).join(', ') || '—'}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {record.academicYear || '—'}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {record.adviser?.fullName || '—'}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {record.course?.label ||
                              record.course?.name ||
                              record.course?.code ||
                              '—'}
                          </td>
                          <td className="py-2 pr-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportRecordInfo(record)}
                            >
                              Export Info
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canGoPrev}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                  </Button>

                  <span className="text-xs text-muted-foreground">
                    Page {table.page} of {table.totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canGoNext}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {!isLoading && !error && !hasResults && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Ready to generate a report</p>
              <p className="text-sm text-muted-foreground">
                Use the filters above and click Generate to populate KPI cards, charts, and table.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
