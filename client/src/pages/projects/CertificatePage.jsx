import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Download, FileText, Loader2, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUploadCertificate, useCertificateUrl } from '@/hooks/useProjects';
import { ROLES } from '@cms/shared';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';

export default function CertificatePage() {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: certData, isLoading, isError, error, refetch } = useCertificateUrl(projectId);
  const uploadMutation = useUploadCertificate();

  const certificateErrorCode = error?.response?.data?.error?.code ?? error?.code;
  const isMissingCertificate = certificateErrorCode === 'NO_CERTIFICATE';
  const certificateUrl = certData?.url ?? null;
  const isSealedCertificate = Boolean(certData?.verificationHash);
  const isInstructor = user?.role === ROLES.INSTRUCTOR;
  let certificateDescription = 'View and download the completion certificate.';
  if (isInstructor) {
    certificateDescription = isSealedCertificate
      ? 'The archived certificate is sealed and includes a QR verification link.'
      : 'Upload or manage the completion certificate for this project.';
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      await uploadMutation.mutateAsync({ projectId, formData });
      toast.success('Certificate uploaded successfully');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Failed to upload certificate');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError && !isMissingCertificate) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message || 'Failed to load certificate information.'}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Completion Certificate</h1>
          <p className="text-muted-foreground mt-1">
            Final completion certificate for this capstone project
          </p>
        </div>

        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-lg">Certificate</CardTitle>
            <CardDescription>{certificateDescription}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Current certificate display */}
            {certificateUrl && (
              <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Completion Certificate</p>
                    <Badge variant={isSealedCertificate ? 'success' : 'secondary'} className="mt-1">
                      {isSealedCertificate ? 'QR verified' : 'Uploaded'}
                    </Badge>
                    {isSealedCertificate && (
                      <p
                        className="mt-2 max-w-[min(72vw,360px)] truncate font-mono text-xs text-muted-foreground"
                        title={certData.verificationHash}
                      >
                        Verification: {certData.verificationHash}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={certificateUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* No certificate message for non-instructors */}
            {!certificateUrl && !isInstructor && (
              <Alert>
                <AlertDescription>No certificate has been uploaded yet.</AlertDescription>
              </Alert>
            )}

            {/* Upload form for instructors */}
            {isInstructor && isSealedCertificate && (
              <Alert>
                <AlertDescription>
                  This certificate was generated after archival and is sealed. Its QR code opens the public verification record.
                </AlertDescription>
              </Alert>
            )}

            {isInstructor && !isSealedCertificate && (
              <div className="space-y-4 rounded-lg border bg-background p-4">
                <p className="text-sm font-medium text-foreground">
                  {certificateUrl ? 'Replace Certificate' : 'Upload Certificate'}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    Choose File
                  </Button>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {selectedFile ? selectedFile.name : 'No file selected'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Accepted format: PDF only (max 10MB)
                </p>

                <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Certificate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {previewOpen && certificateUrl && (
        <SophisticatedDocumentViewer
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          fileUrl={certificateUrl}
          submission={{
            title: 'Completion Certificate',
            fileName: 'Completion_Certificate.pdf',
            fileType: 'application/pdf',
            chapter: 'Certificate',
          }}
        />
      )}
    </DashboardLayout>
  );
}
