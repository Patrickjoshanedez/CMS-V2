import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import PageSkeleton from '@/components/ui/PageSkeleton';
import {
  useProjectManuscripts,
  useUploadManuscript,
  useSubmitManuscriptReview,
  useSyncManuscriptComments,
  useSyncManuscriptPermissions,
} from '@/hooks/useDocuments';
import { DOCUMENT_TYPES, ROLES } from '@cms/shared';
import { AlertCircle, ExternalLink, FileText, RefreshCw, Save, Send } from 'lucide-react';
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

const REVIEW_STATUS_LABELS = {
  pending: 'Pending Review',
  pending_review: 'Pending Review',
  review_submitted: 'Review Submitted',
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
          Submit a link to your external document (Google Docs, etc.). Advisers and instructors will
          review via the link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType" aria-label="Document Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Select value={externalDocProvider} onValueChange={setExternalDocProvider}>
              <SelectTrigger id="provider" aria-label="Document Provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_docs">Google Docs</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
            {isLoading ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Submit Document Link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ManuscriptRow({
  manuscript,
  projectId,
  canReview,
  canSyncPermissions,
  onSyncPermissions,
  onSyncComments,
  onSubmitReview,
}) {
  const navigate = useNavigate();

  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0 p-4">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="min-w-0 flex-1 break-words font-semibold leading-snug">
                {manuscript.title}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {DOC_TYPE_LABELS[manuscript.documentType] || manuscript.documentType}
              </Badge>
              <Badge variant="secondary">
                {REVIEW_STATUS_LABELS[manuscript.reviewStatus] || 'Pending Review'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/projects/${projectId}/documents/${manuscript.documentType}`)
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>

            {canSyncPermissions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSyncPermissions(manuscript.documentType)}
              >
                <Save className="mr-2 h-4 w-4" />
                Sync Permissions
              </Button>
            )}

            {canReview && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSyncComments(manuscript.documentType)}
                >
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

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/**
 * Extract the backend API error message cleanly across `{ error: { message } }` and flat `{ message }` envelopes.
 *
 * @param {unknown} error
 * @param {string} fallback
 * @returns {string}
 */
export function getDocumentApiErrorMessage(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback;
}

export default function TemplateManagementPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(() => searchParams.get('projectId')?.trim() || '');

  useEffect(() => {
    const queryProjectId = searchParams.get('projectId')?.trim() || '';
    if (queryProjectId !== projectId) {
      setProjectId(queryProjectId);
    }
  }, [searchParams, projectId]);

  const handleProjectIdChange = (event) => {
    const value = event.target.value.trim();
    setProjectId(value);

    const nextParams = new URLSearchParams(searchParams);
    if (value) {
      nextParams.set('projectId', value);
    } else {
      nextParams.delete('projectId');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const canUpload = useMemo(
    () => user?.role === ROLES.STUDENT || user?.role === ROLES.INSTRUCTOR,
    [user?.role],
  );

  const canReview = useMemo(
    () =>
      user?.role === ROLES.ADVISER ||
      user?.role === ROLES.FACULTY ||
      user?.role === ROLES.INSTRUCTOR,
    [user?.role],
  );

  const canSyncPermissions = useMemo(
    () =>
      user?.role === ROLES.STUDENT ||
      user?.role === ROLES.ADVISER ||
      user?.role === ROLES.FACULTY ||
      user?.role === ROLES.INSTRUCTOR,
    [user?.role],
  );

  const hasValidProjectId = OBJECT_ID_PATTERN.test(projectId);

  const {
    data,
    isLoading,
    error: listError,
  } = useProjectManuscripts(projectId, {
    enabled: hasValidProjectId,
  });

  const uploadMutation = useUploadManuscript(projectId, {
    onSuccess: () => toast.success('Manuscript uploaded successfully.'),
    onError: (error) =>
      toast.error(getDocumentApiErrorMessage(error, 'Failed to upload manuscript.')),
  });

  const syncPermissionsMutation = useSyncManuscriptPermissions(projectId, {
    onSuccess: () => toast.success('Permissions synchronized.'),
    onError: (error) =>
      toast.error(getDocumentApiErrorMessage(error, 'Failed to sync permissions.')),
  });

  const syncCommentsMutation = useSyncManuscriptComments(projectId, {
    onSuccess: () => toast.success('Comments synchronized.'),
    onError: (error) => toast.error(getDocumentApiErrorMessage(error, 'Failed to sync comments.')),
  });

  const submitReviewMutation = useSubmitManuscriptReview(projectId, {
    onSuccess: () => toast.success('Review submitted and comments archived.'),
    onError: (error) => toast.error(getDocumentApiErrorMessage(error, 'Failed to submit review.')),
  });

  const manuscripts = data?.manuscripts || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Cloud Documents"
          icon={FileText}
          title="Manuscript Review Workspace"
          description="Open this page from a project to auto-fill context, or enter a project ID manually to upload manuscripts, open review links, and manage sync."
        />

        <Card>
          <CardHeader>
            <CardTitle>Project Context</CardTitle>
            <CardDescription>
              This workspace is project-scoped. Project ID is auto-filled when provided in the URL,
              and can still be edited manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                value={projectId}
                onChange={handleProjectIdChange}
                placeholder="Paste a project ID"
              />
            </div>
            <div
              data-testid="file-management-nav-bar"
              className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3"
            >
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tip: Open this workspace directly from your project&apos;s Submissions page to
                auto-fill the Project ID, or use the shortcuts below to manage chapter files and
                archive records.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      hasValidProjectId
                        ? `/project/submissions?projectId=${projectId}`
                        : '/project/submissions',
                    )
                  }
                  className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Go to Chapter Submissions</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(user?.role === ROLES.STUDENT ? '/project?tab=capstone_1' : '/projects')
                  }
                  className="min-h-11 sm:min-h-9 gap-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {user?.role === ROLES.STUDENT
                      ? 'Go to My Capstone'
                      : 'Browse Projects Directory'}
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <UploadForm
          canUpload={canUpload && hasValidProjectId}
          onSubmit={(payload) => uploadMutation.mutate(payload)}
          isLoading={uploadMutation.isPending}
        />

        {!projectId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Set a project ID first, or open this page from a project quick action to prefill it.
            </AlertDescription>
          </Alert>
        )}

        {projectId && !hasValidProjectId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Enter a valid 24-character project ID to load manuscripts for that project.
            </AlertDescription>
          </Alert>
        )}

        {hasValidProjectId && isLoading && <PageSkeleton variant="detail" />}

        {hasValidProjectId && listError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getDocumentApiErrorMessage(
                listError,
                'Failed to load manuscripts for this project.',
              )}
            </AlertDescription>
          </Alert>
        )}

        {hasValidProjectId && !isLoading && !listError && manuscripts.length === 0 && (
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
          <div className="grid min-w-0 gap-3">
            {manuscripts.map((manuscript) => (
              <ManuscriptRow
                key={manuscript._id}
                manuscript={manuscript}
                projectId={projectId}
                canReview={canReview}
                canSyncPermissions={canSyncPermissions}
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
