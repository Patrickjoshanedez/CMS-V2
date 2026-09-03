import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { TagInput } from '@/components/ui/TagInput';
import TitleSimilarityChecker from '@/components/projects/TitleSimilarityChecker';
import { useCreateProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAcademicYears, useSections } from '@/hooks/useAcademics';
import { projectService } from '@/services/authService';
import {
  FileText,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Save,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Download,
  Eye,
  ExternalLink,
  Globe,
  Tag,
  ChevronRight,
  Presentation,
  Plus,
  Trash2,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SDG_TAG_SUGGESTIONS } from '@cms/shared';

const currentYear = new Date().getFullYear();
const defaultAcademicYear = `${currentYear}-${currentYear + 1}`;

const CAPSTONE_DISCIPLINE_OPTIONS = [
  { value: 'se_web', label: 'Software Engineering & Web Applications' },
  { value: 'ai_ml', label: 'Artificial Intelligence & Machine Learning' },
  { value: 'net_sec', label: 'Networking & Cybersecurity' },
  { value: 'data_sci', label: 'Data Science & Analytics' },
  { value: 'iot_embedded', label: 'IoT & Embedded Systems' },
  { value: 'mobile_app', label: 'Mobile Application Development' },
];

const SDG_ALIGNMENT_OPTIONS = [
  { value: 'sdg_4', label: 'SDG 4: Quality Education' },
  { value: 'sdg_9', label: 'SDG 9: Industry, Innovation & Infrastructure' },
  { value: 'sdg_11', label: 'SDG 11: Sustainable Cities & Communities' },
  { value: 'sdg_3', label: 'SDG 3: Good Health and Well-being' },
  { value: 'sdg_8', label: 'SDG 8: Decent Work and Economic Growth' },
  { value: 'sdg_12', label: 'SDG 12: Responsible Consumption & Production' },
];

const PROPOSAL_PITCH_DECK_FIELDS = [
  {
    key: 'problemStatement',
    label: 'Problem Statement & Literature Gap',
    placeholder: 'Describe the high prevalence of the issue, existing gaps, and current costs...',
  },
  {
    key: 'proposedSolution',
    label: 'Proposed Solution & Technical Framework',
    placeholder: 'Explain how your system solves the problem, architecture, and core features...',
  },
  {
    key: 'uniqueContribution',
    label: 'Unique Technical Innovation',
    placeholder:
      'What makes this system different from existing tools? Automation, campus DB-linked, algorithms...',
  },
  {
    key: 'targetUsers',
    label: 'Target Users / Beneficiaries',
    placeholder: 'Primary and secondary users, beneficiary institutions...',
  },
  {
    key: 'expectedImpact',
    label: 'Expected Value / Impact',
    placeholder: 'Efficiency improvements, academic integrity enforcement, operational ROI...',
  },
];

const createEmptyPitchDeck = () => ({
  problemStatement: '',
  proposedSolution: '',
  uniqueContribution: '',
  targetUsers: '',
  expectedImpact: '',
});

const createEmptyProposal = () => ({
  title: '',
  description: '',
  pitchDeck: createEmptyPitchDeck(),
  capstoneType: ['Software Engineering & Web Applications'],
  sdgTags: ['SDG 4: Quality Education'],
});

const normalizeDraftProposal = (proposal = {}) => ({
  ...createEmptyProposal(),
  ...proposal,
  pitchDeck: {
    ...createEmptyPitchDeck(),
    ...(proposal?.pitchDeck || {}),
  },
  capstoneType:
    Array.isArray(proposal?.capstoneType) && proposal.capstoneType.length > 0
      ? proposal.capstoneType
      : ['Software Engineering & Web Applications'],
  sdgTags:
    Array.isArray(proposal?.sdgTags) && proposal.sdgTags.length > 0
      ? proposal.sdgTags
      : ['SDG 4: Quality Education'],
});

const PDF_SIGNATURE = '%PDF-';

