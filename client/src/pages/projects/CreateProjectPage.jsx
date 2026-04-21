import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useCreateProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/authStore';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import TitleSimilarityChecker from '@/components/projects/TitleSimilarityChecker';
import {
  AlertTriangle,
  X,
  Plus,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { SDG_TAG_SUGGESTIONS } from '@cms/shared';

import { cn } from '@/lib/utils';
import { TagInput } from '@/components/ui/TagInput';
import { projectService } from '@/services/authService';

/**
 * CreateProjectPage — Students create a new capstone project.
 *
 * The form collects title, abstract, keywords, and academic year.
 * On submission, the server returns any similar projects found,
 * which are displayed as warnings.
 */

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

const CAPSTONE_TYPE_SUGGESTIONS = [
  'IoT',
  'Internet of Things',
  'Machine Learning',
  'Deep Learning',
  'AI',
  'Artificial Intelligence',
  'Mobile Application',
  'Web Application',
  'Web Development',
  'Database',
  'Cloud Computing',
  'AWS',
  'Azure',
  'Blockchain',
  'Cybersecurity',
  'Network Security',
  'Data Science',
  'Data Analytics',
  'Hardware',
  'Robotics',
  'Game Development',
  'Information System',
];

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

const PDF_SIGNATURE = '%PDF-';

const hasPdfSignature = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length < PDF_SIGNATURE.length) {
    return false;
  }

  const signature = String.fromCharCode(...bytes.slice(0, PDF_SIGNATURE.length));
  return signature === PDF_SIGNATURE;
};

const isSerializedByteObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length < 8) {
    return false;
  }

  return keys.every((key) => /^\d+$/.test(key));
};

const deserializeByteObject = (value) => {
  const orderedKeys = Object.keys(value)
    .map((key) => Number.parseInt(key, 10))
    .filter((key) => Number.isInteger(key) && key >= 0)
    .sort((a, b) => a - b);

  const bytes = new Uint8Array(orderedKeys.length);
  orderedKeys.forEach((index, position) => {
    const raw = Number(value[index]);
    bytes[position] = Number.isFinite(raw) ? raw & 0xff : 0;
  });

  return bytes;
};

const toPdfBytes = async (payload) => {
  if (!payload) {
    return new Uint8Array();
  }

  if (payload instanceof Blob) {
    return new Uint8Array(await payload.arrayBuffer());
  }

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (isSerializedByteObject(payload)) {
    return deserializeByteObject(payload);
  }

  return new Uint8Array();
};

const createEmptyProposal = () => ({
  title: '',
  description: '',
  pitchDeck: createEmptyPitchDeck(),
  capstoneType: [],
  sdgTags: [],
});

const normalizeDraftProposal = (proposal = {}) => ({
  ...createEmptyProposal(),
  ...proposal,
  pitchDeck: {
    ...createEmptyPitchDeck(),
    ...(proposal?.pitchDeck || {}),
  },
  capstoneType: Array.isArray(proposal?.capstoneType) ? proposal.capstoneType : [],
  sdgTags: Array.isArray(proposal?.sdgTags) ? proposal.sdgTags : [],
});

