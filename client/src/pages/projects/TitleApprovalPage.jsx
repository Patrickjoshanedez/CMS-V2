import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Download,
  Presentation,
  ShieldCheck,
  Globe,
  Tag,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Layers,
  Users,
  Award,
  RefreshCw,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { useMyProject } from '@/hooks/useProjects';
import { useMyTeam } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/authStore';
import PageSkeleton from '@/components/ui/PageSkeleton';
import EmptyProjectState from '@/components/projects/EmptyProjectState';
import { TITLE_STATUSES } from '@cms/shared';
import { exportProposalDeckPptx } from '@/utils/exportPptx';
import ProposalSlideCanvas from '@/components/projects/ProposalSlideCanvas';
import ProposalRehearsalModal from '@/components/projects/ProposalRehearsalModal';
import { usePresentationEditorStore } from '@/stores/presentationEditorStore';
import { projectService } from '@/services/authService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PITCH_DECK_FIELDS = [
  {
    key: 'problemStatement',
    label: 'Problem Statement & Literature Gap',
    icon: AlertTriangle,
    accent: 'border-l-4 border-amber-500/80',
    color: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'proposedSolution',
    label: 'Proposed Solution & Technical Framework',
    icon: Sparkles,
    accent: 'border-l-4 border-primary',
    color: 'text-primary',
  },
  {
    key: 'uniqueContribution',
    label: 'Unique Technical Innovation',
    icon: ShieldCheck,
    accent: 'border-l-4 border-blue-500/80',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'targetUsers',
    label: 'Target Users / Beneficiaries',
    icon: Layers,
    accent: 'border-l-4 border-emerald-500/80',
    color: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'expectedImpact',
    label: 'Expected Value / Impact',
    icon: CheckCircle2,
    accent: 'border-l-4 border-indigo-500/80',
    color: 'text-indigo-600 dark:text-indigo-400',
  },
];

function parsePitchDeckFromDescription(description = '') {
  const result = {
    problemStatement: '',
    proposedSolution: '',
    uniqueContribution: '',
    targetUsers: '',
    expectedImpact: '',
  };

  const text = String(description || '').trim();
  if (!text) return result;

  // Supports both camelCase (e.g., problemStatement: ...) and formatted label (e.g., Problem Statement: ...)
  const patterns = [
    {
      key: 'problemStatement',
      regex:
        /(?:problemStatement|problem\s*statement(?:\s*&\s*literature\s*gap)?)\s*:\s*([\s\S]*?)(?=(?:proposedSolution|proposed\s*solution|uniqueContribution|unique\s*technical|targetUsers|target\s*users|expectedImpact|expected\s*value|$))/i,
    },
    {
      key: 'proposedSolution',
      regex:
        /(?:proposedSolution|proposed\s*solution(?:\s*&\s*technical\s*framework)?)\s*:\s*([\s\S]*?)(?=(?:uniqueContribution|unique\s*technical|targetUsers|target\s*users|expectedImpact|expected\s*value|$))/i,
    },
    {
      key: 'uniqueContribution',
      regex:
        /(?:uniqueContribution|unique\s*(?:technical\s*)?innovation|unique\s*contribution)\s*:\s*([\s\S]*?)(?=(?:targetUsers|target\s*users|expectedImpact|expected\s*value|$))/i,
    },
    {
      key: 'targetUsers',
      regex:
        /(?:targetUsers|target\s*users(?:\s*\/\s*beneficiaries)?)\s*:\s*([\s\S]*?)(?=(?:expectedImpact|expected\s*value|$))/i,
    },
    {
      key: 'expectedImpact',
      regex: /(?:expectedImpact|expected\s*(?:value|impact))\s*:\s*([\s\S]*?)$/i,
    },
  ];

  let matchedAny = false;
  for (const { key, regex } of patterns) {
    const match = text.match(regex);
    if (match?.[1]) {
      result[key] = match[1].trim();
      matchedAny = true;
    }
  }

  // Fallback: If formatted keys weren't used, store the entire description in problemStatement
  if (!matchedAny && text.length > 0) {
    result.problemStatement = text;
  }

  return result;
}

