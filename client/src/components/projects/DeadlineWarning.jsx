import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Clock, CheckCircle2, Timer, Info } from 'lucide-react';

/**
 * Deadline urgency thresholds (in milliseconds).
 */
const ONE_DAY = 24 * 60 * 60 * 1000;
const THREE_DAYS = 3 * ONE_DAY;
const SEVEN_DAYS = 7 * ONE_DAY;

/**
 * Friendly display names for each deadline key.
 */
const DEADLINE_LABELS = {
  chapter1: 'Chapter 1',
  chapter2: 'Chapter 2',
  chapter3: 'Chapter 3',
  proposal: 'Proposal',
  chapter4: 'Chapter 4',
  chapter5: 'Chapter 5',
  finalAcademic: 'Full Academic Manuscript',
  finalJournal: 'Condensed Journal Paper',
  defense: 'Defense',
};

/**
 * Check if a deadline value represents an active, valid date.
 * Excludes null, undefined, empty strings, 'unscheduled', 'none', 'cancelled', and invalid dates.
 */
function isValidDeadline(val) {
  if (!val) return false;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (!s || s === 'unscheduled' || s === 'none' || s === 'cancelled' || s === 'tbd') {
      return false;
    }
  }
  const d = new Date(val);
  return !isNaN(d.getTime());
}

/**
 * Compute urgency level and human-readable remaining text.
 * @param {string|Date} deadline - ISO date string or Date object
 * @returns {{ level: 'overdue'|'critical'|'warning'|'safe'|'distant', text: string, ms: number }}
 */
function computeUrgency(deadline) {
  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff < 0) {
    const overdueDays = Math.ceil(Math.abs(diff) / ONE_DAY);
    return {
      level: 'overdue',
      text: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      ms: diff,
    };
  }

  if (diff <= ONE_DAY) {
    const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
    return {
      level: 'critical',
      text: hours === 1 ? '1 hour left' : `${hours} hours left`,
      ms: diff,
    };
  }

  if (diff <= THREE_DAYS) {
    const days = Math.ceil(diff / ONE_DAY);
    return {
      level: 'warning',
      text: days === 1 ? '1 day left' : `${days} days left`,
      ms: diff,
    };
  }

  if (diff <= SEVEN_DAYS) {
    const days = Math.ceil(diff / ONE_DAY);
    return {
      level: 'safe',
      text: `${days} days left`,
      ms: diff,
    };
  }

  const days = Math.ceil(diff / ONE_DAY);
  return {
    level: 'distant',
    text: `${days} days left`,
    ms: diff,
  };
}

/**
 * Visual config per urgency level: icon, badge variant, row classes.
 */
const LEVEL_CONFIG = {
  overdue: {
    icon: AlertTriangle,
    badgeVariant: 'destructive',
    rowClass: 'border-destructive/40 bg-destructive/5',
    iconClass: 'text-destructive',
  },
  critical: {
    icon: Timer,
    badgeVariant: 'destructive',
    rowClass: 'border-destructive/30 bg-destructive/5',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: Clock,
    badgeVariant: 'warning',
    rowClass: 'border-warning/30 bg-warning/5',
    iconClass: 'text-warning',
  },
  safe: {
    icon: Clock,
    badgeVariant: 'success',
    rowClass: 'border-success/30 bg-success/5',
    iconClass: 'text-success',
  },
  distant: {
    icon: CheckCircle2,
    badgeVariant: 'secondary',
    rowClass: '',
    iconClass: 'text-muted-foreground',
  },
  tba: {
    icon: Info,
    badgeVariant: 'info',
    rowClass: 'border-info/30 bg-info/5',
    iconClass: 'text-info',
  },
};

/**
 * Single deadline row.
 */
/**
 * Single deadline row.
 */
