import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  Building,
  Layers,
  Sparkles,
  AlertTriangle,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { projectService } from '@/services/authService';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { projectKeys } from '@/hooks/useProjects';
import { CAPSTONE_PHASES, resolveWorkflowPhase, TITLE_STATUSES } from '@cms/shared';

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
  const queryClient = useQueryClient();
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '09:00 AM - 09:30 AM');
  const [venue, setVenue] = useState('COT Conference Room');
  const [round, setRound] = useState('1st');
  const [defenseType, setDefenseType] = useState('progress');
  const [clientName, setClientName] = useState('Dr. Sales G. Aribe Jr.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isTitleReviewHearing =
    project?.titleStatus === TITLE_STATUSES.SUBMITTED &&
    resolveWorkflowPhase(project) === CAPSTONE_PHASES.PHASE_1;

  const handleUnschedule = async () => {
    if (!project?._id) return;
    setIsSubmitting(true);
    try {
      await projectService.scheduleDefense(project._id, {
        status: 'unscheduled',
        date: null,
        time: '',
      });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['milestone-deadlines'] });
      toast.success(`Defense schedule removed for ${project.teamId?.name || project.title}.`);
      if (onScheduled) onScheduled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove defense schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const hasSecretary = Boolean(project?.secretaryId);
  const panelistCount = project?.panelistIds?.length || 0;
  const hasFullCommittee = isTitleReviewHearing
    ? hasSecretary && panelistCount >= 3
    : hasAdviser && panelistCount >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project?._id) return;

    if (!date) {
      toast.error(`Please select a ${isTitleReviewHearing ? 'hearing' : 'defense'} date.`);
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
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(
        `${isTitleReviewHearing ? 'Title hearing' : 'Defense'} scheduled for ${project.teamId?.name || project.title} on ${date} at ${time}.`,
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
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showClose={false}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault();
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="flex max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-xl border-border bg-card p-0 shadow-lg sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="min-w-0 text-sm sm:text-base font-bold text-foreground truncate">
                  {isTitleReviewHearing ? 'Schedule Title Hearing' : 'Schedule Defense Hearing'}
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-primary/40 bg-primary/10 text-primary shrink-0"
                >
                  {isTitleReviewHearing
                    ? 'Title Review'
                    : `Capstone ${project?.capstonePhase || 2}`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {project?.teamId?.name
                  ? `Team ${project.teamId.name.replace(/^Team\s+/i, '')}`
                  : project?.title ||
                    (isTitleReviewHearing ? 'Title Proposal Hearing' : 'Project Defense Hearing')}
              </p>
              <a
                href={`/projects/${project?._id || project?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium mt-0.5"
              >
                <span>View Linked Project Workspace</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 px-2.5 text-xs gap-1.5 border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <a
                href={`/projects/${project?._id || project?.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Project Workspace</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close schedule dialog"
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 text-xs"
        >
          {/* Committee Readiness Advisory Warning Banner */}
          {!hasFullCommittee && (
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 space-y-1 text-warning-foreground">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                <span>Institutional Notice: Committee Incomplete</span>
              </div>
              <p className="text-[11px] leading-relaxed text-warning-foreground/90">
                This project is not yet fully appointed.
                {isTitleReviewHearing ? (
                  <>
                    {!hasSecretary && ' Committee Secretary is unassigned.'}
                    {panelistCount < 3 &&
                      ` Only ${panelistCount} of 3 defense panelists are appointed.`}{' '}
                    Title proposal review hearings require 1 Secretary and 3 Panelists (Adviser will
                    be chosen by the instructor after proposal approval based on the capstone&apos;s
                    field).
                  </>
                ) : (
                  <>
                    {!hasAdviser && ' Faculty Adviser is unassigned.'}
                    {panelistCount < 3 &&
                      ` Only ${panelistCount} of 3 defense panelists are appointed.`}{' '}
                    Defense hearings officially require 1 Adviser and 3 Panelists for rubric
                    ratification.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Defense Round & Type */}
          {!isTitleReviewHearing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="defense-type"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Defense Type
                </Label>
                <Select value={defenseType} onValueChange={setDefenseType}>
                  <SelectTrigger id="defense-type" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Title/Proposal Defense (Capstone 1)</SelectItem>
                    <SelectItem value="progress">
                      Prototype / Progress Defense (Capstone 2)
                    </SelectItem>
                    <SelectItem value="final">Final Manuscript Defense (Capstone 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="defense-round"
                  className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Defense Round
                </Label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger id="defense-round" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Round (Standard Defense)</SelectItem>
                    <SelectItem value="2nd">2nd Round (Re-defense)</SelectItem>
                    <SelectItem value="3rd">3rd Round (Final Attempt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="defense-date"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                {isTitleReviewHearing ? 'Hearing Date' : 'Defense Date'}
              </Label>
              <Input
                id="defense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="defense-time"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5 text-primary" />
                Time Slot
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="defense-time" className="h-9 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PRESETS.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Popular Time Slot Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">
              Quick Slots:
            </span>
            {POPULAR_TIME_CHIPS.map((t) => (
              <Button
                type="button"
                key={t}
                onClick={() => setTime(t)}
                variant={time === t ? 'secondary' : 'outline'}
                aria-pressed={time === t}
                className="h-7 rounded-md px-2 py-0.5 text-[10px] font-mono"
              >
                {t.split(' - ')[0]}
              </Button>
            ))}
          </div>

          {/* Venue Selector */}
          <div className="space-y-1.5">
            <Label
              htmlFor="defense-venue"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Venue &amp; Location
            </Label>
            <Select value={venue} onValueChange={setVenue}>
              <SelectTrigger id="defense-venue" className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENUE_PRESETS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Client / Industry Partner */}
          {!isTitleReviewHearing && (
            <div className="space-y-1.5">
              <Label
                htmlFor="defense-client"
                className="text-xs font-semibold text-foreground flex items-center gap-1.5"
              >
                <Building className="h-3.5 w-3.5 text-primary" />
                Target Client / Industry Partner
              </Label>
              <Input
                id="defense-client"
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
          )}

          {/* Hearing Committee Notification Roster Snapshot */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" /> Hearing Committee Roster
              </span>
              <Badge
                variant={hasFullCommittee ? 'success' : 'warning'}
                className="h-4 px-1.5 text-[9px] font-bold"
              >
                {hasFullCommittee
                  ? 'Committee Complete'
                  : isTitleReviewHearing && !hasSecretary
                    ? 'Missing Secretary'
                    : `${panelistCount}/3 Panelists`}
              </Badge>
            </div>
            <div className="text-[11px] text-foreground space-y-0.5 font-mono">
              <p>
                <strong className="text-muted-foreground font-sans">Adviser:</strong>{' '}
                {project?.adviserId?.firstName ? (
                  `${project.adviserId.firstName} ${project.adviserId.lastName}`
                ) : isTitleReviewHearing ? (
                  <span className="text-muted-foreground font-sans italic">
                    To be chosen after approval based on field
                  </span>
                ) : (
                  <span className="text-warning-foreground font-sans italic">Unassigned</span>
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
                  <span className="text-warning-foreground font-sans italic">0 appointed</span>
                )}
              </p>
              {(isTitleReviewHearing || project?.secretaryId) && (
                <p>
                  <strong className="text-muted-foreground font-sans">Secretary:</strong>{' '}
                  {project?.secretaryId?.firstName ? (
                    `${project.secretaryId.firstName} ${project.secretaryId.lastName}`
                  ) : (
                    <span className="text-warning-foreground font-sans italic">
                      Unassigned (Required)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Pinned Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-border bg-muted/30 shrink-0">
          <div>
            {Boolean(
              project?.defenseSchedule?.date || project?.defenseSchedule?.status === 'scheduled',
            ) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleUnschedule}
                disabled={isSubmitting}
                className="text-xs h-8 px-3"
              >
                {isTitleReviewHearing ? 'Remove Title Hearing' : 'Remove Schedule'}
              </Button>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              className="text-xs h-auto min-h-[44px] max-w-full whitespace-normal px-3.5 py-2 font-semibold gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-3.5 w-3.5" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isTitleReviewHearing
                    ? 'Confirm & Notify Title Review Committee'
                    : 'Confirm & Notify Hearing Committee'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return modalContent;
}

ScheduleDefenseModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  project: PropTypes.object,
  onScheduled: PropTypes.func,
  initialDate: PropTypes.string,
  initialTime: PropTypes.string,
};