export default function TitleApprovalPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: project, isLoading, error } = useMyProject();
  const { data: team, isLoading: isTeamLoading } = useMyTeam(user?._id);

  // Expanded proposal details tracker — default proposal 0 to expanded
  const [expandedProposals, setExpandedProposals] = useState({ 0: true });
  const [activeSlideIndex, setActiveSlideIndex] = useState({});
  const [fullscreenProposalIndex, setFullscreenProposalIndex] = useState(null);
  const [exportingPptxIndex, setExportingPptxIndex] = useState(null);
  const [exportingPdfIndex, setExportingPdfIndex] = useState(null);

  // Persistent presentation edits from rehearsal editor
  const allDeckEdits = usePresentationEditorStore((s) => s.deckEdits);

  const toggleProposalExpansion = (index) => {
    setExpandedProposals((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const normalizedProposals = useMemo(() => {
    if (!project) return [];
    const titles = Array.isArray(project.titleProposals) ? project.titleProposals : [];
    const metadataList = Array.isArray(project.titleProposalMetadata)
      ? project.titleProposalMetadata
      : [];

    return titles.map((rawProposal, index) => {
      const titleStr =
        typeof rawProposal === 'string'
          ? rawProposal
          : rawProposal?.title || `Proposal ${index + 1}`;
      const meta = metadataList.find((m) => m.title === titleStr) || metadataList[index] || {};

      const description =
        meta.description || (typeof rawProposal === 'object' ? rawProposal.description : '') || '';
      const pitchDeck = meta.pitchDeck || parsePitchDeckFromDescription(description);

      const disciplines =
        meta.capstoneType ||
        (Array.isArray(rawProposal?.capstoneType)
          ? rawProposal.capstoneType
          : ['Software Engineering & Web Applications']);
      const sdgs =
        meta.sdgTags ||
        (Array.isArray(rawProposal?.sdgTags) ? rawProposal.sdgTags : ['SDG 4: Quality Education']);

      return {
        index,
        title: titleStr,
        description,
        pitchDeck,
        disciplines,
        sdgs,
        isApproved: project.titleStatus === TITLE_STATUSES.APPROVED && project.title === titleStr,
      };
    });
  }, [project]);

  const proposalCommentsMap = useMemo(() => {
    const map = {};
    if (!project?.titleProposalComments) return map;

    for (const thread of project.titleProposalComments) {
      const idx = thread.proposalIndex;
      if (idx !== undefined && Array.isArray(thread.comments)) {
        map[idx] = thread.comments;
      }
    }
    return map;
  }, [project]);

  const cleanTeamName = useMemo(() => {
    if (!team?.name) return 'Team Workspace';
    const trimmed = team.name.trim();
    return trimmed.toLowerCase().startsWith('team') ? trimmed : `Team ${trimmed}`;
  }, [team]);

  const resolvedSectionName = useMemo(() => {
    if (project?.sectionId?.name) return `Section ${project.sectionId.name}`;
    if (team?.sectionId?.name) return `Section ${team.sectionId.name}`;
    return 'BSIT Senior Section';
  }, [project, team]);

  // Export PowerPoint presentation
  const handleExportPptx = async (proposalItem) => {
    setExportingPptxIndex(proposalItem.index);
    try {
      const filename = await exportProposalDeckPptx({
        title: proposalItem.title,
        deckData: proposalItem.pitchDeck,
        team,
        user,
        academicYear: project?.academicYear || team?.academicYear || '2024-2025',
        capstoneType: proposalItem.disciplines,
        sdgTags: proposalItem.sdgs,
        teamMembers: team?.members || [],
      });
      toast.success('Pitch deck presentation (.pptx) exported.', {
        description: `Downloaded ${filename}`,
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to export PowerPoint presentation.');
    } finally {
      setExportingPptxIndex(null);
    }
  };

  // Export PDF deck
  const handleExportPdf = async (proposalItem) => {
    setExportingPdfIndex(proposalItem.index);
    try {
      const response = await projectService.generateProposalDeck({
        projectId: project?._id || 'draft',
        proposalId: `proposal-${proposalItem.index}`,
        title: proposalItem.title,
        deckData: proposalItem.pitchDeck,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${proposalItem.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_PitchDeck.pdf`;
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
        link.remove();
      }, 1000);

      toast.success('Pitch deck presentation PDF exported.');
    } catch (err) {
      toast.error(err?.message || 'Failed to generate presentation PDF.');
    } finally {
      setExportingPdfIndex(null);
    }
  };

  const renderSlides = (proposalItem) => {
    const pitch = proposalItem.pitchDeck || {};
    return [
      {
        id: 1,
        numberStr: '01',
        category: 'Title Pitch & Proponents',
        tag: 'BukSU Proposal Defense',
        title: proposalItem.title,
        subtitle: pitch.subtitle || '',
        type: 'cover',
      },
      {
        id: 2,
        numberStr: '02',
        category: 'Problem Statement & Literature Gap',
        tag: 'Problem & Context',
        title: 'Problem Statement',
        content:
          pitch.problemStatement ||
          'Current manual processes lack real-time visibility, automated validation, and institutional tracking, creating operational friction and compliance risks.',
        type: 'statement',
        icon: AlertTriangle,
        accent: 'border-l-4 border-amber-500/80',
      },
      {
        id: 3,
        numberStr: '03',
        category: 'Proposed Solution & Technical Framework',
        tag: 'Technical Framework',
        title: 'Proposed Solution',
        content:
          pitch.proposedSolution ||
          'An end-to-end automated platform integrating role-based workflows, automated similarity checks, and verifiable multi-signatory digital approvals.',
        type: 'solution',
        icon: Sparkles,
        accent: 'border-l-4 border-primary',
      },
      {
        id: 4,
        numberStr: '04',
        category: 'Unique Technical Innovation',
        tag: 'Novelty & IP',
        title: 'Unique Technical Contribution',
        content:
          pitch.uniqueContribution ||
          'Innovative dual-engine similarity detection with localized historical archiving and automated rubric-driven milestone clearance.',
        type: 'innovation',
        icon: ShieldCheck,
        accent: 'border-l-4 border-blue-500/80',
      },
      {
        id: 5,
        numberStr: '05',
        category: 'Target Users & Stakeholders',
        tag: 'Stakeholders',
        title: 'Target Users & Beneficiaries',
        content:
          pitch.targetUsers ||
          'BukSU Capstone Proponents, Faculty Advisers, Panel Reviewers, Department Secretaries, and College Leadership.',
        type: 'users',
        icon: Layers,
        accent: 'border-l-4 border-emerald-500/80',
      },
      {
        id: 6,
        numberStr: '06',
        category: 'Expected Value & Operational Impact',
        tag: 'Impact & ROI',
        title: 'Expected Institutional Impact',
        content:
          pitch.expectedImpact ||
          'Reduces defense turnaround times by 65%, eliminates document loss, and enforces 100% compliance with BukSU IT capstone manual standards.',
        type: 'impact',
        icon: CheckCircle2,
        accent: 'border-l-4 border-indigo-500/80',
      },
      {
        id: 7,
        numberStr: '07',
        category: 'Discipline & UN SDG Alignment',
        tag: 'Institutional Alignment',
        title: 'Field of Discipline & UN SDG Alignment',
        disciplines: proposalItem.disciplines,
        sdgs: proposalItem.sdgs,
        type: 'alignment',
      },
      {
        id: 8,
        numberStr: '08',
        category: 'Committee Discussion',
        tag: 'Committee Discussion',
        title: 'Committee Discussion & Recommendations',
        content:
          'Thank you to the Panel of Examiners. Open for defense recommendations, rubric inquiries, and committee revisions.',
        type: 'qa',
      },
    ];
  };

  if (isLoading || isTeamLoading) {
    return (
      <DashboardLayout>
        <PageSkeleton />
      </DashboardLayout>
    );
  }

  if (!project || error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Capstone Title Proposals & Approval
            </h1>
            <p className="text-xs text-muted-foreground">
              BukSU College of Technologies · Phase 1 Title Defense
            </p>
          </div>
          <EmptyProjectState team={team} />
        </div>
      </DashboardLayout>
    );
  }

  const isApproved = project.titleStatus === TITLE_STATUSES.APPROVED;
  const isSubmitted = project.titleStatus === TITLE_STATUSES.SUBMITTED;
  const defenseStage = isApproved ? 4 : isSubmitted ? 3 : normalizedProposals.length > 0 ? 2 : 1;
  const defenseProgressPercent = isApproved
    ? 100
    : isSubmitted
      ? 75
      : normalizedProposals.length > 0
        ? 50
        : 25;
  const currentStageLabel = isApproved
    ? 'Stage 4: Title Approval (Approved)'
    : isSubmitted
      ? 'Stage 3: Committee Defense (Deliberation)'
      : normalizedProposals.length > 0
        ? 'Stage 2: Similarity Pre-Scan'
        : 'Stage 1: Proposals Submitted';

  const defenseSteps = [
    {
      id: 1,
      name: '1. Proposals Submitted',
      description: `${normalizedProposals.length} candidate proposal${normalizedProposals.length === 1 ? '' : 's'} logged`,
      icon: CheckCircle2,
      status: 'completed',
    },
    {
      id: 2,
      name: '2. Similarity Pre-Scan',
      description: 'Archive cross-check passed',
      icon: ShieldCheck,
      status: defenseStage >= 2 ? 'completed' : 'pending',
    },
    {
      id: 3,
      name: '3. Committee Defense',
      description: isApproved
        ? 'Defense hearing approved'
        : isSubmitted
          ? 'Deliberation in progress'
          : 'Awaiting hearing schedule',
      icon: Clock,
      status: isApproved ? 'completed' : isSubmitted ? 'current' : 'pending',
    },
    {
      id: 4,
      name: '4. Title Approval',
      description: isApproved ? 'Officially endorsed' : 'Pending committee sign-off',
      icon: isApproved ? Award : Lock,
      status: isApproved ? 'completed' : 'pending',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto min-w-0">
        {/* 1. Header Ribbon */}
        <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-primary/5 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  Capstone 1: Title Proposal & Approval Studio
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-foreground/80">{cleanTeamName}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{resolvedSectionName}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">AY {project.academicYear}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Capstone Title Proposals & Committee Approval
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                Review and reveal all candidate research titles proposed by your team. Track live
                faculty committee defense deliberations, rubric reviews, and official institutional
                clearance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/project?view=overview')}
                className="gap-2 text-xs border-border/80 hover:bg-muted"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to My Capstone
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/project/create?edit=true&projectId=${project?._id || ''}`, {
                    state: { edit: true, projectId: project?._id, project },
                  })
                }
                className="gap-2 text-xs border-border/80"
              >
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                Update Proposals
              </Button>
              {isApproved && (
                <Button
                  onClick={() => navigate('/project?tab=capstone_2')}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Award className="h-4 w-4" />
                  Proceed to Capstone 2 Workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Capstone 1 Title Defense Progression Stepper & Connected Progress Bar */}
        <Card className="rounded-2xl border-border/70 shadow-xs overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Stepper Header Bar: Title, Subtitle, and Progress Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse shrink-0" />
                  <h3 className="text-base font-bold tracking-tight text-foreground">
                    Title Defense & Approval Pipeline
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Live candidate title submission, similarity pre-scan, defense hearing & committee
                  clearance
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {currentStageLabel}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-2.5 py-1 text-xs font-semibold text-foreground">
                  {defenseProgressPercent}% Completed
                </span>
              </div>
            </div>

            {/* Continuous Connected Progress Track Bar */}
            <div className="space-y-2">
              <div className="relative h-2.5 w-full rounded-full bg-muted/80 overflow-hidden border border-border/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-blue-600 transition-all duration-500"
                  style={{ width: `${defenseProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-xs font-medium text-muted-foreground px-1">
                <span className={defenseStage >= 1 ? 'text-foreground font-semibold' : ''}>
                  1. Proposals
                </span>
                <span className={defenseStage >= 2 ? 'text-foreground font-semibold' : ''}>
                  2. Pre-Scan
                </span>
                <span className={defenseStage >= 3 ? 'text-foreground font-semibold' : ''}>
                  3. Defense Hearing
                </span>
                <span className={defenseStage >= 4 ? 'text-foreground font-semibold' : ''}>
                  4. Institutional Approval
                </span>
              </div>
            </div>

            {/* 4 Connected Milestone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {defenseSteps.map((step) => {
                const Icon = step.icon;
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                const isPending = step.status === 'pending';

                return (
                  <div
                    key={step.id}
                    className={cn(
                      'relative flex flex-col justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all',
                      isCompleted &&
                        'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20',
                      isCurrent &&
                        'border-primary/50 bg-primary/5 dark:bg-primary/10 ring-2 ring-primary/20 shadow-xs',
                      isPending && 'border-border/60 bg-card/50 text-muted-foreground',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all',
                          isCompleted && 'bg-emerald-500 text-white shadow-xs',
                          isCurrent && 'bg-primary text-primary-foreground shadow-xs animate-pulse',
                          isPending && 'bg-muted text-muted-foreground border border-border/60',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          isCompleted &&
                            'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                          isCurrent && 'border-primary/40 text-primary bg-primary/10',
                          isPending && 'border-border/60 text-muted-foreground bg-muted/40',
                        )}
                      >
                        {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                      </Badge>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p
                        className={cn(
                          'text-xs sm:text-sm font-semibold truncate',
                          isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground',
                        )}
                        title={step.name}
                      >
                        {step.name}
                      </p>
                      <p
                        className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2"
                        title={step.description}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 3. Approved Banner Notice */}
        {isApproved && (
          <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1 ml-2">
              <p className="font-semibold text-sm">
                Congratulations! Title Proposal Officially Endorsed & Approved
              </p>
              <p className="text-xs text-muted-foreground">
                The Capstone Committee has approved your research title:{' '}
                <span className="font-semibold text-foreground">&ldquo;{project.title}&rdquo;</span>
                . You may now proceed to Capstone 2 (Chapters 1–3 Manuscript Development).
              </p>
            </div>
          </Alert>
        )}

        {/* 4. Appointed Defense Committee & Institutional Roster */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Appointed Defense Committee & Institutional Roster
            </CardTitle>
            <CardDescription className="text-xs">
              Committee panel authorized to conduct the proposal hearing, grade defense rubrics, and
              approve capstone titles.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-primary">
                  Faculty Adviser
                </span>
                <p className="font-semibold text-foreground truncate">
                  {project.adviserId
                    ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                    : 'Pending Assignment'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {project.adviserId?.email || 'Awaiting endorsement'}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">
                  Defense Panel Chair
                </span>
                <p className="font-semibold text-foreground truncate">
                  {project.panelistIds?.[0]
                    ? `${project.panelistIds[0].firstName} ${project.panelistIds[0].lastName}`
                    : 'Pending Assignment'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {project.panelistIds?.[0]?.email || 'Panelist 1 (Chair)'}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                  Committee Secretary
                </span>
                <p className="font-semibold text-foreground truncate">
                  {team?.secretaryId
                    ? `${team.secretaryId.firstName} ${team.secretaryId.lastName}`
                    : 'Department Appointed'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Defense minutes & records
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                  Defense Panel Members
                </span>
                <p className="font-semibold text-foreground truncate">
                  {project.panelistIds?.length >= 2
                    ? `${project.panelistIds.length} Panelists Appointed`
                    : 'Pending Appointment'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">Members 2 & 3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Candidate Title Proposals Showcase ("Reveal All Capstone Titles") */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Presentation className="h-5 w-5 text-primary" />
                Candidate Capstone Titles Proposed by Team ({normalizedProposals.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Expand each proposal card to reveal the complete technical blueprint, pitch deck
                slides, and committee comments.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const allExpanded = normalizedProposals.every((p) => expandedProposals[p.index]);
                const next = {};
                normalizedProposals.forEach((p) => {
                  next[p.index] = !allExpanded;
                });
                setExpandedProposals(next);
              }}
              className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
            >
              {normalizedProposals.every((p) => expandedProposals[p.index]) ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Collapse All
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" /> Reveal All Proposals
                </>
              )}
            </Button>
          </div>

          <div className="space-y-5">
            {normalizedProposals.map((prop) => {
              const isExpanded = Boolean(expandedProposals[prop.index]);
              const comments = proposalCommentsMap[prop.index] || [];
              const slides = renderSlides(prop);
              const slideIdx = activeSlideIndex[prop.index] || 0;
              const currentSlide = slides[slideIdx] || slides[0];
              const deckId = `proposal_deck_${prop.index}_${(prop.title || '')
                .slice(0, 25)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')}`;
              const deckEdits = allDeckEdits[deckId] || {};
              const slideEdits = deckEdits[currentSlide.id || slideIdx + 1] || {};
              const effectiveSlide = {
                ...currentSlide,
                title: slideEdits.title !== undefined ? slideEdits.title : currentSlide.title,
                subtitle:
                  slideEdits.subtitle !== undefined ? slideEdits.subtitle : currentSlide.subtitle,
                content:
                  slideEdits.content !== undefined ? slideEdits.content : currentSlide.content,
                fontSize: slideEdits.fontSize || 100,
              };

              return (
                <Card
                  key={`proposal-card-${prop.index}`}
                  className={cn(
                    'rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs',
                    prop.isApproved
                      ? 'border-emerald-500/80 dark:border-emerald-500/60 bg-emerald-500/[0.02]'
                      : 'border-border/70 bg-card hover:border-border',
                  )}
                >
                  <div className="p-5 sm:p-6 space-y-4">
                    {/* Top Status & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                            Proposal {prop.index + 1} {prop.index === 0 ? '(Primary Choice)' : ''}
                          </span>
                          {prop.isApproved ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
                              <Award className="h-3 w-3" /> Officially Approved Title
                            </Badge>
                          ) : isSubmitted ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                            >
                              Under Committee Review
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Candidate Proposal
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] gap-1 bg-muted/30">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            Originality Verified (&lt;15% Similarity)
                          </Badge>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug tracking-tight">
                          {prop.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleProposalExpansion(prop.index)}
                          className="h-8 text-xs gap-1.5 border-border/80"
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 text-primary" />
                              Reveal Details
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Metadata Badges: Disciplines & SDGs */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {prop.disciplines.map((d, i) => (
                          <span
                            key={i}
                            className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/40"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                      <span className="text-muted-foreground text-xs hidden sm:inline">·</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        {prop.sdgs.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* REVEALED SECTION */}
                    {isExpanded && (
                      <div className="pt-4 space-y-6 border-t border-border/60 animate-in fade-in-50 duration-200">
                        {/* 5-Field Pitch Blueprint */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Proposal Architecture & Blueprint
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PITCH_DECK_FIELDS.map((field) => {
                              const content = prop.pitchDeck[field.key];
                              const Icon = field.icon;
                              return (
                                <div
                                  key={field.key}
                                  className={cn(
                                    'rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-1.5 text-xs',
                                    field.accent,
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                    <Icon className={cn('h-3.5 w-3.5', field.color)} />
                                    <span>{field.label}</span>
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {content ||
                                      'Specification details submitted for oral proposal defense.'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Interactive Pitch Deck Slide Rehearsal Carousel */}
                        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Presentation className="h-4 w-4 text-primary" />
                              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                                Proposal Defense Slide Deck Rehearsal (16:9)
                              </h4>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPptx(prop)}
                                disabled={exportingPptxIndex === prop.index}
                                className="h-7 text-[11px] gap-1 border-border/70"
                              >
                                <Download className="h-3 w-3" />
                                {exportingPptxIndex === prop.index
                                  ? 'Exporting...'
                                  : 'Export .pptx'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPdf(prop)}
                                disabled={exportingPdfIndex === prop.index}
                                className="h-7 text-[11px] gap-1 border-border/70"
                              >
                                <Download className="h-3 w-3" />
                                {exportingPdfIndex === prop.index ? 'Exporting...' : 'Export PDF'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFullscreenProposalIndex(prop.index)}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Fullscreen Preview"
                              >
                                <Maximize2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Slide Canvas */}
                          <div className="w-full aspect-video rounded-xl shadow-md overflow-hidden">
                            <ProposalSlideCanvas
                              slide={effectiveSlide}
                              teamName={team?.name}
                              academicYear={`AY ${team?.academicYear || '2024–2025'}`}
                            />
                          </div>

                          {/* Slide Navigation Bar */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={slideIdx === 0}
                              onClick={() =>
                                setActiveSlideIndex((prev) => ({
                                  ...prev,
                                  [prop.index]: Math.max(0, slideIdx - 1),
                                }))
                              }
                              className="h-7 text-xs gap-1"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" /> Previous
                            </Button>

                            <div className="flex items-center gap-1">
                              {slides.map((_, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() =>
                                    setActiveSlideIndex((prev) => ({
                                      ...prev,
                                      [prop.index]: sIdx,
                                    }))
                                  }
                                  className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    sIdx === slideIdx
                                      ? 'w-4 bg-primary'
                                      : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                                  )}
                                  title={`Slide ${sIdx + 1}`}
                                />
                              ))}
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={slideIdx === slides.length - 1}
                              onClick={() =>
                                setActiveSlideIndex((prev) => ({
                                  ...prev,
                                  [prop.index]: Math.min(slides.length - 1, slideIdx + 1),
                                }))
                              }
                              className="h-7 text-xs gap-1"
                            >
                              Next <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Committee Deliberation Comments */}
                        {comments.length > 0 && (
                          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              Committee Deliberation & Panel Comments ({comments.length})
                            </div>
                            <div className="space-y-2">
                              {comments.map((comment, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="rounded-lg border border-border/60 bg-card p-3 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      {comment.name || 'Committee Examiner'}
                                    </span>
                                    <span>
                                      {new Date(
                                        comment.createdAt || Date.now(),
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {comment.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 6. Fullscreen Modal for Rehearsal Deck (Portaled to document.body for true fullscreen) */}
        {fullscreenProposalIndex !== null &&
          normalizedProposals[fullscreenProposalIndex] &&
          (() => {
            const prop = normalizedProposals[fullscreenProposalIndex];
            const slides = renderSlides(prop);
            const activeIdx = activeSlideIndex[fullscreenProposalIndex] || 0;
            return (
              <ProposalRehearsalModal
                isOpen={true}
                onClose={() => setFullscreenProposalIndex(null)}
                deckId={`proposal_deck_${prop.index}_${(prop.title || '')
                  .slice(0, 25)
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, '_')}`}
                title={prop.title}
                slides={slides}
                activeSlideIndex={activeIdx}
                onSlideChange={(newIdx) =>
                  setActiveSlideIndex((prev) => ({
                    ...prev,
                    [fullscreenProposalIndex]: newIdx,
                  }))
                }
                teamName={team?.name}
                academicYear={`AY ${team?.academicYear || '2024–2025'}`}
                onExportPptx={() => handleExportPptx(prop)}
                isExportingPptx={exportingPptxIndex === prop.index}
                onExportPdf={() => handleExportPdf(prop)}
                isExportingPdf={exportingPdfIndex === prop.index}
              />
            );
          })()}
      </div>
    </DashboardLayout>
  );
}
