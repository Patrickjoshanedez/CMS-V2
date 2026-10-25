import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Calendar, CalendarPlus, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { toast } from 'sonner';
import api from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useAcademicYears } from '@/hooks/useAcademics';
import { CAPSTONE_STAGES, STAGE_DELIVERABLE_MAP, DELIVERABLE_CATEGORY_MAP } from '@cms/shared';

const STAGE_LABELS = {
  [CAPSTONE_STAGES.PROPOSAL]: 'Phase 1 — Title Proposals & Committee',
  [CAPSTONE_STAGES.CAPSTONE_1]: 'Phase 2 — Capstone 1 (Chapters 1–3 & Proposal Defense)',
  [CAPSTONE_STAGES.CAPSTONE_2]: 'Phase 3 — Capstone 2 (System Development & Prototype)',
  [CAPSTONE_STAGES.CAPSTONE_3]: 'Phase 4 — Capstone 3 (Final Manuscripts & Defense)',
};

export default function MilestoneDeadlinesModal({
  open,
  onClose,
  sections = [],
  batchYears = [],
  defaultBatch = '',
  deadlines = [],
  onSaved,
}) {
  const queryClient = useQueryClient();
  const { data: createdAcademicYears = [] } = useAcademicYears();

  const availableBatches = useMemo(() => {
    const batchSet = new Set();
    if (Array.isArray(batchYears)) {
      batchYears.forEach((b) => {
        if (b) batchSet.add(typeof b === 'string' ? b : b?.year || b?.name || b?.code);
      });
    }
    if (Array.isArray(createdAcademicYears)) {
      createdAcademicYears.forEach((y) => {
        const yearStr = typeof y === 'string' ? y : y?.year || y?.name || y?.code;
        if (yearStr) batchSet.add(yearStr);
      });
    }
    if (batchSet.size === 0) {
      const currentYear = new Date().getFullYear();
      batchSet.add(`${currentYear}-${currentYear + 1}`);
      batchSet.add(`${currentYear - 1}-${currentYear}`);
    }
    return Array.from(batchSet).filter(Boolean).sort().reverse();
  }, [batchYears, createdAcademicYears]);

  const [batchYear, setBatchYear] = useState(defaultBatch || availableBatches[0] || '2025-2026');

  useEffect(() => {
    if (defaultBatch && availableBatches.includes(defaultBatch)) {
      setBatchYear(defaultBatch);
    } else if (!batchYear && availableBatches.length > 0) {
      setBatchYear(availableBatches[0]);
    }
  }, [defaultBatch, availableBatches, batchYear]);

  const [targetType, setTargetType] = useState('batch');
  const [sectionId, setSectionId] = useState('');
  const [stage, setStage] = useState(CAPSTONE_STAGES.PROPOSAL);
  const [deliverable, setDeliverable] = useState(
    STAGE_DELIVERABLE_MAP[CAPSTONE_STAGES.PROPOSAL][0]?.id || 'title_proposal',
  );
  const [title, setTitle] = useState(
    STAGE_DELIVERABLE_MAP[CAPSTONE_STAGES.PROPOSAL][0]?.label || 'Title Proposals',
  );
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Available deliverables for the currently selected stage
  const availableDeliverables = useMemo(() => {
    return STAGE_DELIVERABLE_MAP[stage] || [];
  }, [stage]);

  // When stage changes, update deliverable and title default
  const handleStageChange = (newStage) => {
    setStage(newStage);
    const firstDeliv = STAGE_DELIVERABLE_MAP[newStage]?.[0];
    if (firstDeliv) {
      setDeliverable(firstDeliv.id);
      setTitle(firstDeliv.label);
    }
  };

  const handleDeliverableChange = (newDelivId) => {
    setDeliverable(newDelivId);
    const match = availableDeliverables.find((d) => d.id === newDelivId);
    if (match) {
      setTitle(match.label);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !batchYear ||
      !stage ||
      !deliverable ||
      !title ||
      !deadlineDate ||
      (targetType === 'section' && !sectionId)
    ) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/settings/deadlines/milestone', {
        batchYear: batchYear.trim(),
        targetType,
        sectionId: targetType === 'section' && sectionId ? sectionId : null,
        stage,
        deliverable,
        title: title.trim(),
        description: description.trim(),
        deadlineDate,
        allowLateSubmission,
        isMandatory: true,
      });

      toast.success('Milestone deadline scheduled successfully.');
      queryClient.invalidateQueries({ queryKey: ['milestone-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (onSaved) onSaved();
      // Reset date and description
      setDeadlineDate('');
      setDescription('');
    } catch (err) {
      toast.error(
        err?.response?.data?.message || 'Failed to save milestone deadline. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/settings/deadlines/milestone/${id}`);
      toast.success('Milestone deadline removed.');
      queryClient.invalidateQueries({ queryKey: ['milestone-deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete milestone deadline.');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <DialogContent className="grid-rows-[auto_minmax(0,1fr)] max-h-[min(90dvh,56rem)] max-w-5xl gap-0 overflow-hidden p-0">
          {/* Modal Header */}
          <DialogHeader className="relative flex-row items-center justify-between border-b border-border/70 bg-muted/20 px-5 py-4 pr-14 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <CalendarPlus aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  Set Milestone Submission Deadlines
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Configure deliverable cutoffs across the 4-phase capstone lifecycle (Batch or
                  Section level).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Body: Split view (Create Form on Left, Active Deadlines on Right) */}
          <div className="grid min-h-0 grid-cols-1 overflow-y-auto md:grid-cols-12">
            {/* Left Column: Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 border-b border-border/60 p-5 sm:p-6 md:col-span-7 md:border-b-0 md:border-r"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Schedule New Milestone Cutoff
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Deadlines normalize to End-of-Day (23:59:59 UTC) and automatically render on the
                  calendar ribbon.
                </p>
              </div>

              {/* Batch & Target Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="deadline-batch-year" className="text-xs">
                    Academic Year (Batch)
                  </Label>
                  <Select value={batchYear} onValueChange={setBatchYear}>
                    <SelectTrigger
                      id="deadline-batch-year"
                      aria-required="true"
                      className="h-10 text-sm"
                    >
                      <SelectValue placeholder="Select Academic Year..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBatches.map((b) => (
                        <SelectItem key={b} value={b}>
                          AY {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Target Scope</Label>
                  <RadioGroup
                    value={targetType}
                    onValueChange={setTargetType}
                    aria-label="Target Scope"
                    className="grid grid-cols-2 gap-2"
                  >
                    <Label
                      htmlFor="deadline-target-batch"
                      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                    >
                      <RadioGroupItem id="deadline-target-batch" value="batch" />
                      Batch-Wide
                    </Label>
                    <Label
                      htmlFor="deadline-target-section"
                      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-xs font-medium"
                    >
                      <RadioGroupItem id="deadline-target-section" value="section" />
                      Section Only
                    </Label>
                  </RadioGroup>
                </div>
              </div>

              {/* Section Picker (if Section Only) */}
              {targetType === 'section' && (
                <div className="space-y-1.5 animate-in fade-in-50">
                  <Label htmlFor="deadline-section" className="text-xs">
                    Specific Section
                  </Label>
                  <Select value={sectionId} onValueChange={setSectionId}>
                    <SelectTrigger
                      id="deadline-section"
                      aria-required="true"
                      className="h-10 text-sm"
                    >
                      <SelectValue placeholder="Select Target Section..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((sec) => (
                        <SelectItem key={sec._id} value={String(sec._id)}>
                          {sec.name} ({sec.code || 'IT'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Phase selector: title proposal work followed by the three one-semester Capstone courses. */}
              <div className="space-y-1.5">
                <Label htmlFor="deadline-stage" className="text-xs">
                  Capstone Stage
                </Label>
                <Select value={stage} onValueChange={handleStageChange}>
                  <SelectTrigger id="deadline-stage" aria-required="true" className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deliverable Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="deadline-deliverable" className="text-xs">
                  Deliverable Component
                </Label>
                <Select value={deliverable} onValueChange={handleDeliverableChange}>
                  <SelectTrigger
                    id="deadline-deliverable"
                    aria-required="true"
                    className="h-10 text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDeliverables.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label} {d.postApprovalGated ? '(Post-Approval Gated)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Milestone Title */}
              <div className="space-y-1.5">
                <Label htmlFor="deadline-title" className="text-xs">
                  Display Title
                </Label>
                <Input
                  id="deadline-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 1 Final Draft Submission"
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Deadline Date */}
              <div className="space-y-1.5">
                <Label htmlFor="deadline-date" className="text-xs">
                  Submission Cutoff Date
                </Label>
                <Input
                  id="deadline-date"
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Allow Late Submissions Toggle */}
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="allow-late"
                  checked={allowLateSubmission}
                  onCheckedChange={(checked) => setAllowLateSubmission(checked === true)}
                />
                <Label
                  htmlFor="allow-late"
                  className="cursor-pointer select-none text-xs leading-relaxed text-foreground"
                >
                  Allow late submissions (marked as late with instructor justification flag)
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs gap-1.5 shadow-xs"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {isSubmitting ? 'Saving...' : 'Set Deadline'}
                </Button>
              </div>
            </form>

            {/* Right Column: Existing Deadlines List */}
            <div className="space-y-4 bg-muted/10 p-5 sm:p-6 md:col-span-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Active Milestones ({deadlines.length})
                </h3>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {batchYear}
                </Badge>
              </div>

              {deadlines.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium text-foreground">No Deadlines Configured</p>
                  <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto">
                    Use the form to define milestone submission dates for batch {batchYear}.
                  </p>
                </div>
              ) : (
                <div className="max-h-[min(32rem,50dvh)] space-y-2.5 overflow-y-auto pr-1">
                  {deadlines.map((item) => {
                    const dateObj = new Date(item.deadlineDate);
                    const isPast = dateObj < new Date();
                    const cat = DELIVERABLE_CATEGORY_MAP[item.deliverable] || 'manuscript';

                    const categoryVariant =
                      cat === 'adm'
                        ? 'info'
                        : cat === 'prototype'
                          ? 'warning'
                          : cat === 'final_paper'
                            ? 'success'
                            : 'secondary';

                    return (
                      <Card
                        key={item._id}
                        className="space-y-1.5 p-3 shadow-none hover:border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge
                                variant={categoryVariant}
                                className="px-1.5 py-0 text-[9px] uppercase"
                              >
                                {item.stage}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {item.targetType === 'section'
                                  ? item.sectionId?.name || 'Section'
                                  : 'Batch-Wide'}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            disabled={deletingId === item._id}
                            variant="ghost"
                            size="icon"
                            className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Delete deadline: ${item.title}`}
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">Cutoff Date:</span>
                          <span
                            className={`font-mono font-semibold ${isPast ? 'text-destructive-text' : 'text-foreground'}`}
                          >
                            {dateObj.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove milestone deadline?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove “{deleteTarget?.title}” from the active milestone deadlines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget._id)}
            >
              Remove deadline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

MilestoneDeadlinesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sections: PropTypes.array,
  batchYears: PropTypes.array,
  defaultBatch: PropTypes.string,
  deadlines: PropTypes.array,
  onSaved: PropTypes.func,
};
