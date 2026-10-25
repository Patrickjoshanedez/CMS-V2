import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import GoogleDocViewer from '@/components/documents/GoogleDocViewer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { useManuscriptOpenLink } from '@/hooks/useDocuments';
import { parseDocParam } from '@/utils/documentParams';
import { ROLES, DOCUMENT_TYPES } from '@cms/shared';
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react';

/** Human-readable labels for document types */
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

/**
 * DocumentEditorPage — Full-page embedded Google Doc viewer / editor.
 *
 * Route: /projects/:projectId/documents/:docIdOrType
 *
 * The backend returns an `openLink` that is either an /edit or /preview URL
 * depending on the user's role:
 *   - Students + Advisers → /edit  (canEdit = true)
 *   - Panelists           → /preview (canEdit = false)
 */
export default function DocumentEditorPage() {
  const { projectId, docIdOrType, documentType, docId } = useParams();
  const rawParam = docIdOrType || documentType || docId || '';
  const parsed = parseDocParam(rawParam);
  const resolvedDocumentType = parsed.documentType || parsed.raw;

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading, error } = useManuscriptOpenLink(projectId, resolvedDocumentType);

  // Determine edit capability based on role
  const canEdit =
    user?.role === ROLES.STUDENT || user?.role === ROLES.ADVISER || user?.role === ROLES.FACULTY;

  const doc = data?.manuscript;

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col space-y-4">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            {doc && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h1 className="truncate text-lg font-semibold">{doc.title}</h1>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline">
                    {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                  </Badge>
                  <Badge variant={canEdit ? 'success' : 'secondary'}>
                    {canEdit ? 'Edit Mode' : 'View Only'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div role="status" aria-live="polite" className="flex flex-1 flex-col gap-4">
            <span className="sr-only">Loading document</span>
            <Skeleton className="h-7 w-2/5 max-w-sm" />
            <Skeleton className="h-5 w-3/5 max-w-md" />
            <Skeleton className="min-h-[50vh] w-full rounded-md" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.response?.data?.message || 'Failed to load document.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Document viewer */}
        {doc && (
          <div className="flex-1">
            <GoogleDocViewer
              embedUrl={data?.openLink}
              title={doc.title}
              canEdit={canEdit}
              className="h-full min-h-[600px]"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
