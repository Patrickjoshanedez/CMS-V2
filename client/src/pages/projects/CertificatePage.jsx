import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Download, FileText, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUploadCertificate, useCertificateUrl, useApprovalSheetUrl } from '@/hooks/useProjects';
import { ROLES } from '@cms/shared';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import Spinner from '@/components/ui/Spinner';
import SophisticatedDocumentViewer from '@/components/documents/SophisticatedDocumentViewer';

export default function CertificatePage() {
  const { projectId } = useParams();
  const { user } = useAuthStore();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approvalPreviewOpen, setApprovalPreviewOpen] = useState(false);

  const { data: certData, isLoading, isError, error, refetch } = useCertificateUrl(projectId);
  const {
    data: approvalData,
    isLoading: approvalLoading,
    error: approvalError,
  } = useApprovalSheetUrl(projectId);
  const approvalSheetUrl = approvalData?.url ?? null;
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
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" role="status" aria-live="polite">
          <span className="sr-only">Loading certificate</span>
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Card className="border-border/60">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isError && !isMissingCertificate) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Capstone Completion"
            icon={FileText}
            title="Completion Certificate"
            description="Final completion certificate for this capstone project"
          />
          <Alert variant="destructive" className="max-w-3xl">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              {error?.message || 'Failed to load certificate information.'}
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="min-h-[44px]"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="certificate-page-content" className="space-y-6">
        <PageHeader
          eyebrow="Capstone Completion"
          icon={FileText}
          title="Completion Certificate"
          description="Final completion certificate for this capstone project"
        />

        <Card className="max-w-3xl border-border/60">
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
                    className="min-h-[44px]"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
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
                  This certificate was generated after archival and is sealed. Its QR code opens the
                  public verification record.
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
                    className="min-h-[44px]"
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

                <Button
                  className="min-h-[44px]"
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Certificate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Official Phase 4 Final Approval Sheet */}
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Final Approval Sheet</CardTitle>
                  <CardDescription>
                    Official BukSU Capstone Final Approval Sheet with committee signatures.
                  </CardDescription>
                </div>
              </div>
              {approvalSheetUrl && <Badge variant="default">Ready</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvalLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : approvalSheetUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() => setApprovalPreviewOpen(true)}
                  data-testid="preview-approval-sheet-btn"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Approval Sheet
                </Button>
                <a
                  href={approvalSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  data-testid="download-approval-sheet-link"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Approval Sheet PDF
                </a>
              </div>
            ) : (
              <Alert>
                <AlertDescription className="text-xs text-muted-foreground">
                  {approvalError?.response?.data?.error?.message ||
                    'Final Approval Sheet becomes available once all required Phase 4 ADM signatures are completed.'}
                </AlertDescription>
              </Alert>
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

      {approvalPreviewOpen && approvalSheetUrl && (
        <SophisticatedDocumentViewer
          open={approvalPreviewOpen}
          onOpenChange={setApprovalPreviewOpen}
          fileUrl={approvalSheetUrl}
          submission={{
            title: 'Final Approval Sheet',
            fileName: 'Final_Approval_Sheet.pdf',
            fileType: 'application/pdf',
            chapter: 'Approval Sheet',
          }}
        />
      )}
    </DashboardLayout>
  );
}
