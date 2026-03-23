import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  useProjectManuscripts,
  useUploadManuscript,
  useSubmitManuscriptReview,
  useSyncManuscriptComments,
  useSyncManuscriptPermissions,
} from '@/hooks/useDocuments';
import { DOCUMENT_TYPES, ROLES } from '@cms/shared';
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

const DOC_TYPE_LABELS = {
  [DOCUMENT_TYPES.CHAPTER_1]: 'Chapter 1',
  [DOCUMENT_TYPES.CHAPTER_2]: 'Chapter 2',
  [DOCUMENT_TYPES.CHAPTER_3]: 'Chapter 3',
  [DOCUMENT_TYPES.CHAPTER_4]: 'Chapter 4',
  [DOCUMENT_TYPES.CHAPTER_5]: 'Chapter 5',
  [DOCUMENT_TYPES.PROPOSAL]: 'Full Proposal',
  [DOCUMENT_TYPES.FINAL_ACADEMIC]: 'Final (Academic)',
  [DOCUMENT_TYPES.FINAL_JOURNAL]: 'Final (Journal)',
};

function UploadForm({ onSubmit, isLoading, canUpload }) {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES.CHAPTER_1);
  const [title, setTitle] = useState('');
  const [externalDocUrl, setExternalDocUrl] = useState('');
  const [externalDocProvider, setExternalDocProvider] = useState('google_docs');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!externalDocUrl.trim()) {
      toast.error('Please enter a document URL.');
      return;
    }

    try {
      new URL(externalDocUrl);
    } catch {
      toast.error('Please enter a valid URL.');
      return;
    }

    onSubmit({
      documentType,
      title: title.trim() || undefined,
      externalDocUrl: externalDocUrl.trim(),
      externalDocProvider,
    });
  };

  if (!canUpload) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Manuscript</CardTitle>
        <CardDescription>
          Submit a link to your external document (Google Docs, etc.). Advisers and instructors will review via the link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <select
                id="documentType"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Optional Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Leave empty to use default title"
                maxLength={300}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">Document Provider</Label>
            <select
              id="provider"
              value={externalDocProvider}
              onChange={(event) => setExternalDocProvider(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="google_docs">Google Docs</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docUrl">Document URL *</Label>
            <Input
              id="docUrl"
              type="url"
              value={externalDocUrl}
              onChange={(event) => setExternalDocUrl(event.target.value)}
              placeholder="https://docs.google.com/document/d/... or other URL"
              required
            />
            <p className="text-xs text-muted-foreground">
              Share a link to your document (must be accessible to advisers/instructors).
            </p>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            Submit Document Link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ManuscriptRow({ manuscript, projectId, canReview, onSyncPermissions, onSyncComments, onSubmitReview }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="truncate font-semibold">{manuscript.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {DOC_TYPE_LABELS[manuscript.documentType] || manuscript.documentType}
              </Badge>
              <Badge variant="secondary">{manuscript.reviewStatus || 'pending_review'}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/projects/${projectId}/documents/${manuscript.documentType}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>

            <Button variant="outline" size="sm" onClick={() => onSyncPermissions(manuscript.documentType)}>
              <Save className="mr-2 h-4 w-4" />
              Sync Permissions
            </Button>

            {canReview && (
              <>
                <Button variant="outline" size="sm" onClick={() => onSyncComments(manuscript.documentType)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Comments
                </Button>
                <Button size="sm" onClick={() => onSubmitReview(manuscript.documentType)}>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Review
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplateManagementPage() {
  const { user } = useAuthStore();
  const [projectId, setProjectId] = useState('');

  const canUpload = useMemo(
    () => user?.role === ROLES.STUDENT || user?.role === ROLES.INSTRUCTOR,
    [user?.role],
  );

  const canReview = useMemo(
    () => user?.role === ROLES.ADVISER || user?.role === ROLES.INSTRUCTOR,
    [user?.role],
  );

  const {
    data,
    isLoading,
    error: listError,
  } = useProjectManuscripts(projectId, {
    enabled: !!projectId,
  });

  const uploadMutation = useUploadManuscript(projectId, {
    onSuccess: () => toast.success('Manuscript uploaded successfully.'),
    onError: (error) => toast.error(error?.response?.data?.message || 'Failed to upload manuscript.'),
  });

  const syncPermissionsMutation = useSyncManuscriptPermissions(projectId, {
    onSuccess: () => toast.success('Permissions synchronized.'),
    onError: (error) => toast.error(error?.response?.data?.message || 'Failed to sync permissions.'),
  });

  const syncCommentsMutation = useSyncManuscriptComments(projectId, {
    onSuccess: () => toast.success('Comments synchronized.'),
    onError: (error) => toast.error(error?.response?.data?.message || 'Failed to sync comments.'),
  });

  const submitReviewMutation = useSubmitManuscriptReview(projectId, {
    onSuccess: () => toast.success('Review submitted and comments archived.'),
    onError: (error) => toast.error(error?.response?.data?.message || 'Failed to submit review.'),
  });

  const manuscripts = data?.manuscripts || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manuscript Review Workspace</h1>
          <p className="text-muted-foreground">
            Enter a project ID to upload manuscripts, open Google review links, and manage review sync.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Project Context</CardTitle>
            <CardDescription>
              This workspace is project-scoped. Provide the project ID before loading manuscripts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value.trim())}
              placeholder="Paste a project ID"
            />
          </CardContent>
        </Card>

        <UploadForm
          canUpload={canUpload && !!projectId}
          onSubmit={(payload) => uploadMutation.mutate(payload)}
          isLoading={uploadMutation.isPending}
        />

        {!projectId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Set a project ID first to load manuscript records.</AlertDescription>
          </Alert>
        )}

        {projectId && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {projectId && listError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {listError?.response?.data?.message || 'Failed to load manuscripts for this project.'}
            </AlertDescription>
          </Alert>
        )}

        {projectId && !isLoading && !listError && manuscripts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No manuscripts found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload the first manuscript file to initialize this project review workspace.
              </p>
            </CardContent>
          </Card>
        )}

        {manuscripts.length > 0 && (
          <div className="grid gap-3">
            {manuscripts.map((manuscript) => (
              <ManuscriptRow
                key={manuscript._id}
                manuscript={manuscript}
                projectId={projectId}
                canReview={canReview}
                onSyncPermissions={(documentType) => syncPermissionsMutation.mutate(documentType)}
                onSyncComments={(documentType) => syncCommentsMutation.mutate(documentType)}
                onSubmitReview={(documentType) => submitReviewMutation.mutate(documentType)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
