import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useProjects, projectKeys } from '@/hooks/useProjects';
import { projectService, academicService } from '@/services/authService';
import { toast } from 'sonner';
import ScheduleDefenseModal from '@/components/defense/ScheduleDefenseModal';
import {
  CalendarClock,
  Calendar,
  Clock,
  MapPin,
  Search,
  Users,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  GripVertical,
  Sparkles,
  LayoutGrid,
  List,
  FolderOpen,
  UserCheck,
  User,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const TIMELINE_START_HOUR = 8; // 08:00 AM
export const TIMELINE_END_HOUR = 17; // 05:00 PM
export const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 9 hours
export const PIXELS_PER_HOUR = 72; // Exact 72px per hour (6px per 5-minute quantum)
export const TOTAL_TIMELINE_HEIGHT = TOTAL_HOURS * PIXELS_PER_HOUR; // 648px
export const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60; // 1.2px per minute
export const HOURS_ARRAY = [8, 9, 10, 11, 12, 13, 14, 15, 16];

export const DEFENSE_TIME_SLOTS = [
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
];

/**
 * Resolves the team leader's full name from project metadata
 */
export function getTeamLeaderName(project) {
  const leader = project?.teamId?.leaderId;
  if (leader && (leader.firstName || leader.lastName)) {
    return `${leader.firstName || ''} ${leader.lastName || ''}`.trim();
  }
  const leadRole = project?.teamId?.memberRoles?.find(
    (mr) => mr.role?.toLowerCase().includes('lead') || mr.role?.toLowerCase().includes('analyst'),
  );
  if (leadRole?.userId && (leadRole.userId.firstName || leadRole.userId.lastName)) {
    return `${leadRole.userId.firstName || ''} ${leadRole.userId.lastName || ''}`.trim();
  }
  const firstMember = project?.teamId?.members?.[0];
  if (firstMember && (firstMember.firstName || firstMember.lastName)) {
    return `${firstMember.firstName || ''} ${firstMember.lastName || ''}`.trim();
  }
  return null;
}

/**
 * Parses a time string like "09:15 AM - 10:30 AM" into minutes from 8:00 AM and duration
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return { startMinutes: 60, duration: 30 }; // default 9:00 AM (60 min from 8am), 30 min duration
  const parts = timeStr.split(' - ');
  const startPart = parts[0]?.trim() || '';
  const endPart = parts[1]?.trim() || '';

  const parseSingle = (s) => {
    const match = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 540; // 9:00 AM in minutes from midnight
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const isPM = match[3].toUpperCase() === 'PM';
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  };

  const startM = parseSingle(startPart);
  const endM = endPart ? parseSingle(endPart) : startM + 30;
  const duration = Math.max(15, endM - startM);
  // minutes relative to 8:00 AM (480 minutes from midnight)
  const startFrom8AM = Math.max(0, Math.min(TOTAL_HOURS * 60, startM - 480));
  return { startMinutes: startFrom8AM, duration };
}

/**
 * Converts minutes from 8:00 AM and duration into a standard 12-hour formatted time string
 */
export function formatMinutesToTime(minutesFrom8AM, durationMinutes = 30) {
  const startM = 480 + minutesFrom8AM;
  const endM = startM + durationMinutes;

  const to12h = (totalM) => {
    const h24 = Math.floor(totalM / 60);
    const m = totalM % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return `${to12h(startM)} - ${to12h(endM)}`;
}

/**
 * Formats a duration in minutes into a human-readable badge label (e.g. "1h 15m")
 */
export function formatDurationLabel(minutes) {
  const mNum = Number(minutes) >= 5 ? Number(minutes) : 30;
  const h = Math.floor(mNum / 60);
  const m = mNum % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

/**
 * Normalizes any Date or ISO string into a local YYYY-MM-DD key without UTC shifting
 */
export function toLocalDateKey(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * DefenseSchedulingPage — Dedicated Instructor Defense Scheduling Command Center.
 *
 * Centralized dashboard for Course Instructors to monitor defense readiness across
 * all capstone teams, track adviser endorsements, and schedule defense hearings
 * with assigned panelists, timeslots, and client representatives.
 */
export default function DefenseSchedulingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending_scheduling' | 'scheduled' | 'in_progress'
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table' | 'grid'

  // Modal state
  const [selectedProject, setSelectedProject] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [initialScheduleDate, setInitialScheduleDate] = useState('');
  const [initialScheduleTime, setInitialScheduleTime] = useState('');

  // Fluid Drag-and-Drop & Date Navigation State
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [popoverMonth, setPopoverMonth] = useState(() => new Date());
  const datePickerPopoverRef = useRef(null);

  const [draggedProject, setDraggedProject] = useState(null);
  const [dragOverState, setDragOverState] = useState(null); // { dateStr, topPx, heightPx, slotTime, minutesFrom8AM }
  const [resizingState, setResizingState] = useState(null); // { project, startY, initialDuration, currentDuration, dateStr }

  // Configurable Default Meeting Duration (typed minutes between 5 and 360)
  const [defaultDefenseDuration, setDefaultDefenseDuration] = useState(() => {
    try {
      const stored = localStorage.getItem('cms-default-defense-duration');
      const parsed = parseInt(stored, 10);
      return !isNaN(parsed) && parsed >= 5 && parsed <= 360 ? parsed : 30;
    } catch {
      return 30;
    }
  });
  const [isTrayDragOver, setIsTrayDragOver] = useState(false);

  // Close mini-calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerPopoverRef.current && !datePickerPopoverRef.current.contains(event.target)) {
        setIsDatePopoverOpen(false);
      }
    }
    if (isDatePopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePopoverOpen]);

  // Fetch all active capstone projects (limit 100 to list all teams)
  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useProjects({
    limit: 100,
    excludeArchived: true,
  });

  // Window listener for 5-minute block resizing
  useEffect(() => {
    if (!resizingState) return;

    const handleMouseMove = (e) => {
      const deltaY = e.clientY - resizingState.startY;
      // 6px = 5 minutes (72px / 60 * 5)
      const deltaMinutes = Math.round(deltaY / 6) * 5;
      const newDuration = Math.max(15, Math.min(240, resizingState.initialDuration + deltaMinutes));
      setResizingState((prev) => (prev ? { ...prev, currentDuration: newDuration } : null));
    };

    const handleMouseUp = async () => {
      const finalState = resizingState;
      setResizingState(null);
      if (!finalState || finalState.currentDuration === finalState.initialDuration) return;

      const { project, currentDuration } = finalState;
      const { startMinutes } = parseTimeToMinutes(project.defenseSchedule?.time);
      const newTimeSlot = formatMinutesToTime(startMinutes, currentDuration);

      try {
        await projectService.scheduleDefense(project._id, {
          ...(project.defenseSchedule || {}),
          time: newTimeSlot,
        });
        toast.success(
          `Duration updated for "${project.teamId?.name || project.title}" to ${formatDurationLabel(currentDuration)} (${newTimeSlot}).`,
        );
        refetchProjects();
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to update defense duration.');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingState, refetchProjects]);

  // Fetch sections for filtering
  const { data: sectionsData } = useQuery({
    queryKey: ['academic-sections'],
    queryFn: async () => {
      const res = await academicService.listSections({ limit: 100 });
      return res.data?.data?.sections || res.data?.sections || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const sections = Array.isArray(sectionsData) ? sectionsData : [];

  // Filter out any archived records
  const allProjects = useMemo(() => {
    const rawProjects = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    return rawProjects.filter((p) => {
      const normalizedStatus = String(p.projectStatus || p.status || '').toLowerCase();
      return p.isArchived !== true && normalizedStatus !== 'archived';
    });
  }, [projectsData]);

  // Executive KPI calculations
  const kpis = useMemo(() => {
    const total = allProjects.length;
    let pending = 0;
    let scheduled = 0;
    let inProgress = 0;

    allProjects.forEach((p) => {
      const defStatus = p.defenseSchedule?.status;
      if (defStatus === 'pending_scheduling') {
        pending += 1;
      } else if (defStatus === 'scheduled') {
        scheduled += 1;
      } else {
        inProgress += 1;
      }
    });

    return { total, pending, scheduled, inProgress };
  }, [allProjects]);

  // Filtered projects based on search, active tab, section, and phase
  const filteredProjects = useMemo(() => {
    return allProjects.filter((project) => {
      const defStatus = project.defenseSchedule?.status;

      // Tab filter
      if (activeTab === 'pending_scheduling' && defStatus !== 'pending_scheduling') {
        return false;
      }
      if (activeTab === 'scheduled' && defStatus !== 'scheduled') {
        return false;
      }
      if (
        activeTab === 'in_progress' &&
        (defStatus === 'pending_scheduling' || defStatus === 'scheduled')
      ) {
        return false;
      }

      // Section filter
      if (selectedSection) {
        const secId = project.sectionId?._id || project.sectionId;
        const teamSecId = project.teamId?.sectionId?._id || project.teamId?.sectionId;
        if (String(secId) !== selectedSection && String(teamSecId) !== selectedSection) {
          return false;
        }
      }

      // Phase filter
      if (selectedPhase) {
        if (String(project.capstonePhase || 1) !== selectedPhase) {
          return false;
        }
      }

      // Live search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const teamName = (project.teamId?.name || '').toLowerCase();
        const title = (project.title || '').toLowerCase();
        const adviserName =
          `${project.adviserId?.firstName || ''} ${project.adviserId?.lastName || ''}`.toLowerCase();
        const leaderName =
          `${project.teamId?.leaderId?.firstName || ''} ${project.teamId?.leaderId?.lastName || ''}`.toLowerCase();
        const sectionName = (project.sectionId?.name || '').toLowerCase();

        return (
          teamName.includes(q) ||
          title.includes(q) ||
          adviserName.includes(q) ||
          leaderName.includes(q) ||
          sectionName.includes(q)
        );
      }

      return true;
    });
  }, [allProjects, activeTab, selectedSection, selectedPhase, search]);

  // Calendar Monday-Friday days calculation based on selectedDate
  const weekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday of selectedDate
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      days.push(dayDate);
    }
    return days;
  }, [selectedDate]);

  const isCurrentWeek = useMemo(() => {
    const now = new Date();
    const nowDay = now.getDay();
    const nowDiff = now.getDate() - nowDay + (nowDay === 0 ? -6 : 1);
    const nowMonday = new Date(now.setDate(nowDiff));
    nowMonday.setHours(0, 0, 0, 0);
    return weekDays[0]?.toDateString() === nowMonday.toDateString();
  }, [weekDays]);

  const popoverDays = useMemo(() => {
    const year = popoverMonth.getFullYear();
    const month = popoverMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun..6=Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  }, [popoverMonth]);

  // Group scheduled defenses by date string (YYYY-MM-DD)
  const scheduledByDateMap = useMemo(() => {
    const map = new Map();
    allProjects.forEach((p) => {
      if (p.defenseSchedule?.date && p.defenseSchedule?.status === 'scheduled') {
        const dStr = toLocalDateKey(p.defenseSchedule.date);
        if (dStr) {
          if (!map.has(dStr)) map.set(dStr, []);
          map.get(dStr).push(p);
        }
      }
    });
    return map;
  }, [allProjects]);

  // Teams displayed in the scheduling tray (or all matching search results)
  const unscheduledTeams = useMemo(() => {
    if (search.trim()) {
      return filteredProjects;
    }
    return filteredProjects.filter((p) => p.defenseSchedule?.status !== 'scheduled');
  }, [filteredProjects, search]);

  const handleOpenScheduleModal = (project, date = '', time = '') => {
    setSelectedProject(project);
    setInitialScheduleDate(date);
    setInitialScheduleTime(time || '09:00 AM - 09:30 AM');
    setIsScheduleModalOpen(true);
  };

  const handleColumnDragOver = (dateStr, e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const rawMinutes = (offsetY / PIXELS_PER_HOUR) * 60;
    // Snap to 5-minute intervals
    const snappedMinutes = Math.round(rawMinutes / 5) * 5;
    const defaultDuration = defaultDefenseDuration; // Use configurable general duration
    const clampedMinutes = Math.max(
      0,
      Math.min(TOTAL_HOURS * 60 - defaultDuration, snappedMinutes),
    );
    const slotTime = formatMinutesToTime(clampedMinutes, defaultDuration);

    setDragOverState({
      dateStr,
      topPx: clampedMinutes * PIXELS_PER_MINUTE,
      heightPx: defaultDuration * PIXELS_PER_MINUTE,
      slotTime,
      minutesFrom8AM: clampedMinutes,
    });
  };

  const handleColumnDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverState(null);
    }
  };

  const handleColumnDrop = async (dateStr, e) => {
    e.preventDefault();
    const state = dragOverState;
    setDragOverState(null);

    let data = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {
      // fallback
    }

    const targetProjId = data?.projectId || draggedProject?._id;
    const proj = allProjects.find((p) => p._id === targetProjId) || draggedProject;
    if (!proj) return;

    const timeSlot = state?.slotTime || '09:00 AM - 09:30 AM';
    const { startMinutes: proposedStart, duration: proposedDuration } =
      parseTimeToMinutes(timeSlot);
    const proposedEnd = proposedStart + proposedDuration;

    // Overlap collision detection: verify no other team is already scheduled in this slot on this date
    const existingOnDate = scheduledByDateMap.get(dateStr) || [];
    const conflict = existingOnDate.find((existingProj) => {
      if (String(existingProj._id) === String(proj._id)) return false; // same team rescheduling is allowed
      const { startMinutes: exStart, duration: exDuration } = parseTimeToMinutes(
        existingProj.defenseSchedule?.time,
      );
      const exEnd = exStart + exDuration;
      return proposedStart < exEnd && proposedEnd > exStart;
    });

    if (conflict) {
      const conflictTeam = conflict.teamId?.name || conflict.title || 'Another team';
      const conflictTime = conflict.defenseSchedule?.time || 'this timeslot';
      toast.error(
        `Time slot conflict: "${conflictTeam}" is already scheduled at ${conflictTime}. Please choose an open slot.`,
      );
      setDraggedProject(null);
      return;
    }

    // Direct Scheduling with Optimistic UI Update:
    // 1. Snapshot previous cache for instant rollback if API fails
    const queryFilter = { limit: 100, excludeArchived: true };
    const queryKey = projectKeys.list(queryFilter);
    const previousProjectsData = queryClient.getQueryData(queryKey);

    const updatedSchedule = {
      ...(proj.defenseSchedule || {}),
      date: dateStr,
      time: timeSlot,
      venue: proj.defenseSchedule?.venue || 'AVR 1 (COT Main)',
      round: proj.defenseSchedule?.round || '1st',
      defenseType: proj.defenseSchedule?.defenseType || 'midterm',
      clientName: proj.defenseSchedule?.clientName || 'Dr. Sales G. Aribe Jr.',
      status: 'scheduled',
    };

    // 2. Visually snap the card into place immediately
    if (previousProjectsData?.projects) {
      queryClient.setQueryData(queryKey, {
        ...previousProjectsData,
        projects: previousProjectsData.projects.map((p) =>
          p._id === proj._id ? { ...p, defenseSchedule: updatedSchedule } : p,
        ),
      });
    }

    try {
      await projectService.scheduleDefense(proj._id, updatedSchedule);
      const dayLabel = new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      toast.success(
        `Defense scheduled for "${proj.teamId?.name || proj.title}" on ${dayLabel} at ${timeSlot}.`,
      );
      refetchProjects();
    } catch (err) {
      // 3. Rollback seamlessly if the API call fails
      if (previousProjectsData) {
        queryClient.setQueryData(queryKey, previousProjectsData);
      }
      toast.error(err?.response?.data?.message || 'Failed to schedule defense. Reverting changes.');
    }

    setDraggedProject(null);
  };

  const handleTrayDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isTrayDragOver) {
      setIsTrayDragOver(true);
    }
  };

  const handleTrayDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsTrayDragOver(false);
    }
  };

  const handleTrayDrop = async (e) => {
    e.preventDefault();
    setIsTrayDragOver(false);

    let data = null;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) data = JSON.parse(raw);
    } catch {
      // fallback
    }

    const targetProjId = data?.projectId || draggedProject?._id;
    const proj = allProjects.find((p) => p._id === targetProjId) || draggedProject;
    if (!proj) return;

    // Check if the project is currently scheduled or has a date assigned
    const isCurrentlyScheduled =
      proj.defenseSchedule?.status === 'scheduled' || Boolean(proj.defenseSchedule?.date);

    if (!isCurrentlyScheduled) {
      setDraggedProject(null);
      return;
    }

    // Direct Unschedule with Optimistic UI Update:
    // 1. Snapshot previous cache for instant rollback if API fails
    const queryFilter = { limit: 100, excludeArchived: true };
    const queryKey = projectKeys.list(queryFilter);
    const previousProjectsData = queryClient.getQueryData(queryKey);

    // Normalize duration to the general defaultDefenseDuration
    const baseStart = parseTimeToMinutes(proj.defenseSchedule?.time).startMinutes;
    const normalizedTime = formatMinutesToTime(baseStart, defaultDefenseDuration);

    const updatedSchedule = {
      ...(proj.defenseSchedule || {}),
      date: null,
      time: normalizedTime,
      status: 'pending_scheduling',
    };

    // 2. Visually move the card back to the tray immediately
    if (previousProjectsData?.projects) {
      queryClient.setQueryData(queryKey, {
        ...previousProjectsData,
        projects: previousProjectsData.projects.map((p) =>
          p._id === proj._id ? { ...p, defenseSchedule: updatedSchedule } : p,
        ),
      });
    }

    try {
      await projectService.scheduleDefense(proj._id, {
        status: 'pending_scheduling',
        date: null,
        time: normalizedTime,
      });
      const teamName = proj.teamId?.name || proj.title;
      toast.success(
        `Defense hearing for "${teamName}" returned to Awaiting Scheduling (${formatDurationLabel(defaultDefenseDuration)} duration).`,
      );
      refetchProjects();
    } catch (err) {
      // 3. Rollback seamlessly if the API call fails
      if (previousProjectsData) {
        queryClient.setQueryData(queryKey, previousProjectsData);
      }
      toast.error(
        err?.response?.data?.message ||
          'Failed to move hearing back to awaiting scheduling. Reverting changes.',
      );
    }

    setDraggedProject(null);
  };

  const handleScheduledSuccess = () => {
    refetchProjects();
  };

  if (projectsLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (projectsError) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {projectsError?.response?.data?.message ||
              'Failed to load capstone teams for defense scheduling.'}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Defense Scheduling Center
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    Instructor Command
                  </Badge>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Schedule oral defense hearings, manage committee timeslots, and track defense
                  readiness across all teams.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchProjects()}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Refresh Roster
            </Button>
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
                aria-label="Calendar View"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode('table')}
                title="Table View"
                aria-label="Table View"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Executive Summary Ribbon */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Card 1: Total Teams */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'all' ? 'ring-2 ring-primary/40' : ''
            }`}
            onClick={() => setActiveTab('all')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Teams
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{kpis.total}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Enrolled capstone projects
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Ready for Scheduling */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/15 ${
              activeTab === 'pending_scheduling' ? 'ring-2 ring-emerald-500/50' : ''
            }`}
            onClick={() => setActiveTab('pending_scheduling')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  Ready for Defense
                  {kpis.pending > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {kpis.pending}
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                  Adviser endorsed &amp; awaiting schedule
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Scheduled Hearings */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/15 ${
              activeTab === 'scheduled' ? 'ring-2 ring-blue-500/50' : ''
            }`}
            onClick={() => setActiveTab('scheduled')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Scheduled Hearings
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {kpis.scheduled}
                </p>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  Timeslot &amp; venue confirmed
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <Calendar className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: In Progress / Drafting */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeTab === 'in_progress' ? 'ring-2 ring-primary/40' : ''
            }`}
            onClick={() => setActiveTab('in_progress')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{kpis.inProgress}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Drafting / adviser review
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All Teams ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending_scheduling')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pending_scheduling'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              Ready for Defense ({kpis.pending})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
              }`}
            >
              Scheduled ({kpis.scheduled})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'in_progress'
                  ? 'bg-muted text-foreground font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              In Progress ({kpis.inProgress})
            </button>
          </div>

          {/* Search + Section + Phase Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search team, project, adviser..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Section Filter */}
            {sections.length > 0 && (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            )}

            {/* Capstone Filter */}
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Capstones</option>
              <option value="1">Capstone 1 (Title Defense)</option>
              <option value="2">Capstone 2 (Midterm Defense)</option>
              <option value="3">Capstone 3 (Progress Defense)</option>
              <option value="4">Capstone 4 (Final Defense)</option>
            </select>
          </div>
        </div>

        {/* Teams Defense Roster: Interactive Drag-and-Drop Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Controls Bar with Rapid Jump-To Mini-Calendar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const prevW = new Date(selectedDate);
                    prevW.setDate(prevW.getDate() - 7);
                    setSelectedDate(prevW);
                  }}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev Week
                </Button>
                <Button
                  variant={isCurrentWeek ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    setSelectedDate(now);
                    setPopoverMonth(now);
                  }}
                  className="h-8 px-3 text-xs font-medium"
                >
                  Current Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const nextW = new Date(selectedDate);
                    nextW.setDate(nextW.getDate() + 7);
                    setSelectedDate(nextW);
                  }}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  Next Week
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Interactive Date Range Button + Mini-Calendar Popover */}
              <div className="flex items-center gap-3">
                <div className="relative" ref={datePickerPopoverRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setPopoverMonth(new Date(selectedDate));
                      setIsDatePopoverOpen((prev) => !prev);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground font-mono transition-colors shadow-xs cursor-pointer"
                  >
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>
                      {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      –{' '}
                      {weekDays[4].toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {/* Mini-Calendar Popover */}
                  {isDatePopoverOpen && (
                    <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-72 p-3 bg-card text-card-foreground border border-border rounded-xl shadow-xl z-50 animate-in fade-in-0 zoom-in-95">
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-xs font-bold text-foreground">
                          {popoverMonth.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setPopoverMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                              );
                            }}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              setPopoverMonth(
                                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                              );
                            }}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Day Name Headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground py-2">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {popoverDays.map((dayObj, i) => {
                          if (!dayObj) {
                            return <div key={`empty-${i}`} className="h-7 w-7" />;
                          }
                          const isSelected = selectedDate.toDateString() === dayObj.toDateString();
                          const isToday = new Date().toDateString() === dayObj.toDateString();
                          const isInCurrentWeek = weekDays.some(
                            (w) => w.toDateString() === dayObj.toDateString(),
                          );

                          return (
                            <button
                              key={dayObj.toISOString()}
                              type="button"
                              onClick={() => {
                                setSelectedDate(dayObj);
                                setIsDatePopoverOpen(false);
                              }}
                              className={`h-7 w-7 text-xs rounded-md font-medium transition-colors flex items-center justify-center cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                  : isInCurrentWeek
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : isToday
                                      ? 'border border-primary text-primary font-bold'
                                      : 'text-foreground hover:bg-muted'
                              }`}
                            >
                              {dayObj.getDate()}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const now = new Date();
                            setSelectedDate(now);
                            setPopoverMonth(now);
                            setIsDatePopoverOpen(false);
                          }}
                        >
                          Jump to Today
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => setIsDatePopoverOpen(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <span className="text-xs text-muted-foreground hidden md:inline">
                  Drag any team or hearing to schedule / reschedule (
                  {formatDurationLabel(defaultDefenseDuration)} default, 5-min snap)
                </span>
              </div>
            </div>

            {/* Main Calendar + Tray Layout */}
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Left Column: Awaiting Scheduling Tray */}
              <div className="w-full lg:w-80 shrink-0 space-y-3">
                <Card
                  data-testid="awaiting-scheduling-tray"
                  onDragOver={handleTrayDragOver}
                  onDragLeave={handleTrayDragLeave}
                  onDrop={handleTrayDrop}
                  className={`border-border shadow-xs transition-all ${
                    isTrayDragOver
                      ? 'border-primary border-dashed bg-primary/5 ring-2 ring-primary/30 shadow-md'
                      : ''
                  }`}
                >
                  <CardHeader className="p-3.5 pb-2 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {search.trim() ? 'Matching Teams' : 'Awaiting Scheduling'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {/* Configurable Typed Default Duration Input */}
                        <div className="flex items-center gap-1 bg-background border border-border/70 rounded-md px-2 py-0.5 shadow-2xs hover:border-primary/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <input
                            type="number"
                            min={5}
                            max={360}
                            step={5}
                            data-testid="defense-duration-input"
                            value={defaultDefenseDuration}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '') {
                                setDefaultDefenseDuration('');
                                return;
                              }
                              const num = parseInt(val, 10);
                              if (!isNaN(num)) {
                                const capped = Math.min(360, Math.max(0, num));
                                setDefaultDefenseDuration(capped);
                                if (capped >= 5) {
                                  try {
                                    localStorage.setItem(
                                      'cms-default-defense-duration',
                                      String(capped),
                                    );
                                  } catch {
                                    // ignore
                                  }
                                }
                              }
                            }}
                            onBlur={() => {
                              const num = parseInt(defaultDefenseDuration, 10);
                              if (isNaN(num) || num < 5) {
                                setDefaultDefenseDuration(30);
                                try {
                                  localStorage.setItem('cms-default-defense-duration', '30');
                                } catch {
                                  // ignore
                                }
                              } else {
                                const clamped = Math.min(360, num);
                                setDefaultDefenseDuration(clamped);
                                try {
                                  localStorage.setItem(
                                    'cms-default-defense-duration',
                                    String(clamped),
                                  );
                                } catch {
                                  // ignore
                                }
                              }
                            }}
                            className="w-9 text-[11px] font-bold font-mono bg-transparent border-0 p-0 text-foreground text-right focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            title="Type hearing duration in minutes (e.g. 30, 45, 60)"
                          />
                          <span className="text-[11px] font-bold text-muted-foreground select-none">
                            m
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {unscheduledTeams.length}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-[11px] text-muted-foreground">
                      {search.trim()
                        ? 'Teams matching search filters'
                        : `Drag team onto calendar (${formatDurationLabel(defaultDefenseDuration)} slot)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2.5 max-h-[660px] overflow-y-auto">
                    {isTrayDragOver && (
                      <div
                        data-testid="tray-drop-zone-banner"
                        className="rounded-xl border-2 border-dashed border-primary bg-primary/10 p-3 text-center transition-all animate-pulse"
                      >
                        <p className="text-xs font-bold text-primary flex items-center justify-center gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Drop here to Unschedule
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Return hearing to Awaiting Scheduling (
                          {formatDurationLabel(defaultDefenseDuration)})
                        </p>
                      </div>
                    )}
                    {unscheduledTeams.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        All teams are currently scheduled or match other filters.
                      </div>
                    ) : (
                      unscheduledTeams.map((project) => {
                        const isScheduled = project.defenseSchedule?.status === 'scheduled';
                        const isEndorsed = project.defenseSchedule?.status === 'pending_scheduling';
                        const leaderName = getTeamLeaderName(project);

                        return (
                          <div
                            key={project._id}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({
                                  projectId: project._id,
                                  isReschedule: isScheduled,
                                }),
                              );
                              setDraggedProject(project);
                            }}
                            onDragEnd={() => setDraggedProject(null)}
                            className="group cursor-grab active:cursor-grabbing rounded-xl border border-border/80 bg-card p-3 shadow-xs hover:border-primary/50 hover:shadow-sm transition-all space-y-2 select-none"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                                <span className="text-xs font-bold text-foreground truncate">
                                  {project.teamId?.name || 'Unnamed Team'}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  isScheduled ? 'outline' : isEndorsed ? 'default' : 'outline'
                                }
                                className={`text-[10px] shrink-0 ${
                                  isScheduled
                                    ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                                    : isEndorsed
                                      ? 'bg-emerald-600 text-white font-medium'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {isScheduled ? 'Scheduled' : isEndorsed ? 'Ready ✓' : 'In Prep'}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
                              {project.title || 'Proposal in preparation'}
                            </p>

                            {/* Team Leader Indicator */}
                            {leaderName && (
                              <div className="flex items-center gap-1.5 text-[11px] text-foreground/90 font-medium">
                                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="truncate">
                                  Lead: <strong className="text-foreground">{leaderName}</strong>
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span>
                                Adviser:{' '}
                                <strong className="text-foreground font-medium">
                                  {project.adviserId?.lastName || 'TBD'}
                                </strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenScheduleModal(project)}
                                className="text-primary hover:underline font-semibold text-[11px] cursor-pointer"
                              >
                                {isScheduled ? 'Reschedule Defense' : 'Schedule Defense'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Fluid Continuous Timeline (8:00 AM - 5:00 PM = 648px) */}
              <div className="flex-1 min-w-0 w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                <div className="min-w-[760px]">
                  {/* Day Headers Bar */}
                  <div className="grid grid-cols-[72px_repeat(5,1fr)] border-b border-border bg-muted/40">
                    <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/60 flex flex-col items-center justify-center text-center">
                      <span>Time Slot</span>
                      <span className="text-[9px] text-muted-foreground/80 font-normal">
                        1 Hour Scale (30 Min Quantum)
                      </span>
                    </div>
                    {weekDays.map((day, idx) => {
                      const isToday = new Date().toDateString() === day.toDateString();
                      return (
                        <div
                          key={idx}
                          className={`p-3 text-center border-r border-border/60 last:border-r-0 ${
                            isToday ? 'bg-primary/10' : ''
                          }`}
                        >
                          <p className="text-xs font-bold text-foreground">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p
                            className={`text-[11px] font-mono mt-0.5 ${
                              isToday ? 'text-primary font-bold' : 'text-muted-foreground'
                            }`}
                          >
                            {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Continuous Timeline Area: Exactly 648px Height */}
                  <div
                    className="grid grid-cols-[72px_repeat(5,1fr)] relative"
                    style={{ height: `${TOTAL_TIMELINE_HEIGHT}px` }}
                  >
                    {/* Left Time Axis (72px per hour, 9 hours from 8:00 AM to 5:00 PM) */}
                    <div className="border-r border-border/60 bg-muted/15 relative select-none">
                      {HOURS_ARRAY.map((hour, idx) => {
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const h12 = hour % 12 === 0 ? 12 : hour % 12;
                        const label = `${String(h12).padStart(2, '0')}:00 ${ampm}`;
                        return (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-border/60 flex flex-col justify-between px-1.5 py-1 text-right"
                            style={{
                              top: `${idx * PIXELS_PER_HOUR}px`,
                              height: `${PIXELS_PER_HOUR}px`,
                            }}
                          >
                            <span className="text-[10px] font-bold font-mono text-foreground leading-none">
                              {label}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground/60 leading-none">
                              :30
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* 5 Day Columns with 5-Minute Snapped Droppable Surface */}
                    {weekDays.map((day, dayIdx) => {
                      const dateStr = toLocalDateKey(day);
                      const dayScheduledProjects = scheduledByDateMap.get(dateStr) || [];
                      const isOverThisDay = dragOverState?.dateStr === dateStr;

                      return (
                        <div
                          key={dayIdx}
                          data-testid={`day-column-${dateStr}`}
                          data-date={dateStr}
                          onDragOver={(e) => handleColumnDragOver(dateStr, e)}
                          onDragLeave={handleColumnDragLeave}
                          onDrop={(e) => handleColumnDrop(dateStr, e)}
                          className="relative border-r border-border/60 last:border-r-0 bg-background/50 transition-colors"
                        >
                          {/* Background Hour Guidelines (72px per hour, with 30-min dashed line) */}
                          {HOURS_ARRAY.map((hour, i) => (
                            <div
                              key={hour}
                              className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                              style={{
                                top: `${i * PIXELS_PER_HOUR}px`,
                                height: `${PIXELS_PER_HOUR}px`,
                              }}
                            >
                              {/* 30-minute subtle dashed divider */}
                              <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-border/25" />
                            </div>
                          ))}

                          {/* Semi-transparent Ghost Drop Preview (Snapped to 5-min intervals) */}
                          {isOverThisDay && (
                            <div
                              className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-primary bg-primary/20 pointer-events-none z-20 flex flex-col justify-between p-2 transition-all shadow-md"
                              style={{
                                top: `${dragOverState.topPx}px`,
                                height: `${dragOverState.heightPx}px`,
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-primary font-mono bg-primary/20 px-1.5 py-0.5 rounded">
                                  {dragOverState.slotTime}
                                </span>
                                <Badge className="text-[9px] bg-primary text-primary-foreground font-semibold px-1 py-0">
                                  Drop to Schedule
                                </Badge>
                              </div>
                              <p className="text-[10px] text-primary font-medium truncate">
                                Snapped: 5-min quantum
                              </p>
                            </div>
                          )}

                          {/* Scheduled Hearing Blocks */}
                          {dayScheduledProjects.map((project) => {
                            const { startMinutes, duration } = parseTimeToMinutes(
                              project.defenseSchedule?.time,
                            );
                            const isResizingThis = resizingState?.project?._id === project._id;
                            const activeDuration = isResizingThis
                              ? resizingState.currentDuration
                              : duration;
                            const topPx = startMinutes * PIXELS_PER_MINUTE;
                            const heightPx = activeDuration * PIXELS_PER_MINUTE;
                            const leaderName = getTeamLeaderName(project);

                            const isCompact = heightPx < 54;
                            const tooltipContent = `${project.teamId?.name || 'Scheduled Team'}\nLeader: ${leaderName || 'N/A'}\nProject: ${project.title || 'Oral Defense Hearing'}\nTime: ${project.defenseSchedule?.time || 'Scheduled Slot'} (${formatDurationLabel(activeDuration)})\nVenue: ${project.defenseSchedule?.venue || 'COT Conference Room'}\nRound: ${project.defenseSchedule?.round || '1st'} Round`;

                            return (
                              <div
                                key={project._id}
                                draggable="true"
                                title={tooltipContent}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData(
                                    'application/json',
                                    JSON.stringify({
                                      projectId: project._id,
                                      isReschedule: true,
                                    }),
                                  );
                                  setDraggedProject(project);
                                }}
                                onDragEnd={() => setDraggedProject(null)}
                                onClick={() =>
                                  handleOpenScheduleModal(
                                    project,
                                    dateStr,
                                    project.defenseSchedule?.time,
                                  )
                                }
                                style={{
                                  top: `${topPx}px`,
                                  height: `${heightPx}px`,
                                }}
                                className={`absolute left-1 right-1 rounded-lg border-l-4 border-l-blue-600 border border-border bg-card shadow-xs hover:shadow-md transition-all select-none text-left z-10 flex flex-col justify-between group cursor-grab active:cursor-grabbing overflow-hidden ${
                                  isCompact ? 'px-1.5 py-0.5' : 'p-2'
                                } ${
                                  isResizingThis
                                    ? 'ring-2 ring-primary ring-offset-1 shadow-lg'
                                    : ''
                                }`}
                              >
                                {isCompact ? (
                                  <div className="h-full flex flex-col justify-between select-none overflow-hidden pb-1">
                                    <div className="flex items-center justify-between gap-1 leading-[1.2] whitespace-nowrap overflow-hidden">
                                      <span className="text-[10.5px] font-bold text-foreground truncate">
                                        {project.teamId?.name || 'Scheduled Team'}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {project.defenseSchedule?.time && (
                                          <Badge
                                            variant="outline"
                                            className="text-[8px] px-1 py-0 font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 leading-none h-3.5 flex items-center font-bold tracking-tight"
                                          >
                                            <Clock className="h-2 w-2 mr-0.5" />
                                            {project.defenseSchedule.time.split(' - ')[0]}
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] px-1 py-0 uppercase tracking-tight bg-blue-500/10 text-blue-600 border-blue-500/30 leading-none h-3.5 flex items-center font-semibold"
                                        >
                                          {formatDurationLabel(activeDuration)}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-[8px] px-1 py-0 uppercase tracking-tight bg-blue-500/10 text-blue-600 border-blue-500/30 leading-none h-3.5 flex items-center font-semibold"
                                        >
                                          {project.defenseSchedule?.round || '1st'} Rnd
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 text-[9px] leading-[1.2] text-foreground/85 whitespace-nowrap overflow-hidden">
                                      <div className="flex items-center gap-0.5 truncate font-medium">
                                        <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">
                                          Lead: {leaderName || 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-0.5 text-muted-foreground shrink-0 text-[8.5px]">
                                        <MapPin className="h-2 w-2 text-primary shrink-0" />
                                        <span className="truncate max-w-[80px]">
                                          {project.defenseSchedule?.venue || 'COT Conf Rm'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[11px] font-bold text-foreground truncate">
                                        {project.teamId?.name || 'Scheduled Team'}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {project.defenseSchedule?.time && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1.5 py-0.5 font-mono bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold flex items-center"
                                          >
                                            <Clock className="h-2.5 w-2.5 mr-1" />
                                            {project.defenseSchedule.time}
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 uppercase tracking-tight bg-blue-500/10 text-blue-600 border-blue-500/30"
                                        >
                                          {formatDurationLabel(activeDuration)}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="text-[9px] px-1 py-0 uppercase tracking-tight bg-blue-500/10 text-blue-600 border-blue-500/30"
                                        >
                                          {project.defenseSchedule?.round || '1st'} Rnd
                                        </Badge>
                                      </div>
                                    </div>

                                    {leaderName && (
                                      <p className="text-[10px] text-foreground/80 font-medium truncate flex items-center gap-1">
                                        <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                        <span>Lead: {leaderName}</span>
                                      </p>
                                    )}

                                    <p className="text-[10px] text-muted-foreground line-clamp-1 font-medium">
                                      {project.title || 'Oral Defense Hearing'}
                                    </p>

                                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground truncate">
                                      <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                                      <span className="truncate">
                                        {project.defenseSchedule?.venue || 'COT Conf Rm'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Bottom Resize Handle: Pull to adjust duration in 5-minute (6px) increments */}
                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setResizingState({
                                      project,
                                      startY: e.clientY,
                                      initialDuration: duration,
                                      currentDuration: duration,
                                      dateStr,
                                    });
                                  }}
                                  className={`absolute bottom-0 left-0 right-0 ${
                                    isCompact ? 'h-1.5' : 'h-2'
                                  } cursor-ns-resize flex items-center justify-center hover:bg-primary/40 group/handle transition-colors rounded-b-md`}
                                  title="Drag up or down to adjust duration in 5-minute increments"
                                >
                                  <div
                                    className={`${
                                      isCompact ? 'w-6 h-0.5' : 'w-8 h-1'
                                    } bg-muted-foreground/40 rounded-full group-hover/handle:bg-primary transition-colors`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Teams Defense Roster: Table View */}
        {viewMode === 'table' && (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Team &amp; Capstone Project</th>
                    <th className="py-3 px-4">Section / Capstone</th>
                    <th className="py-3 px-4">Adviser &amp; Committee</th>
                    <th className="py-3 px-4">Defense Readiness</th>
                    <th className="py-3 px-4">Hearing Details</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="font-semibold text-foreground">No capstone teams found</p>
                        <p className="text-xs mt-0.5">
                          Try adjusting your filters or search query.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => {
                      const defStatus = project.defenseSchedule?.status;
                      const isReady = defStatus === 'pending_scheduling';
                      const isScheduled = defStatus === 'scheduled';
                      const leaderName = getTeamLeaderName(project);
                      const teamName = project.teamId?.name
                        ? project.teamId.name.replace(/^Team\s+/i, '').trim()
                        : 'Capstone Team';
                      const sectionName =
                        project.sectionId?.name || project.teamId?.sectionId?.name || 'BSIT';
                      const adviserName = project.adviserId
                        ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                        : 'Unassigned';

                      return (
                        <tr
                          key={project._id}
                          className={`hover:bg-muted/30 transition-colors ${
                            isReady ? 'bg-emerald-500/[0.02]' : ''
                          }`}
                        >
                          {/* 1. Team & Project */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="space-y-0.5">
                              <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                                {teamName}
                                {isReady && (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] py-0 px-1"
                                  >
                                    Ready
                                  </Badge>
                                )}
                              </p>
                              {leaderName && (
                                <p className="text-[11px] text-foreground/80 font-medium flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span>Lead: {leaderName}</span>
                                </p>
                              )}
                              <p
                                className="text-xs text-muted-foreground line-clamp-1"
                                title={project.title}
                              >
                                {project.title || 'Untitled Project'}
                              </p>
                            </div>
                          </td>

                          {/* 2. Section / Capstone */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <Badge variant="secondary" className="text-[11px] font-mono">
                                {sectionName}
                              </Badge>
                              <p className="text-[11px] text-muted-foreground">
                                Capstone {project.capstonePhase || 2}
                              </p>
                            </div>
                          </td>

                          {/* 3. Adviser & Committee */}
                          <td className="py-3.5 px-4 max-w-[200px]">
                            <div className="space-y-0.5 text-xs">
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate" title={adviserName}>
                                  {adviserName}
                                </span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {project.panelistIds?.length || 0} Panelists appointed
                              </p>
                            </div>
                          </td>

                          {/* 4. Defense Readiness */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isReady ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px] shadow-xs">
                                <ShieldCheck className="h-3 w-3" />
                                Ready for Scheduling
                              </Badge>
                            ) : isScheduled ? (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-[11px] shadow-xs">
                                <Calendar className="h-3 w-3" />
                                Scheduled
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[11px] text-muted-foreground"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </td>

                          {/* 5. Hearing Details */}
                          <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                            {isScheduled && project.defenseSchedule?.date ? (
                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-blue-500" />
                                  {new Date(project.defenseSchedule.date).toLocaleDateString(
                                    undefined,
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    },
                                  )}
                                </p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {project.defenseSchedule.venue || 'COT Conference Room'}
                                </p>
                              </div>
                            ) : isReady ? (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 italic">
                                Awaiting Instructor Scheduling
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* 6. Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant={isReady ? 'default' : 'outline'}
                                className={`text-xs gap-1 h-8 ${
                                  isReady
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : ''
                                }`}
                                onClick={() => handleOpenScheduleModal(project)}
                              >
                                <CalendarClock className="h-3.5 w-3.5" />
                                {isScheduled ? 'Reschedule' : 'Schedule Defense'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => navigate(`/projects/${project._id}?tab=capstone_2`)}
                                title="Open Project Workspace"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Teams Defense Roster: Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground rounded-xl border border-border bg-card">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-semibold text-foreground">No capstone teams found</p>
                <p className="text-xs mt-0.5">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const defStatus = project.defenseSchedule?.status;
                const isReady = defStatus === 'pending_scheduling';
                const isScheduled = defStatus === 'scheduled';
                const leaderName = getTeamLeaderName(project);
                const teamName = project.teamId?.name
                  ? project.teamId.name.replace(/^Team\s+/i, '').trim()
                  : 'Capstone Team';
                const sectionName =
                  project.sectionId?.name || project.teamId?.sectionId?.name || 'BSIT';
                const adviserName = project.adviserId
                  ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                  : 'Unassigned';

                return (
                  <Card
                    key={project._id}
                    className={`flex flex-col justify-between transition-all hover:shadow-md ${
                      isReady ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              {sectionName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              Capstone {project.capstonePhase || 2}
                            </span>
                          </div>
                          <CardTitle className="text-base font-bold text-foreground mt-1">
                            {teamName}
                          </CardTitle>
                        </div>
                        {isReady ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">
                            Ready
                          </Badge>
                        ) : isScheduled ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px]">
                            Scheduled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Drafting
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {project.title || 'Untitled Capstone Project'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0 text-xs">
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5">
                        {leaderName && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Team Lead:</span>
                            <span className="font-semibold text-foreground truncate max-w-[150px]">
                              {leaderName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Adviser:</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {adviserName}
                          </span>
                        </div>
                        {isScheduled && project.defenseSchedule?.date && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                            <span className="text-muted-foreground">Hearing:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {new Date(project.defenseSchedule.date).toLocaleDateString(
                                undefined,
                                {
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}{' '}
                              • {project.defenseSchedule.time || 'TBD'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={isReady ? 'default' : 'outline'}
                          className={`flex-1 text-xs gap-1.5 h-8 ${
                            isReady ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                          }`}
                          onClick={() => handleOpenScheduleModal(project)}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          {isScheduled ? 'Reschedule' : 'Schedule Defense'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => navigate(`/projects/${project._id}?tab=capstone_2`)}
                          title="View Workspace"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Schedule Defense Modal */}
        <ScheduleDefenseModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedProject(null);
            setInitialScheduleDate('');
            setInitialScheduleTime('');
          }}
          project={selectedProject}
          initialDate={initialScheduleDate}
          initialTime={initialScheduleTime}
          onScheduled={handleScheduledSuccess}
        />
      </div>
    </DashboardLayout>
  );
}
