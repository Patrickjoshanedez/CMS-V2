import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
} from 'lucide-react';

const SAMPLE_EVENTS = [
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
  final: {
    label: 'Final Defense',
    color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
};

export default function DefenseScheduleCalendar({
  events = SAMPLE_EVENTS,
  onSelectEvent,
  canSchedule = false,
}) {
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

  return (
    <Card className="rounded-2xl border-border bg-card shadow-lg">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-bold">Defense &amp; Submission Schedule</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center text-sm font-semibold">
              {monthNames[month]} {year}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Calendar Grid */}
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
              <div
                key={`day-${day}`}
                onClick={() => setSelectedDayEvents(dayEvents.length > 0 ? dayEvents : null)}
                className={`group min-h-[5.5rem] rounded-xl border p-2 text-left transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${
                  isToday ? 'border-primary bg-primary/10 font-bold' : 'border-border/70 bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                    }`}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold text-primary">{dayEvents.length}</span>
                  )}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((evt) => {
                    const cfg = TYPE_CONFIG[evt.type] || TYPE_CONFIG.proposal;
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
              </div>
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
                const cfg = TYPE_CONFIG[evt.type] || TYPE_CONFIG.proposal;
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
                        <span className="text-xs font-semibold text-foreground">{evt.title}</span>
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
      </CardContent>
    </Card>
  );
}
