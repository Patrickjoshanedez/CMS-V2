import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Clock, AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';

/**
 * Formats date into institutional BukSU display format (e.g., "Sep 18, 2026").
 */
export function formatDefenseDate(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Determines defense schedule status and classification:
 * - 'redefense': destructive badge
 * - 'overdue': destructive badge
 * - 'scheduled': success badge
 * - 'pending': warning badge
 * - 'completed': success badge
 */
export function resolveDefenseScheduleState(schedule) {
  if (!schedule) return null;

  const status = schedule.status;
  const rawDate = schedule.date;
  const verdict = schedule.verdict;
  const round = schedule.round;

  if (!status && !rawDate) return null;
  if (status === 'none' || status === 'unscheduled' || status === 'cancelled') return null;
  if (!rawDate && status !== 'pending_scheduling') return null;

  // 1. Redefense check:
  // Triggered if status is explicitly 'redefense', or consensus verdict was rejected/major revisions redefense,
  // or round is 2nd/3rd when flagged as redefense.
  const isRedefense =
    status === 'redefense' ||
    verdict === 'rejected' ||
    verdict === 'major_revisions_redefense' ||
    Boolean(schedule.isRedefense) ||
    schedule.defenseType === 'redefense';

  if (isRedefense) {
    const formatted = formatDefenseDate(rawDate);
    return {
      type: 'redefense',
      label: formatted ? `Redefense: ${formatted}` : 'Redefense Required',
      dateText: formatted,
      badgeVariant: 'destructive',
      icon: RotateCcw,
      tooltip: `Redefense Required${schedule.venue ? ` • Venue: ${schedule.venue}` : ''}${
        schedule.time ? ` • ${schedule.time}` : ''
      }${round ? ` (${round} Round)` : ''}`,
    };
  }

  // 2. Overdue check:
  // Scheduled date has elapsed without defense completion, or explicitly flagged as overdue.
  const scheduledDate = rawDate ? new Date(rawDate) : null;
  const isCompleted = status === 'completed';
  const now = new Date();
  // Strip hours for start-of-day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isPastDate =
    scheduledDate &&
    !isNaN(scheduledDate.getTime()) &&
    new Date(scheduledDate.getFullYear(), scheduledDate.getMonth(), scheduledDate.getDate()) <
      today;

  const isOverdue =
    !isCompleted &&
    (status === 'overdue' || schedule.isOverdue === true || (isPastDate && status === 'scheduled'));

  if (isOverdue) {
    const formatted = formatDefenseDate(rawDate);
    return {
      type: 'overdue',
      label: formatted ? `Overdue: ${formatted}` : 'Schedule Overdue',
      dateText: formatted,
      badgeVariant: 'destructive',
      icon: AlertTriangle,
      tooltip: `Defense Hearing Overdue${formatted ? ` (Scheduled ${formatted})` : ''}`,
    };
  }

  // 3. Completed state
  if (isCompleted) {
    const formatted = formatDefenseDate(rawDate);
    return {
      type: 'completed',
      label: formatted ? `Defense Concluded: ${formatted}` : 'Defense Hearing Concluded',
      dateText: formatted,
      badgeVariant: 'success',
      icon: CheckCircle2,
      tooltip: 'Oral defense hearing has concluded and consensus verdict recorded.',
    };
  }

  // 4. Scheduled state (Green)
  if (status === 'scheduled') {
    const formatted = formatDefenseDate(rawDate);
    return {
      type: 'scheduled',
      label: formatted ? `Scheduled: ${formatted}` : 'Defense Scheduled',
      dateText: formatted,
      badgeVariant: 'success',
      icon: Calendar,
      tooltip: `Hearing Confirmed: ${formatted || 'Date set'}${
        schedule.time ? ` at ${schedule.time}` : ''
      }${schedule.venue ? ` (${schedule.venue})` : ''}`,
    };
  }

  // 5. Pending state (Orange / Amber)
  const isPending =
    status === 'pending_scheduling' || status === 'pending' || Boolean(!status && rawDate);
  if (isPending) {
    const formatted = formatDefenseDate(rawDate);
    return {
      type: 'pending',
      label: formatted ? `Pending: ${formatted}` : 'Pending Schedule',
      dateText: formatted,
      badgeVariant: 'warning',
      icon: Clock,
      tooltip: 'Defense schedule is pending instructor confirmation.',
    };
  }

  return null;
}

/**
 * DefenseScheduleBadge component.
 * Prominently displays defense date with institutional color coding:
 * - Orange if pending
 * - Green if scheduled
 * - Red if overdue or redefense
 */
export default function DefenseScheduleBadge({
  defenseSchedule,
  className,
  showIcon = true,
  showTime = false,
}) {
  const state = resolveDefenseScheduleState(defenseSchedule);
  if (!state) return null;

  const Icon = state.icon;
  const timeText = showTime && defenseSchedule?.time ? ` • ${defenseSchedule.time}` : '';

  return (
    <Badge
      variant={state.badgeVariant}
      title={state.tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors cursor-default text-xs px-2.5 py-0.5',
        className,
      )}
    >
      {showIcon && Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span>
        {state.label}
        {timeText}
      </span>
    </Badge>
  );
}

DefenseScheduleBadge.propTypes = {
  defenseSchedule: PropTypes.shape({
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    time: PropTypes.string,
    venue: PropTypes.string,
    round: PropTypes.string,
    status: PropTypes.string,
    verdict: PropTypes.string,
    isOverdue: PropTypes.bool,
    isRedefense: PropTypes.bool,
    defenseType: PropTypes.string,
  }),
  className: PropTypes.string,
  showIcon: PropTypes.bool,
  showTime: PropTypes.bool,
};
