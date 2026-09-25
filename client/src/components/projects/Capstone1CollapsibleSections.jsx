import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Presentation,
  ShieldCheck,
  Eye,
  FileCheck,
  Award,
  Loader2,
  XCircle,
  Send,
  ClipboardCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { TITLE_STATUSES, DOCUMENT_TYPES } from '@cms/shared';
import { parsePitchDeckFromDescription } from '@/utils/pitchDeckParser';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useApproveTitle, useRejectTitle, useAddTitleComment } from '@/hooks/useProjects';
import { toast } from 'sonner';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import ProposalRehearsalModal from './ProposalRehearsalModal';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';
import EvaluationPanel from './EvaluationPanel';
import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';

const CHAPTER_TITLES = {
  1: 'Chapter 1: Problem Definition & Objectives',
  2: 'Chapter 2: Literature Review & Methodology',
  3: 'Chapter 3: System Architecture & Specifications',
};

export default function Capstone1CollapsibleSections({
  project,
  isStudent = false,
  isFaculty = false,
  user,
  onTabChange,
  onRefresh,
}) {
  const navigate = useNavigate();

  // Every section is collapsed by default per minimalist requirements
  const [openSections, setOpenSections] = useState({
    proposal: false,
    manuscript: false,
    adm: false,
    evaluation: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Rehearsal modal state
  const [isRehearsalOpen, setIsRehearsalOpen] = useState(false);

  // Document Viewer modal state
  const [viewerDoc, setViewerDoc] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Derive title approval status
  const titleApproved =
    project?.titleStatus === TITLE_STATUSES.APPROVED ||
    Boolean(project?.titleApproved) ||
    project?.capstonePhase > 1;

  // Normalized proposal items
  const titleProposals = useMemo(() => {
    const list = Array.isArray(project?.titleProposals) ? project.titleProposals : [];
    const meta = Array.isArray(project?.titleProposalMetadata) ? project.titleProposalMetadata : [];

    return list.map((item, idx) => {
      const titleStr = typeof item === 'string' ? item : item?.title;
      const details = meta.find((m) => m?.title === titleStr) || meta[idx];
      const desc = details?.description || '';
      const pitchDeck =
        details?.pitchDeck && Object.keys(details.pitchDeck).length > 0
          ? details.pitchDeck
          : parsePitchDeckFromDescription(desc);

      return {
        id: details?._id || item?._id || `prop-${idx + 1}`,
        index: idx + 1,
        title: titleStr || `Title Proposal ${idx + 1}`,
        description: desc,
        pitchDeck,
        sdgs: details?.sdgs || item?.sdgs || [],
        disciplines: details?.disciplines || item?.disciplines || [],
        status: details?.status || 'pending',
        isApproved: details?.status === 'approved' || project?.title === titleStr,
      };
    });
  }, [project]);

  // Proposal index selection state
  const [selectedProposalIndex, setSelectedProposalIndex] = useState(() => {
    const list = Array.isArray(project?.titleProposals) ? project.titleProposals : [];
    const meta = Array.isArray(project?.titleProposalMetadata) ? project.titleProposalMetadata : [];
    const approvedIdx = list.findIndex((item, idx) => {
      const titleStr = typeof item === 'string' ? item : item?.title;
      const details = meta.find((m) => m?.title === titleStr) || meta[idx];
      return details?.status === 'approved' || project?.title === titleStr;
    });
    return approvedIdx >= 0 ? approvedIdx : 0;
  });

  // Deliberation state for reviewers
  const [deliberationVote, setDeliberationVote] = useState(''); // 'Approve' | 'Revision'
  const [deliberationRemarks, setDeliberationRemarks] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const approveTitleMutation = useApproveTitle();
  const rejectTitleMutation = useRejectTitle();
  const addCommentMutation = useAddTitleComment();

  const isInstructor = user?.role === 'instructor';
  const isAdviser =
    (project?.adviserId?._id || project?.adviserId)?.toString() === user?._id?.toString();
  const isPanelist = (project?.panelistIds || []).some(
    (p) => (p?._id || p)?.toString() === user?._id?.toString(),
  );
  const canReviewTitle = isInstructor || isAdviser || isPanelist || isFaculty;

  // Selected proposal or approved title
  const activeProposal = useMemo(() => {
    if (!titleProposals.length) {
      return {
        id: 'prop-default',
        index: 1,
        title: project?.title || 'Proposed Capstone Research Title',
        description: project?.abstract || '',
        pitchDeck: parsePitchDeckFromDescription(project?.abstract || ''),
        sdgs: project?.sdg || [],
        disciplines: project?.discipline ? [project.discipline] : [],
        isApproved: titleApproved,
      };
    }
    const selected = titleProposals[selectedProposalIndex];
    return selected || titleProposals[0];
  }, [titleProposals, selectedProposalIndex, project, titleApproved]);

  const handleSubmitDecision = async () => {
    if (!deliberationVote) {
      toast.error('Please select a decision: Approve or Request Revision.');
      return;
    }
    if (deliberationVote === 'Revision' && !deliberationRemarks.trim()) {
      toast.error('Please provide revision remarks for the proponents.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      if (deliberationRemarks.trim()) {
        await addCommentMutation.mutateAsync({
          projectId: project._id,
          proposalId: String(activeProposal.index),
          text: `Deliberation Decision: ${deliberationVote}\nRemarks: ${deliberationRemarks.trim()}`,
        });
      }

      if (deliberationVote === 'Approve') {
        const scheduleStatus = project?.defenseSchedule?.status;
        const hasScheduleDate = Boolean(project?.defenseSchedule?.date);
        const isScheduledOrDone =
          (scheduleStatus === 'scheduled' && hasScheduleDate) || scheduleStatus === 'completed';

        if (!isScheduledOrDone) {
          toast.error(
            'The proponent team must have a scheduled defense hearing before their title proposal can be approved. Please schedule the team in the Scheduling Center.',
          );
          return;
        }

        await approveTitleMutation.mutateAsync({
          projectId: project._id,
          proposalId: activeProposal.index,
        });
        toast.success(`Proposal ${activeProposal.index} officially approved as capstone title!`);
      } else if (deliberationVote === 'Revision') {
        await rejectTitleMutation.mutateAsync({
          projectId: project._id,
          reason: `Proposal Revision Required: ${deliberationRemarks.trim()}`,
        });
        toast.success('Title proposal sent back for revision.');
      }

      setDeliberationVote('');
      setDeliberationRemarks('');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Submissions query for Chapters 1-3 and compiled proposal
  const { data: submissions = [] } = useProjectSubmissions(project?._id);

  const latestChapters = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(submissions)) return map;
    for (let ch = 1; ch <= 3; ch++) {
      const chSubs = submissions.filter((s) => s.chapterNumber === ch);
      if (chSubs.length > 0) {
        chSubs.sort((a, b) => (b.version || 0) - (a.version || 0));
        map.set(ch, chSubs[0]);
      }
    }
    return map;
  }, [submissions]);

  const compiledProposalSub = useMemo(() => {
    if (!Array.isArray(submissions)) return null;
    const propSubs = submissions.filter(
      (s) => s.type === DOCUMENT_TYPES.PROPOSAL || s.type === 'proposal',
    );
    if (!propSubs.length) return null;
    return propSubs.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  }, [submissions]);

  const handleOpenViewer = (sub, title) => {
    if (!sub) return;
    setViewerDoc({
      submission: sub,
      title: title || sub.title || 'Document Manuscript',
      fileUrl: sub.fileUrl || `/api/submissions/${sub._id}/file`,
    });
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-3" data-testid="capstone1-collapsible-workspace">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: PROPOSAL STAGE                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.proposal && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('proposal')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.proposal}
          data-testid="toggle-proposal-stage"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">Proposal Stage</span>
                {titleApproved ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Title Approved
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-semibold gap-1"
                  >
                    <Clock className="h-3 w-3" />
                    Pending Defense Approval
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                {titleApproved
                  ? activeProposal.title
                  : 'Candidate proposal blueprints, SDG mapping & pitch deck rehearsal'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.proposal ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.proposal && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.proposal && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 space-y-4 animate-in fade-in duration-200">
            {/* Candidate Proposal Selector Tabs (when multiple proposals exist) */}
            {titleProposals.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                  Candidate Proposals ({titleProposals.length}):
                </span>
                {titleProposals.map((prop, idx) => {
                  const isSelected = activeProposal.index === prop.index;
                  return (
                    <button
                      key={prop.id || idx}
                      type="button"
                      onClick={() => setSelectedProposalIndex(idx)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/30'
                          : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60',
                      )}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold">
                        {prop.index}
                      </span>
                      <span className="max-w-[180px] truncate">{prop.title}</span>
                      {prop.isApproved && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Proposal Title Header Bar */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shrink-0 mt-0.5">
                  {activeProposal.index}
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                    {activeProposal.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {activeProposal.sdgs?.map((sdg) => (
                      <Badge
                        key={sdg}
                        variant="outline"
                        className="text-[10px] font-mono border-border/70 bg-background/80"
                      >
                        SDG {sdg}
                      </Badge>
                    ))}
                    {activeProposal.disciplines?.map((disc) => (
                      <Badge key={disc} variant="secondary" className="text-[10px] font-mono">
                        {disc}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Student-only rehearsal and drafting buttons */}
              {isStudent && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsRehearsalOpen(true)}
                    className="gap-1.5 text-xs h-8 font-medium shadow-xs"
                  >
                    <Presentation className="h-3.5 w-3.5 text-primary" />
                    <span>Rehearse Pitch Deck</span>
                  </Button>
                  {onTabChange && (
                    <Button
                      size="sm"
                      onClick={() => onTabChange('proposal')}
                      className="gap-1.5 text-xs h-8 font-medium shadow-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Drafting Studio</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 5-Point Blueprint (Image 1 Style) */}
            <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4">
              {/* Problem Statement */}
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Problem Statement
                </h5>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {activeProposal.pitchDeck?.problemStatement ||
                    activeProposal.description ||
                    'No problem statement documented yet.'}
                </p>
              </div>

              {/* Proposed Solution */}
              <div className="space-y-1 border-t border-border/40 pt-3">
                <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Proposed Solution
                </h5>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {activeProposal.pitchDeck?.proposedSolution ||
                    'An on-premise hardware-software pipeline and intelligent web/mobile progressive app.'}
                </p>
              </div>

              {/* 2-Column: Unique Innovation & Target Beneficiaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/40 pt-3">
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Unique Innovation
                  </h5>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {activeProposal.pitchDeck?.uniqueContribution ||
                      'On-premise edge computing, localized offline support, and low-latency diagnostic processing.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Target Beneficiaries
                  </h5>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {activeProposal.pitchDeck?.targetUsers ||
                      'Local communities, institutional researchers, and municipal stakeholders.'}
                  </p>
                </div>
              </div>

              {/* Expected Impact / Value */}
              <div className="space-y-1 border-t border-border/40 pt-3">
                <h5 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Expected Impact / Value
                </h5>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {activeProposal.pitchDeck?.expectedImpact ||
                    'Significantly reduces operational overhead and enhances automated institutional compliance.'}
                </p>
              </div>
            </div>

            {/* Reviewer Deliberation Decision Studio (Instructor / Faculty Committee) */}
            {!isStudent && !titleApproved && canReviewTitle && (
              <div className="rounded-xl border border-amber-500/30 bg-muted/40 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Committee Deliberation &amp; Official Decision
                    </h5>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]"
                  >
                    Proposal {activeProposal.index}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeliberationVote('Approve')}
                    className={cn(
                      'h-10 text-xs font-semibold gap-2 border-emerald-500/30 justify-start px-3.5 transition-all',
                      deliberationVote === 'Approve'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500 border-emerald-500'
                        : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Approve Proposal as Official Title</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeliberationVote('Revision')}
                    className={cn(
                      'h-10 text-xs font-semibold gap-2 border-amber-500/30 justify-start px-3.5 transition-all',
                      deliberationVote === 'Revision'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500 border-amber-500'
                        : 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600',
                    )}
                  >
                    <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Request Revisions from Proponents</span>
                  </Button>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Textarea
                    placeholder="Enter committee remarks, deliberation feedback, or revision instructions..."
                    value={deliberationRemarks}
                    onChange={(e) => setDeliberationRemarks(e.target.value)}
                    rows={3}
                    className="text-xs bg-background resize-none border-border/80"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Remarks are recorded to the project review history and transmitted to the
                    proponents.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmitDecision}
                    disabled={isSubmittingDecision || !deliberationVote}
                    className="gap-2 text-xs font-semibold px-5"
                  >
                    {isSubmittingDecision ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Submit Official Decision</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: CHAPTER 1–3 AND COMPILED 1–3 MANUSCRIPT                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.manuscript && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('manuscript')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.manuscript}
          data-testid="toggle-manuscript-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Chapters 1–3 &amp; Compiled Manuscript
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  {latestChapters.size}/3 Chapters
                </Badge>
                {compiledProposalSub && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Compiled Draft
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Submission review, originality compliance, and OOXML reader view
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.manuscript ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.manuscript && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.manuscript && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 space-y-4 animate-in fade-in duration-200">
            {!isStudent ? (
              <div className="pt-2 space-y-4">
                <ChapterReviewPanel
                  submissions={submissions}
                  chapters={[1, 2, 3]}
                  extraItems={[
                    {
                      id: 'compiled_proposal',
                      key: 'proposal',
                      number: 4,
                      label: 'Capstone 1 (1–3 Manuscript)',
                      filter: (sub) =>
                        sub.type === DOCUMENT_TYPES.PROPOSAL || sub.type === 'proposal',
                      emptyText: 'No submissions yet for this compiled manuscript.',
                    },
                  ]}
                  title="Capstone 1 — Chapter Submissions"
                  description="Approve or request revisions for each chapter and compiled manuscript. Approving locks the chapter and unlocks the next one for the student."
                  showReviewActions={isInstructor || isAdviser}
                />
              </div>
            ) : (
              /* Chapters 1-3 & Compiled Cards Grid for Students */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[1, 2, 3].map((ch) => {
                  const sub = latestChapters.get(ch);
                  const hasSub = Boolean(sub);

                  return (
                    <div
                      key={ch}
                      className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-foreground line-clamp-1">
                            {CHAPTER_TITLES[ch]}
                          </span>
                          {hasSub ? (
                            <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                              v{sub.version || 1}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-muted-foreground shrink-0 border-border/60"
                            >
                              Not Uploaded
                            </Badge>
                          )}
                        </div>

                        {hasSub ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={cn(
                                'text-[10px] font-medium capitalize',
                                sub.status === 'approved' &&
                                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
                                sub.status === 'rejected' &&
                                  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
                                sub.status === 'pending' &&
                                  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
                              )}
                            >
                              {sub.status || 'Pending Review'}
                            </Badge>
                            {sub.plagiarismScore !== undefined && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {100 - Math.round(sub.plagiarismScore)}% Original
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Manuscript pending initial submission by proponents.
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                        {hasSub ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenViewer(sub, CHAPTER_TITLES[ch])}
                            className="text-xs h-7 gap-1.5 text-primary hover:bg-primary/10 px-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View in Reader
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Awaiting upload
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/project/submissions')}
                          className="text-[11px] text-muted-foreground hover:text-foreground h-7 px-2"
                        >
                          Submissions &rarr;
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Compiled Proposal Card */}
                <div className="rounded-xl border border-primary/30 bg-primary/[0.02] p-3.5 space-y-2 flex flex-col justify-between sm:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <h5 className="text-xs font-bold text-foreground">
                          Compiled Chapters 1–3 Proposal Manuscript
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          {compiledProposalSub
                            ? `Official compiled draft v${compiledProposalSub.version || 1} ready for committee hearing evaluation.`
                            : 'Compiled once Chapters 1–3 manuscripts are reviewed and approved.'}
                        </p>
                      </div>
                    </div>
                    {compiledProposalSub && (
                      <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono w-fit">
                        Compiled v{compiledProposalSub.version || 1}
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    {compiledProposalSub ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleOpenViewer(compiledProposalSub, 'Compiled Proposal Manuscript')
                        }
                        className="text-xs h-7 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Full Manuscript
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Submissions page compiles approved chapters.
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/project/submissions')}
                      className="text-xs h-7 gap-1.5"
                    >
                      <span>Manage on Submissions Page</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: ACTION DONE MATRIX (ADM) SECTION                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.adm && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('adm')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.adm}
          data-testid="toggle-adm-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Action Done Matrix (ADM v1 — Proposal Defense)
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground border-border/60"
                >
                  Cap 1 Scoped
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Panel suggestions, actions taken, manuscript page numbers, and multi-tier digital
                signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.adm ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.adm && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.adm && (
          <CardContent className="p-2 sm:p-4 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <ActionDoneMatrixTab
                project={project}
                isStudent={isStudent}
                user={user}
                onRefresh={onRefresh}
                initialMilestone="CAPSTONE_1"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: DEFENSE EVALUATION & GRADE SIGN-OFF                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Card
        className={cn(
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs',
          openSections.evaluation && 'ring-1 ring-primary/20',
        )}
      >
        <button
          type="button"
          onClick={() => toggleSection('evaluation')}
          className="w-full text-left p-4 sm:p-4.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors focus-visible:outline-none"
          aria-expanded={openSections.evaluation}
          data-testid="toggle-evaluation-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 font-bold shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Defense Evaluation &amp; Grade Sign-Off
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px]',
                    project?.evaluations?.length > 0
                      ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      : 'border-border/60 text-muted-foreground',
                  )}
                >
                  {project?.evaluations?.length > 0
                    ? `${project.evaluations.length} Evals Recorded`
                    : 'Proposal Defense'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-xl">
                Panel rubric scoring, grading criteria breakdown, remarks, and official defense
                verdict
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {openSections.evaluation ? 'Collapse' : 'Expand'}
            </span>
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-transform duration-200',
                openSections.evaluation && 'rotate-180 text-foreground bg-muted/50',
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </button>

        {openSections.evaluation && (
          <CardContent className="p-4 sm:p-6 pt-2 border-t border-border/50 animate-in fade-in duration-200">
            <EvaluationPanel projectId={project?._id} defenseType="proposal" />
          </CardContent>
        )}
      </Card>

      {/* Rehearsal Pitch Deck Modal */}
      <ProposalRehearsalModal
        isOpen={isRehearsalOpen}
        onClose={() => setIsRehearsalOpen(false)}
        proposal={{
          ...activeProposal,
          pitchDeck: activeProposal.pitchDeck,
        }}
        proponentTeam={project?.teamId || { name: 'Proponents' }}
        projectTitle={activeProposal.title}
      />

      {/* Canonical Sophisticated Document Viewer Modal */}
      {isViewerOpen && viewerDoc && (
        <SophisticatedDocumentViewer
          open={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          submission={viewerDoc.submission}
          fileUrl={viewerDoc.fileUrl}
          chapterTitle={viewerDoc.title}
          embedded={false}
        />
      )}
    </div>
  );
}

Capstone1CollapsibleSections.propTypes = {
  project: PropTypes.object,
  isStudent: PropTypes.bool,
  isFaculty: PropTypes.bool,
  user: PropTypes.object,
  onTabChange: PropTypes.func,
  onRefresh: PropTypes.func,
};
