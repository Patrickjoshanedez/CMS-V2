import React, { useState, useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
  Clock,
  ExternalLink,
  Presentation,
  Eye,
  FileCheck,
  Award,
  XCircle,
  Send,
  ClipboardCheck,
  Calendar as CalendarIcon,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { TITLE_STATUSES, DOCUMENT_TYPES } from '@cms/shared';
import { parsePitchDeckFromDescription } from '@/utils/pitchDeckParser';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useApproveTitle, useRejectTitle, useAddTitleComment } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import ProposalRehearsalModal from './ProposalRehearsalModal';
const SophisticatedDocumentViewer = lazy(
  () => import('@/components/documents/SophisticatedDocumentViewer'),
);
import EvaluationPanel from './EvaluationPanel';
import ChapterReviewPanel from '@/components/submissions/ChapterReviewPanel';
import ScheduleDefenseModal from '@/components/defense/ScheduleDefenseModal';
import AssignCommitteeDialog from '@/components/teams/AssignCommitteeDialog';

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

  // Defense schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAssignCommitteeOpen, setIsAssignCommitteeOpen] = useState(false);
  const [selectedAdviserId, setSelectedAdviserId] = useState('');

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
        isApproved:
          details?.status === 'approved' ||
          (project?.titleStatus === TITLE_STATUSES.APPROVED && project?.title === titleStr),
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
      return (
        details?.status === 'approved' ||
        (project?.titleStatus === TITLE_STATUSES.APPROVED && project?.title === titleStr)
      );
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

  // Candidate faculty for instructor to choose suitable adviser based on proposal field
  const { data: facultyData } = useUsers(
    { role: 'faculty', isActive: true, page: 1, limit: 100 },
    { enabled: Boolean(isInstructor && !project?.adviserId) },
  );

  const candidateFaculty = useMemo(() => {
    const list = facultyData?.users || [];
    const secId = String(project?.secretaryId?._id || project?.secretaryId || '');
    const panelistIds = (project?.panelistIds || []).map((p) => String(p?._id || p));

    return list
      .filter((f) => {
        const fId = String(f._id);
        const rawRole = String(f.role || '').toLowerCase();
        if (rawRole === 'instructor' || rawRole === 'student') return false;
        if (fId === secId) return false;
        if (panelistIds.includes(fId)) return false;
        return true;
      })
      .sort((a, b) => {
        const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ').toLowerCase();
        const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [facultyData, project?.secretaryId, project?.panelistIds]);

  // Derive defense hearing schedule status
  const scheduleStatus = project?.defenseSchedule?.status;
  const hasScheduleDate = Boolean(project?.defenseSchedule?.date);
  const isScheduledOrDone =
    (scheduleStatus === 'scheduled' && hasScheduleDate) || scheduleStatus === 'completed';

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
        const commentProposalId =
          activeProposal?.id && !String(activeProposal.id).startsWith('prop-')
            ? String(activeProposal.id)
            : String(selectedProposalIndex);

        await addCommentMutation.mutateAsync({
          projectId: project._id,
          proposalId: commentProposalId,
          text: `Deliberation Decision: ${deliberationVote}\nRemarks: ${deliberationRemarks.trim()}`,
        });
      }

      if (deliberationVote === 'Approve') {
        if (!isScheduledOrDone) {
          if (isInstructor) {
            setIsScheduleModalOpen(true);
          }
          toast.error(
            'The proponent team must have a scheduled title proposal hearing before the title can be approved.',
          );
          return;
        }

        await approveTitleMutation.mutateAsync({
          projectId: project._id,
          proposalId: selectedProposalIndex,
          ...(selectedAdviserId ? { adviserId: selectedAdviserId } : {}),
        });
        toast.success(`Proposal ${activeProposal.index} officially approved as capstone title!`);
      } else if (deliberationVote === 'Revision') {
        await rejectTitleMutation.mutateAsync({
          projectId: project._id,
          reason: `Proposal Revision Required: ${deliberationRemarks.trim()}`,
          proposalId: selectedProposalIndex,
        });
        toast.success('Title proposal sent back for revision.');
      }

      setDeliberationVote('');
      setDeliberationRemarks('');
      onRefresh?.();
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message ||
          err?.response?.data?.message ||
          err?.message ||
          'Failed to submit decision.',
      );
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => toggleSection('proposal')}
          className="h-auto min-h-11 w-full min-w-0 justify-between whitespace-normal rounded-none p-4 text-left hover:bg-muted/30 sm:p-4.5"
          aria-expanded={openSections.proposal}
          data-testid="toggle-proposal-stage"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">Proposal Stage</span>
                {titleApproved ? (
                  <Badge variant="success" className="text-[10px] font-semibold gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Title Approved
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] font-semibold gap-1">
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
        </Button>

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
                    <Button
                      key={prop.id || idx}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedProposalIndex(idx)}
                      className={cn(
                        'h-auto min-h-11 min-w-0 gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/30'
                          : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60',
                      )}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold">
                        {prop.index}
                      </span>
                      <span className="max-w-[180px] truncate">{prop.title}</span>
                      {prop.isApproved && <CheckCircle2 className="h-3 w-3 text-success" />}
                    </Button>
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
                <h5 className="text-xs font-bold text-primary uppercase tracking-wider">
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
                <h5 className="text-xs font-bold text-success uppercase tracking-wider">
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
                  <h5 className="text-xs font-bold text-info uppercase tracking-wider">
                    Unique Innovation
                  </h5>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {activeProposal.pitchDeck?.uniqueContribution ||
                      'On-premise edge computing, localized offline support, and low-latency diagnostic processing.'}
                  </p>
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-warning uppercase tracking-wider">
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
                <h5 className="text-xs font-bold text-info uppercase tracking-wider">
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
              <div className="rounded-xl border border-warning/30 bg-muted/40 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Committee Deliberation &amp; Official Decision
                    </h5>
                  </div>
                  <Badge variant="warning" className="text-[10px]">
                    Proposal {activeProposal.index}
                  </Badge>
                </div>

                {/* Institutional Prerequisite: Scheduled Defense Hearing Indicator */}
                {!isScheduledOrDone ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-warning shrink-0" />
                      <span>
                        <strong>Title Proposal Hearing Required:</strong> The proponent team must
                        have a scheduled title proposal hearing before the title can be approved.
                      </span>
                    </div>
                    {isInstructor && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsScheduleModalOpen(true)}
                        className="gap-1.5 text-xs font-semibold border-warning/40 text-warning-foreground hover:bg-warning/20 shrink-0"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Schedule Title Hearing
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-2.5 text-xs text-success-foreground">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span>
                      <strong>Title Proposal Hearing Scheduled:</strong>{' '}
                      {project?.defenseSchedule?.date
                        ? new Date(project.defenseSchedule.date).toLocaleDateString()
                        : 'Scheduled'}{' '}
                      {project?.defenseSchedule?.time ? `(${project.defenseSchedule.time})` : ''} in{' '}
                      {project?.defenseSchedule?.venue || 'COT Conference Room'}. Ready for official
                      endorsement.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeliberationVote('Approve')}
                    className={cn(
                      'h-10 text-xs font-semibold gap-2 border-success/30 justify-start px-3.5 transition-all',
                      deliberationVote === 'Approve'
                        ? 'bg-success/20 text-success-foreground ring-2 ring-success border-success'
                        : 'text-muted-foreground hover:bg-success/10 hover:text-success',
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Approve Proposal as Official Title</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeliberationVote('Revision')}
                    className={cn(
                      'h-10 text-xs font-semibold gap-2 border-warning/30 justify-start px-3.5 transition-all',
                      deliberationVote === 'Revision'
                        ? 'bg-warning/20 text-warning-foreground ring-2 ring-warning border-warning'
                        : 'text-muted-foreground hover:bg-warning/10 hover:text-warning',
                    )}
                  >
                    <XCircle className="h-4 w-4 text-warning" />
                    <span>Request Revisions from Proponents</span>
                  </Button>
                </div>

                {deliberationVote === 'Approve' && isInstructor && !project?.adviserId && (
                  <div className="rounded-lg border border-info/30 bg-info/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="approve-adviser-select"
                        className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                      >
                        <UserCheck className="h-3.5 w-3.5 text-info" />
                        <span>Choose Capstone Adviser for this Field</span>
                      </Label>
                      {activeProposal.disciplines?.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {activeProposal.disciplines.join(', ')}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedAdviserId || 'unassigned'}
                      onValueChange={(value) =>
                        setSelectedAdviserId(value === 'unassigned' ? '' : value)
                      }
                    >
                      <SelectTrigger id="approve-adviser-select" className="h-11 w-full text-xs">
                        <SelectValue placeholder="Select faculty adviser" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          -- Select faculty adviser for this field (or assign later) --
                        </SelectItem>
                        {candidateFaculty.map((f) => (
                          <SelectItem key={f._id} value={String(f._id)}>
                            {f.firstName} {f.lastName} {f.department ? `(${f.department})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Adviser can remain vacant during proposal review. Once approved, the
                      instructor chooses a suitable adviser based on the capstone&apos;s field.
                    </p>
                  </div>
                )}

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
                      <Spinner className="h-3.5 w-3.5" />
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => toggleSection('manuscript')}
          className="h-auto min-h-11 w-full min-w-0 justify-between whitespace-normal rounded-none p-4 text-left hover:bg-muted/30 sm:p-4.5"
          aria-expanded={openSections.manuscript}
          data-testid="toggle-manuscript-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success-foreground font-bold shrink-0">
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
                  <Badge variant="success" className="text-[10px] font-semibold gap-1">
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
        </Button>

        {openSections.manuscript && (
          <CardContent className="p-4 sm:p-6 pt-0 border-t border-border/50 space-y-4 animate-in fade-in duration-200">
            {/* Adviser Appointment Alert when Title is Approved but Adviser is Vacant */}
            {titleApproved && !project?.adviserId && (
              <div className="rounded-xl border border-info/30 bg-info/10 p-3.5 space-y-1.5 text-info-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <UserCheck className="h-4 w-4 text-info shrink-0" />
                    <span>Adviser Appointment Needed for Approved Capstone</span>
                  </div>
                  {isInstructor && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsAssignCommitteeOpen(true)}
                      className="h-7 text-xs font-semibold gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Appoint Capstone Adviser</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-info-foreground leading-relaxed">
                  Proposal approved under{' '}
                  <strong>
                    {activeProposal.disciplines?.join(', ') ||
                      project?.discipline ||
                      'Approved IT Specialization'}
                  </strong>
                  .
                  {isInstructor
                    ? ' As course instructor, appoint a suitable faculty adviser specializing in this field to mentor the team and review Chapters 1–3.'
                    : ' Your course instructor will assign a faculty adviser specializing in this field to mentor your team and review Chapters 1–3.'}
                </p>
              </div>
            )}

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
                              variant={
                                sub.status === 'approved'
                                  ? 'success'
                                  : sub.status === 'rejected'
                                    ? 'destructive'
                                    : sub.status === 'pending'
                                      ? 'warning'
                                      : 'default'
                              }
                              className="text-[10px] font-medium capitalize"
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
          'overflow-hidden rounded-xl border border-border/70 bg-card transition-all shadow-xs print:border-none print:shadow-none print:bg-transparent',
          openSections.adm && 'ring-1 ring-primary/20',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => toggleSection('adm')}
          className="h-auto min-h-11 w-full min-w-0 justify-between whitespace-normal rounded-none p-4 text-left hover:bg-muted/30 no-print sm:p-4.5"
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
                  Proposal Defense Review Matrix
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
        </Button>

        {openSections.adm && (
          <CardContent className="p-2 sm:p-4 pt-0 border-t border-border/50 animate-in fade-in duration-200">
            <div className="pt-2">
              <ActionDoneMatrixTab
                project={project}
                isStudent={isStudent}
                isFaculty={isFaculty}
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => toggleSection('evaluation')}
          className="h-auto min-h-11 w-full min-w-0 justify-between whitespace-normal rounded-none p-4 text-left hover:bg-muted/30 sm:p-4.5"
          aria-expanded={openSections.evaluation}
          data-testid="toggle-evaluation-section"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning font-bold shrink-0">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Defense Evaluation &amp; Grade Sign-Off
                </span>
                <Badge
                  variant={project?.evaluations?.length > 0 ? 'success' : 'outline'}
                  className={cn(
                    'font-mono text-[10px]',
                    !project?.evaluations?.length && 'border-border/60 text-muted-foreground',
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
        </Button>

        {openSections.evaluation && (
          <CardContent className="p-4 sm:p-6 pt-2 border-t border-border/50 animate-in fade-in duration-200">
            <EvaluationPanel projectId={project?._id} defenseType="proposal" />
          </CardContent>
        )}
      </Card>

      {/* Rehearsal Pitch Deck Modal */}
      {isRehearsalOpen && (
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
      )}

      {/* Canonical Sophisticated Document Viewer Modal */}
      {isViewerOpen && viewerDoc && (
        <Suspense fallback={null}>
          <SophisticatedDocumentViewer
            open={isViewerOpen}
            onOpenChange={setIsViewerOpen}
            submission={viewerDoc.submission}
            fileUrl={viewerDoc.fileUrl}
            chapterTitle={viewerDoc.title}
            embedded={false}
          />
        </Suspense>
      )}

      {/* Defense Scheduling Modal for seamless inline hearing scheduling */}
      {isScheduleModalOpen && (
        <ScheduleDefenseModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          project={project}
          onScheduled={() => {
            onRefresh?.();
            setIsScheduleModalOpen(false);
          }}
        />
      )}

      {/* Assign Committee Dialog for appointing adviser based on field */}
      {isAssignCommitteeOpen && (
        <AssignCommitteeDialog
          open={isAssignCommitteeOpen}
          onOpenChange={setIsAssignCommitteeOpen}
          teamId={project?.teamId?._id || project?.teamId}
          teamName={project?.teamId?.name || project?.title}
          initialAdviserId={project?.adviserId?._id || project?.adviserId || ''}
          initialSecretaryId={project?.secretaryId?._id || project?.secretaryId || ''}
          initialPanelistIds={(project?.panelistIds || []).map((p) => p?._id || p)}
          disciplines={activeProposal.disciplines}
          onSuccess={() => {
            setIsAssignCommitteeOpen(false);
            onRefresh?.();
          }}
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
