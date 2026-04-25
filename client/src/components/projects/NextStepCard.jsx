import { useNavigate } from 'react-router-dom';
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

  if (titleStatus === TITLE_STATUSES.DRAFT) {
    return {
      title: 'Submit Your Title',
      description:
        'Your project title is still in draft. Edit it and submit it for instructor approval to proceed.',
      icon: Edit3,
      color: 'text-blue-600 dark:text-blue-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.SUBMITTED) {
    return {
      title: 'Pending Proposal',
      description: 'Your team has a pending proposal. Waiting for panel and instructor feedback.',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.REVISION_REQUIRED) {
    return {
      title: 'Revise Your Title',
      description: 'The instructor requested changes on your title. Revise and resubmit below.',
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (titleStatus === TITLE_STATUSES.PENDING_MODIFICATION) {
    return {
      title: 'Title Modification Pending',
      description: 'Your title change request is pending instructor approval.',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (titleStatus === TITLE_STATUSES.APPROVED) {
    const chapterMap = {};
    if (submissions?.submissions) {
      for (const sub of submissions.submissions) {
        const existing = chapterMap[sub.chapter];
        if (!existing || new Date(sub.uploadedAt) > new Date(existing.uploadedAt)) {
          chapterMap[sub.chapter] = sub;
        }
      }
    }

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
          title: 'Compile Your Proposal',
          description:
            'All chapters 1\u20133 are approved or locked. Submit your compiled proposal.',
          action: { label: 'Compile Proposal', path: '/project/proposal' },
          icon: BookOpen,
          color: 'text-green-600 dark:text-green-400',
        };
      }
      return {
        title: 'Proposal Submitted',
        description: 'Your full proposal has been compiled. Await adviser and panelist review.',
        action: { label: 'View Submissions', path: '/project/submissions' },
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-start gap-4 pt-6">
        <div className={`mt-0.5 ${step.color}`}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        {step.action && (
          <Button size="sm" onClick={() => navigate(step.action.path)}>
            {step.action.label}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
