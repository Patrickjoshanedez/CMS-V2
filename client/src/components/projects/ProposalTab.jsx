import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileDown, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { projectService } from '@/services/authService';

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

export default function ProposalTab({ project }) {
  const proposalItems = useMemo(() => normalizeProposalItems(project), [project]);
  const [activeAccordionId, setActiveAccordionId] = useState(null);
  const [formsByProposal, setFormsByProposal] = useState({});
  const [loadingProposalId, setLoadingProposalId] = useState(null);

  useEffect(() => {
    if (!proposalItems.length) {
      setActiveAccordionId(null);
      setFormsByProposal({});
      return;
    }

    setActiveAccordionId((current) => {
      if (current && proposalItems.some((proposal) => proposal.id === current)) {
        return current;
      }
      return proposalItems[0].id;
    });

    setFormsByProposal((current) => {
      const next = { ...current };
      for (const proposal of proposalItems) {
        const storageKey = getDraftStorageKey(project?._id, proposal.id);
        const savedDraft = window.localStorage.getItem(storageKey);

        if (!next[proposal.id]) {
          next[proposal.id] = {
            ...emptyDeckData(),
            ...(proposal.pitchDeck || {}),
          };
        }

        if (savedDraft) {
          try {
            next[proposal.id] = {
              ...emptyDeckData(),
              ...next[proposal.id],
              ...JSON.parse(savedDraft),
            };
          } catch {
            window.localStorage.removeItem(storageKey);
          }
        }
      }
      return next;
    });
  }, [proposalItems, project?._id]);

  const handleFieldChange = (proposalId, field, value) => {
    setFormsByProposal((current) => ({
      ...current,
      [proposalId]: {
        ...(current[proposalId] || emptyDeckData()),
        [field]: value,
      },
    }));
  };

  const handleSaveDraft = (proposal) => {
    if (!project?._id) {
      toast.error('Cannot save proposal draft without a project ID.');
      return;
    }

    const draft = formsByProposal[proposal.id] || emptyDeckData();
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
    setActiveAccordionId((current) => (current === proposalId ? null : proposalId));
  };

  const generateDeck = async (proposal) => {
    const deckData = formsByProposal[proposal.id] || emptyDeckData();

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
          <CardTitle className="text-base">Proposal Pitch Deck Builder</CardTitle>
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
        <CardTitle className="text-base">Proposal Pitch Deck Builder</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposalItems.map((proposal, index) => {
          const expanded = activeAccordionId === proposal.id;
          const formData = formsByProposal[proposal.id] || emptyDeckData();
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
