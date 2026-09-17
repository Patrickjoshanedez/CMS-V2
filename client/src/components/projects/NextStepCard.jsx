import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TITLE_STATUSES, DOCUMENT_TYPES, SUBMISSION_STATUSES } from '@cms/shared';
import {
  Edit3,
  Clock,
  AlertTriangle,
  Upload,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Award,
  Code2,
  ShieldCheck,
} from 'lucide-react';

const CHAPTER_LABELS = {
  1: 'Chapter 1',
  2: 'Chapter 2',
  3: 'Chapter 3',
  4: 'Chapter 4',
  5: 'Chapter 5',
};

/**
 * Determines the current workflow step and returns contextual guidance.
 */
function getNextStep(project, submissions) {
  if (!project) return null;
  const { titleStatus } = project;

  // 1. Archival State
  if (
    project.projectStatus === 'archived' ||
    project.isArchived ||
    project.projectStatus === 'defended'
  ) {
    return {
      title: 'Capstone Successfully Archived',
      description:
        'Your project has completed all institutional defense requirements and is preserved in the official repository.',
      action: { label: 'View Certificate & Paper', path: '/project/certificate' },
      icon: Award,
      color: 'text-emerald-600 dark:text-emerald-400',
    };
  }

  // 2. Title Proposal Phase (Capstone 1)
  if (titleStatus === TITLE_STATUSES.DRAFT) {
    return {
      title: 'Draft Your Title Proposals',
      description:
        'Your project titles are in draft. Edit your proposals and submit them for committee defense review.',
      action: { label: 'Edit Proposals', path: '/project/approval' },
      icon: Edit3,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.SUBMITTED) {
    return {
      title: 'Proposal Defense Review Pending',
      description:
        'Your candidate titles have been submitted. Review pitch decks and defense rehearsal blueprints.',
      action: { label: 'View Proposals & Rehearsal', path: '/project/approval' },
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
    return {
      title: 'Revise Your Title Proposal',
      description:
        'The committee or instructor requested revisions on your title proposal. Update and resubmit.',
      action: { label: 'Revise Title', path: '/project/approval' },
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION) {
    return {
      title: 'Title Modification Pending',
      description: 'Your title change request is under review by the course instructor.',
      action: { label: 'View Request Status', path: '/project/approval' },
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }

  // 3. Post-Title Approval Workflows
  if (titleStatus === TITLE_STATUSES.APPROVED || titleStatus === 'title_approved') {
    const phase = Number(project.capstonePhase ?? project.phase ?? 2);

    const chapterMap = {};
    if (submissions?.submissions) {
      for (const sub of submissions.submissions) {
        const existing = chapterMap[sub.chapter];
        if (!existing || new Date(sub.uploadedAt) > new Date(existing.uploadedAt)) {
          chapterMap[sub.chapter] = sub;
        }
      }
    }

    // Phase 3: Final Defense, Secretary Gate, Multi-Tier ADM & Chapters 4 & 5
    if (phase >= 3) {
      for (const ch of [4, 5]) {
        const sub = chapterMap[ch];
        if (sub?.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
          return {
            title: `Revise ${CHAPTER_LABELS[ch]}`,
            description: `Adviser requested revisions on ${CHAPTER_LABELS[ch]}. Upload a revised draft.`,
            action: { label: 'Upload Revision', path: `/project/submissions/upload?chapter=${ch}` },
            icon: AlertTriangle,
            color: 'text-amber-600 dark:text-amber-400',
          };
        }
      }

      if (!chapterMap[4]) {
        return {
          title: 'Upload Chapter 4 (Results)',
          description:
            'Submit your Chapter 4 draft with system implementation and prototype evaluation.',
          action: { label: 'Upload Chapter 4', path: '/project/submissions/upload?chapter=4' },
          icon: Upload,
          color: 'text-blue-600 dark:text-blue-400',
        };
      }
      if (!chapterMap[5]) {
        return {
          title: 'Upload Chapter 5 (Conclusions)',
          description: 'Submit your Chapter 5 draft covering conclusions and recommendations.',
          action: { label: 'Upload Chapter 5', path: '/project/submissions/upload?chapter=5' },
          icon: Upload,
          color: 'text-blue-600 dark:text-blue-400',
        };
      }

      const isSecretaryEndorsed = Boolean(project.admSignatures?.secretary?.endorsed);
      if (!isSecretaryEndorsed) {
        return {
          title: 'Secretary ADM Endorsement Pending',
          description:
            'Defense Secretary compliance verification is required before committee signatures can unlock.',
          action: { label: 'Open Action Done Matrix', path: '/project?tab=capstone_3' },
          icon: ShieldCheck,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
      return {
        title: 'Final Paper & Digital Signatures',
        description:
          'Upload your final manuscript papers and verify Tier 1–3 committee digital signatures in the ADM.',
        action: { label: 'View Capstone 3 Workspace', path: '/project?tab=capstone_3' },
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
      };
    }

    // Phase 2: System Development, Interactive Gantt, Progress Defense
    if (phase === 2) {
      return {
        title: 'Prototype & Milestone Roadmap',
        description:
          'Track sprint tasks on your Interactive Gantt Chart and prepare for progress defense.',
        action: { label: 'View Gantt Roadmap', path: '/project?tab=capstone_2' },
        icon: Code2,
        color: 'text-primary',
      };
    }

    // Phase 1: Chapters 1–3 & Proposal Defense
    for (let ch = 1; ch <= 3; ch++) {
      const sub = chapterMap[ch];
      if (sub?.status === SUBMISSION_STATUSES.REVISIONS_REQUIRED) {
        return {
          title: `Revise ${CHAPTER_LABELS[ch]}`,
          description: `Your adviser requested revisions on ${CHAPTER_LABELS[ch]}. Upload a new version.`,
          action: { label: 'Upload Revision', path: `/project/submissions/upload?chapter=${ch}` },
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
    }

    const allChaptersReady = [1, 2, 3].every((ch) => {
      const sub = chapterMap[ch];
      return (
        sub &&
        [
          SUBMISSION_STATUSES.LOCKED,
          SUBMISSION_STATUSES.APPROVED,
          SUBMISSION_STATUSES.ACCEPTED,
        ].includes(sub.status)
      );
    });

    if (allChaptersReady) {
      const hasProposal = submissions?.submissions?.some((s) => s.type === DOCUMENT_TYPES.PROPOSAL);
      if (!hasProposal) {
        return {
          title: 'Compile Proposal Manuscript',
          description:
            'All chapters 1–3 are approved. Compile your full proposal for proposal defense hearing.',
          action: { label: 'Compile Proposal', path: '/project/proposal' },
          icon: BookOpen,
          color: 'text-emerald-600 dark:text-emerald-400',
        };
      }
      return {
        title: 'Proposal Defense & ADM Sign-Off',
        description:
          'Proposal compiled. Review panel defense remarks and track committee sign-offs in the ADM.',
        action: { label: 'View Action Done Matrix', path: '/project?tab=capstone_1' },
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
      };
    }

    for (let ch = 1; ch <= 3; ch++) {
      const sub = chapterMap[ch];
      if (!sub) {
        return {
          title: `Upload ${CHAPTER_LABELS[ch]}`,
          description: `Start by uploading your ${CHAPTER_LABELS[ch]} draft for adviser review.`,
          action: {
            label: `Upload ${CHAPTER_LABELS[ch]}`,
            path: `/project/submissions/upload?chapter=${ch}`,
          },
          icon: Upload,
          color: 'text-blue-600 dark:text-blue-400',
        };
      }
      if (
        sub.status === SUBMISSION_STATUSES.PENDING ||
        sub.status === SUBMISSION_STATUSES.UNDER_REVIEW
      ) {
        return {
          title: `${CHAPTER_LABELS[ch]} Under Review`,
          description: `Your ${CHAPTER_LABELS[ch]} is being reviewed. Wait for adviser feedback.`,
          action: { label: 'View Submissions', path: '/project/submissions' },
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
        };
      }
    }
  }

  return null;
}

export default function NextStepCard({ project, submissions }) {
  const navigate = useNavigate();
  const step = getNextStep(project, submissions);
  if (!step) return null;

  const IconComponent = step.icon;

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-muted/60 border border-border/60 ${step.color}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Milestone
            </span>
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Next Action
          </span>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground leading-snug">{step.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
        </div>

        {step.action && (
          <div className="pt-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate(step.action.path)}
              className="w-full justify-center text-xs font-semibold gap-1.5 shadow-xs"
            >
              <span>{step.action.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

NextStepCard.propTypes = {
  project: PropTypes.object,
  submissions: PropTypes.object,
};
