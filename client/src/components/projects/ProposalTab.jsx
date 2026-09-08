import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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

  if (phase >= CAPSTONE_PHASES.PHASE_4) return 'Capstone 4';
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

export default function ProposalTab({ project, onRefresh }) {
  const proposalItems = useMemo(() => normalizeProposalItems(project), [project]);
  const [selectedAccordionId, setSelectedAccordionId] = useState(null);
  const [formOverrides, setFormOverrides] = useState({});
  const [loadingProposalId, setLoadingProposalId] = useState(null);
  const [isEditingApproved, setIsEditingApproved] = useState(false);
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  const titleApproved = project?.titleStatus === TITLE_STATUSES.APPROVED;
  const isRevisionRequired = project?.titleStatus === TITLE_STATUSES.REVISION_REQUIRED;
  const projectApproved = getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_2;
  const capstoneProgressLabel = getCapstoneProgressLabel(project);

  const isLocked = titleApproved && !isEditingApproved;

  const { plagiarismRejectThreshold, titleSimilarityThreshold, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const approvedItem = proposalItems.find((p) => p.isApproved);
  const defaultAccordionId = approvedItem?.id || proposalItems[0]?.id || null;

  const activeAccordionId =
    selectedAccordionId !== null
      ? proposalItems.some((p) => p.id === selectedAccordionId)
        ? selectedAccordionId
        : null
      : defaultAccordionId;

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

  const toggleAccordion = (proposalId) => {
    setSelectedAccordionId((current) => {
      const active = current !== null ? current : proposalItems[0]?.id || null;
      return active === proposalId ? '' : proposalId;
    });
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
      <CardContent className="space-y-3">
        {proposalItems.map((proposal, index) => {
          const expanded = activeAccordionId === proposal.id;
          const formData = getFormData(proposal);
          const isGenerating = loadingProposalId === proposal.id;

          return (
            <div
              key={proposal.id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                proposal.isApproved
                  ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                  : 'border-border/60'
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                onClick={() => toggleAccordion(proposal.id)}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Proposal {index + 1}
                    </p>
                    {proposal.isApproved && (
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
                  <p className="text-sm font-semibold text-foreground">{proposal.title}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                    expanded ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {expanded && (
                <div className="border-t border-border/60 bg-background/50 px-4 py-4 space-y-4">
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
                              Approved Title &amp; Scope locked. Inputs are read-only to preserve
                              the formal defense baseline.
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

                  <div className="space-y-4">
                    {PITCH_DECK_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`${proposal.id}-${field.key}`}
                            className="text-xs font-semibold"
                          >
                            {field.label}
                          </Label>
                          <span className="text-[10px] uppercase font-mono text-muted-foreground">
                            {field.tag}
                          </span>
                        </div>
                        <Textarea
                          id={`${proposal.id}-${field.key}`}
                          value={formData[field.key] || ''}
                          disabled={isLocked}
                          onChange={(event) =>
                            handleFieldChange(proposal.id, field.key, event.target.value)
                          }
                          placeholder={field.placeholder}
                          className={`min-h-24 text-sm ${
                            isLocked ? 'bg-muted/40 cursor-not-allowed opacity-90' : 'bg-background'
                          }`}
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/40">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {isRevisionRequired && (
                          <Button
                            type="button"
                            onClick={() => handleConfirmRevision(proposal)}
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
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleSaveDraft(proposal)}
                          disabled={isLocked}
                          className="w-full sm:w-auto text-xs gap-1.5"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save Draft
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => generateDeck(proposal)}
                        disabled={isGenerating}
                        className="w-full sm:w-auto text-xs gap-1.5"
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
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
