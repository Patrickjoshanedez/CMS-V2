import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Loader2,
  Lock,
  Save,
  Send,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import ProjectStatusBadge from './ProjectStatusBadge';
import TitleStatusBadge from './TitleStatusBadge';
import { projectService } from '@/services/authService';
import { useSettingsStore } from '@/stores/settingsStore';
import { cn } from '@/lib/utils';
import { CAPSTONE_PHASES, TITLE_STATUSES } from '@cms/shared';
import {
  PITCH_DECK_FIELDS,
  emptyPitchDeck,
  formatPitchDeckDescription,
  parsePitchDeckFromDescription,
} from '@/utils/pitchDeckParser';

const PROPOSAL_DRAFT_STORAGE_PREFIX = 'cms:proposal-draft';

function normalizeProposalItems(project) {
  const proposals = Array.isArray(project?.titleProposals) ? project.titleProposals : [];
  const metadata = Array.isArray(project?.titleProposalMetadata)
    ? project.titleProposalMetadata
    : [];

  return proposals
    .map((proposal, index) => {
      const proposalTitle = typeof proposal === 'string' ? proposal : proposal?.title;
      const details = metadata.find((entry) => entry?.title === proposalTitle) || metadata[index];
      const proposalId = details?._id || proposal?._id || `proposal-${index + 1}`;
      const normalizedDescription = details?.description || '';
      const pitchDeck =
        details?.pitchDeck && Object.keys(details.pitchDeck).length > 0
          ? details.pitchDeck
          : parsePitchDeckFromDescription(normalizedDescription);

      return {
        id: proposalId,
        index,
        title: proposalTitle || `Untitled Proposal ${index + 1}`,
        description: normalizedDescription,
        pitchDeck,
        status: details?.status || 'pending',
        isApproved: details?.status === 'approved' || project?.title === proposalTitle,
      };
    })
    .filter((proposal) => Boolean(proposal.title));
}

function getDraftStorageKey(projectId, proposalId) {
  return `${PROPOSAL_DRAFT_STORAGE_PREFIX}:${projectId}:${proposalId}`;
}

