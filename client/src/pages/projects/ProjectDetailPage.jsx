import { useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import TitleStatusBadge from '@/components/projects/TitleStatusBadge';
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge';
import PrototypeGallery from '@/components/projects/PrototypeGallery';
import DeadlineWarning from '@/components/projects/DeadlineWarning';
import EvaluationPanel from '@/components/projects/EvaluationPanel';
import FinalPaperUpload from '@/components/submissions/FinalPaperUpload';
import { submissionService } from '@/services/submissionService';
import {
  useProject,
  useApproveTitle,
  useRejectTitle,
  useAddTitleComment,
  useResolveTitleModification,
  useAssignAdviser,
  useAssignPanelist,
  useRemovePanelist,
  useSetDeadlines,
  useRejectProject,
  useAdvancePhase,
  useArchiveProject,
  useArchiveSearch,
} from '@/hooks/useProjects';
import { useProjectSubmissions } from '@/hooks/useSubmissions';
import { useEntityAuditHistory } from '@/hooks/useAuditLogs';
import { userService } from '@/services/authService';
import { getProjectResolveErrorMessage } from './projectDetailUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useQuery } from '@tanstack/react-query';
import { TITLE_STATUSES, ROLES, CAPSTONE_PHASES, PROJECT_STATUSES } from '@cms/shared';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  UserPlus,
  Trash2,
  ShieldAlert,
  FileText,
  ArrowUpCircle,
  Award,
  Archive,
  ScrollText,
  Clock,
  Bookmark,
  BookmarkCheck,
  Copy,
  Download,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export const ARCHIVE_BOOKMARKS_STORAGE_KEY = 'cms.archive.bookmarks';

export function getFullName(person) {
  if (!person) return null;
  if (typeof person === 'string') return person;

  const parts = [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .map((part) => String(part).trim());

  return parts.length ? parts.join(' ') : person.email || null;
}

export function getProjectAuthors(project) {
  const assignmentAuthors = (project?.memberRoleAssignments || [])
    .map((assignment) => assignment?.userId)
    .map(getFullName)
    .filter(Boolean);

  if (assignmentAuthors.length > 0) return assignmentAuthors;

  const teamName = project?.teamId?.name;
  return teamName ? [teamName] : [];
}

function getProposalTitle(proposal) {
  if (typeof proposal === 'string') return proposal.trim();
  if (typeof proposal?.title === 'string') return proposal.title.trim();
  return '';
}

function normalizeTitleKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getUniqueProjectTitles(project) {
  const proposalTitles = (project?.titleProposals || []).map(getProposalTitle).filter(Boolean);
  const fallbackTitle = typeof project?.title === 'string' ? project.title.trim() : '';

  const titles = fallbackTitle ? [fallbackTitle, ...proposalTitles] : proposalTitles;
  const seen = new Set();

  return titles.filter((title) => {
    const key = normalizeTitleKey(title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getApprovedProjectTitle(project) {
  if (project?.titleStatus !== TITLE_STATUSES.APPROVED) return '';
  return typeof project?.title === 'string' ? project.title.trim() : '';
}

export function formatCitation(project, style, authors) {
  const year = project?.academicYear?.split('-')?.[1] || new Date().getFullYear();
  const title = project?.title || 'Untitled project';
  const adviser = getFullName(project?.adviserId) || 'Adviser unavailable';
  const institution = project?.courseId?.name || 'University repository';
  const authorText = authors.length ? authors.join(', ') : 'Unknown author';

  if (style === 'ieee') {
    return `${authorText}, "${title}," ${institution}, ${year}. Adviser: ${adviser}.`;
  }

  if (style === 'mla') {
    return `${authorText}. "${title}." ${institution}, ${year}. Adviser: ${adviser}.`;
  }

  return `${authorText} (${year}). ${title}. ${institution}. Adviser: ${adviser}.`;
}

export function resolveArchiveBackContext(locationState, locationSearch) {
  const fromArchive =
    Boolean(locationState?.fromArchive) ||
    new URLSearchParams(locationSearch || '').get('from') === 'archive';

  return {
    fromArchive,
    backDestination: locationState?.returnTo || (fromArchive ? '/archive' : '/projects'),
    backLabel: fromArchive ? 'Back to Search Results' : 'Back to Projects',
  };
}

/**
 * ProjectDetailPage — Faculty project detail view.
 *
 * Shows full project information and provides contextual admin actions:
 *   - Approve / Reject title  (when titleStatus is SUBMITTED)
 *   - Resolve modification request (when PENDING_MODIFICATION)
 *   - Assign adviser / panelists (instructor only)
 *   - Set deadlines (instructor / adviser)
 *   - Reject entire project (instructor only)
 */

/* ────────── Sub-components ────────── */

function TitleProposalsSection({ project, userRole }) {
  const canVoteOnTitles =
    userRole === ROLES.INSTRUCTOR || userRole === ROLES.ADVISER || userRole === ROLES.PANELIST;
  const [voteForms, setVoteForms] = useState({});
  const [openProposalKey, setOpenProposalKey] = useState(null);

  const voteOnTitle = useAddTitleComment({
    onSuccess: () => {
      toast.success('Vote and remarks submitted.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit vote.');
    },
  });

  const approveTitle = useApproveTitle({
    onSuccess: () => {
      toast.success('Proposal approved.');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to approve proposal.');
    },
  });

  const setVoteFormField = (proposalIndex, field, value) => {
    setVoteForms((current) => ({
      ...current,
      [proposalIndex]: {
        vote: current[proposalIndex]?.vote || '',
        remarks: current[proposalIndex]?.remarks || '',
        [field]: value,
      },
    }));
  };

  const parseVoteComment = (text) => {
    const normalizedText = typeof text === 'string' ? text : '';
    const voteMatch = normalizedText.match(/^Vote:\s*(Approve|Needs Revision|Reject)/im);
    const remarksMatch = normalizedText.match(/Remarks:\s*([\s\S]*)$/im);

    return {
      vote: voteMatch ? voteMatch[1] : null,
      remarks: remarksMatch ? remarksMatch[1].trim() : '',
    };
  };

  if (!project.titleProposals || project.titleProposals.length === 0) {
    return null;
  }

  const proposalEntries = (project.titleProposals || [])
    .map((proposal, proposalIndex) => {
      const title = getProposalTitle(proposal);
      if (!title) return null;

      return {
        proposal,
        proposalIndex,
        proposalKey: `proposal-${proposalIndex}`,
        title,
        metadata: project.titleProposalMetadata?.find((entry) => entry?.title === title),
      };
    })
    .filter(Boolean);

  if (proposalEntries.length === 0) return null;

  const approvedTitle = getApprovedProjectTitle(project);
  const approvedTitleKey = normalizeTitleKey(approvedTitle);
  const showApprovedOnly = Boolean(approvedTitleKey);

  const visibleProposals = showApprovedOnly
    ? (() => {
        const matched = proposalEntries.filter(
          (entry) => normalizeTitleKey(entry.title) === approvedTitleKey,
        );
        return matched.length > 0 ? matched : proposalEntries.slice(0, 1);
      })()
    : proposalEntries;

  const resolvedOpenProposalKey = openProposalKey ?? visibleProposals[0]?.proposalKey ?? null;
  const canSubmitVotesNow = project.titleStatus === TITLE_STATUSES.SUBMITTED;

  const submitVote = (proposalIndex) => {
    const current = voteForms[proposalIndex] || { vote: '', remarks: '' };
    const vote = current.vote?.trim();
    const remarks = current.remarks?.trim();

    if (!vote || !remarks) {
      toast.error('Please select a vote and add remarks before submitting.');
      return;
    }

    voteOnTitle.mutate({
      projectId: project._id,
      proposalId: String(proposalIndex),
      text: `Vote: ${vote}\nRemarks: ${remarks}`,
    });

    setVoteForms((currentForms) => ({
      ...currentForms,
      [proposalIndex]: { vote: '', remarks: '' },
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {showApprovedOnly ? 'Approved Title' : 'Title Proposals'}
        </CardTitle>
        <CardDescription>
          {showApprovedOnly
            ? 'Proposal has been approved. This view now focuses on the approved title only.'
            : 'Review all submitted title options before final approval or revision decisions.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showApprovedOnly && (
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            Related proposals are hidden after approval so faculty can focus on the selected title.
          </div>
        )}

        {visibleProposals.map(({ proposal, proposalIndex, proposalKey, title, metadata }) => {
          const commentThread = (project.titleProposalComments || []).find(
            (thread) => Number(thread?.proposalIndex) === proposalIndex,
          );
          const voteEntries = (commentThread?.comments || [])
            .map((comment) => ({
              ...comment,
              ...parseVoteComment(comment?.text),
            }))
            .filter((entry) => Boolean(entry.vote));
          const currentVoteForm = voteForms[proposalIndex] || { vote: '', remarks: '' };
          const canApproveProposal = userRole === ROLES.INSTRUCTOR;
          const canApproveNow = project.titleStatus === TITLE_STATUSES.SUBMITTED;
          const isOpen = resolvedOpenProposalKey === proposalKey;

          return (
            <div key={proposal?._id || proposalKey} className="rounded-md border">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                onClick={() => setOpenProposalKey(isOpen ? null : proposalKey)}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Proposal {proposalIndex + 1}
                  </p>
                  <p className="text-sm font-medium">{title || 'Untitled proposal'}</p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="space-y-2 border-t p-3">
                  {metadata?.description ? (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {metadata.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {metadata?.capstoneType ? (
                      <Badge variant="secondary">
                        {Array.isArray(metadata.capstoneType)
                          ? metadata.capstoneType.join(', ')
                          : metadata.capstoneType}
                      </Badge>
                    ) : null}
                    {metadata?.sdgTags?.map((tag, tagIdx) => (
                      <Badge key={`${title}-sdg-${tagIdx}`} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {voteEntries.length > 0 && (
                    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Votes & Remarks
                      </p>
                      {voteEntries.map((entry, voteIndex) => (
                        <div
                          key={`${proposalIndex}-vote-${voteIndex}`}
                          className="space-y-1 rounded-md border bg-background p-2"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {entry.name || 'Reviewer'}
                            </span>
                            <Badge variant="outline">{entry.vote}</Badge>
                            {entry.createdAt ? (
                              <span>{new Date(entry.createdAt).toLocaleString()}</span>
                            ) : null}
                          </div>
                          {entry.remarks ? (
                            <p className="text-sm text-muted-foreground">{entry.remarks}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}

                  {canVoteOnTitles && (
                    <div className="space-y-3 rounded-md border bg-background/80 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Cast Vote
                      </p>

                      <div className="space-y-1">
                        <Label>Vote</Label>
                        <div className="flex flex-wrap gap-2">
                          {canApproveProposal && (
                            <Button
                              type="button"
                              variant="secondary"
                              className="border border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200"
                              disabled={approveTitle.isPending || !canApproveNow}
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Approve Proposal ${proposalIndex + 1}? This will set this proposal as the approved project title.`,
                                );
                                if (!confirmed) return;
                                approveTitle.mutate({
                                  projectId: project._id,
                                  proposalId: proposalIndex,
                                });
                              }}
                            >
                              {approveTitle.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Approve Proposal
                            </Button>
                          )}
                          <Button
                            type="button"
                            className="border border-orange-300 bg-orange-200 text-orange-950 hover:bg-orange-300"
                            disabled={!canSubmitVotesNow}
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Set Proposal ${proposalIndex + 1} vote to Approve With Revision?`,
                              );
                              if (!confirmed) return;
                              setVoteFormField(proposalIndex, 'vote', 'Needs Revision');
                            }}
                          >
                            Approve With Revision
                          </Button>
                          <Button
                            type="button"
                            className="border border-rose-300 bg-rose-200 text-rose-950 hover:bg-rose-300"
                            disabled={!canSubmitVotesNow}
                            onClick={() => {
                              const confirmed = window.confirm(
                                `Set Proposal ${proposalIndex + 1} vote to Reject Proposal?`,
                              );
                              if (!confirmed) return;
                              setVoteFormField(proposalIndex, 'vote', 'Reject');
                            }}
                          >
                            Reject Proposal
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`proposal-remarks-${proposalIndex}`}>Remarks</Label>
                        <Textarea
                          id={`proposal-remarks-${proposalIndex}`}
                          value={currentVoteForm.remarks}
                          onChange={(event) =>
                            setVoteFormField(proposalIndex, 'remarks', event.target.value)
                          }
                          placeholder="Add your decision notes for this title proposal"
                          className="min-h-24"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          disabled={voteOnTitle.isPending || !canSubmitVotesNow}
                          onClick={() => submitVote(proposalIndex)}
                        >
                          {voteOnTitle.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Submit Remarks
                        </Button>
                      </div>

                      {!canSubmitVotesNow ? (
                        <p className="text-xs text-muted-foreground">
                          Voting is available only while title status is Submitted.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Reusable project info panel — title, badges, abstract, keywords, meta.
 */
function ProjectInfoPanel({ project, isPeer, authors, onKeywordClick }) {
  const phaseNumber = Number(project.capstonePhase);
  const phaseLabel =
    phaseNumber === CAPSTONE_PHASES.PHASE_1
      ? 'Proposal'
      : phaseNumber
        ? `Capstone ${phaseNumber}`
        : '—';

  const allProjectTitles = getUniqueProjectTitles(project);
  const approvedProjectTitle = getApprovedProjectTitle(project);
  const focusApprovedTitle = Boolean(approvedProjectTitle);

  const primaryTitle =
    (focusApprovedTitle ? approvedProjectTitle : allProjectTitles[0]) || 'Untitled project';
  const secondaryTitles = focusApprovedTitle
    ? []
    : allProjectTitles.filter(
        (title) => normalizeTitleKey(title) !== normalizeTitleKey(primaryTitle),
      );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight">{primaryTitle}</CardTitle>
            <CardDescription>
              {project.academicYear || '—'} · {phaseLabel}
            </CardDescription>
            {secondaryTitles.length > 0 ? (
              <div className="pt-1 space-y-1">
                {secondaryTitles.map((title, index) => (
                  <p
                    key={`${title}-${index}`}
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    {title}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <TitleStatusBadge status={project.titleStatus} />
            <ProjectStatusBadge status={project.projectStatus} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Abstract */}
        {project.abstract && (
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Overview</p>
            <p className="text-sm leading-relaxed">{project.abstract}</p>
          </div>
        )}

        {/* Keywords */}
        {project.keywords?.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Keywords / Tech Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {project.keywords.map((kw, i) => (
                <button key={`${kw}-${i}`} type="button" onClick={() => onKeywordClick?.(kw)}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
                    {kw}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project details */}
        <div className="space-y-4 border-t pt-4">
          <section className="rounded-md border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              People
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-start gap-2 text-sm">
                <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Authors:</span>
                <span className="font-medium">
                  {authors.length ? authors.join(', ') : 'Not available'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-medium">{project.teamId?.name || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Adviser:</span>
                  <span className="font-medium">
                    {project.adviserId?.firstName
                      ? `${project.adviserId.firstName} ${project.adviserId.lastName}`
                      : 'Not assigned'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Panelists:</span>
                  <span className="font-medium">{project.panelistIds?.length || 0} / 3</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-md border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Context
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Academic Year:</span>
                <span className="font-medium">{project.academicYear || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Program / Department:</span>
                <span className="font-medium">{project.courseId?.name || 'Not specified'}</span>
              </div>
            </div>

            {!isPeer && (project.teamId?.googleDocUrl || project.teamId?.githubUrl) ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                {project.teamId?.googleDocUrl ? (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={project.teamId.googleDocUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Team Google Doc
                    </a>
                  </Button>
                ) : null}
                {project.teamId?.githubUrl ? (
                  <Button type="button" variant="secondary" size="sm" asChild>
                    <a href={project.teamId.githubUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Team GitHub
                    </a>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </section>

          {project.panelistIds?.length > 0 && (
            <section className="rounded-md border bg-muted/10 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Panelist Roster
              </p>
              <div className="flex flex-wrap gap-2">
                {project.panelistIds.map((p) => (
                  <Badge key={p._id || p} variant="outline">
                    {p.firstName ? `${p.firstName} ${p.lastName}` : p._id || p}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Rejection reason */}
        {project.rejectionReason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{project.rejectionReason}</AlertDescription>
          </Alert>
        )}

        {/* Modification request */}
        {project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION &&
          project.titleModificationRequest?.status === 'pending' &&
          project.titleModificationRequest?.proposedTitle && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-200">
                Pending Title Modification Request
              </p>
              <p className="text-sm">
                <strong>Proposed:</strong> {project.titleModificationRequest.proposedTitle}
              </p>
              <p className="text-sm">
                <strong>Justification:</strong> {project.titleModificationRequest.justification}
              </p>
            </div>
          )}

        {/* Deadlines — color-coded urgency display */}
        {!isPeer && project.deadlines && <DeadlineWarning deadlines={project.deadlines} />}
      </CardContent>
    </Card>
  );
}

/**
 * Approve / Reject title card — shown when titleStatus === SUBMITTED
 */
function TitleReviewCard({ project }) {
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const approve = useApproveTitle({
    onSuccess: () => toast.success('Title approved!'),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to approve title.'),
  });
  const reject = useRejectTitle({
    onSuccess: () => toast.success('Title rejected.'),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to reject title.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Title Review
        </CardTitle>
        <CardDescription>The team has submitted their title for approval.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button onClick={() => approve.mutate(project._id)} disabled={approve.isPending}>
            {approve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Title
          </Button>
          <Button variant="destructive" onClick={() => setShowReject(!showReject)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject Title
          </Button>
        </div>

        {showReject && (
          <div className="space-y-3 rounded-lg border p-4">
            <Label htmlFor="rejectReason">Rejection Reason</Label>
            <Textarea
              id="rejectReason"
              placeholder="Explain why the title is being rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={!reason.trim() || reject.isPending}
              onClick={() => reject.mutate({ projectId: project._id, reason: reason.trim() })}
            >
              {reject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Rejection
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Resolve a pending title modification request card.
 */
function ModificationReviewCard({ project }) {
  const [reviewNote, setReviewNote] = useState('');

  const resolve = useResolveTitleModification({
    onSuccess: () => toast.success('Modification resolved.'),
    onError: (err) => toast.error(getProjectResolveErrorMessage(err)),
  });

  const modReq = project.titleModificationRequest;
  if (modReq?.status !== 'pending' || !modReq?.proposedTitle) return null;

  const handleResolve = (action) => {
    if (resolve.isPending) return;

    resolve.mutate({
      projectId: project._id,
      action,
      reviewNote: reviewNote.trim() || undefined,
    });
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          Title Modification Request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <p>
            <strong>Current Title:</strong> {project.title}
          </p>
          <p>
            <strong>Proposed Title:</strong> {modReq.proposedTitle}
          </p>
          <p>
            <strong>Justification:</strong> {modReq.justification}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewNote">Review Note (optional)</Label>
          <Textarea
            id="reviewNote"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Add a note for the team…"
            rows={2}
          />
        </div>

        <div className="flex gap-3">
          <Button disabled={resolve.isPending} onClick={() => handleResolve('approved')}>
            {resolve.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve Modification
          </Button>
          <Button
            variant="destructive"
            disabled={resolve.isPending}
            onClick={() => handleResolve('denied')}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Deny Modification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Unified faculty committee card.
 * Read-only for adviser/panelist roles, editable for instructors.
 */
function FacultyCommitteeCard({ project, canManage }) {
  const [adviserId, setAdviserId] = useState('');
  const [panelistId, setPanelistId] = useState('');

  const { data: advisers = [] } = useQuery({
    queryKey: ['users', 'advisers'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'adviser' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: panelists = [] } = useQuery({
    queryKey: ['users', 'panelists'],
    queryFn: async () => {
      const { data } = await userService.listUsers({ role: 'panelist' });
      return data.data?.users || [];
    },
    enabled: canManage,
    staleTime: 5 * 60 * 1000,
  });

  const assignAdviser = useAssignAdviser({
    onSuccess: () => {
      toast.success('Adviser assigned!');
      setAdviserId('');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign adviser.'),
  });

  const assignPanelist = useAssignPanelist({
    onSuccess: () => {
      toast.success('Panelist added!');
      setPanelistId('');
    },
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to assign panelist.'),
  });

  const removePanelist = useRemovePanelist({
    onSuccess: () => toast.success('Panelist removed.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to remove panelist.'),
  });

  const currentPanelists = project.panelistIds || [];
  const assignedIds = new Set(currentPanelists.map((p) => p._id || p));
  const currentAdviser = project.adviserId
    ? `${project.adviserId.firstName || ''} ${project.adviserId.lastName || ''}`.trim() ||
      project.adviserId.email ||
      'Assigned'
    : 'Not assigned yet';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="h-5 w-5" />
          Faculty Committee
        </CardTitle>
        <CardDescription>
          Adviser and panel assignments are managed in one place for faculty workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Adviser
          </p>
          <p className="mt-1 text-sm font-medium">{currentAdviser}</p>
          <p className="text-xs text-muted-foreground">{project.adviserId?.email || '—'}</p>
        </div>

        {canManage && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="adviser">Select Adviser</Label>
              <select
                id="adviser"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={adviserId}
                onChange={(e) => setAdviserId(e.target.value)}
              >
                <option value="">Choose an adviser…</option>
                {advisers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!adviserId || assignAdviser.isPending}
              onClick={() => assignAdviser.mutate({ projectId: project._id, adviserId })}
            >
              {assignAdviser.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Adviser
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Panelists ({currentPanelists.length} / 3)
          </p>

          {currentPanelists.length > 0 ? (
            currentPanelists.map((p) => {
              const id = p._id || p;
              const name = p.firstName ? `${p.firstName} ${p.lastName}` : id;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{name}</span>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removePanelist.isPending}
                      onClick={() =>
                        removePanelist.mutate({ projectId: project._id, panelistId: id })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No panelists assigned yet.</p>
          )}
        </div>

        {/* Current panelists */}
        {/* Add panelist */}
        {canManage && currentPanelists.length < 3 && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="panelist">Add Panelist</Label>
              <select
                id="panelist"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={panelistId}
                onChange={(e) => setPanelistId(e.target.value)}
              >
                <option value="">Choose a panelist…</option>
                {panelists
                  .filter((u) => !assignedIds.has(u._id))
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
              </select>
            </div>
            <Button
              disabled={!panelistId || assignPanelist.isPending}
              onClick={() => assignPanelist.mutate({ projectId: project._id, panelistId })}
            >
              {assignPanelist.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Minimum capstone phase required for each deadline field.
 * Fields only become editable once the project reaches this phase.
 */
const FIELD_MIN_PHASE = {
  chapter1: 1,
  chapter2: 1,
  chapter3: 1,
  proposal: 1,
  chapter4: 2,
  chapter5: 2,
  defense: 4,
};

const DEADLINE_KEYS = [
  'chapter1',
  'chapter2',
  'chapter3',
  'proposal',
  'chapter4',
  'chapter5',
  'defense',
];

/**
 * Set deadlines card — instructor / adviser.
 *
 * Phase-aware: only fields whose phase ≤ the project's current phase show
 * date inputs. Future-phase fields default to "No Deadline" and can be
 * toggled to "TBA" (To Be Announced) by the instructor.
 */
function DeadlinesCard({ project, isInstructor }) {
  const currentPhase = project.capstonePhase || CAPSTONE_PHASES.PHASE_1;
  const existingTba = project.deadlines?.tba || [];
  const dateInputRefs = useRef({});

  const [deadlines, setDeadlines] = useState(() => {
    const initial = {};
    DEADLINE_KEYS.forEach((key) => {
      initial[key] = project.deadlines?.[key]?.split('T')[0] || '';
    });
    return initial;
  });

  const [tbaFields, setTbaFields] = useState(() => new Set(existingTba));
  const [applyToSection, setApplyToSection] = useState(false);

  const setDl = useSetDeadlines({
    onSuccess: () => toast.success('Deadlines saved!'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to save deadlines.'),
  });

  const handleSave = () => {
    const payload = { projectId: project._id, tba: [...tbaFields] };
    if (isInstructor && applyToSection) payload.applyToSection = true;
    Object.entries(deadlines).forEach(([key, val]) => {
      if (val && !tbaFields.has(key)) payload[key] = val;
    });
    setDl.mutate(payload);
  };

  const toggleTba = (key) => {
    setTbaFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // Clear the date value when marking TBA
        setDeadlines((prev) => ({ ...prev, [key]: '' }));
      }
      return next;
    });
  };

  const openDatePicker = (key) => {
    const input = dateInputRefs.current[key];
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Deadlines
        </CardTitle>
        <CardDescription>
          Currently in <strong>Capstone {currentPhase}</strong>. Future-phase deadlines default to
          &ldquo;No Deadline&rdquo; — toggle TBA to announce them early.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isInstructor && (
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={applyToSection}
              onChange={(e) => setApplyToSection(e.target.checked)}
            />
            Apply to all projects in this section
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {DEADLINE_KEYS.map((key) => {
            const reachable = currentPhase >= FIELD_MIN_PHASE[key];
            const isTba = tbaFields.has(key);
            const label = key.replace(/(\d)/, ' $1');

            return (
              <div key={key} className="space-y-1">
                <Label htmlFor={`dl-${key}`} className="capitalize">
                  {label}
                </Label>

                {reachable && !isTba ? (
                  /* Current / past phase — editable date input */
                  <div className="flex items-center gap-2">
                    <Input
                      ref={(node) => {
                        if (node) {
                          dateInputRefs.current[key] = node;
                        } else {
                          delete dateInputRefs.current[key];
                        }
                      }}
                      id={`dl-${key}`}
                      type="date"
                      className="flex-1"
                      value={deadlines[key]}
                      onChange={(e) => setDeadlines((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => openDatePicker(key)}
                      aria-label={`Open ${label} calendar`}
                      title="Open calendar"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>
                ) : isTba ? (
                  /* Marked as TBA */
                  <div className="flex h-10 items-center gap-2">
                    <Badge className="bg-amber-500 text-white dark:bg-amber-600">TBA</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleTba(key)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  /* Future phase — no deadline yet */
                  <div className="flex h-10 items-center gap-2">
                    <span className="text-sm text-muted-foreground">No Deadline</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleTba(key)}
                    >
                      Mark TBA
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button disabled={setDl.isPending} onClick={handleSave}>
          {setDl.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Calendar className="mr-2 h-4 w-4" />
          )}
          Save Deadlines
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Advance capstone phase card — instructor only.
 */
function AdvancePhaseCard({ project }) {
  const advance = useAdvancePhase({
    onSuccess: () => toast.success('Phase advanced!'),
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to advance phase.'),
  });

  const currentPhase = project.capstonePhase || CAPSTONE_PHASES.PHASE_1;
  const isMaxPhase = currentPhase >= CAPSTONE_PHASES.PHASE_4;
  const isProposalStage = currentPhase === CAPSTONE_PHASES.PHASE_1;
  const currentStageLabel =
    currentPhase === CAPSTONE_PHASES.PHASE_1 ? 'Proposal Stage' : `Capstone ${currentPhase - 1}`;
  const nextStageLabel = isMaxPhase ? 'Final Phase Reached' : `Advance to Capstone ${currentPhase}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowUpCircle className="h-5 w-5" />
          Capstone Phase
        </CardTitle>
        <CardDescription>
          Currently in <strong>{currentStageLabel}</strong>.
          {isProposalStage
            ? ' Approve the proposal first to unlock Capstone 1.'
            : isMaxPhase
              ? ' This project is at the final phase.'
              : ' Advance when the team is ready.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isProposalStage && (
          <Button
            disabled={isMaxPhase || advance.isPending}
            onClick={() => advance.mutate(project._id)}
          >
            {advance.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="mr-2 h-4 w-4" />
            )}
            {nextStageLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Archive project card — instructor only once Capstone 4 is reached.
 */
function ArchiveProjectCard({ project }) {
  const [completionNotes, setCompletionNotes] = useState('');

  const archive = useArchiveProject({
    onSuccess: () => toast.success('Project archived successfully.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to archive project.'),
  });

  const handleArchive = () => {
    archive.mutate({
      projectId: project._id,
      completionNotes: completionNotes.trim() || undefined,
    });
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Archive className="h-5 w-5 text-emerald-600" />
          Archive Project
        </CardTitle>
        <CardDescription>
          Archive this project after all final requirements are satisfied. Completion notes are
          optional.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`archive-notes-${project._id}`}>Completion Notes (optional)</Label>
          <Textarea
            id={`archive-notes-${project._id}`}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            placeholder="Add completion notes for the archive record."
            maxLength={2000}
            rows={3}
          />
        </div>
        <Button disabled={archive.isPending} onClick={handleArchive}>
          {archive.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Archive className="mr-2 h-4 w-4" />
          )}
          Archive Project
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Reject entire project card — instructor only, destructive action.
 */
function RejectProjectCard({ project }) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);

  const reject = useRejectProject({
    onSuccess: () => toast.success('Project rejected.'),
    onError: (err) =>
      toast.error(err.response?.data?.error?.message || 'Failed to reject project.'),
  });

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Reject Project
        </CardTitle>
        <CardDescription>
          This action marks the entire project as rejected. The team will need to create a new
          project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!confirm ? (
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reject This Project…
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
            <Label htmlFor="projectRejectReason">Reason for Rejection</Label>
            <Textarea
              id="projectRejectReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for rejecting this project…"
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={!reason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate({
                    projectId: project._id,
                    reason: reason.trim(),
                  })
                }
              >
                {reject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Rejection
              </Button>
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ProjectHistoryCard({ projectId }) {
  const { data: logs = [], isLoading, isError } = useEntityAuditHistory('Project', projectId, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ScrollText className="h-5 w-5" />
          Project Activity
        </CardTitle>
        <CardDescription>
          Track the latest changes for this project from the system audit trail.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-2">
            <p className="text-sm text-muted-foreground">Total audit entries: {logs.length}</p>
            {logs[0] ? (
              <p className="text-sm text-muted-foreground">
                Latest activity: {logs[0].action} at {new Date(logs[0].createdAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No activity has been logged yet.</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading project history...
              </div>
            )}

            {isError && (
              <Alert variant="destructive">
                <AlertDescription>Failed to load project history.</AlertDescription>
              </Alert>
            )}

            {!isLoading && !isError && logs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No history entries found for this project.
              </p>
            )}

            {!isLoading &&
              !isError &&
              logs.map((log) => (
                <div key={log._id} className="rounded-md border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{log.action}</Badge>
                    <Badge variant="secondary">{log.actorRole || 'unknown'}</Badge>
                  </div>
                  {log.description && <p className="mt-2 text-sm">{log.description}</p>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/* ────────── Main Page ────────── */

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const [citationStyle, setCitationStyle] = useState('apa');
  const [downloadingManuscriptType, setDownloadingManuscriptType] = useState(null);
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(ARCHIVE_BOOKMARKS_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const {
    data: project,
    isLoading,
    error,
  } = useProject(id, {
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  });
  const isStudent = user?.role === ROLES.STUDENT;
  const projectTeamId = project?.teamId?._id || project?.teamId;
  const userTeamId = user?.teamId?._id || user?.teamId;
  const isAuthor =
    isStudent && userTeamId && projectTeamId && String(userTeamId) === String(projectTeamId);
  const isPeer = isStudent && !isAuthor;
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  const isFacultyMember =
    user?.role === ROLES.INSTRUCTOR ||
    user?.role === ROLES.ADVISER ||
    user?.role === ROLES.PANELIST;
  const isArchived =
    Boolean(project?.isArchived) || project?.projectStatus === PROJECT_STATUSES.ARCHIVED;

  const { data: finalAcademicData, isLoading: isFinalAcademicLoading } = useProjectSubmissions(
    project?._id,
    { limit: 1, type: 'final_academic' },
    { enabled: !!project?._id && isArchived },
  );

  const { data: finalJournalData, isLoading: isFinalJournalLoading } = useProjectSubmissions(
    project?._id,
    { limit: 1, type: 'final_journal' },
    { enabled: !!project?._id && isArchived },
  );

  const finalAcademicSubmission = finalAcademicData?.[0] || finalAcademicData?.submissions?.[0];
  const finalJournalSubmission = finalJournalData?.[0] || finalJournalData?.submissions?.[0];

  const { backDestination, backLabel } = resolveArchiveBackContext(location.state, location.search);

  const authors = useMemo(() => getProjectAuthors(project), [project]);
  const isBookmarked = Boolean(project?._id && bookmarkedIds.includes(project._id));
  const canViewAcademic = !isStudent || isAuthor;

  const { data: relatedArchiveData } = useArchiveSearch(
    {
      search: (project?.keywords || [])[0] || project?.title || '',
      academicYear: project?.academicYear,
      page: 1,
      limit: 8,
    },
    {
      enabled: isArchived && !!project?._id,
      staleTime: 60_000,
    },
  );

  const relatedProjects = useMemo(() => {
    const adviserId = project?.adviserId?._id;
    const currentKeywords = new Set(
      (project?.keywords || []).map((kw) => String(kw).toLowerCase()),
    );

    const candidates = (relatedArchiveData?.projects || []).filter(
      (candidate) => String(candidate._id) !== String(project?._id),
    );

    const scored = candidates
      .map((candidate) => {
        let score = 0;
        const candidateKeywords = (candidate.keywords || []).map((kw) => String(kw).toLowerCase());
        candidateKeywords.forEach((kw) => {
          if (currentKeywords.has(kw)) score += 2;
        });

        if (adviserId && String(candidate?.adviserId?._id) === String(adviserId)) {
          score += 3;
        }

        return { candidate, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((entry) => entry.candidate);

    return scored;
  }, [project, relatedArchiveData]);

  const citationText = useMemo(
    () => formatCitation(project, citationStyle, authors),
    [project, citationStyle, authors],
  );

  const toggleBookmark = () => {
    if (!project?._id) return;

    const next = isBookmarked
      ? bookmarkedIds.filter((entryId) => entryId !== project._id)
      : [...bookmarkedIds, project._id];

    setBookmarkedIds(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ARCHIVE_BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
    }

    toast.success(isBookmarked ? 'Removed from reading list.' : 'Saved to your reading list.');
  };

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(citationText);
      toast.success(`${citationStyle.toUpperCase()} citation copied.`);
    } catch {
      toast.error('Failed to copy citation.');
    }
  };

  const handleKeywordClick = (keyword) => {
    navigate(`/archive?q=${encodeURIComponent(keyword)}&view=content`);
  };

  const requestFullAccess = () => {
    toast.success('Access request submitted. Your instructor/adviser will be notified.');
  };

  const handleDownloadManuscript = async (submissionId, manuscriptType) => {
    if (!submissionId) {
      toast.error(`${manuscriptType} is not available for this project.`);
      return;
    }

    setDownloadingManuscriptType(manuscriptType);
    try {
      const { data } = await submissionService.getViewUrl(submissionId);
      const viewUrl = data?.data?.url;
      if (!viewUrl) {
        throw new Error('Missing manuscript view URL');
      }

      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(
        err?.response?.data?.message || `Failed to download ${manuscriptType.toLowerCase()}.`,
      );
    } finally {
      setDownloadingManuscriptType(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate(backDestination)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.response?.data?.error?.message || 'Failed to load project'}
            </AlertDescription>
          </Alert>
        )}

        {/* Project content */}
        {project && (
          <>
            {/* Info panel */}
            <ProjectInfoPanel
              project={project}
              isPeer={isPeer}
              authors={authors}
              onKeywordClick={handleKeywordClick}
            />

            {isArchived && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>Research Utilities</span>
                      <Button variant="outline" size="sm" onClick={toggleBookmark}>
                        {isBookmarked ? (
                          <>
                            <BookmarkCheck className="mr-2 h-4 w-4" />
                            Bookmarked
                          </>
                        ) : (
                          <>
                            <Bookmark className="mr-2 h-4 w-4" />
                            Bookmark
                          </>
                        )}
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Save this archive item and generate citations for literature review workflows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-[200px] space-y-1">
                        <Label htmlFor="citation-style">Citation style</Label>
                        <select
                          id="citation-style"
                          value={citationStyle}
                          onChange={(event) => setCitationStyle(event.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="apa">APA</option>
                          <option value="ieee">IEEE</option>
                          <option value="mla">MLA</option>
                        </select>
                      </div>
                      <Button variant="secondary" onClick={copyCitation}>
                        <Copy className="mr-2 h-4 w-4" />
                        Cite this Project
                      </Button>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                      {citationText}
                    </div>
                  </CardContent>
                </Card>

                {!canViewAcademic && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                      <p>
                        Full manuscript access is restricted for student peer viewers to protect
                        authorship and reduce plagiarism risk.
                      </p>
                      <Button variant="outline" size="sm" onClick={requestFullAccess}>
                        Request Full Manuscript Access
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {isArchived && canViewAcademic && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Archived Manuscripts</CardTitle>
                  <CardDescription>
                    Download the academic and journal versions for this archived project.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!finalAcademicSubmission?._id || isFinalAcademicLoading}
                      onClick={() =>
                        handleDownloadManuscript(finalAcademicSubmission?._id, 'Academic Paper')
                      }
                    >
                      {downloadingManuscriptType === 'Academic Paper' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Academic Paper
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!finalJournalSubmission?._id || isFinalJournalLoading}
                      onClick={() =>
                        handleDownloadManuscript(finalJournalSubmission?._id, 'Journal Paper')
                      }
                    >
                      {downloadingManuscriptType === 'Journal Paper' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download Journal Paper
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isFinalAcademicLoading || isFinalJournalLoading
                      ? 'Checking manuscript availability...'
                      : 'Manuscript downloads are audit-logged and governed by access policy.'}
                  </p>
                </CardContent>
              </Card>
            )}

            {isArchived && relatedProjects.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Related Projects</CardTitle>
                  <CardDescription>
                    Similar archives based on shared keywords and adviser match.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {relatedProjects.map((related) => (
                      <button
                        key={related._id}
                        type="button"
                        className="rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                        onClick={() =>
                          navigate(`/projects/${related._id}`, {
                            state: {
                              fromArchive: true,
                              returnTo: backDestination,
                            },
                          })
                        }
                      >
                        <p className="line-clamp-2 text-sm font-semibold">{related.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {related.teamId?.name || 'Unknown Team'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(related.keywords || []).slice(0, 2).map((keyword) => (
                            <Badge
                              key={`${related._id}-${keyword}`}
                              variant="outline"
                              className="text-[11px]"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isPeer && (
              <>
                {/* Faculty/student owner can open submissions; faculty access is view-only */}
                {!isArchived && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Student Submissions</CardTitle>
                      <CardDescription>
                        {isFacultyMember
                          ? 'Open the student submissions page in read-only mode.'
                          : 'Open your submissions workspace.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            isFacultyMember
                              ? `/project/submissions?mode=view&projectId=${project._id}`
                              : '/project/submissions',
                          )
                        }
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {isFacultyMember
                          ? 'View Student Submissions (Read-Only)'
                          : 'View Submissions'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Advance phase — instructor only */}
                {!isArchived &&
                  isInstructor &&
                  project.projectStatus !== PROJECT_STATUSES.REJECTED && (
                    <AdvancePhaseCard project={project} />
                  )}

                {/* History tab with audit trail */}
                <ProjectHistoryCard projectId={project._id} />

                {!isArchived && <TitleProposalsSection project={project} userRole={user?.role} />}

                {/* Deadlines setter/viewer — instructors can apply section-wide updates */}
                {!isArchived && (isInstructor || user?.role === ROLES.ADVISER) && (
                  <DeadlinesCard project={project} isInstructor={isInstructor} />
                )}

                {/* Modification review — only when pending */}
                {!isArchived &&
                  project.titleStatus === TITLE_STATUSES.PENDING_MODIFICATION &&
                  project.titleModificationRequest?.status === 'pending' &&
                  project.titleModificationRequest?.proposedTitle &&
                  isInstructor && <ModificationReviewCard project={project} />}

                {/* Faculty committee — shared card for adviser/panel, editable by instructor */}
                {!isArchived && isFacultyMember && (
                  <FacultyCommitteeCard project={project} canManage={isInstructor} />
                )}

                {/* Archive transition — instructor only (Capstone 4) */}
                {!isArchived &&
                  isInstructor &&
                  project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 &&
                  project.projectStatus !== PROJECT_STATUSES.REJECTED && (
                    <ArchiveProjectCard project={project} />
                  )}

                {/* Prototype showcase — visible to all faculty */}
                {project.capstonePhase >= CAPSTONE_PHASES.PHASE_2 && (
                  <PrototypeGallery projectId={project._id} canDelete={false} />
                )}

                {/* Evaluation panels — proposal defense */}
                {!isArchived && project.capstonePhase >= CAPSTONE_PHASES.PHASE_1 && (
                  <EvaluationPanel projectId={project._id} defenseType="proposal" />
                )}

                {/* Evaluation panels — final defense (Capstone 4) */}
                {!isArchived && project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 && (
                  <EvaluationPanel projectId={project._id} defenseType="final" />
                )}

                {/* Final paper upload — Capstone 4 */}
                {project.capstonePhase >= CAPSTONE_PHASES.PHASE_4 &&
                  !isArchived &&
                  (user?.role === ROLES.STUDENT || isInstructor) && (
                    <FinalPaperUpload projectId={project._id} />
                  )}

                {/* Certificate link — archived projects only */}
                {isArchived && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Completion Certificate
                      </CardTitle>
                      <CardDescription>
                        View or manage the completion certificate for this project.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/projects/${project._id}/certificate`)}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Go to Certificate
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
