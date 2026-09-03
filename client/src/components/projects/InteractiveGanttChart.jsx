import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Plus,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  X,
  User,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_SECTIONS = [
  'SECTION 1 — PROJECT PLANNING & RESEARCH',
  'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
  'SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION',
  'SECTION 4 — TESTING & QUALITY ASSURANCE',
  'SECTION 5 — DEPLOYMENT & DEFENSE PREPARATION',
];

const INITIAL_TASKS = [
  {
    id: 'PLAN-01',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Project kickoff, scope alignment and deliverables sign-off',
    owner: 'Throylan Antipuesto',
    startDate: '2026-03-09',
    dueDate: '2026-03-11',
    durationDays: 3,
    progress: 1.0,
  },
  {
    id: 'PLAN-05',
    section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
    title: 'Compile survey / interview results into requirements data table',
    owner: 'Throylan Antipuesto',
    startDate: '2026-03-12',
    dueDate: '2026-03-13',
    durationDays: 2,
    progress: 1.0,
  },
  {
    id: 'ARCH-05',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'Entity Relationship Diagram (ERD) & Schema Models',
    owner: 'Patrick Josh Añedez',
    startDate: '2026-03-18',
    dueDate: '2026-03-19',
    durationDays: 2,
    progress: 0.85,
  },
  {
    id: 'ARCH-15',
    section: 'SECTION 2 — ARCHITECTURE & SYSTEM DESIGN',
    title: 'UI wireframes – Student dashboard and workflow pages',
    owner: 'Chijay Canoy',
    startDate: '2026-03-23',
    dueDate: '2026-03-25',
    durationDays: 3,
    progress: 0.6,
  },
  {
    id: 'DEV-01',
    section: 'SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION',
    title: 'Plagiarism analysis microservice & vector similarity scanner',
    owner: 'Patrick Josh Añedez',
    startDate: '2026-03-26',
    dueDate: '2026-04-05',
    durationDays: 10,
    progress: 0.45,
  },
  {
    id: 'DEV-08',
    section: 'SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION',
    title: 'Action Done Matrix REST API and atomic cell patching engine',
    owner: 'Steven Joe Bautista',
    startDate: '2026-04-06',
    dueDate: '2026-04-12',
    durationDays: 7,
    progress: 0.4,
  },
];

export default function InteractiveGanttChart({ project, isReadOnly = false }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [newTask, setNewTask] = useState({
    id: '',
    section: DEFAULT_SECTIONS[2],
    title: '',
    owner: '',
    startDate: '',
    dueDate: '',
    durationDays: 3,
    progress: 0,
  });

  // Extract unique owners
  const owners = useMemo(() => {
    const list = Array.from(new Set(tasks.map((t) => t.owner).filter(Boolean)));
    return list;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (selectedOwner === 'ALL') return tasks;
    return tasks.filter((t) => t.owner === selectedOwner);
  }, [tasks, selectedOwner]);

  // Group filtered tasks by section
  const sections = useMemo(() => {
    return Array.from(new Set(filteredTasks.map((t) => t.section)));
  }, [filteredTasks]);

  // Overall accomplishment
  const overallProgress = useMemo(() => {
    if (!tasks.length) return 0;
    const total = tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0);
    return Math.round((total / tasks.length) * 100);
  }, [tasks]);

  const handleUpdateProgress = (taskId, newProgress) => {
    if (isReadOnly) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, progress: Math.min(Math.max(newProgress, 0), 1) } : t,
      ),
    );
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.owner.trim()) {
      toast.error('Please enter a task title and owner.');
      return;
    }

    const generatedId = newTask.id.trim() || `TSK-${String(tasks.length + 1).padStart(2, '0')}`;

    const created = {
      ...newTask,
      id: generatedId.toUpperCase(),
      title: newTask.title.trim(),
      owner: newTask.owner.trim(),
      durationDays: Number(newTask.durationDays) || 1,
      progress: Number(newTask.progress) / 100,
    };

    setTasks((prev) => [...prev, created]);
    toast.success(`Task ${created.id} added to roadmap.`);
    setIsAddModalOpen(false);
    setNewTask({
      id: '',
      section: DEFAULT_SECTIONS[2],
      title: '',
      owner: '',
      startDate: '',
      dueDate: '',
      durationDays: 3,
      progress: 0,
    });
  };

  return (
    <Card className="border-border/60 bg-card shadow-xs min-w-0">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-semibold text-foreground">
              Sprint Deliverables & Gantt Roadmap
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
            <strong className="text-foreground font-semibold">{overallProgress}% Complete</strong>
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Owner Filter */}
          <div className="flex items-center gap-1.5 bg-muted/30 border border-border/60 rounded-md px-2 py-1 text-xs">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              aria-label="Filter by task owner"
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="bg-transparent border-0 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Owners ({tasks.length})</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>

          {!isReadOnly && (
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="p-3 w-[100px]">Task ID</th>
                <th className="p-3 min-w-[260px]">Task Description</th>
                <th className="p-3 w-[150px]">Assigned Owner</th>
                <th className="p-3 w-[100px]">Duration</th>
                <th className="p-3 w-[130px]">% Complete</th>
                <th className="p-3 min-w-[220px]">Sprint Timeline (Weeks 1–6)</th>
              </tr>
            </thead>
            <tbody>
              {sections.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No tasks match the selected filter.
                  </td>
                </tr>
              )}

              {sections.map((sec) => {
                const secTasks = filteredTasks.filter((t) => t.section === sec);
                return (
                  <React.Fragment key={sec}>
                    {/* Section Header Row */}
                    <tr className="bg-muted/20 border-y border-border/40 font-bold text-[10px] text-primary tracking-wider uppercase">
                      <td colSpan={6} className="p-2.5 px-3">
                        {sec}
                      </td>
                    </tr>

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
                                    isComplete ? 'bg-emerald-500' : 'bg-primary',
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
                                    ? 'bg-emerald-500 text-white'
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
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gantt-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 id="gantt-modal-title" className="text-base font-bold text-foreground">
                Add Sprint Task
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="task-section">Project Section</Label>
                <select
                  id="task-section"
                  value={newTask.section}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, section: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {DEFAULT_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
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
                  <Input
                    id="task-owner"
                    placeholder="e.g. Patrick Josh Añedez"
                    value={newTask.owner}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, owner: e.target.value }))}
                    required
                    className="h-9 text-xs"
                  />
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
                <Button type="submit" size="sm" className="bg-primary">
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

InteractiveGanttChart.propTypes = {
  project: PropTypes.object,
  isReadOnly: PropTypes.bool,
};
