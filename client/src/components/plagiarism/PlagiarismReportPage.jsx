import React from 'react';
import CanonicalPlagiarismReportPage from '@/pages/submissions/PlagiarismReportPage';

/**
 * PlagiarismReportPage (Component Facade)
 *
 * Universal forwarding facade ensuring all consumers of PlagiarismReportPage
 * strictly adhere to the Mandatory Unified Sophisticated Document Reader Contract,
 * rendering authentic OOXML Word (.docx) and PDF document canvases instead of raw text dumps.
 */
export default function PlagiarismReportPage({
  reportData,
  fileName,
  onBack,
  file,
  originalText,
  initialCanvasMode = 'document',
  ...rest
}) {
  return (
    <CanonicalPlagiarismReportPage
      file={file}
      reportData={reportData}
      fileName={fileName}
      onBack={onBack}
      onReset={onBack}
      originalText={originalText}
      initialCanvasMode={initialCanvasMode}
      {...rest}
    />
  );
}
