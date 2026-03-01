import { useState, useCallback } from 'react';
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
  RefreshCw,
} from 'lucide-react';

/**
 * AuditLogPage — Instructor-only activity log viewer.
 *
 * Displays paginated, filterable audit trail entries logged by the
 * auditLog middleware across all system operations.
 */

const TARGET_TYPES = ['User', 'Team', 'Project', 'Submission', 'Evaluation', 'Settings', 'System'];

const ACTION_CATEGORIES = {
  auth: { label: 'Authentication', color: 'info' },
  project: { label: 'Projects', color: 'success' },
  submission: { label: 'Submissions', color: 'warning' },
  user: { label: 'Users', color: 'secondary' },
  evaluation: { label: 'Evaluations', color: 'default' },
  settings: { label: 'Settings', color: 'outline' },
};

/** Derive a category key from an action string like "project.created" */
function getActionCategory(action) {
  const prefix = action?.split('.')[0] || '';
  return ACTION_CATEGORIES[prefix] || { label: prefix, color: 'secondary' };
}

/** Pick an icon for the audit target type */
function TargetIcon({ type }) {
  switch (type) {
    case 'User':
      return <User className="h-4 w-4" />;
    case 'Project':
      return <FileText className="h-4 w-4" />;
    case 'Submission':
      return <BookOpen className="h-4 w-4" />;
    case 'Settings':
      return <Settings className="h-4 w-4" />;
    default:
      return <Shield className="h-4 w-4" />;
  }
}

export default function AuditLogPage() {
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  });

  const queryFilters = {
    ...filters,
    page,
    limit: 25,
  };

  // Remove empty filter values
  Object.keys(queryFilters).forEach((key) => {
    if (!queryFilters[key]) delete queryFilters[key];
  });

  const { data, isLoading, isError, refetch, isFetching } = useAuditLogs(queryFilters, {
    keepPreviousData: true,
  });

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ action: '', targetType: '', startDate: '', endDate: '' });
    setPage(1);
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

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ScrollText className="h-6 w-6 text-primary" />
              Activity Log
            </h3>
            <p className="text-muted-foreground">
              View all system activity and administrative actions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="actionFilter" className="text-xs">
                  Action
                </Label>
                <Input
                  id="actionFilter"
                  placeholder="e.g. project.created"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetTypeFilter" className="text-xs">
                  Target Type
                </Label>
                <select
                  id="targetTypeFilter"
                  value={filters.targetType}
                  onChange={(e) => handleFilterChange('targetType', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All types</option>
                  {TARGET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs">
                  From
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs">
                  To
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {Object.values(filters).some(Boolean) && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {total > 0 ? `${total} log entries` : 'Log entries'}
              </CardTitle>
              {total > 0 && (
                <CardDescription>
                  Page {page} of {totalPages}
                </CardDescription>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertDescription>Failed to load audit logs. Please try again.</AlertDescription>
              </Alert>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No audit log entries found.</p>
                <p className="text-xs text-muted-foreground">
                  Activity will appear here as users interact with the system.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <AuditLogEntry key={log._id} log={log} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/**
 * AuditLogEntry — renders a single audit log row with action badge,
 * actor, target, description, and timestamp.
 */
function AuditLogEntry({ log }) {
  const category = getActionCategory(log.action);
  const actionLabel = log.action?.split('.').pop()?.replace(/_/g, ' ') || log.action;
  const timestamp = new Date(log.createdAt);

  return (
    <div className="flex items-start gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-muted/50">
      {/* Icon */}
      <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
        <TargetIcon type={log.targetType} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={category.color} className="text-[10px]">
            {log.action}
          </Badge>
          {log.targetType && (
            <span className="text-xs text-muted-foreground">
              on <span className="font-medium">{log.targetType}</span>
            </span>
          )}
        </div>

        {log.description && (
          <p className="text-sm text-foreground">{log.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {log.actor && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.actor.firstName
                ? `${log.actor.firstName} ${log.actor.lastName}`
                : log.actor.email || log.actor._id}
            </span>
          )}
          {log.actorRole && (
            <Badge variant="outline" className="text-[10px] py-0">
              {log.actorRole}
            </Badge>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timestamp.toLocaleDateString()}{' '}
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {log.ipAddress && (
            <span className="font-mono text-[10px]">{log.ipAddress}</span>
          )}
        </div>
      </div>
    </div>
  );
}
