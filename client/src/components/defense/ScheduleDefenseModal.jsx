import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  X,
  Loader2,
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { projectService } from '@/services/authService';
import { toast } from 'sonner';

const VENUE_PRESETS = [
  'COT Conference Room',
  'COT Computer Lab 2',
  'COT Multi-Purpose Hall',
  'Virtual Hearing (Google Meet)',
  'IT Department Audio-Visual Room',
];

const POPULAR_TIME_CHIPS = [
  '08:30 AM - 09:00 AM',
  '09:00 AM - 09:30 AM',
  '10:30 AM - 11:00 AM',
  '01:30 PM - 02:00 PM',
  '03:00 PM - 03:30 PM',
];

const TIME_PRESETS = [
  '08:00 AM - 08:30 AM',
  '08:30 AM - 09:00 AM',
  '09:00 AM - 09:30 AM',
  '09:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '11:00 AM - 11:30 AM',
  '11:30 AM - 12:00 PM',
  '01:00 PM - 01:30 PM',
  '01:30 PM - 02:00 PM',
  '02:00 PM - 02:30 PM',
  '02:30 PM - 03:00 PM',
  '03:00 PM - 03:30 PM',
  '03:30 PM - 04:00 PM',
  '04:00 PM - 04:30 PM',
  '04:30 PM - 05:00 PM',
];

