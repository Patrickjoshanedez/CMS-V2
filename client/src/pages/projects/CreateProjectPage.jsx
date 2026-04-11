import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useCreateProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/authStore';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import TitleSimilarityChecker from '@/components/projects/TitleSimilarityChecker';
import { AlertTriangle, X, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { SDG_TAG_SUGGESTIONS } from '@cms/shared';

/**
 * CreateProjectPage — Students create a new capstone project.
 *
 * The form collects title, abstract, keywords, and academic year.
 * On submission, the server returns any similar projects found,
 * which are displayed as warnings.
 */

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;
const PROPOSAL_PITCH_DECK_FIELDS = [
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

const createEmptyPitchDeck = () => ({
  problemStatement: '',
  proposedSolution: '',
  uniqueContribution: '',
  targetUsers: '',
  expectedImpact: '',
});

const buildProposalDescriptionFromPitchDeck = (pitchDeck = createEmptyPitchDeck()) => {
  return PROPOSAL_PITCH_DECK_FIELDS.map(
    (field) => `${field.label}: ${(pitchDeck[field.key] || '').trim()}`,
  ).join('\n\n');
};

const createEmptyProposal = () => ({
  title: '',
  description: '',
  pitchDeck: createEmptyPitchDeck(),
  capstoneType: '',
  sdgTags: [],
});

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const createProject = useCreateProject({
    onSuccess: () => {
      toast.success('Project created successfully!');
      navigate('/project');
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to create project.',
      );
    },
  });

  const { data: team, isLoading: isTeamLoading } = useMyTeam(user?._id);
  const { data: academicYears = [] } = useAcademicYears();

  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    academicYear: defaultAcademicYear,
    sectionId: '',
  });
  const [titleProposals, setTitleProposals] = useState(() =>
    Array.from({ length: 3 }, () => createEmptyProposal()),
  );
  // Optional: keep track of which proposal is expanded
  const [expandedProposalIndex, setExpandedProposalIndex] = useState(0);
  const [keywordList, setKeywordList] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [sdgTagList, setSdgTagList] = useState([]);
  const [selectedSdgTag, setSelectedSdgTag] = useState('');

  const teamMembers = useMemo(() => {
    if (team?.members?.length > 0) {
      return team.members;
    }

    return [];
  }, [team?.members]);

  const hasFinalizedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);
  const needsTeamFinalization = !isTeamLoading && !hasFinalizedTeam;
  const teamDefaultsAppliedRef = useRef(false);

  const {
    data: sections = [],
    isLoading: isSectionsLoading,
    isError: isSectionsError,
    refetch: refetchSections,
  } = useSections(
    { academicYear: form.academicYear || undefined },
    { enabled: Boolean(form.academicYear), refetchOnMount: 'always' },
  );

  const sectionOptions = sections;
  const isAnySectionLoading = isSectionsLoading;
  const isAnySectionError = isSectionsError;

  useEffect(() => {
    if (academicYears.length === 0) {
      return;
    }

    if (!academicYears.includes(form.academicYear)) {
      setForm((prev) => ({
        ...prev,
        academicYear: academicYears[0],
      }));
    }
  }, [academicYears, form.academicYear]);

  // Initialize form defaults from team context once the team is known.
  useEffect(() => {
    if (isTeamLoading || !team || teamDefaultsAppliedRef.current) {
      return;
    }

    setForm((prev) => {
      const updates = {};
      const normalizedTeamSectionId =
        typeof team.sectionId === 'string' ? team.sectionId : team.sectionId?._id;

      // Prefer the team's academic year when available so the section list and selection stay aligned.
      if (team.academicYear && prev.academicYear !== team.academicYear) {
        updates.academicYear = team.academicYear;
      }

      // Pre-fill section from team context to avoid blocking project creation.
      if (normalizedTeamSectionId && !prev.sectionId) {
        updates.sectionId = normalizedTeamSectionId;
      }

      teamDefaultsAppliedRef.current = true;
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [team, isTeamLoading]);

  useEffect(() => {
    // Clear sectionId when sections change AND current selection is no longer valid
    if (form.sectionId && sectionOptions.length > 0) {
      const isValid = sectionOptions.some((section) => section._id === form.sectionId);
      if (!isValid) {
        setForm((prev) => ({ ...prev, sectionId: '' }));
      }
    }
  }, [form.sectionId, sectionOptions]);

  // Refetch sections when academic year changes to ensure newly created sections are shown
  useEffect(() => {
    if (form.academicYear) {
      refetchSections();
    }
  }, [form.academicYear, refetchSections]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTitleProposalChange = (index, field, value) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handlePitchDeckFieldChange = (index, field, value) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      const current = next[index] || createEmptyProposal();
      const nextPitchDeck = {
        ...(current.pitchDeck || createEmptyPitchDeck()),
        [field]: value,
      };

      next[index] = {
        ...current,
        pitchDeck: nextPitchDeck,
        description: buildProposalDescriptionFromPitchDeck(nextPitchDeck),
      };

      return next;
    });
  };

  const addTitleProposal = () => {
    setTitleProposals((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, createEmptyProposal()];
    });
  };

  const removeTitleProposal = (index) => {
    setTitleProposals((prev) => {
      if (prev.length <= 3) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      if (expandedProposalIndex >= next.length) {
        setExpandedProposalIndex(next.length - 1);
      }
      return next;
    });
  };

  const addProposalSdgTag = (index, tag) => {
    if (!tag) return;

    setTitleProposals((prev) => {
      const next = [...prev];
      const proposal = next[index];
      if (!proposal) return prev;

      if (!proposal.sdgTags.includes(tag)) {
        next[index] = {
          ...proposal,
          sdgTags: [...proposal.sdgTags, tag],
        };
      }

      return next;
    });
  };

  const removeProposalSdgTag = (index, tag) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      const proposal = next[index];
      if (!proposal) return prev;

      next[index] = {
        ...proposal,
        sdgTags: proposal.sdgTags.filter((item) => item !== tag),
      };
      return next;
    });
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywordList.includes(kw) && keywordList.length < 10) {
      setKeywordList((prev) => [...prev, kw]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw) => {
    setKeywordList((prev) => prev.filter((k) => k !== kw));
  };

  const addSdgTag = () => {
    if (!selectedSdgTag) {
      return;
    }

    if (!sdgTagList.includes(selectedSdgTag)) {
      setSdgTagList((prev) => [...prev, selectedSdgTag]);
    }

    setSelectedSdgTag('');
  };

  const removeSdgTag = (tag) => {
    setSdgTagList((prev) => prev.filter((item) => item !== tag));
  };

  const handleKeywordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const members = teamMembers;
    const requiredProposals = titleProposals.slice(0, 3);
    const hasIncompleteRequiredProposal = requiredProposals.some(
      (proposal) =>
        !proposal.title.trim() ||
        PROPOSAL_PITCH_DECK_FIELDS.some(
          (field) => !(proposal.pitchDeck?.[field.key] || '').trim(),
        ) ||
        !proposal.capstoneType.trim() ||
        proposal.sdgTags.length === 0,
    );

    if (hasIncompleteRequiredProposal) {
      toast.error(
        'Proposal 1 to Proposal 3 must each include title, description, capstone type, and at least one SDG tag.',
      );
      return;
    }

    const normalizedByTitle = new Map();
    for (const proposal of titleProposals) {
      const normalizedPitchDeck = {
        problemStatement: (proposal.pitchDeck?.problemStatement || '').trim(),
        proposedSolution: (proposal.pitchDeck?.proposedSolution || '').trim(),
        uniqueContribution: (proposal.pitchDeck?.uniqueContribution || '').trim(),
        targetUsers: (proposal.pitchDeck?.targetUsers || '').trim(),
        expectedImpact: (proposal.pitchDeck?.expectedImpact || '').trim(),
      };

      const normalized = {
        title: proposal.title.trim(),
        description: buildProposalDescriptionFromPitchDeck(normalizedPitchDeck),
        capstoneType: proposal.capstoneType.trim(),
        sdgTags: [...new Set(proposal.sdgTags.map((tag) => tag.trim()))].filter(Boolean),
      };

      if (!normalized.title) continue;
      if (!normalizedByTitle.has(normalized.title)) {
        normalizedByTitle.set(normalized.title, normalized);
      }
    }

    const normalizedTitleProposals = [...normalizedByTitle.values()];

    if (normalizedTitleProposals.length < 3) {
      toast.error('Please provide at least 3 unique title proposals.');
      return;
    }

    if (members.length === 0) {
      toast.error('Finalize your team before creating a proposal.');
      return;
    }

    if (!hasFinalizedTeam) {
      toast.error('Finalize and lock your team before creating a proposal.');
      return;
    }

    if (sdgTagList.length === 0) {
      toast.error('Select at least one SDG tag.');
      return;
    }

    // Since selected title is removed, we default to the first proposal's title if needed, 
    // or just let backend handle if it doesn't strictly need one selected title.
    // Assuming backend still needs `title` field, using the first proposal's title.
    const selectedTitle = normalizedTitleProposals[0]?.title || '';

    createProject.mutate({
      title: selectedTitle,
      titleProposals: normalizedTitleProposals,
      abstract: form.abstract || undefined,
      keywords: keywordList.length > 0 ? keywordList : undefined,
      sdgTags: sdgTagList,
      academicYear: form.academicYear,
      sectionId: form.sectionId,
      memberRoleAssignments: [], // removed from UI
      allowSoloCapstone: false,
      soloCapstoneConfirmed: false,
    });
  };

  const formatMemberName = (member) =>
    [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');

  // Extract similar projects from server response (if any)
  const similarProjects =
    createProject.data?.data?.similarProjects ||
    createProject.error?.response?.data?.data?.similarProjects;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Create Project</h3>
          <p className="text-muted-foreground">
            Start your capstone project by entering a title and optional details.
          </p>
        </div>

        {createProject.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {createProject.error?.response?.data?.error?.message ||
                createProject.error?.message ||
                'Failed to create project'}
            </AlertDescription>
          </Alert>
        )}

        {similarProjects && similarProjects.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-medium">Similar projects found:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {similarProjects.map((sp) => (
                  <li key={sp.projectId}>
                    <span className="font-medium">{sp.title}</span>{' '}
                    <span className="text-muted-foreground">
                      — {Math.round(sp.score * 100)}% similar
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Your title can be modified later. It starts as a draft until you submit it for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {needsTeamFinalization && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Finalize and lock your team first. Proposal submission is only available after
                    your team has been completed.
                  </AlertDescription>
                </Alert>
              )}

              {/* Title Proposals */}
              <div className="space-y-2">
                <Label>Title Proposals * (minimum 3)</Label>
                <p className="text-xs text-muted-foreground">Proposal Pitch Deck Builder</p>
                <div className="space-y-3">
                  {titleProposals.map((proposal, index) => {
                    const isExpanded = expandedProposalIndex === index;
                    return (
                      <div key={`title-proposal-${index}`} className="rounded-md border bg-card">
                        {/* Header & Toggle */}
                        <div
                          className="flex cursor-pointer items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                          onClick={() => setExpandedProposalIndex(isExpanded ? -1 : index)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            <div className="font-medium text-sm">
                              {proposal.title ? proposal.title : `Proposal ${index + 1}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {titleProposals.length > 3 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTitleProposal(index);
                                }}
                                className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                Remove
                              </Button>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t p-3 space-y-4 animate-in slide-in-from-top-1">
                            <div className="space-y-2">
                              <Label htmlFor={`proposal-${index}-title`} className="text-xs">
                                Proposal Title *
                              </Label>
                              <Input
                                id={`proposal-${index}-title`}
                                placeholder="Enter a descriptive title for this proposal"
                                value={proposal.title}
                                onChange={(e) => handleTitleProposalChange(index, 'title', e.target.value)}
                                required={index < 3}
                                minLength={10}
                                maxLength={300}
                              />
                            </div>

                            <div className="space-y-3">
                              {PROPOSAL_PITCH_DECK_FIELDS.map((field) => (
                                <div key={`${index}-${field.key}`} className="space-y-1">
                                  <Label htmlFor={`proposal-${index}-${field.key}`} className="text-xs">
                                    {field.label} {index < 3 && '*'}
                                  </Label>
                                  <Textarea
                                    id={`proposal-${index}-${field.key}`}
                                    placeholder={field.placeholder}
                                    value={proposal.pitchDeck?.[field.key] || ''}
                                    onChange={(event) =>
                                      handlePitchDeckFieldChange(index, field.key, event.target.value)
                                    }
                                    required={index < 3}
                                    minLength={20}
                                    maxLength={1000}
                                    rows={3}
                                  />
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled
                                title="Available after project creation"
                              >
                                Generate Presentation Deck (PDF)
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`proposal-${index}-capstoneType`} className="text-xs">
                                Capstone Type *
                              </Label>
                              <Input
                                id={`proposal-${index}-capstoneType`}
                                placeholder="E.g. Web Application, Mobile Application, Hardware"
                                value={proposal.capstoneType}
                                onChange={(e) =>
                                  handleTitleProposalChange(index, 'capstoneType', e.target.value)
                                }
                                required={index < 3}
                                minLength={2}
                                maxLength={120}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">SDG Tags {index < 3 && '*'}</Label>
                              <div className="flex gap-2">
                                <select
                                  value=""
                                  onChange={(e) => addProposalSdgTag(index, e.target.value)}
                                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                  <option value="">Add SDG tag to this proposal</option>
                                  {SDG_TAG_SUGGESTIONS.map((tag) => (
                                    <option key={`${index}-${tag}`} value={tag}>
                                      {tag}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {proposal.sdgTags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {proposal.sdgTags.map((tag) => (
                                    <span
                                      key={`${index}-${tag}`}
                                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => removeProposalSdgTag(index, tag)}
                                        className="rounded-full p-0.5 hover:bg-primary/20"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    You can add up to 10 proposals. (Required: {Math.max(0, 3 - titleProposals.length)} more)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addTitleProposal();
                      setExpandedProposalIndex(titleProposals.length);
                    }}
                    className="font-semibold"
                    disabled={titleProposals.length >= 10}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add More Title Proposal
                  </Button>
                </div>

                {/* Real-time Title Similarity Checking for expanded proposal */}
                {titleProposals[expandedProposalIndex]?.title && (
                  <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 mt-4">
                    <p className="text-xs font-medium text-blue-900">Title Similarity Check (Proposal {expandedProposalIndex + 1})</p>
                    <TitleSimilarityChecker
                      title={titleProposals[expandedProposalIndex].title}
                      keywords={keywordList}
                      debounceMs={500}
                    />
                  </div>
                )}
              </div>

              {/* Abstract */}
              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  placeholder="Brief description of your project (optional)"
                  value={form.abstract}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {form.abstract.length}/500 characters
                </p>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    id="keywords"
                    placeholder="Add a keyword and press Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywordList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {keywordList.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{keywordList.length}/10 keywords</p>
              </div>

              {/* SDG Tags */}
              <div className="space-y-2">
                <Label htmlFor="sdgTagSelect">SDG Tags * (at least 1)</Label>
                <div className="flex gap-2">
                  <select
                    id="sdgTagSelect"
                    value={selectedSdgTag}
                    onChange={(e) => setSelectedSdgTag(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select an SDG tag</option>
                    {SDG_TAG_SUGGESTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={addSdgTag}>
                    Add
                  </Button>
                </div>
                {sdgTagList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sdgTagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeSdgTag(tag)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Year */}
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {academicYears.length === 0 && (
                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                  )}
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="sectionId">Section *</Label>
                {isAnySectionError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load sections.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchSections()}
                        disabled={isAnySectionLoading}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <select
                  id="sectionId"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={
                    isAnySectionLoading || (isAnySectionError && sectionOptions.length === 0)
                  }
                >
                  <option value="">
                    {isAnySectionLoading
                      ? 'Loading sections...'
                      : isAnySectionError
                        ? 'Error loading sections'
                        : !form.academicYear
                          ? 'Please select an academic year first'
                          : sectionOptions.length === 0
                            ? 'No active sections available. Contact your instructor to create one.'
                            : 'Select a section'}
                  </option>
                  {sectionOptions.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.courseId?.code} - {section.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending || needsTeamFinalization}>
                  {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
