import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Clock, CheckCircle2, Timer } from 'lucide-react';

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
  defense: 'Defense',
};

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
    badgeClass: 'bg-destructive text-destructive-foreground',
    rowClass: 'border-destructive/40 bg-destructive/5',
    iconClass: 'text-destructive',
  },
  critical: {
    icon: Timer,
    badgeClass: 'bg-destructive text-destructive-foreground',
    rowClass: 'border-destructive/30 bg-destructive/5',
    iconClass: 'text-destructive',
  },
  warning: {
    icon: Clock,
    badgeClass: 'bg-amber-500 text-white dark:bg-amber-600',
    rowClass: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  safe: {
    icon: Clock,
    badgeClass: 'bg-green-600 text-white dark:bg-green-700',
    rowClass: 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  distant: {
    icon: CheckCircle2,
    badgeClass: 'bg-muted text-muted-foreground',
    rowClass: '',
    iconClass: 'text-muted-foreground',
  },
};

/**
 * Single deadline row.
 */
function DeadlineRow({ label, deadline }) {
  const { level, text } = computeUrgency(deadline);
  const config = LEVEL_CONFIG[level];
  const Icon = config.icon;

  const formattedDate = new Date(deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${config.rowClass}`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
        <div className="min-w-0">
          <span className="text-sm font-medium">{label}</span>
          <span className="ml-2 text-xs text-muted-foreground">{formattedDate}</span>
        </div>
      </div>
      <Badge className={`shrink-0 text-xs ${config.badgeClass}`}>{text}</Badge>
    </div>
  );
}

/**
 * DeadlineWarning — Displays all project deadlines with color-coded urgency.
 *
 * Shows urgent deadlines (overdue / critical / warning) first, sorted by
 * proximity, then remaining deadlines in natural order.
 *
 * @param {{ deadlines: Record<string, string|null>, compact?: boolean }} props
 * @param {boolean} [props.compact=false] — When true, only shows deadlines
 *   within the warning threshold (≤ 3 days) or overdue. Useful for inline alerts.
 */
export default function DeadlineWarning({ deadlines, compact = false }) {
  const items = useMemo(() => {
    if (!deadlines) return [];

    const entries = Object.entries(deadlines)
      .filter(([, val]) => val) // skip null deadlines
      .map(([key, val]) => ({
        key,
        label: DEADLINE_LABELS[key] || key,
        deadline: val,
        ...computeUrgency(val),
      }));

    // Sort: overdue first (most overdue at top), then by ms ascending (soonest first)
    entries.sort((a, b) => a.ms - b.ms);

    if (compact) {
      return entries.filter((e) => e.level === 'overdue' || e.level === 'critical' || e.level === 'warning');
    }

    return entries;
  }, [deadlines, compact]);

  if (items.length === 0) return null;

  // Compact mode: inline alert-style (no card wrapper)
  if (compact) {
    const hasOverdue = items.some((i) => i.level === 'overdue');
    const hasCritical = items.some((i) => i.level === 'critical');

    return (
      <div
        className={`rounded-lg border p-4 ${
          hasOverdue || hasCritical
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle
            className={`h-4 w-4 ${
              hasOverdue || hasCritical
                ? 'text-destructive'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          />
          <span className="text-sm font-semibold">
            {hasOverdue ? 'Overdue Deadlines' : 'Upcoming Deadlines'}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <DeadlineRow key={item.key} label={item.label} deadline={item.deadline} />
          ))}
        </div>
      </div>
    );
  }

  // Full mode: card wrapper with all deadlines
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-5 w-5" />
          Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <DeadlineRow key={item.key} label={item.label} deadline={item.deadline} />
        ))}
      </CardContent>
    </Card>
  );
}