export default function ScheduleDefenseModal({
  isOpen,
  onClose,
  project,
  onScheduled,
  initialDate,
  initialTime,
}) {
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '09:00 AM - 09:30 AM');
  const [venue, setVenue] = useState('COT Conference Room');
  const [round, setRound] = useState('1st');
  const [defenseType, setDefenseType] = useState('progress');
  const [clientName, setClientName] = useState('Dr. Sales G. Aribe Jr.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    } else if (project?.defenseSchedule?.date) {
      setDate(new Date(project.defenseSchedule.date).toISOString().split('T')[0]);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
    }

    if (initialTime) {
      setTime(initialTime);
    } else if (project?.defenseSchedule?.time) {
      setTime(project.defenseSchedule.time);
    } else {
      setTime('09:00 AM - 09:30 AM');
    }

    if (project?.defenseSchedule?.venue) {
      setVenue(project.defenseSchedule.venue);
    }
    if (project?.defenseSchedule?.status === 'scheduled' && project?.defenseSchedule?.round) {
      setRound(project.defenseSchedule.round);
    } else {
      setRound('1st');
    }
    if (project?.defenseSchedule?.defenseType) {
      const mappedType =
        project.defenseSchedule.defenseType === 'midterm'
          ? 'progress'
          : project.defenseSchedule.defenseType;
      setDefenseType(mappedType);
    } else {
      const phase = Number(project?.capstonePhase ?? 2);
      setDefenseType(phase === 1 ? 'proposal' : phase === 3 ? 'final' : 'progress');
    }
    if (project?.defenseSchedule?.clientName) {
      setClientName(project.defenseSchedule.clientName);
    }
  }, [project, initialDate, initialTime, isOpen]);

  if (!isOpen) return null;

  const hasAdviser = Boolean(project?.adviserId);
  const panelistCount = project?.panelistIds?.length || 0;
  const hasFullCommittee = hasAdviser && panelistCount >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project?._id) return;

    if (!date) {
      toast.error('Please select a defense date.');
      return;
    }
    if (!time) {
      toast.error('Please specify a time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date,
        time,
        venue,
        round,
        defenseType,
        clientName,
        status: 'scheduled',
      };

      await projectService.scheduleDefense(project._id, payload);
      toast.success(
        `Defense scheduled for ${project.teamId?.name || project.title} on ${date} at ${time}.`,
      );
      if (onScheduled) onScheduled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule defense hearing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[88vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                  Schedule Defense Hearing
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-primary/40 bg-primary/10 text-primary shrink-0"
                >
                  Capstone {project?.capstonePhase || 2}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {project?.teamId?.name
                  ? `Team ${project.teamId.name.replace(/^Team\s+/i, '')}`
                  : project?.title || 'Project Defense Hearing'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Committee Readiness Advisory Warning Banner */}
          {!hasFullCommittee && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Institutional Notice: Committee Incomplete</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">
                This project is not yet fully appointed.
                {!hasAdviser && ' Faculty Adviser is unassigned.'}
                {panelistCount < 3 &&
                  ` Only ${panelistCount} of 3 defense panelists are appointed.`}{' '}
                Defense hearings officially require 1 Adviser and 3 Panelists for rubric
                ratification.
              </p>
            </div>
          )}

          {/* Defense Round & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Defense Type
              </Label>
              <select
                value={defenseType}
                onChange={(e) => setDefenseType(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="proposal">Title/Proposal Defense (Capstone 1)</option>
                <option value="progress">Prototype / Progress Defense (Capstone 2)</option>
                <option value="final">Final Manuscript Defense (Capstone 3)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Defense Round
              </Label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="1st">1st Round (Standard Defense)</option>
                <option value="2nd">2nd Round (Re-defense)</option>
                <option value="3rd">3rd Round (Final Attempt)</option>
              </select>
            </div>
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                Defense Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Time Slot
              </Label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                {TIME_PRESETS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Popular Time Slot Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Quick Slots:
            </span>
            {POPULAR_TIME_CHIPS.map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTime(t)}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                  time === t
                    ? 'border-primary bg-primary/15 text-primary font-bold shadow-2xs'
                    : 'border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.split(' - ')[0]}
              </button>
            ))}
          </div>

          {/* Venue Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Venue &amp; Location
            </Label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              {VENUE_PRESETS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Target Client / Industry Partner */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-primary" />
              Target Client / Industry Partner
            </Label>
            <Input
              type="text"
              placeholder="e.g. Dr. Sales G. Aribe Jr."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="h-9 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              A designated section for client recommendations will appear on the Secretary&apos;s
              Minutes (OVPAA-F-INS-032).
            </p>
          </div>

          {/* Hearing Committee Notification Roster Snapshot */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" /> Hearing Committee Roster
              </span>
              <Badge
                variant={hasFullCommittee ? 'default' : 'outline'}
                className={`text-[9px] h-4 px-1.5 font-bold ${
                  hasFullCommittee
                    ? 'bg-emerald-600 text-white'
                    : 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                }`}
              >
                {hasFullCommittee ? 'Committee Complete' : `${panelistCount}/3 Panelists`}
              </Badge>
            </div>
            <div className="text-[11px] text-foreground space-y-0.5 font-mono">
              <p>
                <strong className="text-muted-foreground font-sans">Adviser:</strong>{' '}
                {project?.adviserId?.firstName ? (
                  `${project.adviserId.firstName} ${project.adviserId.lastName}`
                ) : (
                  <span className="text-amber-600 font-sans italic">Unassigned</span>
                )}
              </p>
              <p>
                <strong className="text-muted-foreground font-sans">Panelists:</strong>{' '}
                {panelistCount > 0 ? (
                  project.panelistIds.map((p, i) => (
                    <span
                      key={p._id || i}
                      className="after:content-[',_'] last:after:content-none font-sans"
                    >
                      {p.firstName ? `${p.firstName} ${p.lastName}` : `Panelist ${i + 1}`}
                    </span>
                  ))
                ) : (
                  <span className="text-amber-600 font-sans italic">0 appointed</span>
                )}
              </p>
            </div>
          </div>
        </form>

        {/* Pinned Action Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-muted/30 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-3"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs h-8 px-3.5 font-semibold gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm &amp; Notify Hearing Committee
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

ScheduleDefenseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
  onScheduled: PropTypes.func,
  initialDate: PropTypes.string,
  initialTime: PropTypes.string,
};