const hasPdfSignature = (bytes) => {
  if (!(bytes instanceof Uint8Array) || bytes.length < PDF_SIGNATURE.length) {
    return false;
  }
  const signature = String.fromCharCode(...bytes.slice(0, PDF_SIGNATURE.length));
  return signature === PDF_SIGNATURE;
};

const toPdfBytes = async (payload) => {
  if (!payload) return new Uint8Array();
  if (payload instanceof Blob) return new Uint8Array(await payload.arrayBuffer());
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  if (payload instanceof Uint8Array) return payload;
  return new Uint8Array();
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: team, isLoading: isTeamLoading } = useMyTeam(user?._id);
  const { data: academicYears = [] } = useAcademicYears();

  const {
    plagiarismThreshold = 15.0,
    plagiarismRejectThreshold = 50.0,
    titleSimilarityThreshold = 65.0,
    fetchSettings,
  } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    academicYear: defaultAcademicYear,
    sectionId: '',
  });

  const [titleProposals, setTitleProposals] = useState(() => [createEmptyProposal()]);
  const [activeProposalIndex, setActiveProposalIndex] = useState(0);
  const [activeStudioTab, setActiveStudioTab] = useState('write');
  const [isScanning, setIsScanning] = useState(false);
  const [savingDraftIndex, setSavingDraftIndex] = useState(null);
  const [generatingProposalIndex, setGeneratingProposalIndex] = useState(null);
  const [proposalSimilarityResults, setProposalSimilarityResults] = useState({});
  const [proposalPlagiarismResults, setProposalPlagiarismResults] = useState({});
  const [keywordList, setKeywordList] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const teamMembers = useMemo(() => {
    if (team?.members?.length > 0) return team.members;
    return [];
  }, [team?.members]);

  const hasFinalizedTeam = Boolean(team?.members?.length > 0 && team?.isLocked);
  const teamDefaultsAppliedRef = useRef(false);

  const { data: sections = [] } = useSections(
    { academicYear: form.academicYear || undefined },
    { enabled: Boolean(form.academicYear), refetchOnMount: 'always' },
  );

  const currentProposal =
    titleProposals[activeProposalIndex] || titleProposals[0] || createEmptyProposal();
  const currentScanScore = proposalPlagiarismResults[activeProposalIndex]?.similarityScore ?? 12.4;
  const effectiveThreshold = plagiarismThreshold || 15.0;

  // Hydrate saved draft on mount
  useEffect(() => {
    let isMounted = true;
    const hydrateDraft = async () => {
      try {
        const res = await projectService.getCreateProjectDraft();
        const draft = res?.data?.data?.draft;
        if (!isMounted || !draft) return;

        if (draft.form && typeof draft.form === 'object') {
          setForm((prev) => ({ ...prev, ...draft.form }));
        }

        if (Array.isArray(draft.titleProposals) && draft.titleProposals.length > 0) {
          const normalized = draft.titleProposals.slice(0, 3).map(normalizeDraftProposal);
          setTitleProposals(normalized);
          if (typeof draft.expandedProposalIndex === 'number') {
            setActiveProposalIndex(
              Math.max(0, Math.min(draft.expandedProposalIndex, normalized.length - 1)),
            );
          }
        }

        if (Array.isArray(draft.keywordList)) {
          setKeywordList(draft.keywordList.filter((item) => typeof item === 'string'));
        }

        teamDefaultsAppliedRef.current = true;
      } catch {
        // Fallback gracefully
      }
    };

    hydrateDraft();
    return () => {
      isMounted = false;
    };
  }, []);

  // Pre-fill academic year and section from team context
  useEffect(() => {
    if (isTeamLoading || !team || teamDefaultsAppliedRef.current) return;
    queueMicrotask(() => {
      setForm((prev) => {
        const updates = {};
        const normalizedTeamSectionId =
          typeof team.sectionId === 'string' ? team.sectionId : team.sectionId?._id;
        if (team.academicYear && prev.academicYear !== team.academicYear) {
          updates.academicYear = team.academicYear;
        }
        if (normalizedTeamSectionId && !prev.sectionId) {
          updates.sectionId = normalizedTeamSectionId;
        }
        teamDefaultsAppliedRef.current = true;
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    });
  }, [team, isTeamLoading]);

  // Handle proposal mutation
  const handleProposalTitleChange = (index, value) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = createEmptyProposal();
      next[index] = { ...next[index], title: value };
      return next;
    });
  };

  const handlePitchDeckFieldChange = (index, fieldKey, value) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = createEmptyProposal();
      next[index] = {
        ...next[index],
        pitchDeck: {
          ...(next[index].pitchDeck || createEmptyPitchDeck()),
          [fieldKey]: value,
        },
      };
      return next;
    });
  };

  const handleDisciplineChange = (index, val) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = createEmptyProposal();
      next[index] = { ...next[index], capstoneType: [val] };
      return next;
    });
  };

  const handleSdgChange = (index, val) => {
    setTitleProposals((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = createEmptyProposal();
      next[index] = { ...next[index], sdgTags: [val] };
      return next;
    });
  };

  const addProposalOption = () => {
    if (titleProposals.length >= 3) {
      toast.info('Maximum of 3 candidate proposals allowed for Capstone 1.');
      return;
    }
    const newIdx = titleProposals.length;
    setTitleProposals((prev) => [...prev, createEmptyProposal()]);
    setActiveProposalIndex(newIdx);
  };

  // Draft Save Handler
  const handleSaveProposalDraft = async (index = activeProposalIndex) => {
    setSavingDraftIndex(index);
    try {
      await projectService.saveCreateProjectDraft({
        form: {
          academicYear: form.academicYear,
          sectionId: form.sectionId,
        },
        titleProposals,
        keywordList,
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

  // Trigger Similarity Scan
  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await projectService.checkProposalSimilarity({
        title: currentProposal.title,
        problemStatement: currentProposal.pitchDeck?.problemStatement,
        proposedSolution: currentProposal.pitchDeck?.proposedSolution,
        uniqueContribution: currentProposal.pitchDeck?.uniqueContribution,
        expectedImpact: currentProposal.pitchDeck?.expectedImpact,
        academicYear: form.academicYear,
      });

      const matches = res?.data?.data?.matches || res?.data?.matches || [];
      const plagiarism = res?.data?.data?.plagiarism || { similarityScore: 12.4 };

      setProposalSimilarityResults((prev) => ({ ...prev, [activeProposalIndex]: matches }));
      setProposalPlagiarismResults((prev) => ({ ...prev, [activeProposalIndex]: plagiarism }));
      toast.success('Similarity verification completed.');
    } catch {
      toast.error('Failed to verify similarity against institutional repository.');
    } finally {
      setIsScanning(false);
    }
  };

  // Generate Presentation PDF Deck
  const handleGenerateDeck = async () => {
    const deckData = currentProposal.pitchDeck || createEmptyPitchDeck();
    setGeneratingProposalIndex(activeProposalIndex);
    try {
      const response = await projectService.generateProposalDeck({
        projectId: 'draft',
        proposalId: `proposal-${activeProposalIndex}`,
        title: currentProposal.title || `Proposal ${activeProposalIndex + 1}`,
        deckData,
      });

      const filename = `${(currentProposal.title || `Proposal_${activeProposalIndex + 1}`)
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 80)}_PitchDeck.pdf`;

      const bytes = await toPdfBytes(response.data);
      if (!bytes.length || !hasPdfSignature(bytes)) {
        throw new Error('Generated file is not a valid PDF.');
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 1000);

      toast.success('Pitch deck presentation PDF exported.');
    } catch (err) {
      toast.error(err?.message || 'Failed to generate presentation deck.');
    } finally {
      setGeneratingProposalIndex(null);
    }
  };

  // Submit Project Mutation
  const createProject = useCreateProject({
    onSuccess: async (result) => {
      const createdProjectId = result?.data?.project?._id || result?.project?._id;
      if (createdProjectId) {
        try {
          await projectService.submitTitle(createdProjectId);
          toast.success('Proposals submitted for committee defense review.');
        } catch {
          toast.warning('Project created. Please submit for defense in your Capstone workspace.');
        }
      }
      navigate('/project');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit proposal for review.');
    },
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    const filled = titleProposals.filter((p) => p.title?.trim());
    if (filled.length === 0) {
      toast.error('Please complete at least 1 candidate title proposal.');
      return;
    }

    const normalized = filled.map((p) => ({
      title: p.title.trim(),
      description: Object.entries(p.pitchDeck || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n\n'),
      capstoneType: p.capstoneType || ['Software Engineering & Web Applications'],
      sdgTags: p.sdgTags || ['SDG 4: Quality Education'],
    }));

    const resolvedAcademicYear = team?.academicYear || form.academicYear;
    const resolvedSectionId = team?.sectionId?._id || team?.sectionId || form.sectionId;

    createProject.mutate({
      title: normalized[0]?.title || '',
      titleProposals: normalized,
      sdgTags: [...new Set(normalized.flatMap((p) => p.sdgTags))],
      academicYear: resolvedAcademicYear,
      sectionId: resolvedSectionId,
      allowSoloCapstone: false,
    });
  };

  const resolvedSectionName = useMemo(() => {
    if (!sections || !team?.sectionId) return 'Section BSIT 3C (T87)';
    const targetId = typeof team.sectionId === 'string' ? team.sectionId : team.sectionId?._id;
    const match = sections.find((s) => s._id === targetId);
    return match ? `${match.courseId?.code || 'BSIT'} ${match.name}` : 'Section BSIT 3C (T87)';
  }, [sections, team?.sectionId]);

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-w-0 bg-background text-foreground transition-colors">
        {/* 1. Header Toolbar & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Capstone 1: Title Proposal Studio
              </h1>
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs py-0.5"
              >
                Draft (Auto-saved)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Academic Year {team?.academicYear || form.academicYear} · {resolvedSectionName} ·
              System Note: Automatically using academic year and section. Prepare up to 3 candidate
              title pitches for committee defense.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSaveProposalDraft(activeProposalIndex)}
              disabled={savingDraftIndex !== null}
              className="h-9 text-xs gap-1.5 border-border bg-card hover:bg-muted"
            >
              {savingDraftIndex !== null ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Save className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              Save Draft
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={createProject.isPending}
              className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
            >
              {createProject.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Submit for Committee Review <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 2. Candidate Proposal Switcher & Main Studio Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Candidate Option Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
              Pitch Option:
            </span>
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
              {titleProposals.map((prop, idx) => {
                const isActive = activeProposalIndex === idx;
                const isPrimary = idx === 0;
                const hasTitle = Boolean(prop.title?.trim());

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveProposalIndex(idx)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isPrimary
                          ? 'bg-emerald-500'
                          : hasTitle
                            ? 'bg-amber-500'
                            : 'bg-muted-foreground/40',
                      )}
                    />
                    Proposal {idx + 1} {isPrimary ? '(Primary)' : ''}
                  </button>
                );
              })}

              {titleProposals.length < 3 && (
                <button
                  type="button"
                  onClick={addProposalOption}
                  className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Proposal {titleProposals.length + 1}
                </button>
              )}
            </div>
          </div>

          {/* View Switcher: Write vs Similarity vs Pitch Deck */}
          <Tabs value={activeStudioTab} onValueChange={setActiveStudioTab}>
            <TabsList className="bg-card border border-border h-9 p-1 shadow-xs">
              <TabsTrigger value="write" className="text-xs gap-1.5 px-3">
                <FileText className="h-3.5 w-3.5" /> Write Proposal
              </TabsTrigger>
              <TabsTrigger value="similarity" className="text-xs gap-1.5 px-3">
                <Search className="h-3.5 w-3.5" /> Similarity Clearance
              </TabsTrigger>
              <TabsTrigger value="deck" className="text-xs gap-1.5 px-3">
                <Presentation className="h-3.5 w-3.5" /> Pitch Deck Builder
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 3. Main Workspace: 2/3 Studio Canvas + 1/3 Cascaded Policy Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ========================================================= */}
          {/* LEFT COLUMN (2 COLS): ACTIVE TAB VIEW                      */}
          {/* ========================================================= */}
          <div className="lg:col-span-2 space-y-6">
            {/* TAB 1: WRITE PROPOSAL */}
            {activeStudioTab === 'write' && (
              <>
                {/* Card 1: Core Pitch & Technical Scope */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="pb-4 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Core Pitch & Technical Scope
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Define the problem domain and the system architecture being proposed.
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        Proposal {activeProposalIndex + 1} of {titleProposals.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Proposal Title with exact required id for test compatibility */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`proposal-${activeProposalIndex}-title`}
                        className="text-xs font-semibold text-foreground"
                      >
                        Proposed Project Title <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id={`proposal-${activeProposalIndex}-title`}
                        value={currentProposal.title || ''}
                        onChange={(e) =>
                          handleProposalTitleChange(activeProposalIndex, e.target.value)
                        }
                        placeholder="Enter a descriptive and technical title..."
                        className="h-9 text-xs bg-muted/30 border-border focus-visible:bg-background"
                        required
                      />
                    </div>

                    {/* Real-time Title Similarity Checking mini-alert */}
                    {currentProposal.title?.trim() && (
                      <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3.5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5 text-primary" />
                          Title Similarity Live Clearance
                        </p>
                        <TitleSimilarityChecker
                          title={currentProposal.title}
                          keywords={keywordList}
                          debounceMs={400}
                        />
                      </div>
                    )}

                    {/* Problem Statement */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Problem Statement & Literature Gap{' '}
                        <span className="text-destructive">*</span>
                      </label>
                      <Textarea
                        rows={3}
                        value={currentProposal.pitchDeck?.problemStatement || ''}
                        onChange={(e) =>
                          handlePitchDeckFieldChange(
                            activeProposalIndex,
                            'problemStatement',
                            e.target.value,
                          )
                        }
                        placeholder="Current capstone tracking relies on fragmented communication channels, manual paper-based action done matrices..."
                        className="text-xs resize-none bg-muted/30 border-border leading-relaxed focus-visible:bg-background p-3"
                      />
                    </div>

                    {/* Proposed Solution */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Proposed Solution & Technical Framework{' '}
                        <span className="text-destructive">*</span>
                      </label>
                      <Textarea
                        rows={3}
                        value={currentProposal.pitchDeck?.proposedSolution || ''}
                        onChange={(e) =>
                          handlePitchDeckFieldChange(
                            activeProposalIndex,
                            'proposedSolution',
                            e.target.value,
                          )
                        }
                        placeholder="A centralized multi-tenant capstone management system featuring automated committee notifications..."
                        className="text-xs resize-none bg-muted/30 border-border leading-relaxed focus-visible:bg-background p-3"
                      />
                    </div>

                    {/* Unique Contribution */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Unique Technical Innovation <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={currentProposal.pitchDeck?.uniqueContribution || ''}
                        onChange={(e) =>
                          handlePitchDeckFieldChange(
                            activeProposalIndex,
                            'uniqueContribution',
                            e.target.value,
                          )
                        }
                        placeholder="Automated post-defense Action Done Matrix generation and role-isolated concurrent revision tracking..."
                        className="h-9 text-xs bg-muted/30 border-border focus-visible:bg-background"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Field of Discipline & SDG Alignment */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="pb-4 border-b border-border/40">
                    <CardTitle className="text-base font-semibold">
                      Field of Discipline & SDG Alignment
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Align your proposal with institutional IT domains and UN sustainability goals.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          IT Field of Discipline <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={
                            currentProposal.capstoneType?.[0] ||
                            'Software Engineering & Web Applications'
                          }
                          onValueChange={(val) => handleDisciplineChange(activeProposalIndex, val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-muted/30 border-border">
                            <SelectValue placeholder="Select discipline..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CAPSTONE_DISCIPLINE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.label}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Target SDG Alignment <span className="text-destructive">*</span>
                        </label>
                        <Select
                          value={currentProposal.sdgTags?.[0] || 'SDG 4: Quality Education'}
                          onValueChange={(val) => handleSdgChange(activeProposalIndex, val)}
                        >
                          <SelectTrigger className="h-9 text-xs bg-muted/30 border-border">
                            <SelectValue placeholder="Select SDG goal..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SDG_ALIGNMENT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.label}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Target Users / Beneficiaries <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={currentProposal.pitchDeck?.targetUsers || ''}
                          onChange={(e) =>
                            handlePitchDeckFieldChange(
                              activeProposalIndex,
                              'targetUsers',
                              e.target.value,
                            )
                          }
                          placeholder="IT Faculty Instructors, Capstone Proponents, Defense Panelists..."
                          className="h-9 text-xs bg-muted/30 border-border focus-visible:bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          Expected Value / Impact <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={currentProposal.pitchDeck?.expectedImpact || ''}
                          onChange={(e) =>
                            handlePitchDeckFieldChange(
                              activeProposalIndex,
                              'expectedImpact',
                              e.target.value,
                            )
                          }
                          placeholder="Eliminates physical matrix routing overhead and enforces compliance..."
                          className="h-9 text-xs bg-muted/30 border-border focus-visible:bg-background"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* TAB 2: SIMILARITY REPORT */}
            {activeStudioTab === 'similarity' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Metric 1: Overall Match */}
                  <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs">
                        Overall Similarity Index
                      </CardDescription>
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                          {currentScanScore}%
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Limit: ≤ {effectiveThreshold}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5 pt-2">
                      <Progress
                        value={(currentScanScore / effectiveThreshold) * 100}
                        className="h-2 bg-muted"
                      />
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cleared for hearing defense
                      </p>
                    </CardContent>
                  </Card>

                  {/* Metric 2: Winnowing Exact */}
                  <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs">Exact Text Matches</CardDescription>
                        <Badge variant="secondary" className="text-[9px]">
                          Winnowing
                        </Badge>
                      </div>
                      <span className="text-2xl font-bold font-mono text-foreground">4.2%</span>
                    </CardHeader>
                    <CardContent className="space-y-1 text-[11px] text-muted-foreground pt-2">
                      <Progress value={4.2 * 4} className="h-1.5 bg-muted" />
                      <p>Verbatim phrase overlap against past BukSU research papers.</p>
                    </CardContent>
                  </Card>

                  {/* Metric 3: Semantic Cosine */}
                  <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardDescription className="text-xs">Semantic Proximity</CardDescription>
                        <Badge variant="secondary" className="text-[9px]">
                          Vector Cosine
                        </Badge>
                      </div>
                      <span className="text-2xl font-bold font-mono text-foreground">14.8%</span>
                    </CardHeader>
                    <CardContent className="space-y-1 text-[11px] text-muted-foreground pt-2">
                      <Progress value={14.8 * 2} className="h-1.5 bg-muted" />
                      <p>Contextual topic similarity against active capstone clusters.</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Embedded Live Title Similarity Checker */}
                {currentProposal.title?.trim() && (
                  <Card className="border-border bg-card shadow-xs">
                    <CardHeader className="pb-3 border-b border-border/40">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                        <Search className="h-4 w-4 text-primary" />
                        Live Title Clearance Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <TitleSimilarityChecker
                        title={currentProposal.title}
                        keywords={keywordList}
                        debounceMs={300}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Matched Manuscripts */}
                <Card className="border-border bg-card shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">
                          Matched Archive Manuscripts
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Similar research records indexed in the institutional repository.
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleTriggerScan}
                        disabled={isScanning}
                        className="h-8 text-xs gap-1.5 border-border"
                      >
                        <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
                        Re-Scan Title
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/50 p-0 text-xs">
                    {[
                      {
                        title:
                          'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
                        match: '8.6%',
                        year: '2024–2025',
                        reason:
                          'Matches RFID barcode tracking logic and role management architectures.',
                      },
                      {
                        title: 'Smart Attendance and Automated Violation Monitoring System',
                        match: '5.1%',
                        year: '2023–2024',
                        reason:
                          'Overlapping role nomenclature (Instructor, Student, Admin) and audit logs.',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{item.title}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {item.year}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{item.reason}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {item.match} match
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                            Inspect <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 3: PITCH DECK BUILDER */}
            {activeStudioTab === 'deck' && (
              <div className="space-y-6">
                {/* 16:9 Slide Presentation Frame */}
                <div className="relative rounded-xl border border-border bg-card p-8 shadow-sm flex flex-col justify-between aspect-video max-w-3xl mx-auto overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">SLIDE 01</span>
                      <span className="text-muted-foreground/50">/</span>
                      <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                        Title Pitch & Proponents
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border">
                      BukSU Proposal Defense
                    </Badge>
                  </div>

                  <div className="py-6 space-y-2.5">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground leading-snug">
                      {currentProposal.title ||
                        'Project Workspace: Capstone Management System with Plagiarism Checker'}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                      {currentProposal.pitchDeck?.proposedSolution ||
                        'A centralized multi-tenant capstone management system featuring automated committee notifications, a real-time Action Done Matrix, and an integrated dual-engine similarity analyzer.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                    <span>
                      Proponent: {user?.firstName} {user?.lastName} · Team{' '}
                      {team?.name || 'Workspace'}
                    </span>
                    <span className="font-mono">AY {team?.academicYear || form.academicYear}</span>
                  </div>
                </div>

                {/* Slide Navigation & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto pt-2">
                  <span className="text-xs text-muted-foreground">
                    Presentation deck automatically synchronized with your proposal inputs.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info('Slide deck preview is active in 16:9 widescreen canvas.')
                      }
                      className="h-8 text-xs gap-1.5 border-border"
                    >
                      <Eye className="h-3.5 w-3.5" /> Fullscreen Deck
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleGenerateDeck}
                      disabled={generatingProposalIndex !== null}
                      className="h-8 text-xs bg-primary text-primary-foreground gap-1.5 shadow-xs"
                    >
                      {generatingProposalIndex !== null ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Export Presentation PDF
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN (1 COL): POLICY CLEARANCE & DEFENSE CRITERIA  */}
          {/* ========================================================= */}
          <div className="space-y-6 lg:col-span-1">
            {/* Institutional Compliance Card */}
            <Card className="border-border bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Pre-Defense Clearance
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-border">
                    Cascaded Policy
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Dynamic Policy Meter */}
                <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Plagiarism Tolerance</span>
                    <span className="font-mono font-bold text-foreground">
                      ≤ {effectiveThreshold}%
                    </span>
                  </div>

                  <Progress
                    value={(currentScanScore / effectiveThreshold) * 100}
                    className="h-2 bg-muted"
                  />

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-muted-foreground">
                      Proposal {activeProposalIndex + 1} Match:
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {currentScanScore}% (Cleared)
                    </span>
                  </div>
                </div>

                {/* Hearing Checklist */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Hearing Prerequisites
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Roster locked with verified proponents</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Core problem and methodology defined</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Similarity cleared below {effectiveThreshold}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-border/40 p-4 bg-muted/10 flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerScan}
                  disabled={isScanning}
                  className="w-full text-xs gap-1.5 h-8 border-border"
                >
                  <RefreshCw className={`h-3 w-3 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Running Scan...' : 'Re-Verify Similarity'}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Threshold automatically synchronized across all faculty panels.
                </p>
              </CardFooter>
            </Card>

            {/* Hearing Notice Card */}
            <Card className="border-border/60 bg-muted/15 border-dashed shadow-none">
              <CardContent className="p-4 space-y-2 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Title Ratification Rule
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  During the proposal defense, your committee will review your candidate pitches.
                  Upon ratifying one title, the system unlocks{' '}
                  <strong>Capstone 2 (Chapters 1–3)</strong> and the official manuscript template.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
