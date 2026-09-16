import React from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '@/hooks/useProjects';
import CanonicalDocumentViewer from '@/components/archive/CanonicalDocumentViewer';

/**
 * ArchiveDocumentViewerPage — Full-viewport reader route for canonical manuscripts.
 * URL: /archive/document/:projectId
 */
export default function ArchiveDocumentViewerPage() {
  const { projectId } = useParams();
  const { data: project, isLoading, error } = useProject(projectId);

  return <CanonicalDocumentViewer project={project} isLoading={isLoading} error={error} />;
}
