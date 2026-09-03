import { useState, useEffect } from 'react';
import { Settings2, Loader2, AlertTriangle, Calendar, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { SettingSection } from './SettingsShared';
import { toast } from 'sonner';

export default function AdministrationSection() {
  const { data: settings, isLoading, isError } = useSettings();
  const updateSettings = useUpdateSettings();

  const [form, setForm] = useState({
    plagiarismThreshold: 75,
    titleSimilarityThreshold: 0.65,
    maxFileSize: 25,
    systemAnnouncement: '',
    maintenanceMode: false,
  });
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
      setDirty(false);
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
      });
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
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">
              Institutional Document Templates &amp; Forms
            </h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure default Google Docs templates and Action Done Matrix spreadsheets for student
            access.
          </p>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Google Docs Title Proposal Template URL</Label>
              <Input
                placeholder="https://docs.google.com/document/d/..."
                defaultValue="https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Action Done Matrix Spreadsheet URL</Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                defaultValue="https://docs.google.com/spreadsheets/d/1q6Q7-4_KxKx_ActionDoneMatrix/edit"
                className="h-8 text-xs"
              />
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
