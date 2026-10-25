import { useState, useMemo, useEffect } from 'react';
import { useProjectAuditTrail } from '@/hooks/useAuditLogs';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import {
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  UserPlus,
  UserMinus,
  Unlock,
  RotateCcw,
  Settings,
  Award,
  ClipboardList,
  ShieldCheck,
  Archive,
  History,
  AlertCircle,
} from 'lucide-react';

/* ─── Action config: icon + semantic badge variant + label ─── */
const ACTION_CONFIG = {
  'project.created': {
    icon: FileText,
    variant: 'info',
    label: 'Project Created',
  },
  'project.title_submitted': {
    icon: FileText,
    variant: 'info',
    label: 'Title Submitted',
  },
  'project.title_updated': {
    icon: FileText,
    variant: 'info',
    label: 'Title Updated',
  },
  'project.title_revised': {
    icon: RotateCcw,
    variant: 'warning',
    label: 'Title Revised',
  },
  'project.title_approved': {
    icon: CheckCircle2,
    variant: 'success',
    label: 'Title Approved',
  },
  'project.title_rejected': {
    icon: XCircle,
    variant: 'destructive',
    label: 'Title Rejected',
  },
  'project.title_modification_requested': {
    icon: AlertCircle,
    variant: 'warning',
    label: 'Modification Requested',
  },
  'project.title_modification_resolved': {
    icon: CheckCircle2,
    variant: 'success',
    label: 'Modification Resolved',
  },
  'project.title_proposal_commented': {
    icon: ClipboardList,
    variant: 'info',
    label: 'Title Comment Added',
  },
  'project.adviser_assigned': {
    icon: UserPlus,
    variant: 'info',
    label: 'Adviser Assigned',
  },
  'project.panelist_assigned': {
    icon: UserPlus,
    variant: 'info',
    label: 'Panelist Assigned',
  },
  'project.panelist_removed': {
    icon: UserMinus,
    variant: 'destructive',
    label: 'Panelist Removed',
  },
  'project.panelist_self_selected': {
    icon: UserPlus,
    variant: 'info',
    label: 'Panelist Self-Selected',
  },
  'project.deadlines_updated': {
    icon: Settings,
    variant: 'secondary',
    label: 'Deadlines Updated',
  },
  'project.rejected': {
    icon: XCircle,
    variant: 'destructive',
    label: 'Project Rejected',
  },
  'project.phase_advanced': {
    icon: ShieldCheck,
    variant: 'success',
    label: 'Phase Advanced',
  },
  'project.archived': {
    icon: Archive,
    variant: 'secondary',
    label: 'Project Archived',
  },
  'project.certificate_uploaded': {
    icon: Award,
    variant: 'warning',
    label: 'Certificate Uploaded',
  },
  'project.bulk_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'Bulk Uploaded',
  },
  'submission.chapter_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'Chapter Uploaded',
  },
  'submission.proposal_compiled': {
    icon: FileText,
    variant: 'info',
    label: 'Proposal Compiled',
  },
  'submission.system_design_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'System Design Uploaded',
  },
  'submission.test_results_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'Test Results Uploaded',
  },
  'submission.final_academic_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'Final Academic Uploaded',
  },
  'submission.final_journal_uploaded': {
    icon: Upload,
    variant: 'info',
    label: 'Final Journal Uploaded',
  },
  'submission.reviewed': {
    icon: ClipboardList,
    variant: 'info',
    label: 'Submission Reviewed',
  },
  'submission.unlocked': {
    icon: Unlock,
    variant: 'warning',
    label: 'Submission Unlocked',
  },
  'evaluation.submitted': {
    icon: Award,
    variant: 'warning',
    label: 'Evaluation Submitted',
  },
  'evaluation.unlocked': {
    icon: Unlock,
    variant: 'warning',
    label: 'Evaluation Unlocked',
  },
  'evaluation.released': {
    icon: CheckCircle2,
    variant: 'success',
    label: 'Evaluation Released',
  },
};

const FALLBACK_CONFIG = {
  icon: History,
  variant: 'secondary',
  label: null,
};

function getConfig(action) {
  return ACTION_CONFIG[action] ?? FALLBACK_CONFIG;
}

