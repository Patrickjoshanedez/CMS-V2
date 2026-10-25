import React from 'react';
import PropTypes from 'prop-types';
import {
  FileText,
  Lock,
  ExternalLink,
  Download,
  CheckCircle2,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTeamManuscriptTemplate } from '@/hooks/useTeams';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';

export function ManuscriptTemplateWidget({ teamId, isTitleApproved, templateData }) {
  const { user } = useAuthStore();
  const isInstructor = user?.role === ROLES.INSTRUCTOR || user?.role === ROLES.ADMIN;

  // If teamId is provided and isTitleApproved is not explicitly passed, query the server
  const shouldQuery = Boolean(teamId && typeof isTitleApproved === 'undefined');
  const {
    data: serverGate,
    isLoading,
    isError,
    refetch,
  } = useTeamManuscriptTemplate(teamId, {
    enabled: shouldQuery,
  });

  const effectiveIsApproved =
    typeof isTitleApproved === 'boolean'
      ? isTitleApproved
      : serverGate
        ? Boolean(serverGate.isUnlocked)
        : false;

  const effectiveTemplate = serverGate?.template || templateData;

  if (isLoading && shouldQuery) {
    return (
      <div
        role="status"
        aria-label="Loading manuscript template"
        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-60" />
          </div>
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
    );
  }

  if (shouldQuery && isError) {
    return (
      <Alert
        variant="destructive"
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <AlertTitle>Unable to load the manuscript template</AlertTitle>
          <AlertDescription>
            Please try again. Your title approval status has not changed.
          </AlertDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
          Try again
        </Button>
      </Alert>
    );
  }

  // STATE 1: GATED / LOCKED (Title Defense Not Yet Approved)
  if (!effectiveIsApproved) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3.5 transition-colors">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-warning/10 p-2 text-warning shrink-0 border border-warning/20">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Official Capstone Manuscript Template
              </span>
              <Badge variant="warning" className="text-[10px] py-0">
                Title Approval Required
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Locked until your Capstone 1 title pitch is evaluated and approved by the defense
              committee.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 text-xs shrink-0 cursor-not-allowed"
          >
            <Lock className="mr-1.5 h-3 w-3" /> Locked in Proposal Stage
          </Button>
          {isInstructor && (
            <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
              <Link
                to="/settings?tab=administration"
                title="Configure manuscript template link in instructor settings"
              >
                <Settings2 className="h-3 w-3" /> Set in Settings
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // STATE 2: UNLOCKED (Title Approved by Panel/Instructor)
  const hasTemplateUrl =
    typeof effectiveTemplate?.url === 'string' && effectiveTemplate.url.trim().length > 0;

  if (!effectiveTemplate || !hasTemplateUrl) {
    return (
      <Alert variant="info">
        <AlertTitle>Manuscript template unavailable</AlertTitle>
        <AlertDescription>
          Your title is approved, but an institutional manuscript template has not been configured
          yet.
          {isInstructor && (
            <Button
              asChild
              variant="link"
              size="sm"
              className="ml-1 h-auto min-h-0 p-0 align-baseline"
            >
              <Link to="/settings?tab=administration">Configure it in Settings</Link>
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const isGoogleDocs = effectiveTemplate.type === 'google_docs';
  const rawUrl = effectiveTemplate.url.trim();
  const copyUrl = rawUrl.replace(/\/(edit|preview|view)(\?.*)?$/, '/copy$2');
  const targetUrl = copyUrl.includes('/copy') ? copyUrl : `${copyUrl.replace(/\/$/, '')}/copy`;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 transition-colors hover:border-primary/50">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary shrink-0 border border-primary/20">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words text-xs font-semibold text-foreground">
              {effectiveTemplate.title}
            </span>
            <Badge variant="success" className="text-[10px] py-0">
              <CheckCircle2 className="mr-1 h-3 w-3 inline" /> Unlocked
            </Badge>
          </div>
          <p className="flex flex-wrap gap-x-1 text-[11px] text-muted-foreground">
            Current syllabus specification ·{' '}
            <span className="font-medium text-foreground">{effectiveTemplate.version}</span>{' '}
            (Updated: {effectiveTemplate.updatedAt})
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:self-center">
        {isGoogleDocs ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
          >
            <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => window.open(rawUrl, '_blank', 'noopener,noreferrer')}
          >
            <Download className="h-3.5 w-3.5" /> Download .DOCX Template
          </Button>
        )}
        {isInstructor && (
          <Button asChild variant="outline" size="sm" className="h-8 shrink-0 gap-1 text-xs">
            <Link
              to="/settings?tab=administration"
              title="Configure manuscript template link in instructor settings"
            >
              <Settings2 className="h-3 w-3" /> Settings
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

ManuscriptTemplateWidget.propTypes = {
  teamId: PropTypes.string,
  isTitleApproved: PropTypes.bool,
  templateData: PropTypes.shape({
    title: PropTypes.string,
    type: PropTypes.oneOf(['google_docs', 'downloadable_file']),
    url: PropTypes.string,
    version: PropTypes.string,
    updatedAt: PropTypes.string,
  }),
};

export default ManuscriptTemplateWidget;
