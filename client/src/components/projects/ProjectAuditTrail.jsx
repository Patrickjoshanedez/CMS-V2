import { useState, useMemo } from 'react';
import { useProjectAuditTrail } from '@/hooks/useAuditLogs';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Loader2,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  UserPlus,
  UserMinus,
  Lock,
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

/* ─── Action config: icon + colour + label ─── */
const ACTION_CONFIG = {
  'project.created':                     { icon: FileText,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Project Created' },
  'project.title_submitted':             { icon: FileText,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Title Submitted' },
  'project.title_updated':               { icon: FileText,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Title Updated' },
  'project.title_revised':               { icon: RotateCcw,    color: 'text-amber-400',  bg: 'bg-amber-400/10',  label: 'Title Revised' },
  'project.title_approved':              { icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-400/10',label: 'Title Approved' },
  'project.title_rejected':              { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10',    label: 'Title Rejected' },
  'project.title_modification_requested':{ icon: AlertCircle,  color: 'text-amber-400',  bg: 'bg-amber-400/10',  label: 'Modification Requested' },
  'project.title_modification_resolved': { icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-400/10',label: 'Modification Resolved' },
  'project.title_proposal_commented':    { icon: ClipboardList,color: 'text-sky-400',    bg: 'bg-sky-400/10',    label: 'Title Comment Added' },
  'project.adviser_assigned':            { icon: UserPlus,     color: 'text-violet-400', bg: 'bg-violet-400/10', label: 'Adviser Assigned' },
  'project.panelist_assigned':           { icon: UserPlus,     color: 'text-violet-400', bg: 'bg-violet-400/10', label: 'Panelist Assigned' },
  'project.panelist_removed':            { icon: UserMinus,    color: 'text-rose-400',   bg: 'bg-rose-400/10',   label: 'Panelist Removed' },
  'project.panelist_self_selected':      { icon: UserPlus,     color: 'text-violet-400', bg: 'bg-violet-400/10', label: 'Panelist Self-Selected' },
  'project.deadlines_updated':           { icon: Settings,     color: 'text-slate-400',  bg: 'bg-slate-400/10',  label: 'Deadlines Updated' },
  'project.rejected':                    { icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-400/10',    label: 'Project Rejected' },
  'project.phase_advanced':              { icon: ShieldCheck,  color: 'text-emerald-400',bg: 'bg-emerald-400/10',label: 'Phase Advanced' },
  'project.archived':                    { icon: Archive,      color: 'text-slate-400',  bg: 'bg-slate-400/10',  label: 'Project Archived' },
  'project.certificate_uploaded':        { icon: Award,        color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Certificate Uploaded' },
  'project.bulk_uploaded':               { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Bulk Uploaded' },
  'submission.chapter_uploaded':         { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Chapter Uploaded' },
  'submission.proposal_compiled':        { icon: FileText,     color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Proposal Compiled' },
  'submission.system_design_uploaded':   { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'System Design Uploaded' },
  'submission.test_results_uploaded':    { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Test Results Uploaded' },
  'submission.final_academic_uploaded':  { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Final Academic Uploaded' },
  'submission.final_journal_uploaded':   { icon: Upload,       color: 'text-blue-400',   bg: 'bg-blue-400/10',   label: 'Final Journal Uploaded' },
  'submission.reviewed':                 { icon: ClipboardList,color: 'text-sky-400',    bg: 'bg-sky-400/10',    label: 'Submission Reviewed' },
  'submission.unlocked':                 { icon: Unlock,       color: 'text-amber-400',  bg: 'bg-amber-400/10',  label: 'Submission Unlocked' },
  'evaluation.submitted':               { icon: Award,        color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Evaluation Submitted' },
  'evaluation.unlocked':                { icon: Unlock,       color: 'text-amber-400',  bg: 'bg-amber-400/10',  label: 'Evaluation Unlocked' },
  'evaluation.released':                { icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-400/10',label: 'Evaluation Released' },
};

const FALLBACK_CONFIG = { icon: History, color: 'text-muted-foreground', bg: 'bg-muted/30', label: null };

function getConfig(action) {
  return ACTION_CONFIG[action] ?? FALLBACK_CONFIG;
}

function getActorName(actor) {
  if (!actor) return 'System';
  if (typeof actor === 'string') return actor;
  const parts = [actor.firstName, actor.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : actor.email ?? 'Unknown';
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
  { value: 'all',        label: 'All Events' },
  { value: 'project',    label: 'Project' },
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

  return (
    <div className="space-y-4">
      {/* ── Header + controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, actors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                category === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count ── */}
      <p className="text-xs text-muted-foreground">
        {isLoading ? 'Loading…' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
        {!isLoading && logs.length > 0 && filtered.length !== logs.length
          ? ` (filtered from ${logs.length})`
          : ''}
      </p>

      {/* ── States ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading audit trail…</span>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-muted-foreground">Failed to load audit trail.</p>
          <button
            onClick={refetch}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <History className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
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
            {filtered.map((log) => {
              const cfg = getConfig(log.action);
              const Icon = cfg.icon;
              const actor = log.actor;
              const actorName = getActorName(actor);
              const actorRole = actor?.role ?? log.actorRole ?? null;
              const label = cfg.label ?? log.action;

              return (
                <li key={log._id} className="relative flex gap-4 group">
                  {/* Icon bubble */}
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border ${cfg.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 min-w-0 py-1 pb-4">
                    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 shadow-sm transition-colors group-hover:border-border/80 group-hover:bg-card">
                      {/* Top row */}
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground leading-tight">
                          {label}
                        </span>
                        <time
                          dateTime={log.createdAt}
                          title={formatDate(log.createdAt)}
                          className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0"
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
                        <span className="text-[11px] text-muted-foreground">By</span>
                        <span className="text-[11px] font-medium text-foreground">{actorName}</span>
                        {actorRole && (
                          <Badge
                            variant={getRoleBadgeVariant(actorRole)}
                            className="text-[10px] px-1.5 py-0 h-4 capitalize"
                          >
                            {actorRole}
                          </Badge>
                        )}

                        {/* Action code chip */}
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 bg-muted/40 rounded px-1.5 py-0.5">
                          {log.action}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
