import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Calendar,
  CalendarPlus,
  Clock,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import api from '@/services/api';
import { CAPSTONE_STAGES, STAGE_DELIVERABLE_MAP, DELIVERABLE_CATEGORY_MAP } from '@cms/shared';

const STAGE_LABELS = {
  [CAPSTONE_STAGES.CAPSTONE_1]: 'Capstone 1 (Proposal & Ch. 1–3)',
  [CAPSTONE_STAGES.CAPSTONE_2]: 'Capstone 2 (Sprint & System Dev)',
  [CAPSTONE_STAGES.CAPSTONE_3]: 'Capstone 3 (Results & Progress)',
  [CAPSTONE_STAGES.FINAL]: 'Final (Oral Defense & Archival)',
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
  const [batchYear, setBatchYear] = useState(defaultBatch || '2025-2026');
  const [targetType, setTargetType] = useState('batch');
  const [sectionId, setSectionId] = useState('');
  const [stage, setStage] = useState(CAPSTONE_STAGES.CAPSTONE_1);
  const [deliverable, setDeliverable] = useState(
    STAGE_DELIVERABLE_MAP[CAPSTONE_STAGES.CAPSTONE_1][0]?.id || 'chapter_1',
  );
  const [title, setTitle] = useState(
    STAGE_DELIVERABLE_MAP[CAPSTONE_STAGES.CAPSTONE_1][0]?.label || 'Chapter 1 Submission',
  );
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
    if (!batchYear || !stage || !deliverable || !title || !deadlineDate) {
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
    if (!window.confirm('Are you sure you want to remove this milestone deadline?')) {
      return;
    }
    setDeletingId(id);
    try {
      await api.delete(`/settings/deadlines/milestone/${id}`);
      toast.success('Milestone deadline removed.');
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete milestone deadline.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in-50">
      <div
        className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="milestone-modal-title" className="text-base font-bold text-foreground">
                Set Milestone Submission Deadlines
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure deliverable cutoffs across the 4-phase capstone lifecycle (Batch or
                Section level).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Split view (Create Form on Left, Active Deadlines on Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[75vh] overflow-y-auto">
          {/* Left Column: Form */}
          <form
            onSubmit={handleSubmit}
            className="md:col-span-7 p-6 border-b md:border-b-0 md:border-r border-border/60 space-y-4"
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Academic Year (Batch)
                </label>
                <input
                  type="text"
                  placeholder="2025-2026"
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Target Scope</label>
                <div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-md border border-border">
                  <button
                    type="button"
                    onClick={() => setTargetType('batch')}
                    className={`h-7 text-xs font-semibold rounded transition-all ${
                      targetType === 'batch'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Batch-Wide
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('section')}
                    className={`h-7 text-xs font-semibold rounded transition-all ${
                      targetType === 'section'
                        ? 'bg-background text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Section Only
                  </button>
                </div>
              </div>
            </div>

            {/* Section Picker (if Section Only) */}
            {targetType === 'section' && (
              <div className="space-y-1 animate-in fade-in-50">
                <label className="text-xs font-semibold text-foreground">Specific Section</label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Select Target Section...</option>
                  {sections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      {sec.name} ({sec.code || 'IT'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Stage Selector (Strictly 4 stages: capstone_1, capstone_2, capstone_3, final) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Capstone Stage</label>
              <select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {Object.entries(STAGE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deliverable Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Deliverable Component</label>
              <select
                value={deliverable}
                onChange={(e) => handleDeliverableChange(e.target.value)}
                className="w-full h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {availableDeliverables.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} {d.postApprovalGated ? '(Post-Approval Gated)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Milestone Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Display Title</label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 1 Final Draft Submission"
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Deadline Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Submission Cutoff Date
              </label>
              <Input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            {/* Allow Late Submissions Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="allow-late"
                checked={allowLateSubmission}
                onChange={(e) => setAllowLateSubmission(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label
                htmlFor="allow-late"
                className="text-xs text-foreground select-none cursor-pointer"
              >
                Allow late submissions (marked as late with instructor justification flag)
              </label>
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
          <div className="md:col-span-5 p-6 bg-muted/10 space-y-4">
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
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {deadlines.map((item) => {
                  const dateObj = new Date(item.deadlineDate);
                  const isPast = dateObj < new Date();
                  const cat = DELIVERABLE_CATEGORY_MAP[item.deliverable] || 'manuscript';

                  let badgeClass = 'bg-blue-500/10 text-blue-600 border-blue-500/30';
                  if (cat === 'adm')
                    badgeClass = 'bg-purple-500/10 text-purple-600 border-purple-500/30';
                  if (cat === 'prototype')
                    badgeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/30';
                  if (cat === 'final_paper')
                    badgeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';

                  return (
                    <div
                      key={item._id}
                      className="rounded-xl border border-border/80 bg-card p-3 shadow-2xs space-y-1.5 transition-all hover:border-border"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${badgeClass}`}
                            >
                              {item.stage}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.targetType === 'section'
                                ? item.sectionId?.name || 'Section'
                                : 'Batch-Wide'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Delete deadline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40">
                        <span className="text-muted-foreground">Cutoff Date:</span>
                        <span
                          className={`font-mono font-semibold ${isPast ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}
                        >
                          {dateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
