import React from 'react';
import { ScrollText, FileText } from 'lucide-react';

/**
 * ReadonlyPDFViewer — embeds an approved manuscript PDF in a styled card.
 * Uses the CMS design-token system (var(--color-*)) for consistent theming.
 */
export default function ReadonlyPDFViewer({ fileUrl, title }) {
  if (!fileUrl) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 [font-family:var(--font-body)]">
        <FileText className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          No manuscript has been published for this project yet.
        </p>
      </div>
    );
  }

  // Prepend #toolbar=0 to disable standard download/print buttons in browsers
  const viewerUrl = fileUrl.includes('#') ? fileUrl : `${fileUrl}#toolbar=0`;

  return (
    <div className="flex h-[800px] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm [font-family:var(--font-body)]">
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
        <ScrollText className="h-5 w-5 text-[var(--color-neutral)]" />
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] [font-family:var(--font-display)]">
          {title || 'Approved Manuscript'}
        </h3>
      </div>

      {/* PDF frame area */}
      <div className="relative flex-1 bg-[var(--color-bg)]">
        {/* Anti-right-click overlay (pointer-events-none won't block scroll but lets events pass to iframe) */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          onContextMenu={(e) => e.preventDefault()}
          aria-hidden="true"
        />
        <iframe
          src={viewerUrl}
          title="Manuscript PDF Viewer"
          className="h-full w-full border-0"
          onContextMenu={(e) => e.preventDefault()}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
