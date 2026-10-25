import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileDown, Lock, Save, Send, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
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
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import ProjectStatusBadge from './ProjectStatusBadge';
import TitleStatusBadge from './TitleStatusBadge';
import { projectService } from '@/services/authService';
import { useSettingsStore } from '@/stores/settingsStore';
import { CAPSTONE_PHASES, TITLE_STATUSES, resolveWorkflowPhase } from '@cms/shared';
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

function getCapstoneProgressLabel(project) {
  const phase = resolveWorkflowPhase(project);

  if (phase >= CAPSTONE_PHASES.PHASE_4) return 'Capstone 3';
  if (phase >= CAPSTONE_PHASES.PHASE_3) return 'Capstone 2';
  if (phase >= CAPSTONE_PHASES.PHASE_2) return 'Capstone 1';
  if (phase >= CAPSTONE_PHASES.PHASE_1) return 'Title proposal review';
  return 'Team formation';
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
  const [isUnlockConfirmationOpen, setIsUnlockConfirmationOpen] = useState(false);

  useEffect(() => {
    if (typeof selectedProposalIndex === 'number' && proposalItems[selectedProposalIndex]) {
      setSelectedProposalId(proposalItems[selectedProposalIndex].id);
    }
  }, [selectedProposalIndex, proposalItems]);

  const titleApproved = project?.titleStatus === TITLE_STATUSES.APPROVED;
  const isRevisionRequired = project?.titleStatus === TITLE_STATUSES.REVISION_REQUIRED;
  const projectApproved = resolveWorkflowPhase(project) >= CAPSTONE_PHASES.PHASE_2;
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
    setIsUnlockConfirmationOpen(true);
  };

  const confirmUnlockApproved = () => {
    setIsEditingApproved(true);
    setIsUnlockConfirmationOpen(false);
    toast.info('Proposal scope unlocked for editing. Modifications will be tracked.');
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
            <Alert variant="warning">
              <AlertTitle>Committee title revision required</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  <strong className="text-foreground">Remarks: </strong>
                  {project?.rejectionReason ||
                    'The evaluation panel requires revisions to your proposed title and scope before proceeding.'}
                </p>
                <p>
                  Fields below are unlocked and editable by default. Update your proposal details
                  and confirm the revision to notify your committee.
                </p>
              </AlertDescription>
            </Alert>
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
              Plagiarism similarity limit:{' '}
              <strong className="text-foreground">&le; {plagiarismRejectThreshold ?? 25}%</strong>
            </span>
            <span>•</span>
            <span>
              Title similarity review threshold:{' '}
              <strong className="text-foreground">
                &le; {Math.round((titleSimilarityThreshold ?? 0.65) * 100)}%
              </strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs value={activeProposal.id} onValueChange={setSelectedProposalId} className="space-y-5">
          <section aria-labelledby="proposal-selector-label" className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h4 id="proposal-selector-label" className="text-sm font-semibold text-foreground">
                Candidate proposals
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {proposalItems.length} under review
                </span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Select a proposal to view and edit pitch deck details.
              </p>
            </div>
            <TabsList
              aria-label="Candidate proposals"
              className="h-auto w-full flex-wrap justify-start gap-2 rounded-lg bg-muted/40 p-2"
            >
              {proposalItems.map((proposal, index) => (
                <TabsTrigger
                  key={proposal.id}
                  value={proposal.id}
                  className="h-auto min-h-11 min-w-0 max-w-full justify-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-left whitespace-normal data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <Badge variant="secondary" className="size-5 shrink-0 justify-center p-0 text-xs">
                    {index + 1}
                  </Badge>
                  <span className="max-w-[180px] truncate sm:max-w-[260px]" title={proposal.title}>
                    {proposal.title}
                  </span>
                  {proposal.isApproved && (
                    <Badge variant="success" className="shrink-0 gap-1 px-1.5 py-0 text-[10px]">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Approved
                    </Badge>
                  )}
                  {isRevisionRequired && (
                    <Badge variant="warning" className="shrink-0 px-1.5 py-0 text-[10px]">
                      Revision
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </section>

          {proposalItems.map((proposal) => {
            const formData = getFormData(proposal);
            const isGenerating = loadingProposalId === proposal.id;

            return (
              <TabsContent key={proposal.id} value={proposal.id} className="mt-0 space-y-5">
                <div className="space-y-5 rounded-lg border border-border/70 bg-card p-4 sm:p-5">
                  {/* Active Proposal Header / Status Bar */}
                  <div className="flex flex-col justify-between gap-3 border-b border-border/50 pb-3 sm:flex-row sm:items-start">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Proposal {proposal.index + 1} of {proposalItems.length}
                        </span>
                        {proposal.isApproved && (
                          <Badge variant="success" className="h-5 gap-1 text-[10px]">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            Approved Title
                          </Badge>
                        )}
                        {isRevisionRequired && (
                          <Badge variant="warning" className="h-5 text-[10px]">
                            Revision Required
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-foreground sm:text-lg">
                        {proposal.title}
                      </h4>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveDraft(proposal)}
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
                        onClick={() => generateDeck(proposal)}
                        disabled={isGenerating}
                        className="h-8 text-xs gap-1.5"
                        loading={isGenerating}
                        loadingText="Generating deck..."
                      >
                        {!isGenerating && (
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
                    <Alert
                      variant={isLocked ? 'success' : 'warning'}
                      className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between [&>svg]:static [&>svg]:shrink-0 [&>svg~*]:pl-0"
                    >
                      <div className="space-y-1">
                        <AlertTitle className="text-sm">
                          {isLocked
                            ? 'Approved title and scope are locked'
                            : 'Editing approved scope'}
                        </AlertTitle>
                        <AlertDescription>
                          {isLocked
                            ? 'Inputs are read-only to preserve the formal defense baseline.'
                            : 'Modifications are active. Save your draft and notify your committee if structural changes occur.'}
                        </AlertDescription>
                      </div>
                      {isLocked ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleUnlockApproved}
                          className="h-8 shrink-0 self-start text-xs sm:self-auto"
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
                          className="h-8 shrink-0 self-start text-xs sm:self-auto"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Lock Scope
                        </Button>
                      )}
                    </Alert>
                  )}

                  {/* Seven Pitch Deck Fields */}
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
                          className="min-h-24 text-sm"
                        />
                      </div>
                    ))}

                    {isRevisionRequired && (
                      <div className="border-t border-border/50 pt-4">
                        <Button
                          type="button"
                          onClick={() => handleConfirmRevision(proposal)}
                          disabled={isSubmittingRevision}
                          className="gap-1.5 text-xs font-semibold"
                          loading={isSubmittingRevision}
                          loadingText="Resubmitting revision..."
                        >
                          {!isSubmittingRevision && <Send className="h-4 w-4" />}
                          Confirm Revision &amp; Resubmit for Committee Review
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
        <AlertDialog open={isUnlockConfirmationOpen} onOpenChange={setIsUnlockConfirmationOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit the approved proposal scope?</AlertDialogTitle>
              <AlertDialogDescription>
                Any modifications to an approved title or proposal scope will alter the agreed
                project baseline and may require committee re-evaluation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep scope locked</AlertDialogCancel>
              <AlertDialogAction onClick={confirmUnlockApproved}>Unlock scope</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
