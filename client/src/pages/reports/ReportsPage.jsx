import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useProjectReports } from '@/hooks/useProjects';
import { useAcademicYears } from '@/hooks/useAcademics';
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
  ChevronDown,
  X,
  Printer,
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

/* ────────── SearchableDropdown ────────── */
function SearchableDropdown({ id, value, onChange, options = [], placeholder = 'Select...', label }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt,
      ),
    [options],
  );

  const filtered = useMemo(
    () =>
      normalizedOptions.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase()),
      ),
    [normalizedOptions, query],
  );

  const selectedLabel = useMemo(() => {
    if (!value) return '';
    const match = normalizedOptions.find((opt) => opt.value === value);
    return match ? match.label : value;
  }, [value, normalizedOptions]);

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={ref} className="reports-dropdown" id={id}>
      {label && <Label className="reports-dropdown-label">{label}</Label>}
      <button
        type="button"
        className={`reports-dropdown-trigger ${value ? 'has-value' : ''}`}
        onClick={() => setOpen((p) => !p)}
      >
        <span className="reports-dropdown-trigger-text">
          {value ? selectedLabel : placeholder}
        </span>
        <div className="reports-dropdown-trigger-icons">
          {value && (
            <span
              className="reports-dropdown-clear"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.stopPropagation(); onChange(''); }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`reports-dropdown-chevron ${open ? 'open' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="reports-dropdown-popover">
          <div className="reports-dropdown-search">
            <Search className="reports-dropdown-search-icon" />
            <input
              ref={inputRef}
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="reports-dropdown-search-input"
            />
          </div>
          <div className="reports-dropdown-list">
            <button
              type="button"
              className="reports-dropdown-item placeholder-item"
              onClick={() => handleSelect('')}
            >
              {placeholder}
            </button>
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`reports-dropdown-item ${opt.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="reports-dropdown-empty">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ReportsPage — Instructor-only reporting dashboard.
 *
 * Layout: Overview → Filters → Table → Charts & Trends.
 */
export default function ReportsPage() {
  const { user } = useAuthStore();
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const { data: academicYears = [] } = useAcademicYears();

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
    setFilters({ author: '', title: '', year: '', adviserId: '', courseId: '', keyword: '' });
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

  const table = data?.table || { rows: [], page, limit, total: 0, totalPages: 1 };
  const records = table.rows || [];

  // filterOptions.authors is an array of strings from the API
  const filterOptions = data?.filterOptions || {
    academicYears: [],
    authors: [],
    advisers: [],
    programs: [],
    keywords: [],
  };

  const hasResults = hasGenerated;
  const canGoPrev = table.page > 1;
  const canGoNext = table.page < table.totalPages;

  // Build year options: merge academicYears hook data with filterOptions
  const yearOptions = useMemo(() => {
    const set = new Set([...academicYears, ...filterOptions.academicYears]);
    return [...set].sort().reverse();
  }, [academicYears, filterOptions.academicYears]);

  // Build author options: filterOptions.authors are plain strings
  const authorOptions = useMemo(() => {
    return (filterOptions.authors || [])
      .filter((a) => typeof a === 'string' && a.trim())
      .map((a) => ({ value: a, label: a }));
  }, [filterOptions.authors]);

  const adviserOptions = useMemo(() => {
    return (filterOptions.advisers || []).map((a) => ({
      value: a._id,
      label: a.fullName || 'Unknown',
    }));
  }, [filterOptions.advisers]);

  const programOptions = useMemo(() => {
    return (filterOptions.programs || []).map((p) => ({
      value: p._id,
      label: p.label || p.name || p.code || 'Unknown',
    }));
  }, [filterOptions.programs]);

  const keywordOptions = useMemo(() => {
    return (filterOptions.keywords || [])
      .filter((k) => typeof k === 'string' && k.trim())
      .map((k) => ({ value: k, label: k }));
  }, [filterOptions.keywords]);

  const exportCsv = useCallback(() => {
    if (!records.length) return;
    const headers = ['Title', 'Authors', 'Adviser', 'Program', 'Academic Year', 'Keywords', 'Status'];
    const lines = records.map((r) => [
      r.title || '',
      r.authors?.map((a) => a.fullName).join('; ') || '',
      r.adviser?.fullName || '',
      r.course?.label || r.course?.name || r.course?.code || '',
      r.academicYear || '',
      (r.keywords || []).join('; '),
      r.status || '',
    ]);
    const csv = [headers.join(','), ...lines.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
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
    const rows = records.map((r) => [
      r.title || '',
      r.authors?.map((a) => a.fullName).join('; ') || '',
      r.adviser?.fullName || '',
      r.course?.label || r.course?.name || r.course?.code || '',
      r.academicYear || '',
      (r.keywords || []).join('; '),
      r.status || '',
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
      .map((r) =>
        `<tr>
          <td>${r.title || ''}</td>
          <td>${r.authors?.map((a) => a.fullName).join(', ') || ''}</td>
          <td>${r.adviser?.fullName || ''}</td>
          <td>${r.course?.label || r.course?.name || r.course?.code || ''}</td>
          <td>${r.academicYear || ''}</td>
        </tr>`)
      .join('');
    const popup = window.open('', '_blank', 'width=1200,height=800');
    if (!popup) return;
    popup.document.write(`<html><head><title>Capstone Report</title><style>body{font-family:Arial,sans-serif;margin:24px}h1{margin-bottom:8px}p{color:#555;margin-top:0}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}th{background:#f6f6f6}</style></head><body><h1>Capstone Report</h1><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Title</th><th>Authors</th><th>Adviser</th><th>Program</th><th>Academic Year</th></tr></thead><tbody>${printableRows}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }, [records]);

  const exportRecordInfo = useCallback((record) => {
    const popup = window.open('', '_blank', 'width=800,height=600');
    if (!popup) return;
    popup.document.write(`<html><head><title>${record.title || 'Capstone'} - Info</title><style>body{font-family:Arial,sans-serif;margin:24px;line-height:1.6}h1{margin-bottom:8px;font-size:20px}h2{margin-top:20px;font-size:16px;border-bottom:1px solid #ccc;padding-bottom:4px}p{color:#333;margin-top:4px;margin-bottom:8px}.label{font-weight:bold;color:#555;display:inline-block;width:120px}</style></head><body><h1>${record.title || 'Untitled Capstone'}</h1><p><span class="label">Academic Year:</span> ${record.academicYear || 'N/A'}</p><p><span class="label">Program:</span> ${record.course?.label || record.course?.name || record.course?.code || 'N/A'}</p><h2>Authors</h2><p>${record.authors?.map((a) => a.fullName).join(', ') || 'None'}</p><h2>Adviser</h2><p>${record.adviser?.fullName || 'None'}</p><h2>Keywords</h2><p>${(record.keywords || []).join(', ') || 'None'}</p><h2>Status</h2><p>${record.status || 'Unknown'}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
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
      <div className="reports-page">
        {/* Header */}
        <div className="reports-header">
          <div>
            <h1 className="reports-title">Capstone Reports</h1>
            <p className="reports-subtitle">
              Analyze archived capstones with summary metrics, trend insights, and detailed records.
            </p>
          </div>
        </div>

        {/* KPI Summary Cards */}
        {!isLoading && !error && hasResults && (
          <div className="reports-kpi-grid">
            {[
              { icon: BarChart3, label: 'Total Capstones Archived', value: summary.totalCapstonesArchived, accent: 'blue' },
              { icon: CalendarRange, label: 'Most Active Year', value: summary.mostActiveYear || 'N/A', accent: 'emerald' },
              { icon: Users, label: 'Total Authors / Students', value: summary.totalAuthorsStudents, accent: 'violet' },
              { icon: ShieldAlert, label: 'Plagiarism-Flagged', value: summary.flaggedByPlagiarism, accent: 'rose' },
            ].map((kpi) => (
              <div key={kpi.label} className={`reports-kpi-card reports-kpi-${kpi.accent}`}>
                <div className="reports-kpi-icon-wrap">
                  <kpi.icon className="reports-kpi-icon" />
                </div>
                <div>
                  <p className="reports-kpi-label">{kpi.label}</p>
                  <p className="reports-kpi-value">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters Card */}
        <Card className="reports-filters-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="reports-filter-grid">
              <div className="reports-filter-item">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Search by title..."
                  value={filters.title}
                  onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <SearchableDropdown
                id="author"
                label="Author"
                value={filters.author}
                onChange={(val) => setFilters((f) => ({ ...f, author: val }))}
                options={authorOptions}
                placeholder="All authors"
              />

              <SearchableDropdown
                id="year"
                label="Academic Year"
                value={filters.year}
                onChange={(val) => setFilters((f) => ({ ...f, year: val }))}
                options={yearOptions}
                placeholder="All years"
              />

              <SearchableDropdown
                id="adviserId"
                label="Adviser"
                value={filters.adviserId}
                onChange={(val) => setFilters((f) => ({ ...f, adviserId: val }))}
                options={adviserOptions}
                placeholder="All advisers"
              />

              <SearchableDropdown
                id="courseId"
                label="Program"
                value={filters.courseId}
                onChange={(val) => setFilters((f) => ({ ...f, courseId: val }))}
                options={programOptions}
                placeholder="All programs"
              />

              <SearchableDropdown
                id="keyword"
                label="Keyword"
                value={filters.keyword}
                onChange={(val) => setFilters((f) => ({ ...f, keyword: val }))}
                options={keywordOptions}
                placeholder="All keywords"
              />

              <div className="reports-filter-item">
                <Label>Rows per page</Label>
                <select
                  value={String(limit)}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="reports-native-select"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <div className="reports-filter-actions">
              <div className="reports-sort-group">
                <span className="reports-sort-label">Sort by:</span>
                {[
                  { key: 'archivedAt', label: 'Archived At' },
                  { key: 'title', label: 'Title' },
                  { key: 'academicYear', label: 'Academic Year' },
                ].map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    size="sm"
                    variant={sortBy === s.key ? 'default' : 'outline'}
                    onClick={() => {
                      if (sortBy === s.key) {
                        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortBy(s.key);
                        setSortOrder('desc');
                      }
                    }}
                  >
                    {s.label}
                    {sortBy === s.key && (
                      <span className="ml-1 text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </Button>
                ))}
              </div>

              <div className="reports-action-buttons">
                <Button type="button" variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button onClick={handleGenerate} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="reports-loading">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message || 'Failed to load reports.'}</AlertDescription>
          </Alert>
        )}

        {/* Empty results */}
        {!isLoading && !error && hasResults && records.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No capstone records match your filters.</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!isLoading && !error && records.length > 0 && (
          <>
            {/* Export toolbar */}
            <Card>
              <CardContent className="reports-export-bar">
                <p className="text-sm text-muted-foreground">
                  Showing {(table.page - 1) * table.limit + 1} to{' '}
                  {Math.min(table.page * table.limit, table.total)} of {table.total} records
                </p>
                <div className="reports-export-buttons">
                  <Button size="sm" variant="outline" onClick={exportCsv}>
                    <Download className="mr-2 h-4 w-4" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportExcel}>
                    <Download className="mr-2 h-4 w-4" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportPdf}>
                    <Printer className="mr-2 h-4 w-4" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detailed Capstone Table</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Authors</th>
                        <th>Year</th>
                        <th>Advisor</th>
                        <th>Program</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record._id}>
                          <td className="reports-table-title">{record.title || '—'}</td>
                          <td className="reports-table-muted">
                            {record.authors?.map((a) => a.fullName).join(', ') || '—'}
                          </td>
                          <td className="reports-table-muted">{record.academicYear || '—'}</td>
                          <td className="reports-table-muted">{record.adviser?.fullName || '—'}</td>
                          <td className="reports-table-muted">
                            {record.course?.label || record.course?.name || record.course?.code || '—'}
                          </td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportRecordInfo(record)}
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Print
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="reports-pagination">
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

            {/* Charts */}
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
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
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
          </>
        )}

        {/* Pre-generate placeholder */}
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
