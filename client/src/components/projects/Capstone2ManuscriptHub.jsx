import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  FileText,
  ExternalLink,
  Download,
  CheckCircle2,
  Sparkles,
  Link2,
  Edit2,
  RefreshCw,
  AlertCircle,
  Info,
  Check,
  Loader2,
  Share2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProjectManuscripts,
  useUploadManuscript,
  useSyncManuscriptPermissions,
} from '@/hooks/useDocuments';
import { useTeamManuscriptTemplate, useTeamById } from '@/hooks/useTeams';
import { useSettings } from '@/hooks/useSettings';
import { teamService } from '@/services/authService';

/**
 * Capstone2ManuscriptHub
 *
 * Primary entry point for Capstone 2 (Chapters 1–3 Manuscript Development).
 * 1. Provides the official BukSU Capstone Manuscript Template (Google Docs copy & .DOCX).
 * 2. Prompts the team to attach their working Google Docs / Drive link so advisers,
 *    secretaries, and panelists can review real-time progress.
 */
export default function Capstone2ManuscriptHub({ project }) {
  const projectId = project?._id;
  const teamId = typeof project?.teamId === 'string' ? project.teamId : project?.teamId?._id;
  const queryClient = useQueryClient();

  // 1. Fetch official institutional template & settings
  const { data: serverTemplateData, isLoading: isTemplateLoading } = useTeamManuscriptTemplate(
    teamId,
    { enabled: Boolean(teamId) },
  );
  const { data: settingsData } = useSettings();

  const settingsTpl = settingsData?.documentTemplates?.find(
    (t) => t.documentType === 'manuscript_template' || t.documentType === 'proposal_template',
  );

  const effectiveTemplate = serverTemplateData?.template || {
    title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
    type: 'google_docs',
    url:
      settingsTpl?.templateUrl ||
      'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/copy',
    version: 'AY 2025–2026 v2.1',
    updatedAt: 'Sep 01, 2026',
  };

  // 2. Fetch team details to ensure googleDocUrl is populated from My Team
  const { data: teamData } = useTeamById(teamId, { enabled: Boolean(teamId) });

  // 3. Fetch team's attached manuscripts
  const {
    data: manuscriptsData,
    isLoading: isManuscriptsLoading,
    refetch: refetchManuscripts,
  } = useProjectManuscripts(projectId, { enabled: Boolean(projectId) });

  const manuscriptsList = manuscriptsData?.manuscripts || [];
  // Find working manuscript for chapter 1 or proposal or first attached
  const attachedManuscript =
    manuscriptsList.find(
      (m) =>
        m.documentType === 'chapter_1' ||
        m.documentType === 'proposal' ||
        m.documentType === 'final_academic',
    ) || manuscriptsList[0];

  const existingUrl =
    attachedManuscript?.externalDocUrl ||
    project?.teamId?.googleDocUrl ||
    teamData?.googleDocUrl ||
    '';

  const uploadManuscriptMutation = useUploadManuscript(projectId, {
    onSuccess: () => {
      toast.success('Working Google Docs link attached successfully!');
      setIsEditing(false);
      setInputUrl('');
      refetchManuscripts();
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to attach Google Docs link.');
    },
  });

  const syncPermissionsMutation = useSyncManuscriptPermissions(projectId, {
    onSuccess: () => {
      toast.success('Google Drive permissions synchronized for defense committee.');
      refetchManuscripts();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to sync Drive permissions.');
    },
  });

  const [inputUrl, setInputUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleAttachLink = (e) => {
    e?.preventDefault();
    const cleanUrl = inputUrl.trim();

    if (!cleanUrl) {
      toast.error('Please enter your Google Docs or Google Drive link.');
      return;
    }

    try {
      const parsed = new URL(cleanUrl);
      if (!parsed.protocol.startsWith('http')) {
        throw new Error('Invalid protocol');
      }
    } catch {
      toast.error('Please enter a valid web URL (e.g. https://docs.google.com/document/d/...)');
      return;
    }

    // 1. Save manuscript record
    uploadManuscriptMutation.mutate({
      documentType: 'chapter_1',
      title: `${project?.title || 'Capstone 2'} - Working Manuscript (Chapters 1–3)`,
      externalDocUrl: cleanUrl,
      externalDocProvider: 'google_docs',
    });

    // 2. Also update team's googleDocUrl so My Team & Capstone 2 stay synchronized
    if (teamId) {
      teamService
        .updateGoogleDocLink(teamId, { googleDocUrl: cleanUrl })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['teams'] });
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        })
        .catch((err) => {
          console.warn('Failed to sync team.googleDocUrl:', err);
        });
    }
  };

  const handleStartEditing = () => {
    setInputUrl(existingUrl);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setInputUrl('');
  };

  const handleSyncPermissions = () => {
    if (attachedManuscript?.documentType) {
      syncPermissionsMutation.mutate(attachedManuscript.documentType);
    } else if (existingUrl) {
      uploadManuscriptMutation.mutate(
        {
          documentType: 'chapter_1',
          title: `${project?.title || 'Capstone 2'} - Working Manuscript (Chapters 1–3)`,
          externalDocUrl: existingUrl,
          externalDocProvider: 'google_docs',
        },
        {
          onSuccess: () => {
            syncPermissionsMutation.mutate('chapter_1');
          },
        },
      );
    }
  };

  const handleOpenGoogleDocsCopy = () => {
    const rawUrl = effectiveTemplate.url || '';
    if (!rawUrl) return;
    const copyUrl = rawUrl.replace(/\/(edit|preview)(\?.*)?$/, '/copy$2');
    const targetUrl = copyUrl.includes('/copy') ? copyUrl : `${copyUrl.replace(/\/$/, '')}/copy`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocx = () => {
    const rawUrl = effectiveTemplate.url || '';
    if (!rawUrl) return;
    const docxUrl = rawUrl.replace(/\/(copy|edit|preview)(\?.*)?$/, '/export?format=docx');
    window.open(docxUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4" data-testid="capstone2-manuscript-hub">
      {/* ─── SECTION 1: INSTITUTIONAL MANUSCRIPT TEMPLATE ─── */}
      <Card className="border border-border/70 bg-card/60 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  Step 1: Get the Institutional Template
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 font-medium"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3 inline" /> Official BukSU Standard
                </Badge>
              </div>
              <h3 className="text-sm font-semibold text-foreground truncate">
                {effectiveTemplate.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Make a personal team copy to begin drafting Chapters 1, 2, and 3 according to the
                official BukSU capstone format ·{' '}
                <span className="font-medium text-foreground">{effectiveTemplate.version}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
              onClick={handleOpenGoogleDocsCopy}
            >
              <Sparkles className="h-3.5 w-3.5" /> Use Google Docs Copy
              <ExternalLink className="h-3 w-3 ml-0.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-border/70 hover:bg-muted/50"
              onClick={handleDownloadDocx}
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" /> Download .DOCX
            </Button>
          </div>
        </div>
      </Card>

      {/* ─── SECTION 2: WORKING GOOGLE DOCS LINK ATTACHMENT ─── */}
      <Card
        className={`border rounded-xl overflow-hidden shadow-xs transition-colors ${
          existingUrl
            ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10'
            : 'border-primary/30 bg-primary/5 dark:bg-primary/10'
        }`}
      >
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  existingUrl
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                <Link2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step 2: Attach Working Manuscript Link
                  </span>
                  {existingUrl && !isEditing && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] py-0"
                    >
                      <Check className="mr-1 h-3 w-3 inline" /> Attached
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Team Working Document (Google Docs / Drive)
                </CardTitle>
                <CardDescription className="text-xs">
                  Attach your active working document link so your adviser, secretary, and panelists
                  can review real-time revisions and leave line-item comments.
                </CardDescription>
              </div>
            </div>

            {existingUrl && !isEditing && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEditing}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit Link
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0">
          {/* STATE A: Link is attached & not in editing mode */}
          {existingUrl && !isEditing ? (
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-white/70 dark:bg-card/70 p-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <a
                    href={existingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline truncate max-w-[280px] sm:max-w-md lg:max-w-xl"
                  >
                    {existingUrl}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs"
                    onClick={() => window.open(existingUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-3 w-3" /> Open in Google Docs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-border/70"
                    disabled={syncPermissionsMutation.isPending}
                    onClick={handleSyncPermissions}
                  >
                    {syncPermissionsMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Share2 className="h-3 w-3 text-muted-foreground" />
                    )}
                    Sync Committee Access
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Tip: Keep document permissions set to &quot;Anyone with the BukSU link can
                  comment&quot; so your committee members can leave feedback directly.
                </span>
              </div>
            </div>
          ) : (
            /* STATE B: No link attached yet OR user clicked 'Edit Link' */
            <form onSubmit={handleAttachLink} className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="h-9 text-xs bg-white dark:bg-card border-border/70 pr-8"
                  />
                  <Link2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={uploadManuscriptMutation.isPending}
                    className="h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
                  >
                    {uploadManuscriptMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {existingUrl ? 'Update Link' : 'Attach Google Docs Link'}
                  </Button>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditing}
                      className="h-9 text-xs"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Requirement:</strong> Before submitting chapters for review, attach your
                  team&apos;s working Google Doc. Ensure sharing access allows your appointed
                  Adviser, Secretary, and Panelists to view and comment.
                </span>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

Capstone2ManuscriptHub.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    metadata: PropTypes.object,
  }),
};