function getActorName(actor) {
  if (!actor) return 'System';
  if (typeof actor === 'string') return actor;
  const parts = [actor.firstName, actor.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : (actor.email ?? 'Unknown');
}

function getRoleBadgeVariant(role) {
  if (!role) return 'secondary';
  const map = {
    instructor: 'default',
    adviser: 'secondary',
    panelist: 'outline',
    student: 'secondary',
  };
  return map[role.toLowerCase()] ?? 'secondary';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

/* ─── Category filter options ─── */
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Events' },
  { value: 'project', label: 'Project' },
  { value: 'submission', label: 'Submissions' },
  { value: 'evaluation', label: 'Evaluations' },
];

/* ─── Main Component ─── */
export default function ProjectAuditTrail({ projectId }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: logs = [], isLoading, isError, refetch } = useProjectAuditTrail(projectId);

  const filtered = useMemo(() => {
    let result = logs;

    if (category !== 'all') {
      result = result.filter((l) => l.action?.startsWith(category));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.description?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          getActorName(l.actor)?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [logs, category, search]);

  const [visibleCount, setVisibleCount] = useState(25);
  const visibleLogs = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(25);
  }, [category, search]);

  return (
    <section className="space-y-4" aria-label="Project audit trail">
      {/* ── Header + controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, actors…"
            aria-label="Search audit events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={category === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(opt.value)}
              aria-pressed={category === opt.value}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Count ── */}
      <p className="text-xs font-medium text-muted-foreground" aria-live="polite">
        {isLoading ? 'Loading…' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
        {!isLoading && logs.length > 0 && filtered.length !== logs.length
          ? ` (filtered from ${logs.length})`
          : ''}
      </p>

      {/* ── States ── */}
      {isLoading && (
        <div
          role="status"
          className="flex items-center justify-center py-16 text-muted-foreground gap-2"
        >
          <Spinner className="size-5 text-primary" />
          <span className="text-sm font-medium">Loading audit trail…</span>
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="flex flex-col items-center justify-center py-16 gap-3 text-center"
        >
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-muted-foreground">Failed to load audit trail.</p>
          <Button type="button" variant="outline" size="sm" onClick={refetch}>
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <History className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            {logs.length === 0
              ? 'No audit events recorded for this project yet.'
              : 'No events match your filter.'}
          </p>
        </div>
      )}

      {/* ── Timeline ── */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <ul className="space-y-1">
            {visibleLogs.map((log) => {
              const cfg = getConfig(log.action);
              const Icon = cfg.icon;
              const actor = log.actor;
              const actorName = getActorName(actor);
              const actorRole = actor?.role ?? log.actorRole ?? null;
              const label = cfg.label ?? log.action;

              return (
                <li key={log._id} className="relative flex gap-4 group">
                  {/* Icon bubble */}
                  <Badge
                    variant={cfg.variant}
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </Badge>

                  {/* Content card */}
                  <div className="flex-1 min-w-0 py-1 pb-4">
                    <Card className="min-w-0 flex-1 rounded-xl border-border bg-card/60 p-0 shadow-sm transition-colors group-hover:border-border/80 group-hover:bg-card">
                      <CardContent className="p-3 sm:p-4">
                        {/* Top row */}
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground leading-tight">
                            {label}
                          </span>
                          <time
                            dateTime={log.createdAt}
                            title={formatDate(log.createdAt)}
                            className="text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0"
                          >
                            {formatRelative(log.createdAt)}
                          </time>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          {log.description}
                        </p>

                        {/* Actor row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground">By</span>
                          <span className="text-[11px] font-semibold text-foreground">
                            {actorName}
                          </span>
                          {actorRole && (
                            <Badge
                              variant={getRoleBadgeVariant(actorRole)}
                              className="text-[10px] px-1.5 py-0 h-4 capitalize"
                            >
                              {actorRole}
                            </Badge>
                          )}

                          {/* Action code chip */}
                          <Badge
                            variant="outline"
                            className="ml-auto max-w-full truncate font-mono text-[10px]"
                          >
                            {log.action}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </li>
              );
            })}
          </ul>

          {filtered.length > visibleCount && (
            <div className="pt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + 25)}
                className="text-xs gap-1.5"
              >
                Load more events ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
