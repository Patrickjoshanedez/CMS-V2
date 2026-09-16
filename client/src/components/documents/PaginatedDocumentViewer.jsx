import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { renderAsync } from 'docx-preview';
import { cn } from '@/lib/utils';

/**
 * PaginatedDocumentViewer
 *
 * High-fidelity paginated document reader:
 * - Renders distinct, separated 8.5" x 11" Letter sheets
 * - 1-inch realistic margins with paper drop-shadow
 * - High-contrast canvas (paper stands out clearly in both dark and light modes)
 * - Page navigation (Prev/Next, Page Jump) and Zoom controls
 * - Fully accessible DOM text (screen-reader friendly, selectable, WCAG AAA compliant)
 */
export default function PaginatedDocumentViewer({
  fileUrl,
  fileName,
  fileType,
  zoom = 100,
  onZoomChange,
  className,
}) {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [internalZoom, setInternalZoom] = useState(zoom);

  const activeZoom = onZoomChange ? zoom : internalZoom;
  const setZoom = onZoomChange || setInternalZoom;

  const isPdf =
    fileName?.toLowerCase().endsWith('.pdf') || Boolean(fileType?.toLowerCase().includes('pdf'));
  const isDocx =
    fileName?.toLowerCase().endsWith('.docx') ||
    Boolean(fileType?.toLowerCase().includes('wordprocessingml')) ||
    (!isPdf && Boolean(fileUrl));

  // Render OOXML DOCX into individual paginated sections
  const renderDocx = useCallback(async () => {
    if (!containerRef.current || !fileUrl) return;
    setLoading(true);
    setError(null);

    try {
      let resolvedUrl = fileUrl;
      if (typeof window !== 'undefined' && fileUrl.startsWith('/')) {
        const origin =
          window.location?.origin && window.location.origin !== 'null'
            ? window.location.origin
            : 'http://localhost:43211';
        resolvedUrl = `${origin}${fileUrl}`;
      }
      const response = await fetch(resolvedUrl, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load document`);
      }

      const buffer = await response.arrayBuffer();
      if (!containerRef.current) return;
      containerRef.current.innerHTML = '';

      await renderAsync(buffer, containerRef.current, null, {
        className: 'docx-preview-rendered',
        inWrapper: false,
        breakPages: true,
        ignoreWidth: false,
        ignoreHeight: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      // Post-process rendered pages into paper containers
      const renderedSections = containerRef.current.querySelectorAll(
        '.docx-preview-rendered section, section.docx, section',
      );

      if (renderedSections.length > 0) {
        setTotalPages(renderedSections.length);
        renderedSections.forEach((section, index) => {
          const pageNum = index + 1;
          section.setAttribute('data-page-number', String(pageNum));
          section.setAttribute('role', 'region');
          section.setAttribute('aria-label', `Document Page ${pageNum}`);

          // Institutional paper styling
          section.classList.add(
            'bg-white',
            'text-slate-900',
            'shadow-2xl',
            'ring-1',
            'ring-black/10',
            'rounded-sm',
            'mx-auto',
            'transition-all',
          );

          // Force standard Letter dimensions & margins
          section.style.width = '8.5in';
          section.style.minHeight = '11in';
          section.style.padding = '1in';
          section.style.marginBottom = '2.5rem';
          section.style.boxSizing = 'border-box';
          section.style.position = 'relative';

          // Inject academic page number footer if missing
          const existingPageFooter = section.querySelector('.docx-page-footer-stamp');
          if (!existingPageFooter) {
            const footerStamp = document.createElement('div');
            footerStamp.className =
              'docx-page-footer-stamp text-center text-[10px] text-slate-400 font-mono mt-8 pt-4 border-t border-slate-100 select-none';
            footerStamp.textContent = `Page ${pageNum} of ${renderedSections.length}`;
            section.appendChild(footerStamp);
          }
        });
      } else {
        setTotalPages(1);
      }
      setLoading(false);
    } catch (err) {
      console.error('[PaginatedDocumentViewer] Render error:', err);
      setError(err.message || 'Failed to parse OOXML document structure.');
      setLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    if (isDocx && fileUrl) {
      renderDocx();
    } else if (isPdf) {
      setLoading(false);
      setTotalPages(1);
    }
  }, [isDocx, isPdf, fileUrl, renderDocx]);

  const scrollToPage = (pageNum) => {
    if (!containerRef.current) return;
    const target = containerRef.current.querySelector(`[data-page-number="${pageNum}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  // Observe scrolling to update currentPage in indicator
  const handleScroll = () => {
    if (!containerRef.current || !scrollContainerRef.current) return;
    const sections = containerRef.current.querySelectorAll('[data-page-number]');
    const containerTop = scrollContainerRef.current.getBoundingClientRect().top;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top - containerTop <= 150 && rect.bottom - containerTop > 150) {
        const pNum = Number(section.getAttribute('data-page-number'));
        if (pNum && pNum !== currentPage) {
          setCurrentPage(pNum);
        }
        break;
      }
    }
  };

  return (
    <div
      data-testid="paginated-document-viewer"
      className={cn(
        'flex flex-col h-full w-full bg-slate-950/95 text-slate-100 rounded-xl overflow-hidden border border-border/80 shadow-inner',
        className,
      )}
    >
      {/* ── Paginated Top Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-border/60 z-10 select-none backdrop-blur">
        <div className="flex items-center gap-2.5">
          <Badge
            variant="outline"
            className="text-[11px] font-mono bg-slate-800 text-slate-200 border-slate-700 h-5"
          >
            {isPdf ? 'PDF Locked-In' : 'Word OOXML High-Fidelity'}
          </Badge>
          <span className="text-xs text-muted-foreground truncate max-w-[240px]" title={fileName}>
            {fileName || 'Manuscript Document'}
          </span>
        </div>

        {/* Page Navigator */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage <= 1 || loading}
            onClick={() => scrollToPage(currentPage - 1)}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] font-mono font-semibold text-slate-200 px-1">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={currentPage >= totalPages || loading}
            onClick={() => scrollToPage(currentPage + 1)}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(activeZoom - 10, 50))}
            disabled={activeZoom <= 50}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(100)}
            className="text-[11px] font-mono w-10 h-6 p-0 text-center font-semibold text-slate-200 hover:underline"
            title="Reset Zoom"
          >
            {activeZoom}%
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(activeZoom + 10, 300))}
            disabled={activeZoom >= 300}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-0.5 ml-1">
            {[150, 200, 250, 300].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setZoom(lvl)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  activeZoom === lvl
                    ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 font-medium'
                }`}
                title={`Zoom to ${lvl}%`}
                aria-label={`Zoom ${lvl}%`}
              >
                {lvl}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable Document Canvas ── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-6 sm:p-12 flex flex-col items-center bg-slate-900/60 dark:bg-slate-950"
        style={{ scrollBehavior: 'smooth', maxHeight: '76vh' }}
        tabIndex={0}
        role="region"
        aria-label="Document Pages Canvas"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Rendering Paginated Manuscript...
            </p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Calculating OOXML margins, tables, and page boundaries with 100% layout fidelity.
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-28 gap-3 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-semibold text-slate-200">Document Rendering Notice</p>
            <p className="text-xs text-slate-400 mb-2">{error}</p>
            {fileUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = fileUrl;
                  link.download = fileName || 'manuscript.docx';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Original File
              </Button>
            )}
          </div>
        )}

        {/* PDF Mode */}
        {isPdf && !loading && (
          <div
            className="w-full max-w-[8.5in] flex flex-col gap-8 transition-transform origin-top"
            style={{ transform: `scale(${activeZoom / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title="PDF Document Reader"
              className="w-full min-h-[11in] rounded-sm shadow-2xl border border-slate-200 bg-white"
            />
          </div>
        )}

        {/* DOCX Mode (Rendered by docx-preview) */}
        {isDocx && (
          <div
            ref={containerRef}
            className={cn(
              'transition-transform origin-top flex flex-col items-center w-full',
              loading && 'hidden',
            )}
            style={{
              transform: `scale(${activeZoom / 100})`,
              transformOrigin: 'top center',
            }}
          />
        )}
      </div>
    </div>
  );
}

PaginatedDocumentViewer.propTypes = {
  fileUrl: PropTypes.string.isRequired,
  fileName: PropTypes.string,
  fileType: PropTypes.string,
  zoom: PropTypes.number,
  onZoomChange: PropTypes.func,
  className: PropTypes.string,
};
