import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

export const SAMPLE_EVENTS = [
  {
    id: 'evt-1',
    title: 'Title Proposal Defense — Team Alpha (HealthAI)',
    type: 'proposal',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '09:00 AM - 10:30 AM',
    venue: 'Room 304 / Google Meet',
    panel: ['Dr. Louie Jay Labastida', 'Prof. Raul Lecaros', 'Prof. Joseph Abella'],
    status: 'scheduled',
  },
  {
    id: 'evt-2',
    title: 'Midterm Prototype Review — Team ByteCraft',
    type: 'midterm',
    date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    time: '01:30 PM - 03:00 PM',
    venue: 'COT Lab 2',
    panel: ['Dr. Sales G. Aribe Jr.', 'Prof. Glaiza Mae Libe'],
    status: 'scheduled',
  },
  {
    id: 'evt-3',
    title: 'Final Manuscript Defense — Team DataPulse',
    type: 'final',
    date: new Date(Date.now() + 86400000 * 9).toISOString().split('T')[0],
    time: '10:00 AM - 12:00 PM',
    venue: 'COT Conference Hall',
    panel: ['Dr. Marilou Espina', 'Dr. Louie Jay Labastida', 'Prof. Raul Lecaros'],
    status: 'confirmed',
  },
];

const TYPE_CONFIG = {
  proposal: {
    label: 'Proposal Defense',
    color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
  },
  midterm: {
    label: 'Midterm Review',
    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  progress: {
    label: 'Progress Defense',
    color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    dot: 'bg-indigo-500',
  },
  final: {
    label: 'Final Defense',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  deadline: {
    label: 'Submission Deadline',
    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    dot: 'bg-purple-500',
  },
};

const getEventConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.proposal;

export default function DefenseScheduleCalendar({
  events = [],
  onSelectEvent,
  canSchedule = false,
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
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Defense &amp; Submission Schedule</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Month</span>
              </button>
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center sm:text-left">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    No Scheduled Defense Hearings
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Oral defense hearings and submission deadlines will appear here once scheduled
                    by your instructor or committee.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                Phase 0–4 Timeline
              </Badge>
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

                return (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent?.(evt)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:bg-muted/20 ${
                      onSelectEvent ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/40 font-mono text-center">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {monthShort}
                        </span>
                        <span className="text-base font-extrabold leading-none text-foreground">
                          {dayNumber}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${cfg.color}`}
                          >
                            {cfg.label}
                          </Badge>
                          <h5 className="text-sm font-semibold text-foreground">{evt.title}</h5>
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
                  </div>
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

                return (
                  <button
                    type="button"
                    key={`day-${day}`}
                    onClick={() => setSelectedDayEvents(dayEvents.length > 0 ? dayEvents : null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDayEvents(dayEvents.length > 0 ? dayEvents : null);
                      }
                    }}
                    aria-label={`${monthNames[month]} ${day}, ${year}: ${dayEvents.length} events`}
                    className={`group min-h-[5.5rem] w-full rounded-xl border p-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
                        <span className="text-[10px] font-bold text-primary">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((evt) => {
                        const cfg = getEventConfig(evt.type);
                        return (
                          <div
                            key={evt.id}
                            className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium border ${cfg.color}`}
                            title={evt.title}
                          >
                            {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <span className="block text-[9px] text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Event Drawer */}
            {selectedDayEvents && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Scheduled Sessions on this Date
                  </h4>
                  <Button
                    variant="ghost"
                    size="xs"
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border bg-card p-3 shadow-sm gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
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
