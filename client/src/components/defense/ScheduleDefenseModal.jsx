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
  const [defenseType, setDefenseType] = useState('midterm');
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
      setDefenseType(project.defenseSchedule.defenseType);
    }
    if (project?.defenseSchedule?.clientName) {
      setClientName(project.defenseSchedule.clientName);
    }
  }, [project, initialDate, initialTime, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a defense date.');
      return;
    }
    if (!venue.trim()) {
      toast.error('Please specify a defense venue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        date,
        time: time.trim(),
        venue: venue.trim(),
        round,
        defenseType,
        clientName: clientName.trim(),
      };
      await projectService.scheduleDefense(project._id, payload);
      toast.success('Defense hearing scheduled! Notifications sent to team and committee.');
      if (onScheduled) onScheduled();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to schedule defense hearing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Schedule Defense Hearing</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-primary/40 bg-primary/10 text-primary"
                >
                  Capstone 2
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {project?.title || 'Project Defense Hearing'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Defense Round & Type */}
          <div className="grid grid-cols-2 gap-3">
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
                <option value="midterm">Prototype Defense (Capstone 2)</option>
                <option value="proposal">Title/Proposal Defense (Capstone 1)</option>
                <option value="final">Final Manuscript Defense (Capstone 4)</option>
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
                Time Slot (30 Min Standard / Preset)
              </Label>
              <Input
                type="text"
                placeholder="e.g. 09:00 AM - 09:30 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* 30-Min Standard Slot Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              Standard 30-Min Slots:
            </span>
            <div className="flex flex-wrap gap-1">
              {TIME_PRESETS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTime(t)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                    time === t
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border/80 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.split(' - ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Venue Selector / Custom Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Venue &amp; Location
            </Label>
            <Input
              type="text"
              placeholder="e.g. COT Conference Room"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="h-9 text-xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {VENUE_PRESETS.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setVenue(v)}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Client Attribution */}
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
            <p className="text-[11px] text-muted-foreground">
              A designated section for client recommendations will appear on the Secretary&apos;s
              Minutes (OVPAA-F-INS-032).
            </p>
          </div>

          {/* Committee Roster Snapshot */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Hearing Committee Notification Roster
            </span>
            <div className="text-xs text-foreground space-y-0.5">
              <p>
                <strong className="text-muted-foreground">Adviser:</strong>{' '}
                {project?.adviserId?.firstName
                  ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                  : 'Assigned Faculty Adviser'}
              </p>
              <p>
                <strong className="text-muted-foreground">Defense Secretary:</strong>{' '}
                {project?.secretaryId?.firstName
                  ? `${project.secretaryId.firstName} ${project.secretaryId.lastName}`
                  : 'Appointed Committee Secretary'}
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-9 font-semibold gap-1.5 shadow-xs"
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
        </form>
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
