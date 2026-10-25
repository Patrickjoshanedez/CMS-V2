import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Filter, Table as TableIcon, LayoutList, Trash2, FolderPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { projectService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import AcademicExcelGanttChart, {
  isOwnerMatch,
  CANONICAL_MEMBERS,
  extractProjectMembers,
  dateToDayCol,
  addWorkingDays,
  canEditGanttSchedule,
} from './AcademicExcelGanttChart';
import WeeklyProgressCheckIns from './WeeklyProgressCheckIns';

// Re-export CANONICAL_MEMBERS for external use
export { CANONICAL_MEMBERS };

// Default empty sections and tasks to ensure no template data is shown when empty
export const DEFAULT_SECTIONS = [];
export const INITIAL_TASKS = [];

export default function InteractiveGanttChart({
  project,
  isReadOnly = false,
  defaultView = 'excel',
}) {
  const user = useAuthStore((state) => state.user);
  const canEditSchedule = !isReadOnly && canEditGanttSchedule(project, user);
  const isScheduleReadOnly = !canEditSchedule;
  const isProjectArchived = project?.isArchived === true || project?.projectStatus === 'archived';
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [viewMode, setViewMode] = useState(defaultView); // 'excel' | 'compact'
  const [planProjectId, setPlanProjectId] = useState(null);
  const [ganttApproval, setGanttApproval] = useState(project?.ganttApproval || {});

  // Canonical proponent list — extracted from project team members or empty fallback
  const proponentList = useMemo(() => extractProjectMembers(project), [project]);

  // Storage keys for localStorage persistence
  const storageKey = useMemo(() => {
    const pid = project?._id || project?.id || 'default';
    return `gantt_state_${pid}`;
  }, [project]);
  const sectionsStorageKey = `${storageKey}_sections`;

  // Hoisted state for tasks and sections (defaults to empty arrays when no data exists)
  const [tasks, setTasks] = useState(() => {
    if (project?.ganttPlan?.updatedAt && Array.isArray(project.ganttPlan.tasks)) {
      return project.ganttPlan.tasks;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return [];
  });

  const [sections, setSections] = useState(() => {
    if (project?.ganttPlan?.updatedAt && Array.isArray(project.ganttPlan.sections)) {
      return project.ganttPlan.sections;
    }
    try {
      const saved = localStorage.getItem(sectionsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return [];
  });

  // Load the server-owned plan once per project; local data is a migration fallback.
  useEffect(() => {
    try {
      const serverPlan = project?.ganttPlan;
      const savedTasks = localStorage.getItem(storageKey);
      const savedSections = localStorage.getItem(sectionsStorageKey);
      setTasks(
        serverPlan?.updatedAt && Array.isArray(serverPlan.tasks)
          ? serverPlan.tasks
          : savedTasks
            ? JSON.parse(savedTasks)
            : [],
      );
      setSections(
        serverPlan?.updatedAt && Array.isArray(serverPlan.sections)
          ? serverPlan.sections
          : savedSections
            ? JSON.parse(savedSections)
            : [],
      );
      setGanttApproval(project?.ganttApproval || {});
      setPlanProjectId(String(project?._id || project?.id || ''));
    } catch {
      /* ignore */
    }
  }, [
    storageKey,
    sectionsStorageKey,
    project?._id,
    project?.id,
    project?.ganttApproval,
    project?.ganttPlan,
  ]);

  // Debounced autosave across both views
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (isScheduleReadOnly) return undefined;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(tasks));
        localStorage.setItem(sectionsStorageKey, JSON.stringify(sections));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [tasks, sections, storageKey, sectionsStorageKey, isScheduleReadOnly]);

  useEffect(() => {
    const projectId = String(project?._id || project?.id || '');
    if (
      !projectId ||
      planProjectId !== projectId ||
      isScheduleReadOnly ||
      (!tasks.length && !sections.length)
    ) {
      return undefined;
    }

    const timer = setTimeout(() => {
      projectService
        .updateGanttPlan(projectId, { tasks, sections })
        .then((response) => {
          const savedProject = response.data?.data?.project;
          if (savedProject?.ganttApproval) setGanttApproval(savedProject.ganttApproval);
        })
        .catch((error) => {
          toast.error(error.response?.data?.message || 'The shared Gantt plan could not be saved.');
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [project?._id, project?.id, tasks, sections, planProjectId, canEditSchedule, isScheduleReadOnly]);

  const projectWithGanttApproval = project
    ? { ...project, ganttApproval }
    : project;

  // Combined canonical sections list
  const allSections = useMemo(() => {
    const fromSec = Array.isArray(sections) ? sections : [];
    const fromTasks = Array.from(new Set(tasks.map((t) => t.section).filter(Boolean)));
    return Array.from(new Set([...fromSec, ...fromTasks]));
  }, [sections, tasks]);

  // Filter tasks for compact view
  const filteredTasks = useMemo(() => {
    if (selectedOwner === 'ALL') return tasks;
    return tasks.filter((t) => isOwnerMatch(t.owner, selectedOwner));
  }, [tasks, selectedOwner]);

  // Sections visible under current owner filter
  const visibleSections = useMemo(() => {
    if (selectedOwner === 'ALL') return allSections;
    return allSections.filter((sec) => filteredTasks.some((t) => t.section === sec));
  }, [allSections, filteredTasks, selectedOwner]);

  // Overall accomplishment (Pending when 0 tasks)
  const overallAccomplishment = useMemo(() => {
    if (!tasks.length) return 'Pending';
    const total = tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0);
    return `${((total / tasks.length) * 100).toFixed(2)}%`;
  }, [tasks]);

  // New task form state
  const [newTask, setNewTask] = useState({
    id: '',
    section: allSections[0] || 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: '',
    owner: proponentList[0] || '',
    startDate: '2026-03-23',
    dueDate: '2026-03-27',
    durationDays: 5,
    progress: 0,
  });

  useEffect(() => {
    if (!newTask.section && allSections.length > 0) {
      setNewTask((prev) => ({ ...prev, section: allSections[0] }));
    }
    if (!newTask.owner && proponentList.length > 0) {
      setNewTask((prev) => ({ ...prev, owner: proponentList[0] }));
    }
  }, [allSections, proponentList, newTask.owner, newTask.section]);

  // Section & Row Handlers (Shared between views)
  const handleAddSection = useCallback(
    (title) => {
      const target = (title || newSectionTitle || '').trim();
      if (!target) {
        toast.error('Please enter a section title.');
        return;
      }
      setSections((prev) => (prev.includes(target) ? prev : [...prev, target]));
      setNewSectionTitle('');
      setIsAddSectionOpen(false);
      toast.success(`Milestone section "${target}" created.`);
    },
    [newSectionTitle],
  );

  const handleDeleteSection = useCallback((secTitle) => {
    setSections((prev) => prev.filter((s) => s !== secTitle));
    setTasks((prev) => prev.filter((t) => t.section !== secTitle));
    toast.success(`Section "${secTitle}" and its deliverables removed.`);
  }, []);

  const handleAddRow = useCallback(
    (targetSection) => {
      const sec = targetSection || allSections[0] || 'SECTION 1 — PROJECT PLANNING & RESEARCH';
      setSections((prev) => (prev.includes(sec) ? prev : [...prev, sec]));
      const existingInSec = tasks.filter((t) => t.section === sec);
      const prefixMatch = sec.match(/(?:SECTION\s+(\d+)|PHASE\s+(\d+))/i);
      const prefixNum = prefixMatch ? prefixMatch[1] || prefixMatch[2] : '01';
      const prefix = `SEC${prefixNum.padStart(2, '0')}`;
      const newRow = {
        id: `${prefix}-${String(existingInSec.length + 1).padStart(2, '0')}`,
        section: sec,
        title: 'New Deliverable / Milestone Task',
        owner: proponentList[0] || 'Pending',
        startDate: '2026-03-23',
        dueDate: '2026-03-27',
        durationDays: 5,
        progress: 0,
        startDayCol: 10,
        filledDays: [10, 11, 12, 13, 14],
        category: 'blue',
      };
      setTasks((prev) => [...prev, newRow]);
      toast.success(`New deliverable task added to ${sec}`);
    },
    [allSections, tasks, proponentList],
  );

  const handleDeleteRow = useCallback((taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast.success(`Task ${taskId} removed.`);
  }, []);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.owner.trim()) {
      toast.error('Please enter a task title and owner.');
      return;
    }

    const targetSec =
      newTask.section || allSections[0] || 'SECTION 1 — PROJECT PLANNING & RESEARCH';
    setSections((prev) => (prev.includes(targetSec) ? prev : [...prev, targetSec]));

    const generatedId = newTask.id.trim() || `TSK-${String(tasks.length + 1).padStart(2, '0')}`;
    const duration = Math.max(1, Number(newTask.durationDays) || 5);
    const progressVal = Math.min(100, Math.max(0, Number(newTask.progress) || 0)) / 100;

    const startCol = dateToDayCol(newTask.startDate || '2026-03-23');
    const filled = [];
    for (let d = 0; d < duration; d++) {
      if (startCol + d <= 60) filled.push(startCol + d);
    }

    const created = {
      id: generatedId.toUpperCase(),
      section: targetSec,
      title: newTask.title.trim(),
      owner: newTask.owner.trim(),
      startDate: newTask.startDate || '2026-03-23',
      dueDate: newTask.dueDate || addWorkingDays(newTask.startDate || '2026-03-23', duration),
      durationDays: duration,
      progress: progressVal,
      startDayCol: startCol,
      filledDays: filled,
      category: 'blue',
    };

    setTasks((prev) => [...prev, created]);
    toast.success(`Task ${created.id} added successfully.`);
    setIsAddModalOpen(false);
    setNewTask({
      id: '',
      section: targetSec,
      title: '',
      owner: proponentList[0] || '',
      startDate: '2026-03-23',
      dueDate: '2026-03-27',
      durationDays: 5,
      progress: 0,
    });
  };

  return (
    <div className="space-y-4" data-testid="interactive-gantt-chart-root">
      {/* View Switcher Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 p-3 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground">
              Sprint Deliverables &amp; Gantt Roadmap
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] font-mono border border-primary/20 bg-primary/10 text-primary"
            >
              Capstone 3 Implementation
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Overall Accomplishment:{' '}
            <strong className="text-foreground font-semibold">
              {overallAccomplishment === 'Pending'
                ? 'Pending'
                : `${overallAccomplishment} Complete`}
            </strong>
          </p>
        </div>

        {/* View Mode Toggle & Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border/70 p-0.5 bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'excel' ? 'secondary' : 'ghost'}
              aria-pressed={viewMode === 'excel'}
              onClick={() => setViewMode('excel')}
              className="h-8 text-xs"
            >
              <TableIcon className="h-3.5 w-3.5" />
              Academic Excel View
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
              aria-pressed={viewMode === 'compact'}
              onClick={() => setViewMode('compact')}
              className="h-8 text-xs"
            >
              <LayoutList className="h-3.5 w-3.5" />
              Compact Roadmap
            </Button>
          </div>

          {!isScheduleReadOnly && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddSectionOpen(true)}
              className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Section
            </Button>
          )}

          {viewMode === 'compact' && !isScheduleReadOnly && (
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Main View Renderer */}
      {viewMode === 'excel' ? (
        /* AcademicExcelGanttChart controlled with hoisted state for 100% view sync */
        <AcademicExcelGanttChart
          project={projectWithGanttApproval}
          tasks={tasks}
          setTasks={setTasks}
          sections={allSections}
          setSections={setSections}
          onAddSection={handleAddSection}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
          onDeleteSection={handleDeleteSection}
          selectedOwner={selectedOwner}
          onOwnerChange={setSelectedOwner}
          isReadOnly={isScheduleReadOnly}
          onGanttApprovalChange={(approved) =>
            setGanttApproval((current) => ({ ...current, approved }))
          }
        />
      ) : (
        <Card className="border-border/60 bg-card shadow-xs min-w-0">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold text-foreground">
                  Sprint Deliverables &amp; Gantt Roadmap
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono border border-primary/20 bg-primary/10 text-primary"
                >
                  Capstone 3 Implementation
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1">
                Overall Accomplishment:{' '}
                <strong className="text-foreground font-semibold">
                  {overallAccomplishment === 'Pending'
                    ? 'Pending'
                    : `${overallAccomplishment} Complete`}
                </strong>
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Owner Filter — canonical proponents */}
              <div className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-md px-2 py-1 text-xs">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                  <SelectTrigger
                    aria-label="Filter by task owner"
                    className="h-8 w-auto min-w-36 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Members ({proponentList.length})</SelectItem>
                    {proponentList.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isScheduleReadOnly && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddSectionOpen(true)}
                    className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Section
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Task
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th className="p-3 w-[100px]">Task ID</th>
                    <th className="p-3 min-w-[240px]">Task Description</th>
                    <th className="p-3 w-[150px]">Assigned Owner</th>
                    <th className="p-3 w-[90px]">Duration</th>
                    <th className="p-3 w-[130px]">% Complete</th>
                    <th className="p-3 min-w-[200px]">Sprint Timeline (Weeks 1–12)</th>
                    {!isScheduleReadOnly && <th className="p-3 w-[60px] text-center">Act</th>}
                  </tr>
                </thead>
                <tbody>
                  {allSections.length === 0 ? (
                    <tr>
                      <td colSpan={isScheduleReadOnly ? 6 : 7} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                          <div className="p-3 bg-primary/10 rounded-full text-primary mb-1">
                            <FolderPlus className="h-6 w-6" />
                          </div>
                          <h4 className="text-sm font-semibold text-foreground">
                            No Gantt Roadmap Data
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            No milestone sections or deliverable tasks have been created yet. Click
                            &ldquo;Add Section&rdquo; to create your first milestone section, or add
                            deliverable rows.
                          </p>
                          {!isScheduleReadOnly && (
                            <Button
                              size="sm"
                              onClick={() => setIsAddSectionOpen(true)}
                              className="mt-2 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Section
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : visibleSections.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isScheduleReadOnly ? 6 : 7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No tasks match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    visibleSections.map((sec) => {
                      const secTasks = filteredTasks.filter((t) => t.section === sec);
                      return (
                        <React.Fragment key={sec}>
                          {/* Section Header Row */}
                          <tr className="bg-muted/25 border-y border-border/60 font-bold text-[11px] text-primary tracking-wider uppercase">
                            <td colSpan={isScheduleReadOnly ? 6 : 7} className="p-2.5 px-3">
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <span>{sec}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono py-0 h-4 border-primary/30 text-primary"
                                  >
                                    {secTasks.length} {secTasks.length === 1 ? 'task' : 'tasks'}
                                  </Badge>
                                </span>
                                {!isScheduleReadOnly && (
                                  <div className="flex items-center gap-1.5 lowercase">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleAddRow(sec)}
                                      className="h-7 min-h-0 min-w-0 gap-1 px-2 text-[11px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
                                      title={`Add deliverable task to ${sec}`}
                                    >
                                      <Plus className="h-3 w-3" /> Add Task
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteSection(sec)}
                                      title={`Delete section: ${sec}`}
                                      aria-label={`Delete section: ${sec}`}
                                      className="size-8 min-h-0 min-w-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Empty section state */}
                          {secTasks.length === 0 && (
                            <tr className="border-b border-border/40">
                              <td
                                colSpan={isScheduleReadOnly ? 6 : 7}
                                className="p-4 text-center text-xs text-muted-foreground italic"
                              >
                                No deliverable tasks in this section yet.{' '}
                                {!isScheduleReadOnly && (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={() => handleAddRow(sec)}
                                    className="h-auto min-h-0 min-w-0 p-0 ml-1 not-italic font-medium"
                                  >
                                    + Add task
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )}

                          {/* Task Rows */}
                          {secTasks.map((task) => {
                            const pct = Math.round((Number(task.progress) || 0) * 100);
                            const isComplete = pct >= 100;

                            return (
                              <tr
                                key={task.id}
                                className="border-b border-border/40 hover:bg-muted/15 transition-colors"
                              >
                                <td className="p-3 font-mono font-medium text-foreground whitespace-nowrap">
                                  {task.id}
                                </td>
                                <td className="p-3 font-medium text-foreground">{task.title}</td>
                                <td className="p-3 text-muted-foreground whitespace-nowrap">
                                  {task.owner}
                                </td>
                                <td className="p-3 text-muted-foreground whitespace-nowrap">
                                  {task.durationDays} Days
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-semibold w-8 text-right text-foreground">
                                      {pct}%
                                    </span>
                                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden shrink-0">
                                      <div
                                        className={cn(
                                          'h-full transition-all duration-300',
                                          isComplete ? 'bg-success' : 'bg-primary',
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  {/* Visual Gantt Bar */}
                                  <div className="relative h-6 w-full bg-muted/25 rounded flex items-center px-1">
                                    <div
                                      className={cn(
                                        'h-4 rounded text-[10px] font-mono font-semibold flex items-center justify-center transition-all shadow-xs',
                                        isComplete
                                          ? 'bg-success text-success-foreground'
                                          : 'bg-primary/85 text-primary-foreground',
                                      )}
                                      style={{
                                        width: `${Math.max(pct, 28)}%`,
                                      }}
                                    >
                                      {task.durationDays}d
                                    </div>
                                  </div>
                                </td>
                                    {!isScheduleReadOnly && (
                                  <td className="p-3 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteRow(task.id)}
                                      title={`Delete task ${task.id}`}
                                      aria-label={`Delete task ${task.id}`}
                                      className="size-8 min-h-0 min-w-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Task Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader className="border-b border-border/60 pb-3">
            <DialogTitle id="gantt-modal-title" className="text-base">
              Add Sprint Task
            </DialogTitle>
            <DialogDescription>Add a deliverable to the Capstone 2 schedule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label htmlFor="task-section">Project Section</Label>
              {allSections.length > 0 ? (
                <Select
                  value={newTask.section}
                  onValueChange={(value) =>
                    setNewTask((prev) => ({ ...prev, section: value }))
                  }
                >
                  <SelectTrigger id="task-section" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allSections.map((sec) => (
                      <SelectItem key={sec} value={sec}>
                        {sec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="task-section"
                  value={newTask.section}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, section: e.target.value }))}
                  placeholder="e.g. SECTION 1 — PROJECT PLANNING & RESEARCH"
                  className="h-9 text-xs"
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label htmlFor="task-id">Task ID</Label>
                <Input
                  id="task-id"
                  placeholder="e.g. DEV-09"
                  value={newTask.id}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, id: e.target.value }))}
                  className="h-9 text-xs uppercase"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="task-owner">Assigned Owner *</Label>
                {proponentList.length > 0 ? (
                  <Select
                    value={newTask.owner}
                    onValueChange={(value) => setNewTask((prev) => ({ ...prev, owner: value }))}
                    required
                  >
                    <SelectTrigger id="task-owner" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {proponentList.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="task-owner"
                    placeholder="e.g. Añedez, Patrick Josh"
                    value={newTask.owner}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, owner: e.target.value }))}
                    className="h-9 text-xs"
                    required
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-title">Task Description *</Label>
              <Input
                id="task-title"
                placeholder="e.g. Implement real-time WebSocket events"
                value={newTask.title}
                onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="task-duration">Duration (Days)</Label>
                <Input
                  id="task-duration"
                  type="number"
                  min="1"
                  max="60"
                  value={newTask.durationDays}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      durationDays: Number(e.target.value),
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-progress">Initial Progress (%)</Label>
                <Input
                  id="task-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={newTask.progress}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      progress: Number(e.target.value),
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary text-primary-foreground">
                Save Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Section Modal Dialog */}
      <Dialog open={isAddSectionOpen} onOpenChange={setIsAddSectionOpen}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader className="border-b border-border/60 pb-3">
            <DialogTitle id="add-section-modal-title" className="text-base">
              Create Milestone Section
            </DialogTitle>
            <DialogDescription>Add a section to organize schedule deliverables.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="new-section-input" className="font-semibold">
                Section Name *
              </Label>
              <Input
                id="new-section-input"
                placeholder="e.g. SECTION 1 — PROJECT PLANNING & RESEARCH"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                className="h-9 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSection();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-medium text-muted-foreground">
                Standard Capstone Suggestions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'SECTION 1 — PROJECT PLANNING & RESEARCH',
                  'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
                  'SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION',
                  'SECTION 4 — TESTING & QA',
                  'SECTION 5 — DEPLOYMENT & DOCUMENTATION',
                ].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setNewSectionTitle(preset)}
                    className="h-auto min-h-0 min-w-0 px-2 py-1 text-[10px]"
                  >
                    {preset.split('—')[1]?.trim() || preset}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddSectionOpen(false);
                  setNewSectionTitle('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddSection()}
                className="bg-primary text-primary-foreground gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Create Section
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <WeeklyProgressCheckIns
        project={project}
        isReadOnly={isReadOnly || isProjectArchived}
      />
    </div>
  );
}

InteractiveGanttChart.propTypes = {
  project: PropTypes.object,
  isReadOnly: PropTypes.bool,
  defaultView: PropTypes.oneOf(['excel', 'compact']),
};
