import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';

const TYPE_CONFIG = {
  proposal: {
    label: 'Proposal Defense',
    variant: 'info',
  },
  midterm: {
    label: 'Midterm Review',
    variant: 'secondary',
  },
  progress: {
    label: 'Progress Defense',
    variant: 'warning',
  },
  final: {
    label: 'Final Defense',
    variant: 'success',
  },
  deadline: {
    label: 'Submission Deadline',
    variant: 'warning',
  },
};

const getEventConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.proposal;

export default function DefenseScheduleCalendar({
  events = [],
  onSelectEvent,
  defaultView = 'agenda',
}) {
  const [viewMode, setViewMode] = useState(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === formatted);
  };

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = new Date(`${a.date}T${(a.time || '00:00').split(' ')[0]}`);
      const dateB = new Date(`${b.date}T${(b.time || '00:00').split(' ')[0]}`);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return (a.date || '').localeCompare(b.date || '');
      }
      return dateA - dateB;
    });
  }, [events]);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Defense &amp; Submission Schedule</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div
              role="group"
              aria-label="Schedule view"
              className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1"
            >
              <Button
                aria-pressed={viewMode === 'agenda'}
                type="button"
                variant={viewMode === 'agenda' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('agenda')}
                className="min-h-11 gap-1.5 px-2.5 text-xs font-semibold"
              >
                <List className="h-3.5 w-3.5" />
                <span>Agenda</span>
              </Button>
              <Button
                aria-pressed={viewMode === 'month'}
                type="button"
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="min-h-11 gap-1.5 px-2.5 text-xs font-semibold"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Month</span>
              </Button>
            </div>

            {/* Month Navigator (visible in month view) */}
            {viewMode === 'month' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="min-w-[110px] text-center text-xs font-semibold text-foreground">
                  {monthNames[month]} {year}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {viewMode === 'agenda' ? (
          /* Agenda View: Compact Timeline */
          sortedEvents.length === 0 ? (
            <div className="space-y-3">
              <EmptyState
                icon={CalendarIcon}
                iconVariant="square"
                title="No Scheduled Defense Hearings"
                description="Oral defense hearings and submission deadlines will appear here once scheduled by your instructor or committee."
                compact
              />
              <div className="flex justify-center">
                <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
                  Phase 0–4 Timeline
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedEvents.map((evt) => {
                const cfg = getEventConfig(evt.type);
                const eventDate = new Date(evt.date);
                const isValidDate = !isNaN(eventDate.getTime());
                const monthShort = isValidDate
                  ? eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                  : 'DATE';
                const dayNumber = isValidDate ? eventDate.getDate() : '';
                const eventCardClassName =
                  'flex w-full min-w-0 h-auto flex-col justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/20 sm:flex-row sm:items-center whitespace-normal';
                const eventDetails = (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/40 text-center font-mono">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {monthShort}
                        </span>
                        <span className="text-base font-extrabold leading-none text-foreground">
                          {dayNumber}
                        </span>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={cfg.variant}
                            className="shrink-0 text-[10px] font-semibold"
                          >
                            {cfg.label}
                          </Badge>
                          <h5 className="text-left text-sm font-semibold text-foreground">
                            {evt.title}
                          </h5>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {evt.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-primary" /> {evt.time}
                            </span>
                          )}
                          {evt.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-primary" /> {evt.venue}
                            </span>
                          )}
                          {evt.panel && evt.panel.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-primary" /> {evt.panel.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );

                return onSelectEvent ? (
                  <Button
                    key={evt.id}
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectEvent(evt)}
                    className={`${eventCardClassName} cursor-pointer shadow-sm`}
                  >
                    {eventDetails}
                  </Button>
                ) : (
                  <article key={evt.id} className={`${eventCardClassName} shadow-sm`}>
                    {eventDetails}
                  </article>
                );
              })}
            </div>
          )
        ) : (
          /* Month View: 35-day Grid */
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 rounded-lg bg-muted/10 p-1 opacity-40" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;
                const eventCountLabel = `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`;

                return (
                  <Button
                    type="button"
                    key={`day-${day}`}
                    variant="ghost"
                    onClick={() => setSelectedDayEvents(dayEvents.length > 0 ? dayEvents : null)}
                    aria-label={`${monthNames[month]} ${day}, ${year}: ${eventCountLabel}`}
                    className={`group h-auto min-h-[5.5rem] w-full flex-col items-stretch justify-start whitespace-normal rounded-xl border p-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 ${
                      isToday
                        ? 'border-primary bg-primary/10 font-bold'
                        : 'border-border/70 bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                          isToday
                            ? 'bg-primary text-primary-foreground font-bold'
                            : 'text-foreground'
                        }`}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 py-0 text-[10px] font-bold tabular-nums"
                        >
                          {dayEvents.length}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const cfg = getEventConfig(evt.type);
                        return (
                          <Badge
                            key={evt.id}
                            variant={cfg.variant}
                            className="max-w-full truncate px-1.5 py-0.5 text-[10px] font-medium"
                            title={evt.title}
                          >
                            {evt.title}
                          </Badge>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="block text-[9px] text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Selected Day Event Drawer */}
            {selectedDayEvents && (
              <div
                role="region"
                aria-label="Scheduled sessions on selected date"
                aria-live="polite"
                aria-atomic="true"
                className="space-y-3 rounded-xl border border-info/30 bg-info/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Scheduled Sessions on this Date
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Close scheduled sessions"
                    onClick={() => setSelectedDayEvents(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </Button>
                </div>
                <div className="space-y-2">
                  {selectedDayEvents.map((evt) => {
                    const cfg = getEventConfig(evt.type);
                    return (
                      <div
                        key={evt.id}
                        className="flex flex-col justify-between gap-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={cfg.variant} className="text-[10px]">
                              {cfg.label}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {evt.title}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {evt.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {evt.venue}
                            </span>
                            {evt.panel && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> {evt.panel.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

DefenseScheduleCalendar.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      type: PropTypes.oneOf(['proposal', 'midterm', 'progress', 'final', 'deadline']),
      date: PropTypes.string.isRequired,
      time: PropTypes.string,
      venue: PropTypes.string,
      panel: PropTypes.arrayOf(PropTypes.string),
      status: PropTypes.string,
    }),
  ),
  onSelectEvent: PropTypes.func,
  defaultView: PropTypes.oneOf(['agenda', 'month']),
};
