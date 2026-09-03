import React from 'react';
import PropTypes from 'prop-types';
import { FileText, Lock, ExternalLink, Download, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTeamManuscriptTemplate } from '@/hooks/useTeams';

export function ManuscriptTemplateWidget({
  teamId,
  isTitleApproved,
  approvedTitle = 'Project Workspace: Capstone Management System with Plagiarism Checker',
  templateData = {
    title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
    type: 'google_docs',
    url: 'https://docs.google.com/document/d/1tTwi29xL.../copy',
    version: 'AY 2025–2026 v2.1',
    updatedAt: 'Sep 01, 2026',
  },
}) {
  // If teamId is provided and isTitleApproved is not explicitly passed, query the server
  const shouldQuery = Boolean(teamId && typeof isTitleApproved === 'undefined');
  const { data: serverGate, isLoading } = useTeamManuscriptTemplate(teamId, {
    enabled: shouldQuery,
  });

  const effectiveIsApproved =
    typeof isTitleApproved === 'boolean'
      ? isTitleApproved
      : serverGate
        ? Boolean(serverGate.isUnlocked)
        : false;

  const effectiveTemplate = serverGate?.template ||
    templateData || {
      title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
      type: 'google_docs',
      url: 'https://docs.google.com/document/d/1tTwi29xL.../copy',
      version: 'AY 2025–2026 v2.1',
      updatedAt: 'Sep 01, 2026',
    };

  if (isLoading && shouldQuery) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3.5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-2.5 w-60 rounded bg-muted" />
          </div>
        </div>
        <div className="h-8 w-28 rounded bg-muted" />
      </div>
    );
  }

  // STATE 1: GATED / LOCKED (Title Defense Not Yet Approved)
  if (!effectiveIsApproved) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 transition-colors">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-amber-500/10 p-2 text-amber-500 shrink-0 border border-amber-500/20">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">
                Official Capstone Manuscript Template
              </span>
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-500 text-[10px] py-0"
              >
                Title Approval Required
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Locked until your Capstone 1 title pitch is evaluated and approved by the defense
              committee.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8 text-xs shrink-0 cursor-not-allowed opacity-60 border-border/60"
        >
          <Lock className="mr-1.5 h-3 w-3" /> Locked in Proposal Stage
        </Button>
      </div>
    );
  }

  // STATE 2: UNLOCKED (Title Approved by Panel/Instructor)
  const isGoogleDocs = effectiveTemplate.type === 'google_docs';
  const url = effectiveTemplate.url || '#';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 transition-colors hover:border-primary/50">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary shrink-0 border border-primary/20">
          <FileText className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-foreground truncate">
              {effectiveTemplate.title}
            </span>
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] py-0"
            >
              <CheckCircle2 className="mr-1 h-3 w-3 inline" /> Unlocked
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Current syllabus specification ·{' '}
            <span className="font-medium text-foreground">{effectiveTemplate.version}</span>{' '}
            (Updated: {effectiveTemplate.updatedAt})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isGoogleDocs ? (
          <Button
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <Download className="h-3.5 w-3.5" /> Download .DOCX Template
          </Button>
        )}
      </div>
    </div>
  );
}

ManuscriptTemplateWidget.propTypes = {
  teamId: PropTypes.string,
  isTitleApproved: PropTypes.bool,
  approvedTitle: PropTypes.string,
  templateData: PropTypes.shape({
    title: PropTypes.string,
    type: PropTypes.oneOf(['google_docs', 'downloadable_file']),
    url: PropTypes.string,
    version: PropTypes.string,
    updatedAt: PropTypes.string,
  }),
};

export default ManuscriptTemplateWidget;
