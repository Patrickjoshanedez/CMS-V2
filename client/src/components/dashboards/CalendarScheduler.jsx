import { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

/**
 * CalendarScheduler Component
 * Visual calendar interface displaying submission deadlines, defense schedules,
 * and consultation sessions.
 */
export function CalendarScheduler({ deadlines = [], defenseSchedules = [], onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

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

  // Combine events
  const allEvents = [
    ...deadlines.map((d) => ({
      ...d,
      type: 'deadline',
      date: new Date(d.dueDate || d.date),
    })),
    ...defenseSchedules.map((s) => ({
      ...s,
      type: 'defense',
      date: new Date(s.scheduledAt || s.date),
    })),
  ];

  const getEventsForDay = (day) => {
    return allEvents.filter((e) => {
      const d = e.date;
      return (
        !isNaN(d.getTime()) &&
        d.getDate() === day &&
        d.getMonth() === month &&
        d.getFullYear() === year
      );
    });
  };

  const selectedEvents = getEventsForDay(selectedDay);

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">
            {monthNames[month]} {year}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="text-muted-foreground"
            aria-label="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="text-muted-foreground"
            aria-label="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 grid gap-6 xl:grid-cols-3">
        {/* Calendar Grid */}
        <div className="min-w-0 xl:col-span-2 space-y-2">
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for month start offset */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 rounded-md bg-muted/10" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isSelected = day === selectedDay;
              const isToday =
                day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              return (
                <Button
                  key={`day-${day}`}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedDay(day);
                    onSelectDate?.(new Date(year, month, day));
                  }}
                  className={`h-12 w-full min-w-0 rounded-md p-1 flex flex-col items-center justify-between text-xs transition-all relative ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 font-bold'
                      : isToday
                        ? 'border-success/40 bg-success/10 font-bold'
                        : 'border-border/60 bg-card hover:bg-muted/50'
                  }`}
                >
                  <span className={`${isToday ? 'text-success' : 'text-foreground'}`}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full ${
                            e.type === 'defense' ? 'bg-success' : 'bg-warning'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="rounded-lg border bg-muted/20 p-3 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-bold text-foreground">
              Agenda: {monthNames[month]} {selectedDay}, {year}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {selectedEvents.length} Event{selectedEvents.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-56">
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No deadlines or defense events scheduled for this day.
              </p>
            ) : (
              selectedEvents.map((evt, idx) => (
                <div
                  key={evt._id || idx}
                  className={`space-y-1 rounded-md border p-2.5 text-xs ${
                    evt.type === 'defense'
                      ? 'border-success/30 bg-success/10 text-success-foreground'
                      : 'border-warning/30 bg-warning/10 text-warning-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{evt.title || evt.projectTitle || 'Event'}</span>
                    <span className="text-[10px] uppercase font-semibold">
                      {evt.stage || evt.type}
                    </span>
                  </div>
                  {evt.time && (
                    <div className="flex items-center gap-1 text-[11px] opacity-80">
                      <Clock className="h-3 w-3" />
                      <span>{evt.time}</span>
                    </div>
                  )}
                  {evt.venue && (
                    <div className="flex items-center gap-1 text-[11px] opacity-80">
                      <MapPin className="h-3 w-3" />
                      <span>{evt.venue}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

CalendarScheduler.propTypes = {
  deadlines: PropTypes.array,
  defenseSchedules: PropTypes.array,
  onSelectDate: PropTypes.func,
};

export default CalendarScheduler;