function sanitizeFilename(value) {
  return (value || 'Proposal')
    .replace(/[^a-zA-Z0-9\s-_]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function getCapstonePhase(project) {
  return Number(project?.capstonePhase ?? project?.phase ?? 0) || 0;
}

function getCapstoneProgressLabel(project) {
  const phase = getCapstonePhase(project);

  if (phase >= CAPSTONE_PHASES.PHASE_4) return 'Final Capstone';
  if (phase >= CAPSTONE_PHASES.PHASE_3) return 'Capstone 3';
  if (phase >= CAPSTONE_PHASES.PHASE_2) return 'Capstone 2';
  if (phase >= CAPSTONE_PHASES.PHASE_1) return 'Capstone 1';
  return 'Pre-capstone';
}

function getDraftForProposal(projectId, proposalId, pitchDeck) {
  const base = {
    ...emptyPitchDeck(),
    ...(pitchDeck || {}),
  };
  if (typeof window === 'undefined' || !projectId || !proposalId) return base;
  try {
    const storageKey = getDraftStorageKey(projectId, proposalId);
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      return {
        ...base,
        ...JSON.parse(saved),
      };
    }
  } catch {
    // Ignore draft parse error
  }
  return base;
}

export default function ProposalTab({ project, selectedProposalIndex, onRefresh }) {
  const proposalItems = useMemo(() => normalizeProposalItems(project), [project]);
  const approvedItem = proposalItems.find((p) => p.isApproved);
  const defaultProposalId =
    typeof selectedProposalIndex === 'number' && proposalItems[selectedProposalIndex]
      ? proposalItems[selectedProposalIndex].id
      : approvedItem?.id || proposalItems[0]?.id || null;

  const [selectedProposalId, setSelectedProposalId] = useState(defaultProposalId);
  const [formOverrides, setFormOverrides] = useState({});
  const [loadingProposalId, setLoadingProposalId] = useState(null);
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  useEffect(() => {
    if (typeof selectedProposalIndex === 'number' && proposalItems[selectedProposalIndex]) {
      setSelectedProposalId(proposalItems[selectedProposalIndex].id);
    }
  }, [selectedProposalIndex, proposalItems]);

  const titleApproved = project?.titleStatus === TITLE_STATUSES.APPROVED;
  const isRevisionRequired = project?.titleStatus === TITLE_STATUSES.REVISION_REQUIRED;
  const projectApproved = getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_2;
  const capstoneProgressLabel = getCapstoneProgressLabel(project);

  const isLocked = titleApproved && !isEditingApproved;

  const { plagiarismRejectThreshold, titleSimilarityThreshold, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const activeProposalId =
    selectedProposalId && proposalItems.some((p) => p.id === selectedProposalId)
      ? selectedProposalId
      : defaultProposalId;

  const activeProposal = proposalItems.find((p) => p.id === activeProposalId) || proposalItems[0];

  const getFormData = (proposal) => {
    return (
      formOverrides[proposal.id] ||
      getDraftForProposal(project?._id, proposal.id, proposal.pitchDeck)
    );
  };

  const handleFieldChange = (proposalId, field, value) => {
    const proposal = proposalItems.find((p) => p.id === proposalId) || { id: proposalId };
    const current = getFormData(proposal);
    setFormOverrides((prev) => ({
      ...prev,
      [proposalId]: {
        ...current,
        [field]: value,
      },
    }));
  };

  const handleSaveDraft = (proposal) => {
    if (!project?._id) {
      toast.error('Cannot save proposal draft without a project ID.');
      return;
    }

    const draft = getFormData(proposal);
    const payload = {
      ...emptyPitchDeck(),
      ...draft,
    };

    window.localStorage.setItem(
      getDraftStorageKey(project._id, proposal.id),
      JSON.stringify(payload),
    );
    toast.success('Proposal draft saved locally.');
  };

  const handleUnlockApproved = () => {
    const confirmed = window.confirm(
      'Are you sure you want to edit the approved proposal? Any modifications to an approved title or proposal scope will alter the agreed project baseline and may require committee re-evaluation.',
    );
    if (confirmed) {
      setIsEditingApproved(true);
      toast.info('Proposal scope unlocked for editing. Modifications will be tracked.');
    }
  };

  const handleConfirmRevision = async (proposal) => {
    const deck = getFormData(proposal);
    setIsSubmittingRevision(true);
    try {
      await projectService.reviseAndResubmit(project._id, {
        proposalId: proposal.id,
        title: proposal.title,
        description: formatPitchDeckDescription(deck),
        pitchDeck: deck,
      });
      toast.success('Revised proposal resubmitted! Committee and instructors have been notified.');
      onRefresh?.();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to resubmit revision.');
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const generateDeck = async (proposal) => {
    const deckData = getFormData(proposal);

    if (PITCH_DECK_FIELDS.some((field) => !deckData[field.key]?.trim())) {
      toast.error('Please complete all pitch deck sections before generating the PDF.');
      return;
    }

    setLoadingProposalId(proposal.id);
    try {
      const response = await projectService.generateProposalDeck({
        projectId: project._id,
        proposalId: proposal.id,
        title: proposal.title,
        deckData,
      });

      const filename = `${sanitizeFilename(proposal.title)}_PitchDeck.pdf`;
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });

      if (!blob.size) {
        throw new Error('Generated PDF is empty. Please try again.');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 1000);

      toast.success('Pitch deck generated successfully.');
    } catch (error) {
      toast.error(error?.response?.data?.error?.message || 'Failed to generate presentation deck.');
    } finally {
      setLoadingProposalId(null);
    }
  };

  if (!proposalItems.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-base">Proposal Pitch Deck Builder</CardTitle>
            <div className="flex flex-wrap gap-2">
              {project?.titleStatus && <TitleStatusBadge status={project.titleStatus} />}
              {project?.projectStatus && <ProjectStatusBadge status={project.projectStatus} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No title proposals found for this project yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Proposal Pitch Deck Builder</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Institutional 5-point proposal blueprint and candidate defense pitch decks
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {project?.titleStatus && <TitleStatusBadge status={project.titleStatus} />}
              {project?.projectStatus && <ProjectStatusBadge status={project.projectStatus} />}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {titleApproved
              ? projectApproved
                ? `Title approved. Project progress is now at ${capstoneProgressLabel}.`
                : `Title approved. Current progress: ${capstoneProgressLabel}.`
              : isRevisionRequired
                ? 'Committee has requested revisions to your candidate proposal. Address the remarks below and confirm revision.'
                : 'Save proposal drafts while the title is under review. Once approved, the progress tracker reflects the active capstone phase.'}
          </p>

          {/* Revision Banner (when revision is required) */}
          {isRevisionRequired && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 text-foreground">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Committee Title Revision Required</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Remarks: </strong>
                {project?.rejectionReason ||
                  'The evaluation panel requires revisions to your proposed title and scope before proceeding.'}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Fields below are unlocked and editable by default. Update your proposal details and
                click &ldquo;Confirm Revision &amp; Resubmit&rdquo; to notify your committee.
              </p>
            </div>
          )}

          {/* Institutional Policy Thresholds */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/[0.03] p-2.5 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className="font-mono text-[10px] text-primary border-primary/30"
            >
              Evaluation Rules
            </Badge>
            <span>
              Plagiarism Tolerance:{' '}
              <strong className="text-foreground">&le; {plagiarismRejectThreshold || 25}%</strong>
            </span>
            <span>•</span>
            <span>
              Similarity Warning Threshold:{' '}
              <strong className="text-foreground">
                &le; {Math.round((titleSimilarityThreshold || 0.65) * 100)}%
              </strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Candidate Proposals Tab Bar (Image 1) */}
        <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Candidate Proposals Under Review ({proposalItems.length})
            </p>
            <span className="text-[10px] text-muted-foreground font-medium">
              Select a proposal to view and edit pitch deck details
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {proposalItems.map((proposal, index) => {
              const isSelected = proposal.id === activeProposal.id;
              return (
                <button
                  key={proposal.id}
                  type="button"
                  onClick={() => setSelectedProposalId(proposal.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-all border text-left cursor-pointer select-none font-medium shadow-2xs',
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/25'
                      : 'bg-card hover:bg-muted/60 border-border/80 text-foreground hover:border-border',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className="font-semibold truncate max-w-[180px] sm:max-w-[260px]"
                    title={proposal.title}
                  >
                    {proposal.title}
                  </span>
                  {proposal.isApproved && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4 gap-0.5 ml-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Approved
                    </Badge>
                  )}
                  {isRevisionRequired && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-500/40 text-[9px] px-1.5 py-0 h-4 ml-0.5"
                    >
                      Revision
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Proposal Studio Content */}
        {activeProposal &&
          (() => {
            const formData = getFormData(activeProposal);
            const isGenerating = loadingProposalId === activeProposal.id;

            return (
              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-5 shadow-xs">
                {/* Active Proposal Header / Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Proposal {activeProposal.index + 1} of {proposalItems.length}
                      </span>
                      {activeProposal.isApproved && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-4 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Approved Title
                        </Badge>
                      )}
                      {isRevisionRequired && (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-500/40 text-[10px] h-4"
                        >
                          Revision Required
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-foreground">
                      {activeProposal.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveDraft(activeProposal)}
                      disabled={isLocked}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => generateDeck(activeProposal)}
                      disabled={isGenerating}
                      className="h-8 text-xs gap-1.5"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Generating Deck...
                        </>
                      ) : (
                        <>
                          <FileDown className="h-3.5 w-3.5" />
                          Generate Presentation Deck (PDF)
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Approved Title Lock / Unlock Guard */}
                {titleApproved && (
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg p-3 text-xs border ${
                      isLocked
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLocked ? (
                        <>
                          <Lock className="h-4 w-4 shrink-0" />
                          <span>
                            Approved Title &amp; Scope locked. Inputs are read-only to preserve the
                            formal defense baseline.
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            Editing Approved Scope: Modifications are active. Save your draft and
                            notify your committee if structural changes occur.
                          </span>
                        </>
                      )}
                    </div>
                    {isLocked ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleUnlockApproved}
                        className="h-7 text-xs gap-1.5 border-emerald-400 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 shrink-0 self-start sm:self-auto"
                      >
                        <Unlock className="h-3 w-3" />
                        Unlock to Edit Scope
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingApproved(false)}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0 self-start sm:self-auto"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Lock Scope
                      </Button>
                    )}
                  </div>
                )}

                {/* 5 Pitch Deck Fields */}
                <div className="space-y-4">
                  {PITCH_DECK_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor={`${activeProposal.id}-${field.key}`}
                          className="text-xs font-semibold"
                        >
                          {field.label}
                        </Label>
                        <span className="text-[10px] uppercase font-mono text-muted-foreground">
                          {field.tag}
                        </span>
                      </div>
                      <Textarea
                        id={`${activeProposal.id}-${field.key}`}
                        value={formData[field.key] || ''}
                        disabled={isLocked}
                        onChange={(event) =>
                          handleFieldChange(activeProposal.id, field.key, event.target.value)
                        }
                        placeholder={field.placeholder}
                        className={`min-h-24 text-sm ${
                          isLocked ? 'bg-muted/40 cursor-not-allowed opacity-90' : 'bg-background'
                        }`}
                      />
                    </div>
                  ))}

                  {isRevisionRequired && (
                    <div className="pt-2 border-t border-border/40">
                      <Button
                        type="button"
                        onClick={() => handleConfirmRevision(activeProposal)}
                        disabled={isSubmittingRevision}
                        className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm text-xs font-semibold"
                      >
                        {isSubmittingRevision ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Confirm Revision &amp; Resubmit for Committee Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
}
