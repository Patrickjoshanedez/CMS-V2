import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/common';
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
      <div className="flex h-full flex-col space-y-6">
        <PageHeader
          eyebrow="Cloud Editor"
          icon={FileText}
          title={doc?.title || 'Document Editor'}
          description="View and collaborate on your connected Google Docs manuscript inside CMS-V2."
          meta={
            doc ? (
              <>
                <Badge variant="outline">
                  {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                </Badge>
                <Badge variant={canEdit ? 'success' : 'secondary'}>
                  {canEdit ? 'Edit Mode' : 'View Only'}
                </Badge>
              </>
            ) : null
          }
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          }
        />

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