const getMissingRequiredProposalFields = (proposal) => {
  const missingFields = [];

  if (!proposal.title.trim()) {
    missingFields.push('title');
  }

  const missingPitchLabels = PROPOSAL_PITCH_DECK_FIELDS.filter(
    (field) => !(proposal.pitchDeck?.[field.key] || '').trim(),
  ).map((field) => field.label);

  if (missingPitchLabels.length > 0) {
    missingFields.push(...missingPitchLabels);
  }

  if (!proposal.capstoneType || proposal.capstoneType.length === 0) {
    missingFields.push('capstone type');
  }

  if (!proposal.sdgTags || proposal.sdgTags.length === 0) {
    missingFields.push('at least one SDG tag');
  }

  return missingFields;
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const createProject = useCreateProject({
    onSuccess: async (result) => {
      const createdProjectId = result?.data?.project?._id || result?.project?._id;

      if (!createdProjectId) {
        toast.success('Project created successfully.');
        navigate('/project');
        return;
      }

      try {
        await projectService.submitTitle(createdProjectId);
        toast.success('Project submitted for instructor approval.');
      } catch (submitError) {
        toast.error(
          submitError?.response?.data?.error?.message ||
            'Project created, but automatic submission failed. Please submit from My Capstone.',
        );
      }

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
  const [activeProposalIndex, setActiveProposalIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState('write');
  const [generatingProposalIndex, setGeneratingProposalIndex] = useState(null);
  const [savingDraftIndex, setSavingDraftIndex] = useState(null);
  const [isScanningSimilarityIndex, setIsScanningSimilarityIndex] = useState(null);
  const [proposalSimilarityResults, setProposalSimilarityResults] = useState({});
  const [proposalPlagiarismResults, setProposalPlagiarismResults] = useState({});
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
    let isMounted = true;

    const hydrateDraft = async () => {
      try {
        const res = await projectService.getCreateProjectDraft();
        const draft = res?.data?.data?.draft;
        if (!isMounted || !draft) return;

        if (draft.form && typeof draft.form === 'object') {
          setForm((prev) => ({
            ...prev,
            ...draft.form,
          }));
        }

        if (Array.isArray(draft.titleProposals) && draft.titleProposals.length > 0) {
          const normalizedDraftProposals = draft.titleProposals
            .slice(0, 10)
            .map((proposal) => normalizeDraftProposal(proposal));

          while (normalizedDraftProposals.length < 3) {
            normalizedDraftProposals.push(createEmptyProposal());
          }

          setTitleProposals(normalizedDraftProposals);

          if (typeof draft.expandedProposalIndex === 'number') {
            const nextIndex = Math.max(
              0,
              Math.min(draft.expandedProposalIndex, normalizedDraftProposals.length - 1),
            );
            setActiveProposalIndex(nextIndex);
          }
        }

        if (Array.isArray(draft.keywordList)) {
          setKeywordList(draft.keywordList.filter((item) => typeof item === 'string'));
        }

        if (Array.isArray(draft.sdgTagList)) {
          setSdgTagList(draft.sdgTagList.filter((item) => typeof item === 'string'));
        }

        // Prevent team defaults from overwriting restored draft values.
        teamDefaultsAppliedRef.current = true;
      } catch {
        // Silent fallback: draft restoration should not block page usage.
      }
    };

    hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const saveProposalDraft = async (index) => {
    if (!titleProposals[index]) return;

    setSavingDraftIndex(index);
    try {
      await projectService.saveCreateProjectDraft({
        form: {
          title: form.title,
          abstract: form.abstract,
          keywords: keywordList.join(', '),
          academicYear: form.academicYear,
          sectionId: form.sectionId,
        },
        titleProposals,
        keywordList,
        sdgTagList,
        expandedProposalIndex: activeProposalIndex,
        proposalIndex: index,
        source: 'manual-proposal-save',
        savedAt: new Date().toISOString(),
      });
      toast.success(`Proposal ${index + 1} draft saved.`);
    } catch (error) {
      toast.error(error?.response?.data?.error?.message || 'Failed to save proposal draft.');
    } finally {
      setSavingDraftIndex(null);
    }
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
      if (activeProposalIndex >= next.length) {
        setActiveProposalIndex(next.length - 1);
      }
      return next;
    });
  };

  const generateDeck = async (index, proposal) => {
    const deckData = proposal.pitchDeck || createEmptyPitchDeck();

    if (PROPOSAL_PITCH_DECK_FIELDS.some((field) => !deckData[field.key]?.trim())) {
      toast.error('Please complete all pitch deck sections before generating the PDF.');
      return;
    }

    setGeneratingProposalIndex(index);
    try {
      const response = await projectService.generateProposalDeck({
        projectId: 'draft',
        proposalId: `proposal-${index}`,
        title: proposal.title || `Proposal ${index + 1}`,
        deckData,
      });

      const filename = `${(proposal.title || `Proposal_${index + 1}`)
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 80)}_PitchDeck.pdf`;
      const bytes = await toPdfBytes(response.data);

      if (!bytes.length) {
        throw new Error('Generated PDF is empty. Please try again.');
      }

      if (!hasPdfSignature(bytes)) {
        throw new Error('Generated file is not a valid PDF. Please retry.');
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });

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
      setGeneratingProposalIndex(null);
    }
  };

  const scanSimilarity = async (index, proposal) => {
    setIsScanningSimilarityIndex(index);
    try {
      const res = await projectService.checkProposalSimilarity({
        title: proposal.title,
        problemStatement: proposal.pitchDeck?.problemStatement,
        proposedSolution: proposal.pitchDeck?.proposedSolution,
        uniqueContribution: proposal.pitchDeck?.uniqueContribution,
        expectedImpact: proposal.pitchDeck?.expectedImpact,
        academicYear: form.academicYear,
      });
      setProposalSimilarityResults((prev) => ({
        ...prev,
        [index]: res.data?.data?.matches || res.data?.matches || res?.matches || [],
      }));
      setProposalPlagiarismResults((prev) => ({
        ...prev,
        [index]: res.data?.data?.plagiarism || null,
      }));
      toast.success('Similarity scan completed.');
    } catch (error) {
      toast.error('Failed to scan for similarity.');
    } finally {
      setIsScanningSimilarityIndex(null);
    }
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
    const invalidRequiredProposal = requiredProposals
      .map((proposal, index) => ({
        index,
        missingFields: getMissingRequiredProposalFields(proposal),
      }))
      .find((item) => item.missingFields.length > 0);

    if (invalidRequiredProposal) {
      toast.error(
        `Proposal ${invalidRequiredProposal.index + 1} is missing: ${invalidRequiredProposal.missingFields.join(', ')}.`,
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
        capstoneType: (proposal.capstoneType || []).map((t) => t.trim()).filter(Boolean),
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

    const allSdgTags = [...new Set(normalizedTitleProposals.flatMap((p) => p.sdgTags))];
    if (allSdgTags.length === 0) {
      toast.error('Ensure at least one SDG tag is added across your proposals.');
      return;
    }

    const normalizedTeamAcademicYear =
      typeof team?.academicYear === 'string' ? team.academicYear.trim() : '';
    const normalizedFormAcademicYear =
      typeof form.academicYear === 'string' ? form.academicYear.trim() : '';
    const resolvedAcademicYear = normalizedTeamAcademicYear || normalizedFormAcademicYear;

    const normalizedTeamSectionId =
      typeof team?.sectionId === 'string' ? team.sectionId : team?.sectionId?._id;
    const normalizedFormSectionId = typeof form.sectionId === 'string' ? form.sectionId.trim() : '';
    const resolvedSectionId = team ? normalizedTeamSectionId || '' : normalizedFormSectionId;

    if (!resolvedAcademicYear?.length) {
      toast.error('Team academic year is missing. Make sure your team is finalized.');
      return;
    }

    if (!resolvedSectionId?.length) {
      toast.error('Team section is missing. Make sure your team is finalized.');
      return;
    }

    // Since selected title is removed, we default to the first proposal's title if needed,
    // or just let backend handle if it doesn't strictly need one selected title.
    // Assuming backend still needs `title` field, using the first proposal's title.
    const selectedTitle = normalizedTitleProposals[0]?.title || '';

    createProject.mutate({
      title: selectedTitle,
      titleProposals: normalizedTitleProposals,
      sdgTags: allSdgTags,
      academicYear: resolvedAcademicYear,
      sectionId: resolvedSectionId,
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
    createProject.data?.similarProjects ||
    createProject.error?.response?.data?.data?.similarProjects ||
    createProject.error?.response?.data?.similarProjects;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        {/* Global Header */}
        <div className="mb-6 flex flex-col justify-between space-y-2 border-b pb-4 sm:flex-row sm:items-center sm:space-y-0">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Create Capstone Project</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                🟡 Draft (Auto-saves)
              </Badge>
              <span>System Note: Automatically using academic year and section.</span>
            </div>
          </div>
          <div>
            <Button
              onClick={handleSubmit}
              disabled={createProject.isPending || needsTeamFinalization}
            >
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Project for Approval
            </Button>
          </div>
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

        {needsTeamFinalization && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Finalize and lock your team first. Proposal submission is only available after your
              team has been completed.
            </AlertDescription>
          </Alert>
        )}

        {/* Global Details - Grouped at the top before proposals instead of the bottom 
            Wait, prompt says "Main Navigation: Large tabs for Proposals..." 
            so we jump right to the proposals, and we can keep Global fields nicely grouped below them. */}

        {/* Main Navigation (Proposal Tabs) */}
        <div className="flex flex-wrap items-center gap-2 border-b">
          {titleProposals.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setActiveProposalIndex(i);
                setActiveSubTab('write');
              }}
              className={cn(
                'px-4 py-3 border-b-2 font-medium text-sm transition-colors -mb-px',
                activeProposalIndex === i
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              Proposal {i + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={titleProposals.length >= 10}
            onClick={() => {
              addTitleProposal();
              setActiveProposalIndex(titleProposals.length);
              setActiveSubTab('write');
            }}
            className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center -mb-px"
          >
            <Plus className="mr-1 h-4 w-4" /> Add Proposal
          </button>
        </div>

        {/* Active Proposal View */}
        {titleProposals[activeProposalIndex] &&
          (() => {
            const index = activeProposalIndex;
            const proposal = titleProposals[index];

            return (
              <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                {/* Sub-Navigation (Action Tabs) */}
                <div className="flex gap-2 border-b bg-muted/20 p-2 overflow-x-auto w-full whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('write')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      activeSubTab === 'write'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    📝 Write Proposal
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('similarity')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                      activeSubTab === 'similarity'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    🔍 Similarity Report
                    {proposalSimilarityResults[index]?.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                        {proposalSimilarityResults[index].length}
                      </Badge>
                    )}
                    {proposalSimilarityResults[index]?.length === 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 px-1.5 text-[10px] bg-green-100 text-green-800 hover:bg-green-100"
                      >
                        0
                      </Badge>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('pitch')}
                    className={cn(
                      'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
                      activeSubTab === 'pitch'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    📊 Pitch Deck Builder
                  </button>

                  <div className="ml-auto flex items-center pr-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => saveProposalDraft(index)}
                      disabled={savingDraftIndex === index}
                      className="mr-2 h-8"
                    >
                      {savingDraftIndex === index ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Draft
                    </Button>
                    {titleProposals.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTitleProposal(index)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                      >
                        Delete Proposal
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-0">
                  {activeSubTab === 'write' && (
                    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
                      {/* Basic Details */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">
                          Basic Details
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor={`proposal-${index}-title`}>Proposal Title *</Label>
                          <Input
                            id={`proposal-${index}-title`}
                            placeholder="Enter a descriptive title for this proposal"
                            value={proposal.title}
                            onChange={(e) =>
                              handleTitleProposalChange(index, 'title', e.target.value)
                            }
                            required={index < 3}
                            minLength={10}
                            maxLength={300}
                            className="text-lg"
                          />
                        </div>

                        {/* Real-time Title Similarity Checking mini-alert */}
                        {proposal.title && (
                          <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs font-medium text-blue-900">
                              Title Similarity Check
                            </p>
                            <TitleSimilarityChecker
                              title={proposal.title}
                              keywords={keywordList}
                              debounceMs={500}
                            />
                          </div>
                        )}
                      </div>

                      {/* Core Pitch */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">
                          The Core Pitch
                        </h4>
                        {PROPOSAL_PITCH_DECK_FIELDS.map((field) => (
                          <div key={`${index}-${field.key}`} className="space-y-1">
                            <Label htmlFor={`proposal-${index}-${field.key}`} className="text-sm">
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
                              className="resize-y"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Academic Classifications */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">
                          Academic Classifications
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor={`proposal-${index}-capstoneType`}>Capstone Type *</Label>
                          <TagInput
                            id={`proposal-${index}-capstoneType`}
                            placeholder="Select or type capstone types"
                            value={proposal.capstoneType || []}
                            onChange={(newTags) =>
                              handleTitleProposalChange(index, 'capstoneType', newTags)
                            }
                            suggestions={CAPSTONE_TYPE_SUGGESTIONS}
                            maxTags={5}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">SDG Tags {index < 3 && '*'}</Label>
                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => addProposalSdgTag(index, e.target.value)}
                              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                            <div className="flex flex-wrap gap-2 mt-2">
                              {proposal.sdgTags.map((tag) => (
                                <span
                                  key={`${index}-${tag}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
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

                      {/* Action Button */}
                      <div className="flex justify-center pt-8 border-t mt-8">
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => {
                            scanSimilarity(index, proposal);
                            setActiveSubTab('similarity');
                          }}
                        >
                          Run Similarity Check
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'similarity' && (
                    <div className="max-w-3xl mx-auto py-10 px-4 min-h-[400px]">
                      {isScanningSimilarityIndex === index ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-20">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="text-muted-foreground font-medium text-lg">
                            Scanning for similarity against past projects...
                          </p>
                        </div>
                      ) : proposalSimilarityResults[index] ? (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center bg-muted/20 p-5 rounded-lg border">
                            <div>
                              <h4 className="font-semibold text-lg flex items-center gap-2">
                                <Search className="h-5 w-5 text-primary" /> Similarity Scan Results
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Found {proposalSimilarityResults[index].length} highly similar
                                projects based on your pitch.
                              </p>
                              {proposalPlagiarismResults[index] && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Originality: {proposalPlagiarismResults[index].originalityScore}%
                                  | Similarity: {proposalPlagiarismResults[index].similarityScore}%
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => scanSimilarity(index, proposal)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" /> Rescan
                            </Button>
                          </div>

                          {proposalSimilarityResults[index].length > 0 ? (
                            <div className="space-y-4 pt-2">
                              {proposalSimilarityResults[index].map((match) => (
                                <div
                                  key={match._id}
                                  className="bg-background p-4 rounded-lg border shadow-sm flex flex-col gap-2"
                                >
                                  <div className="font-medium flex justify-between">
                                    <span className="text-base text-foreground">{match.title}</span>
                                    <Badge
                                      variant={match.score > 0.4 ? 'destructive' : 'secondary'}
                                      className="h-6"
                                    >
                                      {Math.round(match.score * 100)}% Match
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    <span className="font-semibold">Status:</span> {match.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-green-50 text-green-900 border border-green-200 p-8 rounded-lg text-center mt-8">
                              <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                                <span className="text-2xl">✨</span>
                              </div>
                              <h4 className="text-lg font-bold mb-2">Highly Unique Proposal!</h4>
                              <p className="text-green-800">
                                No significant matches were found in our database. You&apos;re good
                                to go.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-6 py-20 border-2 border-dashed rounded-xl bg-muted/5">
                          <div className="bg-muted p-4 rounded-full">
                            <Search className="h-10 w-10 text-muted-foreground/60" />
                          </div>
                          <div className="text-center space-y-1">
                            <h4 className="text-lg font-semibold">Ready for Analysis</h4>
                            <p className="text-muted-foreground">
                              Your proposal hasn&apos;t been scanned for similarity yet.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="lg"
                            onClick={() => scanSimilarity(index, proposal)}
                          >
                            ▶ Run Similarity Scan
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeSubTab === 'pitch' && (
                    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 min-h-[400px]">
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
                        <div className="bg-white p-4 rounded-full shadow-sm">
                          <Download className="h-10 w-10 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-indigo-950 mb-2">
                            Presentation Deck
                          </h4>
                          <p className="text-indigo-800 mb-0">
                            Generate a beautifully formatted PDF representation of your proposal to
                            use for your initial pitch presentation.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => generateDeck(index, proposal)}
                          disabled={generatingProposalIndex === index}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                        >
                          {generatingProposalIndex === index ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating PDF...
                            </>
                          ) : (
                            'Generate PDF Deck'
                          )}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2 pt-4">
                          Proposal Summary Preview
                        </h4>
                        <div className="border rounded-xl p-6 bg-card text-sm space-y-6 shadow-sm">
                          {PROPOSAL_PITCH_DECK_FIELDS.map((f) => (
                            <div key={f.key} className="space-y-1">
                              <div className="font-semibold text-foreground">{f.label}</div>
                              <div className="text-muted-foreground leading-relaxed">
                                {proposal.pitchDeck?.[f.key] ? (
                                  proposal.pitchDeck[f.key]
                                ) : (
                                  <span className="italic opacity-60">Not provided</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </div>
    </DashboardLayout>
  );
}
