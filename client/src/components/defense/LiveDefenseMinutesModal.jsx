import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  FileText,
  Calculator,
  Gavel,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Send,
  Loader2,
  ShieldCheck,
  Award,
  Sparkles,
  ChevronRight,
  User,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import AutoExpandingTextarea from '@/components/projects/AutoExpandingTextarea';
import { defenseMinutesService } from '@/services/defenseMinutesService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'Manuscript / Literature',
  'System Architecture / Backend',
  'UI/UX',
  'Database Schema',
  'Methodology & Implementation',
  'General / Other',
];

const SEVERITIES = [
  {
    value: 'minor',
    label: 'Minor',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    value: 'major',
    label: 'Major',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    value: 'critical',
    label: 'Critical',
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
];

const VERDICTS = [
  { value: 'approved', label: 'Approved (Passed without Revisions)' },
  { value: 'approved_with_minor_revisions', label: 'Approved with Minor Revisions' },
  { value: 'major_revisions_redefense', label: 'Major Revisions / Redefense Required' },
  { value: 'failed', label: 'Failed' },
];

export default function LiveDefenseMinutesModal({
  isOpen,
  onClose,
  projectId,
  defenseType = 'proposal',
  projectTitle = '',
  panelists = [],
  user,
  onPublished,
}) {
  const [activeTab, setActiveTab] = useState('minutes'); // 'minutes' | 'scores' | 'verdict'
  const [isLoading, setIsLoading] = useState(true);
  const [minutes, setMinutes] = useState(null);
  const [liveScores, setLiveScores] = useState(null);

  // New entry form state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [panelistName, setPanelistName] = useState('');
  const [critique, setCritique] = useState('');
  const [expectedAction, setExpectedAction] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [pageOrModule, setPageOrModule] = useState('');
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  // Consensus verdict form state
  const [selectedVerdict, setSelectedVerdict] = useState('approved_with_minor_revisions');
  const [verdictRemarks, setVerdictRemarks] = useState('');
  const [isFinalizingVerdict, setIsFinalizingVerdict] = useState(false);

  // Score locking state
  const [isLockingScores, setIsLockingScores] = useState(false);
  const [isPublishingADM, setIsPublishingADM] = useState(false);

  // Candidate panelists list
  const candidatePanelists = useMemo(() => {
    const list = (panelists || []).map((p) => {
      const u = p.userId || p;
      const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(' ');
      return {
        id: u?._id || p?._id,
        name: fullName || p.name || 'Panel Member',
        role: p.role || 'member',
      };
    });
    return list;
  }, [panelists]);

  // Load session minutes & live scores
  const loadSession = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await defenseMinutesService.getMinutes(projectId, defenseType);
      if (res?.data?.data) {
        setMinutes(res.data.data.defenseMinutes);
        setLiveScores(res.data.data.liveScores);
        if (res.data.data.defenseMinutes?.consensusVerdict?.verdict) {
          setSelectedVerdict(res.data.data.defenseMinutes.consensusVerdict.verdict);
          setVerdictRemarks(res.data.data.defenseMinutes.consensusVerdict.remarks || '');
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load defense session.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, defenseType]);

  useEffect(() => {
    if (isOpen) {
      loadSession();
      // Set default panelist name if available
      if (candidatePanelists.length > 0 && !panelistName) {
        setPanelistName(candidatePanelists[0].name);
      }
    }
  }, [isOpen, loadSession, candidatePanelists, panelistName]);

  if (!isOpen) return null;

  // Handle Add Entry
  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!panelistName.trim()) {
      toast.error('Please specify or select a panelist.');
      return;
    }
    if (!critique.trim()) {
      toast.error('Please input the critique or recommendation voiced.');
      return;
    }
    if (!expectedAction.trim()) {
      toast.error('Please define the expected action/revision.');
      return;
    }

    setIsSubmittingEntry(true);
    try {
      const payload = {
        category,
        panelistName: panelistName.trim(),
        critique: critique.trim(),
        expectedAction: expectedAction.trim(),
        severity,
        pageOrModule: pageOrModule.trim(),
      };
      const res = await defenseMinutesService.addEntry(projectId, defenseType, payload);
      toast.success('Revision item logged to minutes.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
      setCritique('');
      setExpectedAction('');
      setPageOrModule('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add revision item.');
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (entryId) => {
    try {
      const res = await defenseMinutesService.deleteEntry(projectId, defenseType, entryId);
      toast.success('Item removed from minutes.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete item.');
    }
  };

  // Handle Lock Scores
  const handleLockScores = async () => {
    setIsLockingScores(true);
    try {
      const res = await defenseMinutesService.lockCompositeScores(projectId, defenseType, {
        confirmedByChair: true,
      });
      toast.success('Composite scores verified and locked.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
      loadSession();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to lock scores.');
    } finally {
      setIsLockingScores(false);
    }
  };

  // Handle Finalize Verdict
  const handleFinalizeVerdict = async () => {
    setIsFinalizingVerdict(true);
    try {
      const res = await defenseMinutesService.finalizeVerdict(projectId, defenseType, {
        verdict: selectedVerdict,
        remarks: verdictRemarks,
        chairConfirmed: true,
      });
      toast.success('Consensus verdict officially recorded.');
      setMinutes(res?.data?.data?.defenseMinutes || minutes);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record verdict.');
    } finally {
      setIsFinalizingVerdict(false);
    }
  };

  // Handle Publish to ADM
  const handlePublishToADM = async () => {
    if (!minutes?.entries || minutes.entries.length === 0) {
      toast.error(
        'Please log at least one revision entry before publishing to the Action Done Matrix.',
      );
      return;
    }

    setIsPublishingADM(true);
    try {
      const res = await defenseMinutesService.publishToADM(projectId, defenseType);
      toast.success(
        'Action Done Matrix successfully generated and published to student dashboard!',
      );
      if (onPublished) onPublished(res?.data?.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to publish to Action Done Matrix.');
    } finally {
      setIsPublishingADM(false);
    }
  };

  const isScoreLocked = Boolean(minutes?.compositeScores?.isLocked);
  const isMatrixPublished = Boolean(minutes?.matrixPublished);
  const entries = minutes?.entries || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Official Defense Minutes & Score Consolidator
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono tracking-wider border-primary/40 bg-primary/10 text-primary"
                >
                  {defenseType} Defense
                </Badge>
                {isMatrixPublished && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  >
                    ADM Published
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {projectTitle || 'Oral Defense Session — Bukidnon State University'}
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

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-border bg-card">
          <button
            type="button"
            onClick={() => setActiveTab('minutes')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'minutes'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-4 w-4" />
            Live Minutes & Revisions ({entries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scores')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'scores'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Calculator className="h-4 w-4" />
            Automated Score Aggregator
            {isScoreLocked && <Lock className="h-3 w-3 text-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('verdict')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all',
              activeTab === 'verdict'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Gavel className="h-4 w-4" />
            Consensus Verdict & Publish
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Synchronizing live defense records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: LIVE MINUTES & REVISION LOGGING */}
              {activeTab === 'minutes' && (
                <div className="space-y-6">
                  {/* Structured Logging Input Form */}
                  <form
                    onSubmit={handleAddEntry}
                    className="rounded-xl border border-border bg-muted/20 p-4 space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        Log Panel Revision Remark / Critique
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Logged entries populate the official student Action Done Matrix (ADM)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Category Selector */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">Category</Label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tagged Panelist */}
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Panelist Attribution
                        </Label>
                        {candidatePanelists.length > 0 ? (
                          <select
                            value={panelistName}
                            onChange={(e) => setPanelistName(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                          >
                            {candidatePanelists.map((p) => (
                              <option key={p.id} value={p.name}>
                                {p.name} ({p.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder="e.g. Dr. Louie Jay Labastida"
                            value={panelistName}
                            onChange={(e) => setPanelistName(e.target.value)}
                            className="h-9 text-xs"
                          />
                        )}
                      </div>

                      {/* Severity & Reference */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">Severity</Label>
                          <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="w-full h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                          >
                            {SEVERITIES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-foreground">
                            Page / Module
                          </Label>
                          <Input
                            placeholder="e.g. Ch 3, p. 45"
                            value={pageOrModule}
                            onChange={(e) => setPageOrModule(e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Critique & Expected Action Textareas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Critique / Technical Flaw Voiced
                        </Label>
                        <AutoExpandingTextarea
                          placeholder="Detail the specific observation or flaw noted by the panelist..."
                          value={critique}
                          onChange={(e) => setCritique(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-foreground">
                          Required Revision / Expected Action
                        </Label>
                        <AutoExpandingTextarea
                          placeholder="Action required from the student team to resolve this item..."
                          value={expectedAction}
                          onChange={(e) => setExpectedAction(e.target.value)}
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmittingEntry}
                        className="gap-2 font-semibold shadow-xs"
                      >
                        {isSubmittingEntry ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Log Revision Item
                      </Button>
                    </div>
                  </form>

                  {/* Logged Revisions List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Recorded Defense Minutes ({entries.length} items)
                      </h3>
                      {entries.length > 0 && !isMatrixPublished && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab('verdict')}
                          className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                        >
                          Proceed to Consensus & ADM Publish
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    {entries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-xs font-medium">No defense minutes recorded yet.</p>
                        <p className="text-[11px] text-muted-foreground">
                          Use the form above to record panel remarks in real time as defense
                          proceeds.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {entries.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  #{idx + 1}. {item.panelistName}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-muted/40 border-border"
                                >
                                  {item.category}
                                </Badge>
                                {item.pageOrModule && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-mono text-muted-foreground"
                                  >
                                    {item.pageOrModule}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] capitalize',
                                    item.severity === 'critical'
                                      ? 'border-rose-500/40 text-rose-600 bg-rose-500/10'
                                      : item.severity === 'major'
                                        ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                        : 'border-blue-500/40 text-blue-600 bg-blue-500/10',
                                  )}
                                >
                                  {item.severity}
                                </Badge>
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteEntry(item._id)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 border-t border-border/50">
                              <div>
                                <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                                  Critique / Flaw:
                                </span>
                                <p className="text-foreground leading-relaxed">{item.critique}</p>
                              </div>
                              <div>
                                <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5">
                                  Expected Action:
                                </span>
                                <p className="text-foreground leading-relaxed">
                                  {item.expectedAction}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AUTOMATED SCORE AGGREGATOR */}
              {activeTab === 'scores' && (
                <div className="space-y-6">
                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Total Panelists
                      </span>
                      <span className="text-2xl font-extrabold text-foreground">
                        {liveScores?.totalPanelists || candidatePanelists.length}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Submitted Rubrics
                      </span>
                      <span className="text-2xl font-extrabold text-primary">
                        {liveScores?.submittedCount || 0} /{' '}
                        {liveScores?.totalPanelists || candidatePanelists.length}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Weighted Average
                      </span>
                      <span className="text-2xl font-extrabold text-indigo-500">
                        {liveScores?.averagePercentage !== null &&
                        liveScores?.averagePercentage !== undefined
                          ? `${liveScores.averagePercentage}%`
                          : 'Pending'}
                      </span>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 text-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                        Passing Status
                      </span>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        {liveScores?.passingThresholdMet ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 font-bold text-xs py-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Passed ({'>='} 75%)
                          </Badge>
                        ) : liveScores?.averagePercentage !== null ? (
                          <Badge
                            variant="outline"
                            className="border-rose-500/40 text-rose-600 bg-rose-500/10 font-bold text-xs py-1"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                            Below 75%
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground border-border text-xs py-1"
                          >
                            Awaiting Scores
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel Rubrics Breakdown Table */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        Individual Evaluation Rubrics Consolidation
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={loadSession}
                        className="text-xs h-7 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Clock className="h-3 w-3" /> Refresh Rubrics
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-muted/10 text-[11px] font-bold text-muted-foreground">
                            <th className="py-2.5 px-4">Panel Member</th>
                            <th className="py-2.5 px-3">Role</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Total Score</th>
                            <th className="py-2.5 px-3 text-right">Percentage</th>
                            <th className="py-2.5 px-4 text-center">Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {liveScores?.panelScores && liveScores.panelScores.length > 0 ? (
                            liveScores.panelScores.map((row, idx) => (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  {row.panelistName}
                                </td>
                                <td className="py-3 px-3 capitalize text-muted-foreground font-mono text-[11px]">
                                  {row.panelRole}
                                </td>
                                <td className="py-3 px-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[10px] capitalize',
                                      row.status === 'submitted' || row.status === 'released'
                                        ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                                        : 'border-amber-500/40 text-amber-600 bg-amber-500/10',
                                    )}
                                  >
                                    {row.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                  {row.score !== null ? `${row.score} / ${row.maxScore}` : '—'}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-primary">
                                  {row.percentage !== null ? `${row.percentage}%` : '—'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {row.decision ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px] capitalize',
                                        ['passed', 'approved'].includes(row.decision.toLowerCase())
                                          ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/10'
                                          : [
                                                'passed_with_revisions',
                                                'passed_with_revision',
                                              ].includes(row.decision.toLowerCase())
                                            ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                                            : 'border-rose-500/40 text-rose-600 bg-rose-500/10',
                                      )}
                                    >
                                      {row.decision.replace(/_/g, ' ')}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground italic text-[11px]">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-6 text-center text-muted-foreground italic"
                              >
                                No panel evaluation sheets registered for this defense yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirmation & Lock Box */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-foreground">
                          Score Confirmation & Immutability Lock
                        </span>
                        {isScoreLocked && (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px]"
                          >
                            Locked & Confirmed
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Locking freezes the aggregated score table for committee documentation and
                        prevents retroactive alteration.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={handleLockScores}
                      disabled={isLockingScores || isScoreLocked}
                      className="gap-2 font-semibold shadow-xs"
                    >
                      {isLockingScores ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {isScoreLocked ? 'Composite Scores Locked' : 'Confirm & Lock Scores'}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: CONSENSUS VERDICT & PUBLISH */}
              {activeTab === 'verdict' && (
                <div className="space-y-6">
                  {/* Verdict Selection Card */}
                  <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <Gavel className="h-4 w-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Committee Consensus Verdict
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-foreground">
                        Consensus Decision
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {VERDICTS.map((v) => (
                          <label
                            key={v.value}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                              selectedVerdict === v.value
                                ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs'
                                : 'border-border bg-muted/10 text-muted-foreground hover:bg-muted/20',
                            )}
                          >
                            <input
                              type="radio"
                              name="verdict"
                              value={v.value}
                              checked={selectedVerdict === v.value}
                              onChange={(e) => setSelectedVerdict(e.target.value)}
                              className="text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs">{v.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        Committee Recommendations & Summary Remarks
                      </Label>
                      <AutoExpandingTextarea
                        placeholder="Provide consensus justification, key directions, and conditions required from the proponent team..."
                        value={verdictRemarks}
                        onChange={(e) => setVerdictRemarks(e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleFinalizeVerdict}
                        disabled={isFinalizingVerdict}
                        className="gap-1.5 font-semibold text-xs"
                      >
                        {isFinalizingVerdict ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Gavel className="h-3.5 w-3.5" />
                        )}
                        Record Consensus Verdict
                      </Button>
                    </div>
                  </div>

                  {/* Publish to ADM Card */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Publish to Action Done Matrix (ADM)
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Publishing transforms all {entries.length} logged revision critiques into an
                      interactive compliance checklist on the student dashboard. Students will be
                      required to submit side-by-side compliance logs (Recommendation vs. Action
                      Taken + Page/Commit Link) for your official endorsement.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span>
                          Items to convert:{' '}
                          <strong className="text-foreground">{entries.length}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Target:{' '}
                          <strong className="text-foreground">Student Action Done Matrix</strong>
                        </span>
                      </div>

                      <Button
                        size="default"
                        onClick={handlePublishToADM}
                        disabled={isPublishingADM || entries.length === 0}
                        className="gap-2 font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isPublishingADM ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Publish to Action Done Matrix
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>BukSU ASDLC v2.0 Institutional Oral Defense Bridge</span>
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
