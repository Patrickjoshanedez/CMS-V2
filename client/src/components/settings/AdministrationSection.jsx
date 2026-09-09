import { useState, useEffect } from 'react';
import {
  Settings2,
  Loader2,
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { useUpdateManuscriptTemplate } from '@/hooks/useTeams';
import { SettingSection } from './SettingsShared';
import { toast } from 'sonner';

export default function AdministrationSection() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();
  const updateManuscriptTemplate = useUpdateManuscriptTemplate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    plagiarismThreshold: 75,
    titleSimilarityThreshold: 0.65,
    maxFileSize: 25,
    systemAnnouncement: '',
    maintenanceMode: false,
  });
  const [proposalTemplateUrl, setProposalTemplateUrl] = useState(
    'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
  );
  const [admSpreadsheetUrl, setAdmSpreadsheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1q6Q7-4_KxKx_ActionDoneMatrix/edit',
  );
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        plagiarismThreshold: settings.plagiarismThreshold ?? 75,
        titleSimilarityThreshold: settings.titleSimilarityThreshold ?? 0.65,
        maxFileSize: settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 25,
        systemAnnouncement: settings.systemAnnouncement ?? '',
        maintenanceMode: Boolean(settings.maintenanceMode),
      });

      const templates = settings.documentTemplates || [];
      const proposalTpl = templates.find(
        (t) => t.documentType === 'proposal_template' || t.documentType === 'manuscript_template',
      );
      const admTpl = templates.find((t) => t.documentType === 'adm_form');
      if (proposalTpl?.templateUrl) {
        setProposalTemplateUrl(proposalTpl.templateUrl);
      }
      if (admTpl?.templateUrl) {
        setAdmSpreadsheetUrl(admTpl.templateUrl);
      }

      setDirty(false);
    }
  }, [settings]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleReset = () => {
    if (settings) {
      setForm({
        plagiarismThreshold: settings.plagiarismThreshold ?? 75,
        titleSimilarityThreshold: settings.titleSimilarityThreshold ?? 0.65,
        maxFileSize: settings.maxFileSize ? Math.round(settings.maxFileSize / (1024 * 1024)) : 25,
        systemAnnouncement: settings.systemAnnouncement ?? '',
        maintenanceMode: Boolean(settings.maintenanceMode),
      });
      const templates = settings.documentTemplates || [];
      const proposalTpl = templates.find(
        (t) => t.documentType === 'proposal_template' || t.documentType === 'manuscript_template',
      );
      const admTpl = templates.find((t) => t.documentType === 'adm_form');
      if (proposalTpl?.templateUrl) {
        setProposalTemplateUrl(proposalTpl.templateUrl);
      }
      if (admTpl?.templateUrl) {
        setAdmSpreadsheetUrl(admTpl.templateUrl);
      }
      setDirty(false);
    }
  };

  const handleSaveTemplates = async (e) => {
    e?.preventDefault();
    const cleanProposalUrl = proposalTemplateUrl.trim();
    const cleanAdmUrl = admSpreadsheetUrl.trim();

    if (cleanProposalUrl) {
      try {
        const parsed = new URL(cleanProposalUrl);
        if (!parsed.protocol.startsWith('http')) throw new Error();
      } catch {
        toast.error('Please enter a valid web URL for the proposal/manuscript template.');
        return;
      }
    }

    if (cleanAdmUrl) {
      try {
        const parsed = new URL(cleanAdmUrl);
        if (!parsed.protocol.startsWith('http')) throw new Error();
      } catch {
        toast.error('Please enter a valid web URL for the Action Done Matrix spreadsheet.');
        return;
      }
    }

    setIsSavingTemplates(true);
    try {
      const documentTemplates = [
        {
          documentType: 'proposal_template',
          templateUrl: cleanProposalUrl,
          description: 'Capstone 1 Proposal Manuscript Template',
          lastUpdated: new Date(),
        },
        {
          documentType: 'manuscript_template',
          templateUrl: cleanProposalUrl,
          description: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
          lastUpdated: new Date(),
        },
        {
          documentType: 'adm_form',
          templateUrl: cleanAdmUrl,
          description: 'Action Done Matrix (ADM) Official Template',
          lastUpdated: new Date(),
        },
      ];

      // 1. Update SystemSettings documentTemplates
      await updateSettings.mutateAsync({ documentTemplates });

      // 2. Cascade to active DocumentTemplate collection so getTeamManuscriptTemplate returns it
      if (cleanProposalUrl) {
        await updateManuscriptTemplate.mutateAsync({
          targetType: 'MANUSCRIPT_CHAPTERS_1_5',
          academicYear: '2025-2026',
          versionLabel: 'AY 2025–2026 v2.1',
          distributionType: 'GOOGLE_DOCS',
          docUrl: cleanProposalUrl,
        });
      }
      if (cleanAdmUrl) {
        await updateManuscriptTemplate.mutateAsync({
          targetType: 'ACTION_DONE_MATRIX',
          academicYear: '2025-2026',
          versionLabel: 'AY 2025–2026 v2.1',
          distributionType: 'GOOGLE_DOCS',
          docUrl: cleanAdmUrl,
        });
      }

      // 3. Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast.success('Document templates saved and cascaded to student workspaces.');
    } catch (err) {
      toast.error(
        err?.response?.data?.error?.message || err?.message || 'Failed to save document templates.',
      );
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (form.plagiarismThreshold < 0 || form.plagiarismThreshold > 100) {
      toast.error('Plagiarism threshold must be between 0 and 100.');
      return;
    }
    if (form.titleSimilarityThreshold < 0 || form.titleSimilarityThreshold > 1) {
      toast.error('Title similarity threshold must be between 0 and 1.');
      return;
    }
    if (form.maxFileSize < 1 || form.maxFileSize > 100) {
      toast.error('Max file size must be between 1 and 100 MB.');
      return;
    }
    if (form.systemAnnouncement.length > 500) {
      toast.error('System announcement must be 500 characters or less.');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        plagiarismThreshold: Number(form.plagiarismThreshold),
        titleSimilarityThreshold: Number(form.titleSimilarityThreshold),
        maxFileSize: Number(form.maxFileSize) * 1024 * 1024,
        systemAnnouncement: form.systemAnnouncement.trim(),
        maintenanceMode: Boolean(form.maintenanceMode),
        documentTemplates: [
          {
            documentType: 'proposal_template',
            templateUrl: proposalTemplateUrl.trim(),
            description: 'Capstone 1 Proposal Manuscript Template',
            lastUpdated: new Date(),
          },
          {
            documentType: 'manuscript_template',
            templateUrl: proposalTemplateUrl.trim(),
            description: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
            lastUpdated: new Date(),
          },
          {
            documentType: 'adm_form',
            templateUrl: admSpreadsheetUrl.trim(),
            description: 'Action Done Matrix (ADM) Official Template',
            lastUpdated: new Date(),
          },
        ],
      });

      if (proposalTemplateUrl.trim()) {
        await updateManuscriptTemplate.mutateAsync({
          targetType: 'MANUSCRIPT_CHAPTERS_1_5',
          academicYear: '2025-2026',
          versionLabel: 'AY 2025–2026 v2.1',
          distributionType: 'GOOGLE_DOCS',
          docUrl: proposalTemplateUrl.trim(),
        });
      }

      toast.success('System settings updated successfully.');
      setDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update settings.');
    }
  };

  if (isLoading) {
    return (
      <SettingSection
        icon={Settings2}
        title="System Administration"
        description="Configure system-wide thresholds and announcements."
        badge="Instructor"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </SettingSection>
    );
  }

  if (isError) {
    return (
      <SettingSection
        icon={Settings2}
        title="System Administration"
        description="Configure system-wide thresholds and announcements."
        badge="Instructor"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system settings. Please try again later.
          </AlertDescription>
        </Alert>
      </SettingSection>
    );
  }

  return (
    <SettingSection
      icon={Settings2}
      title="System Administration"
      description="Configure system-wide thresholds, limits, and announcements."
      badge="Instructor"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plagiarism Threshold */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="settings-plagiarismThreshold" className="text-sm font-medium">
                Minimum Originality Threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                Submissions must meet this originality percentage to pass plagiarism checks.
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {form.plagiarismThreshold}%
            </Badge>
          </div>
          <Input
            id="settings-plagiarismThreshold"
            type="range"
            min={0}
            max={100}
            step={1}
            value={form.plagiarismThreshold}
            onChange={(e) => handleChange('plagiarismThreshold', Number(e.target.value))}
            className="h-2 cursor-pointer accent-primary"
          />
        </div>

        {/* Title Similarity Threshold */}
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="settings-titleSimilarityThreshold" className="text-sm font-medium">
                Title Similarity Threshold
              </Label>
              <p className="text-xs text-muted-foreground">
                Proposed titles exceeding this similarity score will trigger a duplicate warning.
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums">
              {(form.titleSimilarityThreshold * 100).toFixed(0)}%
            </Badge>
          </div>
          <Input
            id="settings-titleSimilarityThreshold"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.titleSimilarityThreshold}
            onChange={(e) => handleChange('titleSimilarityThreshold', Number(e.target.value))}
            className="h-2 cursor-pointer accent-primary"
          />
        </div>

        {/* Max File Size */}
        <div className="space-y-3 rounded-lg border p-4">
          <Label htmlFor="settings-maxFileSize" className="text-sm font-medium">
            Maximum File Size (MB)
          </Label>
          <Input
            id="settings-maxFileSize"
            type="number"
            min={1}
            max={100}
            value={form.maxFileSize}
            onChange={(e) => handleChange('maxFileSize', Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Maximum allowed file size for chapter uploads and final submissions.
          </p>
        </div>

        {/* Deliverables Deadlines */}
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Deliverable Submission Milestones &amp; Deadlines
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Establish institutional deadline dates for capstone research milestones.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Title Proposal Deadline</Label>
              <Input type="date" className="h-8 text-xs" defaultValue="2026-09-15" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capstone 1 (Chapters 1–3) Deadline</Label>
              <Input type="date" className="h-8 text-xs" defaultValue="2026-10-30" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capstone 2 (Prototype &amp; ADM) Deadline</Label>
              <Input type="date" className="h-8 text-xs" defaultValue="2026-12-15" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capstone 3 (Final Manuscript) Deadline</Label>
              <Input type="date" className="h-8 text-xs" defaultValue="2027-02-28" />
            </div>
          </div>
        </div>

        {/* Institutional Document Templates */}
        <div className="space-y-4 rounded-lg border border-border/70 p-4 bg-card/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">
                Institutional Document Templates &amp; Forms
              </h4>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/80">
              Auto-Cascades to Students
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure default Google Docs templates and Action Done Matrix spreadsheets for student
            access.
          </p>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Google Docs Title Proposal Template URL</Label>
              <Input
                type="url"
                placeholder="https://docs.google.com/document/d/..."
                value={proposalTemplateUrl}
                onChange={(e) => {
                  setProposalTemplateUrl(e.target.value);
                  setDirty(true);
                }}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action Done Matrix Spreadsheet URL</Label>
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={admSpreadsheetUrl}
                onChange={(e) => {
                  setAdmSpreadsheetUrl(e.target.value);
                  setDirty(true);
                }}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleSaveTemplates}
                disabled={isSavingTemplates}
                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                {isSavingTemplates ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Document Templates
              </Button>
            </div>
          </div>
        </div>

        {dirty && (
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleReset}>
              Discard Changes
            </Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save System Settings
            </Button>
          </div>
        )}
      </form>
    </SettingSection>
  );
}
