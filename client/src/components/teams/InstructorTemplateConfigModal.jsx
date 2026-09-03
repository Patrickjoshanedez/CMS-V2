import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Settings, FileText, Link, Upload, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useUpdateManuscriptTemplate } from '@/hooks/useTeams';
import { toast } from 'sonner';

export function InstructorTemplateConfigModal({ academicYear = '2025-2026', onSaved }) {
  const [open, setOpen] = useState(false);
  const [templateType, setTemplateType] = useState('google_docs');
  const [docUrl, setDocUrl] = useState('https://docs.google.com/document/d/1tTwi29xL.../copy');
  const [versionTag, setVersionTag] = useState(`AY ${academicYear} v2.1`);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const updateTemplate = useUpdateManuscriptTemplate({
    onSuccess: () => {
      toast.success('Manuscript template updated and cascaded to all approved teams.');
      setOpen(false);
      onSaved?.();
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.error?.message ||
          'Failed to update institutional manuscript template.',
      );
    },
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (templateType === 'google_docs' && !docUrl.trim()) {
      toast.error('Please provide a valid Google Docs URL.');
      return;
    }

    updateTemplate.mutate({
      academicYear,
      versionLabel: versionTag.trim() || `AY ${academicYear} v2.1`,
      distributionType: templateType,
      docUrl: docUrl.trim(),
      fileName: uploadedFileName || 'official_capstone_manuscript_template.docx',
      fileAttachmentUrl: uploadedFileName ? `/templates/${uploadedFileName}` : null,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      toast.success(`Selected file: ${file.name}`);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-border/70"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-3.5 w-3.5" />
        Configure Manuscript Template
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <Card
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
            className="w-full max-w-[520px] border-border/70 shadow-xl"
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b pb-3">
                <div className="space-y-1">
                  <h3
                    id="template-dialog-title"
                    className="text-base font-semibold flex items-center gap-2 text-foreground"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    Manage Institutional Manuscript Template
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure the official manuscript template provided to students after title
                    defense approval.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Template Version / Academic Year Label
                  </Label>
                  <Input
                    value={versionTag}
                    onChange={(e) => setVersionTag(e.target.value)}
                    placeholder="e.g. AY 2025–2026 v2.1"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Distribution Method</Label>
                  <Tabs
                    defaultValue={templateType}
                    value={templateType}
                    onValueChange={(val) => setTemplateType(val)}
                  >
                    <TabsList className="grid grid-cols-2 h-8 w-full">
                      <TabsTrigger value="google_docs" className="text-xs gap-1.5">
                        <Link className="h-3 w-3" /> Google Docs Copy Link
                      </TabsTrigger>
                      <TabsTrigger value="file" className="text-xs gap-1.5">
                        <Upload className="h-3 w-3" /> Direct File Upload (.DOCX)
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="google_docs" className="pt-2 space-y-1.5">
                      <Input
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="https://docs.google.com/document/d/.../copy"
                        className="h-9 text-xs font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Pro-tip: Append <code className="text-primary font-mono">/copy</code> to the
                        URL so students automatically generate their own editable working copy.
                      </p>
                    </TabsContent>

                    <TabsContent value="file" className="pt-2 space-y-2">
                      <label className="border border-dashed border-border/80 rounded-lg p-5 text-center bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors block">
                        <input
                          type="file"
                          accept=".docx,.dotx"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                        <p className="text-xs font-medium text-foreground">
                          {uploadedFileName
                            ? `Selected: ${uploadedFileName}`
                            : 'Click to upload new .docx or .dotx template'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Maximum file size: 25MB
                        </p>
                      </label>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="border-t pt-3 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setOpen(false)}
                    disabled={updateTemplate.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 text-xs bg-primary gap-1.5"
                    disabled={updateTemplate.isPending}
                  >
                    {updateTemplate.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save & Cascade to All Approved Teams
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

InstructorTemplateConfigModal.propTypes = {
  academicYear: PropTypes.string,
  onSaved: PropTypes.func,
};

export default InstructorTemplateConfigModal;
