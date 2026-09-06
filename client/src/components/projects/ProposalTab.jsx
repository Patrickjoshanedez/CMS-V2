import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Loader2, Save } from 'lucide-react';
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
import { CAPSTONE_PHASES, PROJECT_STATUSES, TITLE_STATUSES } from '@cms/shared';

const PITCH_DECK_FIELDS = [
  {
    key: 'problemStatement',
    label: 'Problem Statement',
    placeholder: 'Describe the high prevalence of the issue, existing gaps, and current costs...',
  },
  {
    key: 'proposedSolution',
    label: 'Proposed Solution',
    placeholder: 'Explain how your system solves the problem, core features...',
  },
  {
    key: 'uniqueContribution',
    label: 'Unique Contribution / Innovation',
    placeholder:
      'What makes this different from existing tools? Campus DB-linked, cost-effective...',
  },
  {
    key: 'targetUsers',
    label: 'Target Users / Beneficiaries',
    placeholder: 'Primary and secondary users...',
  },
  {
    key: 'expectedImpact',
    label: 'Expected Impact / Value',
    placeholder: 'Efficiency, transparency, academic integrity...',
  },
];

const PROPOSAL_DRAFT_STORAGE_PREFIX = 'cms:proposal-draft';

function normalizeProposalItems(project) {
  const proposals = Array.isArray(project?.titleProposals) ? project.titleProposals : [];
  const metadata = Array.isArray(project?.titleProposalMetadata)
    ? project.titleProposalMetadata
    : [];

  return proposals
    .map((proposal, index) => {
      const proposalTitle = typeof proposal === 'string' ? proposal : proposal?.title;
      const details = metadata.find((entry) => entry?.title === proposalTitle);
      const proposalId = proposal?._id || `proposal-${index + 1}`;
      const normalizedDescription = details?.description || '';

      return {
        id: proposalId,
        title: proposalTitle || `Untitled Proposal ${index + 1}`,
        description: normalizedDescription,
        pitchDeck: parsePitchDeckFromDescription(normalizedDescription),
      };
    })
    .filter((proposal) => Boolean(proposal.title));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePitchDeckFromDescription(description = '') {
  const normalizedDeck = emptyDeckData();
  const source = String(description || '').trim();

  if (!source) {
    return normalizedDeck;
  }

  PITCH_DECK_FIELDS.forEach((field, index) => {
    const nextFieldLabel = PITCH_DECK_FIELDS[index + 1]?.label;
    const nextFieldBoundary = nextFieldLabel ? `(?=\\s*${escapeRegex(nextFieldLabel)}\\s*:)` : '$';
    const matcher = new RegExp(
      `${escapeRegex(field.label)}\\s*:\\s*([\\s\\S]*?)${nextFieldBoundary}`,
      'i',
    );
    const matched = source.match(matcher);

    if (matched?.[1]) {
      normalizedDeck[field.key] = matched[1].trim();
    }
  });

  return normalizedDeck;
}

function emptyDeckData() {
  return {
    problemStatement: '',
    proposedSolution: '',
    uniqueContribution: '',
    targetUsers: '',
    expectedImpact: '',
  };
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
    ...emptyDeckData(),
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

export default function ProposalTab({ project }) {
  const proposalItems = useMemo(() => normalizeProposalItems(project), [project]);
  const [selectedAccordionId, setSelectedAccordionId] = useState(null);
  const [formOverrides, setFormOverrides] = useState({});
  const [loadingProposalId, setLoadingProposalId] = useState(null);
  const titleApproved = project?.titleStatus === TITLE_STATUSES.APPROVED;
  const projectApproved = getCapstonePhase(project) >= CAPSTONE_PHASES.PHASE_2;
  const capstoneProgressLabel = getCapstoneProgressLabel(project);

  const { plagiarismRejectThreshold, titleSimilarityThreshold, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const activeAccordionId =
    selectedAccordionId !== null
      ? proposalItems.some((p) => p.id === selectedAccordionId)
        ? selectedAccordionId
        : null
      : proposalItems[0]?.id || null;

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
      ...emptyDeckData(),
      ...draft,
    };

    window.localStorage.setItem(
      getDraftStorageKey(project._id, proposal.id),
      JSON.stringify(payload),
    );
    toast.success('Proposal draft saved locally.');
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
        // Optional: pass team members along if the frontend already has them populated
        // teamMembers: project.teamId?.members,
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
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-base">Proposal Pitch Deck Builder</CardTitle>
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
              : 'Save proposal drafts while the title is under review. Once approved, the progress tracker will reflect the active capstone phase.'}
          </p>
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
            <div key={proposal.id} className="overflow-hidden rounded-md border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => toggleAccordion(proposal.id)}
              >
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Proposal {index + 1}
                  </p>
                  <p className="text-sm font-semibold">{proposal.title}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expanded ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </button>

              {expanded && (
                <div className="border-t bg-background px-4 py-4">
                  <div className="space-y-4">
                    {PITCH_DECK_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={`${proposal.id}-${field.key}`}>{field.label}</Label>
                        <Textarea
                          id={`${proposal.id}-${field.key}`}
                          value={formData[field.key]}
                          onChange={(event) =>
                            handleFieldChange(proposal.id, field.key, event.target.value)
                          }
                          placeholder={field.placeholder}
                          className="min-h-24"
                        />
                      </div>
                    ))}

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSaveDraft(proposal)}
                        className="w-full sm:w-auto"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                      </Button>

                      <Button
                        type="button"
                        onClick={() => generateDeck(proposal)}
                        disabled={isGenerating}
                        className="w-full sm:w-auto"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileDown className="mr-2 h-4 w-4" />
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
