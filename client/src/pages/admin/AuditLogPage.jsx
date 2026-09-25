import { useState, useCallback, useRef, useMemo } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { ROLES } from '@cms/shared';
import { toast } from 'sonner';
import {
  Loader2,
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  FileText,
  Settings,
  Shield,
  BookOpen,
  Calendar,
  RefreshCw,
  Download,
  Copy,
  Check,
  X,
  Code2,
  Users,
  Activity,
  Layers,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

/**
 * AuditLogPage — Golden Standard Activity & Security Audit Log Viewer.
 *
 * Provides institution-grade audit trail inspection, real-time filtering,
 * KPI telemetry overview, deep metadata payload inspection, and compliant
 * CSV/JSON exports for institutional accreditation.
 */

const TARGET_TYPES = ['User', 'Team', 'Project', 'Submission', 'Evaluation', 'Settings', 'System'];

const ACTION_CATEGORIES = {
  auth: { label: 'Authentication', color: 'info', icon: KeyRound },
  project: { label: 'Projects', color: 'success', icon: FileText },
  submission: { label: 'Submissions', color: 'warning', icon: BookOpen },
  deadline: { label: 'Deadlines & Scheduling', color: 'destructive', icon: Clock },
  schedule: { label: 'Deadlines & Scheduling', color: 'destructive', icon: Clock },
  defense: { label: 'Deadlines & Scheduling', color: 'destructive', icon: Clock },
  user: { label: 'Users & Roles', color: 'secondary', icon: User },
  team: { label: 'Teams', color: 'secondary', icon: Users },
  evaluation: { label: 'Evaluations', color: 'default', icon: Activity },
  settings: { label: 'Settings', color: 'outline', icon: Settings },
};

const CATEGORY_TABS = [
  { id: 'all', label: 'All Actions' },
  { id: 'auth', label: 'Auth & Security', prefix: 'auth' },
  { id: 'project', label: 'Projects', prefix: 'project' },
  { id: 'submission', label: 'Submissions', prefix: 'submission' },
  {
    id: 'schedule',
    label: 'Scheduling & Deadlines',
    prefixes: ['deadline', 'schedule', 'defense', 'milestone'],
  },
  { id: 'user', label: 'Users & Teams', prefixes: ['user', 'team'] },
  { id: 'settings', label: 'System & Config', prefixes: ['settings', 'system'] },
];

/** Derive category configuration from action string */
function getActionCategory(action) {
  const prefix = action?.split('.')[0]?.toLowerCase() || '';
  return ACTION_CATEGORIES[prefix] || { label: prefix, color: 'secondary', icon: Shield };
}

/** Render appropriate semantic icon for the audit target */
function TargetIcon({ type, className = 'h-4 w-4' }) {
  switch (type) {
    case 'User':
      return <User className={className} />;
    case 'Team':
      return <Users className={className} />;
    case 'Project':
      return <FileText className={className} />;
    case 'Submission':
      return <BookOpen className={className} />;
    case 'Settings':
      return <Settings className={className} />;
    case 'Evaluation':
      return <Activity className={className} />;
    default:
      return <Shield className={className} />;
  }
}

/** Format human-readable relative time */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogPage() {
  const authUser = useAuthStore((state) => state?.user);
  const user = authUser?.user || authUser;
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const dateInputRefs = useRef({ startDate: null, endDate: null });

  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });

  const queryFilters = useMemo(() => {
    const qf = {
      ...filters,
      page,
      limit: 25,
    };
    Object.keys(qf).forEach((key) => {
      if (!qf[key]) delete qf[key];
    });
    return qf;
  }, [filters, page]);

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs(queryFilters, {
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ action: '', targetType: '', startDate: '', endDate: '' });
    setActiveTab('all');
    setPage(1);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab.id);
    setPage(1);
    if (tab.id === 'all') {
      setFilters((prev) => ({ ...prev, action: '' }));
    } else if (tab.prefix) {
      setFilters((prev) => ({ ...prev, action: `${tab.prefix}.` }));
    } else if (tab.prefixes) {
      setFilters((prev) => ({ ...prev, action: `${tab.prefixes[0]}.` }));
    }
  }, []);

  const openDatePicker = (field) => {
    const input = dateInputRefs.current[field];
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  // KPI telemetry calculations
  const telemetry = useMemo(() => {
    const authCount = logs.filter((l) => l.action?.startsWith('auth.')).length;
    const projectSubCount = logs.filter(
      (l) => l.action?.startsWith('project.') || l.action?.startsWith('submission.'),
    ).length;
    const uniqueActors = new Set(
      logs
        .map(
          (l) => l.actor?._id || l.actor?.email || (typeof l.actor === 'string' ? l.actor : null),
        )
        .filter(Boolean),
    ).size;

    return {
      authCount,
      projectSubCount,
      uniqueActors,
    };
  }, [logs]);

  // Export handlers
  const handleExportJSON = useCallback(() => {
    if (!logs.length) {
      toast.error('No audit records to export');
      return;
    }
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `cms-v2-audit-logs-${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${logs.length} audit logs to JSON`);
  }, [logs]);

  const handleExportCSV = useCallback(() => {
    if (!logs.length) {
      toast.error('No audit records to export');
      return;
    }
    const headers = [
      'Timestamp',
      'Action',
      'TargetType',
      'TargetId',
      'Actor',
      'Role',
      'IPAddress',
      'Description',
    ];
    const rows = logs.map((log) => [
      `"${new Date(log.createdAt).toISOString()}"`,
      `"${log.action || ''}"`,
      `"${log.targetType || ''}"`,
      `"${log.targetId || ''}"`,
      `"${log.actor?.firstName ? `${log.actor.firstName} ${log.actor.lastName}` : log.actor?.email || ''}"`,
      `"${log.actorRole || ''}"`,
      `"${log.ipAddress || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute(
      'download',
      `cms-v2-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${logs.length} audit logs to CSV`);
  }, [logs]);

  const handleCopyPayload = useCallback((payload) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedPayload(true);
      toast.success('Metadata payload copied to clipboard');
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, []);

  // Gate: instructor only
  if (user?.role !== ROLES.INSTRUCTOR) {
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScrollText className="h-5 w-5" />
              </div>
              Activity Log
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Audited institutional activity, security events, and compliance trail across CMS-V2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isLoading || logs.length === 0}
              className="text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={isLoading || logs.length === 0}
              className="text-xs"
            >
              <Code2 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs font-medium"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Telemetry KPI Ribbon */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {total.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">System-wide logged actions</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">In Current View</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{logs.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Security / Auth</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {telemetry.authCount}
                </p>
                <p className="text-[11px] text-muted-foreground">Login & credential events</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Shield className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur-sm shadow-sm transition-all hover:border-primary/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">Active Actors</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {telemetry.uniqueActors}
                </p>
                <p className="text-[11px] text-muted-foreground">Distinct users in view</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Filter Activity Trail</CardTitle>
              </div>

              {/* Category Quick Pills */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab)}
                      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="actionFilter" className="text-xs font-medium text-muted-foreground">
                  Action Filter
                </Label>
                <div className="relative">
                  <Input
                    id="actionFilter"
                    placeholder="e.g. project.created"
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="pr-8 text-sm"
                  />
                  {filters.action && (
                    <button
                      type="button"
                      onClick={() => handleFilterChange('action', '')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="targetTypeFilter"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Target Entity
                </Label>
                <select
                  id="targetTypeFilter"
                  value={filters.targetType}
                  onChange={(e) => handleFilterChange('targetType', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                >
                  <option value="">All entity types</option>
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
                  Date From
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={(node) => {
                      dateInputRefs.current.startDate = node;
                    }}
                    id="startDate"
                    type="date"
                    className="flex-1 text-sm"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => openDatePicker('startDate')}
                    aria-label="Open from date calendar"
                    title="Open calendar"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
                  Date To
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={(node) => {
                      dateInputRefs.current.endDate = node;
                    }}
                    id="endDate"
                    type="date"
                    className="flex-1 text-sm"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    onClick={() => openDatePicker('endDate')}
                    aria-label="Open to date calendar"
                    title="Open calendar"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>

            {Object.values(filters).some(Boolean) && (
              <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                <span className="text-xs text-muted-foreground">
                  Active filters applied. Results are filtered dynamically.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Stream */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {total > 0 ? `${total.toLocaleString()} Audit Records` : 'Audit Records'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Immutable chronological system logs with cryptographic actors & IP tracing.
                </CardDescription>
              </div>
              {total > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  Page {page} of {totalPages}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border p-4 animate-pulse"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 rounded bg-muted" />
                      <div className="h-3 w-2/3 rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <Alert variant="destructive" className="my-4">
                <AlertDescription className="flex items-center justify-between">
                  <span>Failed to load audit logs. Please check network connection.</span>
                  <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-3 text-muted-foreground">
                  <Search className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  No audit log entries found
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                  {Object.values(filters).some(Boolean)
                    ? 'No events match the selected filter criteria. Try adjusting or clearing your filters.'
                    : 'System activity will appear here as users and workflows interact with CMS-V2.'}
                </p>
                {Object.values(filters).some(Boolean) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-4 text-xs"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <AuditLogEntry key={log._id} log={log} onInspect={() => setSelectedLog(log)} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Page <span className="font-medium text-foreground">{page}</span> of{' '}
                    <span className="font-medium text-foreground">{totalPages}</span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata Inspector Dialog */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="audit-inspector-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border/80 bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                  <Code2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="audit-inspector-title"
                    className="text-sm font-semibold truncate text-foreground"
                  >
                    Audit Event Payload
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedLog.action} &bull; ID: {selectedLog._id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Event Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Action:</span>
                  <div className="font-mono font-medium text-foreground mt-0.5">
                    {selectedLog.action}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Entity:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {selectedLog.targetType}{' '}
                    {selectedLog.targetId ? `(${selectedLog.targetId})` : ''}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {selectedLog.actor?.firstName
                      ? `${selectedLog.actor.firstName} ${selectedLog.actor.lastName} (${selectedLog.actorRole})`
                      : selectedLog.actor?.email || selectedLog.actorRole || 'System'}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="text-foreground mt-0.5">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </div>
                </div>
                {selectedLog.ipAddress && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Origin IP:</span>
                    <span className="ml-2 font-mono font-medium text-foreground">
                      {selectedLog.ipAddress}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedLog.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Event Summary
                  </h4>
                  <p className="text-sm rounded-md bg-muted/40 p-2.5 text-foreground border border-border/40">
                    {selectedLog.description}
                  </p>
                </div>
              )}

              {/* JSON Metadata Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Code2 className="h-3.5 w-3.5" />
                    Metadata Payload (JSON)
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCopyPayload(selectedLog.metadata || {})}
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <div className="relative rounded-lg border bg-muted/60 p-3 overflow-x-auto max-h-72">
                  <pre className="font-mono text-xs text-foreground/90 whitespace-pre">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-5 py-3 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/**
 * AuditLogEntry — High-fidelity audit trail card with action badge,
 * actor identity chip, timestamp, IP, and payload inspection action.
 */
function AuditLogEntry({ log, onInspect }) {
  const category = getActionCategory(log.action);
  const timestamp = new Date(log.createdAt);
  const relativeTime = formatRelativeTime(log.createdAt);

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-all hover:bg-muted/40 hover:border-border shadow-2xs">
      <div className="flex items-start gap-3 min-w-0">
        {/* Category Icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <TargetIcon type={log.targetType} />
        </div>

        {/* Content */}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={category.color}
              className="text-[10px] font-mono tracking-tight font-semibold"
            >
              {log.action}
            </Badge>
            {log.targetType && (
              <span className="text-xs text-muted-foreground">
                on <span className="font-medium text-foreground">{log.targetType}</span>
                {log.targetId && (
                  <span className="ml-1 text-[10px] font-mono text-muted-foreground/80">
                    #{String(log.targetId).slice(-6)}
                  </span>
                )}
              </span>
            )}
          </div>

          {log.description && (
            <p className="text-sm font-normal text-foreground leading-snug line-clamp-2">
              {log.description}
            </p>
          )}

          {/* Sub-meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-0.5">
            {log.actor && (
              <span className="flex items-center gap-1 font-medium text-foreground/90">
                <User className="h-3 w-3 text-muted-foreground" />
                {log.actor.firstName
                  ? `${log.actor.firstName} ${log.actor.lastName}`
                  : log.actor.email || log.actor._id}
              </span>
            )}
            {log.actorRole && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal uppercase">
                {log.actorRole}
              </Badge>
            )}
            <span className="flex items-center gap-1" title={timestamp.toLocaleString()}>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>{timestamp.toLocaleDateString()}</span>
              <span>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {relativeTime && <span className="text-muted-foreground/70">({relativeTime})</span>}
            </span>
            {log.ipAddress && (
              <span className="font-mono text-[10px] bg-muted/80 px-1.5 py-0.5 rounded text-muted-foreground">
                {log.ipAddress}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action / Inspect */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onInspect}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Inspect event payload"
        >
          <Code2 className="mr-1.5 h-3.5 w-3.5" />
          Inspect
        </Button>
      </div>
    </div>
  );
}