function DeadlineRow({ label, deadline, isMoved = false }) {
  const { level, text } = computeUrgency(deadline);
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  const formattedDate = new Date(deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const badgeText = isMoved ? `Deadline moved to ${formattedDate}` : text;
  return (
    <Card className={`flex flex-col gap-1.5 px-4 py-3 ${config.rowClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
          <div className="min-w-0">
            <span className="text-sm font-medium">{label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
        <Badge variant={isMoved ? 'warning' : config.badgeVariant} className="shrink-0 text-xs">
          {badgeText}
        </Badge>
      </div>
      {!isMoved && level === 'overdue' && (
        <p className="text-[11px] text-destructive font-medium pl-7">
          Institutional Gate: Late submission justification is required upon chapter/manuscript
          upload.
        </p>
      )}
      {isMoved && (
        <p className="pl-7 text-[11px] font-medium text-warning-foreground">
          Milestone schedule adjusted. Remaining time: {text}.
        </p>
      )}
    </Card>
  );
}

/**
 * Removed deadline row — neutral status informing proponent that deadline is removed.
 */
function RemovedRow({ label }) {
  return (
    <Card className="flex items-center justify-between bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs font-medium">
        Deadline removed
      </Badge>
    </Card>
  );
}

/**
 * TBA deadline row — informational, no urgency.
 */
function TbaRow({ label }) {
  const config = LEVEL_CONFIG.tba;
  const Icon = config.icon;

  return (
    <Card className={`flex items-center justify-between px-4 py-3 ${config.rowClass}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge variant={config.badgeVariant} className="shrink-0 text-xs">
        To Be Announced
      </Badge>
    </Card>
  );
}

/**
 * DeadlineWarning — Displays all project deadlines with color-coded urgency.
 *
 * Shows urgent deadlines (overdue / critical / warning) first, sorted by
 * proximity, then remaining deadlines in natural order.
 * Handles explicit removed deadlines ("Deadline removed") and rescheduled
 * deadlines ("Deadline moved to [Date]").
 *
 * @param {{ deadlines: Record<string, any>, defenseSchedule?: Record<string, any>, compact?: boolean }} props
 * @param {boolean} [props.compact=false] — When true, shows urgent deadlines or active updates.
 */
export default function DeadlineWarning({ deadlines, defenseSchedule, compact = false }) {
  const tbaSet = useMemo(() => new Set(deadlines?.tba || []), [deadlines]);

  const removedSet = useMemo(() => {
    const set = new Set(deadlines?.removed || []);
    if (deadlines) {
      Object.entries(deadlines).forEach(([k, v]) => {
        if (v === 'removed' || v === 'cancelled' || v === 'unscheduled') {
          set.add(k);
        }
      });
    }
    if (
      defenseSchedule &&
      (defenseSchedule.status === 'unscheduled' ||
        defenseSchedule.status === 'pending_scheduling') &&
      !deadlines?.defense
    ) {
      set.add('defense');
    }
    return set;
  }, [deadlines, defenseSchedule]);

  const movedMap = useMemo(() => deadlines?.moved || {}, [deadlines]);

  // Removed items list
  const removedItems = useMemo(() => {
    if (removedSet.size === 0) return [];
    return [...removedSet]
      .filter((key) => DEADLINE_LABELS[key])
      .map((key) => ({
        key,
        label: DEADLINE_LABELS[key] || key,
      }));
  }, [removedSet]);

  // Dated items — active deadlines with actual dates that are NOT removed
  const datedItems = useMemo(() => {
    if (!deadlines) return [];

    const entries = Object.entries(deadlines)
      .filter(
        ([key, val]) =>
          isValidDeadline(val) &&
          key !== 'tba' &&
          key !== 'removed' &&
          key !== 'moved' &&
          !removedSet.has(key) &&
          DEADLINE_LABELS[key],
      )
      .map(([key, val]) => {
        const isMoved = Boolean(movedMap[key]);
        return {
          key,
          label: DEADLINE_LABELS[key] || key,
          deadline: val,
          isMoved,
          movedData: movedMap[key],
          ...computeUrgency(val),
        };
      });

    // Sort: overdue first (most overdue at top), then by ms ascending (soonest first)
    entries.sort((a, b) => a.ms - b.ms);

    if (compact) {
      return entries.filter(
        (e) =>
          e.level === 'overdue' || e.level === 'critical' || e.level === 'warning' || e.isMoved,
      );
    }

    return entries;
  }, [deadlines, compact, removedSet, movedMap]);

  // TBA items — fields marked TBA with no date (shown only in full mode)
  const tbaItems = useMemo(() => {
    if (!deadlines || compact || tbaSet.size === 0) return [];

    return [...tbaSet]
      .filter((key) => !deadlines[key] && !removedSet.has(key) && DEADLINE_LABELS[key])
      .map((key) => ({
        key,
        label: DEADLINE_LABELS[key] || key,
      }));
  }, [deadlines, compact, tbaSet, removedSet]);

  const hasContent = datedItems.length > 0 || removedItems.length > 0 || tbaItems.length > 0;
  if (!hasContent) return null;

  // Compact mode: inline alert-style
  if (compact) {
    const overdueOrCritical = datedItems.filter(
      (i) => (i.level === 'overdue' || i.level === 'critical') && !i.isMoved,
    );
    const hasUrgent = overdueOrCritical.length > 0;

    // If there are urgent active deadlines: show urgent banner
    if (hasUrgent) {
      const hasOverdue = overdueOrCritical.some((i) => i.level === 'overdue');
      return (
        <Card className="space-y-3 border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">
              {hasOverdue ? 'Overdue Deadlines' : 'Upcoming Deadlines'}
            </span>
          </div>
          <div className="space-y-2">
            {datedItems.map((item) => (
              <DeadlineRow
                key={item.key}
                label={item.label}
                deadline={item.deadline}
                isMoved={item.isMoved}
              />
            ))}
            {removedItems.map((item) => (
              <RemovedRow key={item.key} label={item.label} />
            ))}
          </div>
        </Card>
      );
    }

    // If there are only removed items or moved items: neutral update container
    if (removedItems.length > 0 || datedItems.length > 0) {
      const allUpcoming = datedItems.filter((i) => !i.isMoved);
      const isUpcomingOnly = allUpcoming.length > 0 && removedItems.length === 0;

      return (
        <Card
          className={`space-y-3 p-4 ${
            isUpcomingOnly ? 'border-warning/30 bg-warning/5' : 'border-border/60 bg-muted/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {isUpcomingOnly ? (
              <Clock className="h-4 w-4 text-warning" />
            ) : (
              <Info className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground">
              {isUpcomingOnly ? 'Upcoming Deadlines' : 'Milestone & Deadline Updates'}
            </span>
          </div>
          <div className="space-y-2">
            {datedItems.map((item) => (
              <DeadlineRow
                key={item.key}
                label={item.label}
                deadline={item.deadline}
                isMoved={item.isMoved}
              />
            ))}
            {removedItems.map((item) => (
              <RemovedRow key={item.key} label={item.label} />
            ))}
          </div>
        </Card>
      );
    }

    return null;
  }

  // Full mode: card wrapper with all deadlines + removed + TBA rows
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5" />
          Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {datedItems.map((item) => (
          <DeadlineRow
            key={item.key}
            label={item.label}
            deadline={item.deadline}
            isMoved={item.isMoved}
          />
        ))}
        {removedItems.map((item) => (
          <RemovedRow key={item.key} label={item.label} />
        ))}
        {tbaItems.map((item) => (
          <TbaRow key={item.key} label={item.label} />
        ))}
      </CardContent>
    </Card>
  );
}
