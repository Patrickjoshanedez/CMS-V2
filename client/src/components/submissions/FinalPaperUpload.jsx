import { useState, useRef } from 'react';
import { FileText, Lock, Globe, Upload, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useUploadFinalAcademic, useUploadFinalJournal } from '@/hooks/useSubmissions';

function UploadSection({ icon: Icon, iconClass, label, badge, badgeVariant, description, mutation, projectId }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped?.type === 'application/pdf') setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await mutation.mutateAsync({ projectId, file });
      toast.success(`${label} uploaded successfully.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to upload ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <h3 className="font-semibold text-base">{label}</h3>
        <Badge variant={badgeVariant} className="text-xs">{badge}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/40 p-6 cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/60"
      >
        <FileText className="h-8 w-8 text-muted-foreground/60" />
        {file ? (
          <span className="text-sm font-medium truncate max-w-[280px]">{file.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Click or drag a PDF file here</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <Button
        onClick={handleUpload}
        disabled={!file || mutation.isPending}
        className="w-full"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </>
        )}
      </Button>
    </div>
  );
}

export default function FinalPaperUpload({ projectId }) {
  const academicMutation = useUploadFinalAcademic();
  const journalMutation = useUploadFinalJournal();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Paper Submission</CardTitle>
        <CardDescription>
          Upload both required versions of your final capstone paper for archiving.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Capstone 4 requires two final paper versions for archiving.
          </AlertDescription>
        </Alert>

        <UploadSection
          icon={Lock}
          iconClass="text-amber-500"
          label="Full Academic Version"
          badge="Restricted"
          badgeVariant="secondary"
          description="The complete academic manuscript with all chapters and references. This will be restricted to faculty access only."
          mutation={academicMutation}
          projectId={projectId}
        />

        <div className="border-t" />

        <UploadSection
          icon={Globe}
          iconClass="text-blue-500"
          label="Journal / Publishable Version"
          badge="Public"
          badgeVariant="outline"
          description="A condensed version suitable for publication. This will be publicly searchable in the archive."
          mutation={journalMutation}
          projectId={projectId}
        />
      </CardContent>
    </Card>
  );
}
