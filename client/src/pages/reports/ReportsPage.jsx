import { useState, useCallback, useMemo } from 'react';
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
  Download,
  RefreshCcw,
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

  const [filters, setFilters] = useState({
    author: '',
    title: '',
    year: '',
    adviserId: '',
    courseId: '',
    keyword: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('archivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expanded, setExpanded] = useState({});

  const queryFilters = useMemo(
    () => ({ ...appliedFilters, sortBy, sortOrder }),
    [appliedFilters, sortBy, sortOrder],
  );

  const { data, isLoading, error } = useProjectReports(queryFilters, {
    enabled: Object.values(appliedFilters).some(Boolean),
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
    setSortBy('archivedAt');
    setSortOrder('desc');
  }, []);

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

  const reports = data?.byYear || [];
  const records = data?.records || [];
  const filterOptions = data?.filterOptions || {
    academicYears: [],
    authors: [],
    advisers: [],
    programs: [],
    keywords: [],
  };
  const totalCount = data?.totalProjects ?? 0;
  const matchingCount = data?.matchingCount ?? totalCount;
  const hasResults = Object.values(appliedFilters).some(Boolean);

  const hasLiveFilters = Object.values(buildCleanFilters(filters)).some(Boolean);

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
      'Archived At',
    ];

    const lines = records.map((record) => [
      record.title || '',
      record.authors?.map((authorItem) => authorItem.fullName).join('; ') || '',
      record.adviser?.fullName || '',
      record.course?.label || record.course?.name || record.course?.code || '',
      record.academicYear || '',
      (record.keywords || []).join('; '),
      record.status || '',
      record.archivedAt ? new Date(record.archivedAt).toISOString() : '',
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

    const headers = ['Title', 'Authors', 'Adviser', 'Program', 'Academic Year', 'Keywords', 'Status'];
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Capstone Reports</h1>
            <p className="text-muted-foreground">
              Generate and view archived capstone analytics with filters and export actions.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button variant="outline" onClick={() => navigate('/archive/upload/capstone')}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Archived Capstone
            </Button>
          </div>
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
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
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
              <span className="text-xs text-muted-foreground">
                Live filter status: {hasLiveFilters ? 'ready' : 'waiting for input'}
              </span>
            </div>

            {showAdvanced && (
              <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-3">
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
              </div>
            )}
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
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <BarChart3 className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Capstones</p>
                    <p className="text-3xl font-bold">{totalCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <Search className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Matching Results</p>
                    <p className="text-3xl font-bold">{matchingCount}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-6">
                  <Download className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quick Export</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={exportCsv}>
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportExcel}>
                        Excel
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportPdf}>
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Sort:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={sortBy === 'archivedAt' ? 'default' : 'outline'}
                    onClick={() => {
                      setSortBy('archivedAt');
                      setSortOrder((prev) => (sortBy === 'archivedAt' && prev === 'desc' ? 'asc' : 'desc'));
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
              </CardContent>
            </Card>

            {/* Year breakdown */}
            <div className="space-y-3">
              {reports.map((group) => (
                <Card key={group._id || group.academicYear}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleExpand(group._id || group.academicYear)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        AY {group.academicYear}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({group.count} project{group.count !== 1 ? 's' : ''})
                        </span>
                      </CardTitle>
                      {expanded[group._id || group.academicYear] ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>

                  {expanded[group._id || group.academicYear] && (
                    <CardContent className="pt-0">
                      {group.projects?.length > 0 ? (
                        <ul className="divide-y">
                          {group.projects.map((p) => (
                            <li
                              key={p._id}
                              className="grid gap-2 py-3 text-sm sm:grid-cols-5"
                            >
                              <span className="sm:col-span-2">
                                <span className="font-medium">{p.title}</span>
                                {p.keywords?.length > 0 && (
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {p.keywords.join(', ')}
                                  </span>
                                )}
                              </span>
                              <span className="text-muted-foreground">
                                {p.authors?.map((a) => a.fullName).join(', ') || '—'}
                              </span>
                              <span className="text-muted-foreground">
                                {p.adviser?.fullName || '—'}
                              </span>
                              <span className="text-muted-foreground">
                                {p.course?.label || p.course?.name || p.course?.code || '—'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No project details available.
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {records.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] table-auto border-collapse text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-3">Title</th>
                          <th className="py-2 pr-3">Authors</th>
                          <th className="py-2 pr-3">Adviser</th>
                          <th className="py-2 pr-3">Program</th>
                          <th className="py-2 pr-3">Year</th>
                          <th className="py-2 pr-3">Keywords</th>
                          <th className="py-2 pr-3">Archived</th>
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
                              {record.adviser?.fullName || '—'}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {record.course?.label || record.course?.name || record.course?.code || '—'}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {record.academicYear || '—'}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {record.keywords?.join(', ') || '—'}
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">
                              {record.archivedAt
                                ? new Date(record.archivedAt).toLocaleDateString()
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
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
