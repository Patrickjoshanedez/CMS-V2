import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  FileText,
  BookOpen,
  Info,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
  GitCommit,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';

// docx-preview: browser-side OOXML renderer — preserves all Word formatting
import { renderAsync } from 'docx-preview';
import RevisionDiffViewer from './RevisionDiffViewer';
import { useSubmissionRevisionDiff } from '@/hooks/useSubmissions';

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const CHAPTER_LABELS = {
  1: 'Chapter 1: Problem Definition & Objectives',
  2: 'Chapter 2: Review of Related Literature & Systems',
  3: 'Chapter 3: Methodology & System Architecture',
  4: 'Chapter 4: Results, Implementation & Discussion',
  5: 'Chapter 5: Conclusions & Recommendations',
};

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Pending Review', className: 'text-yellow-500' },
  approved: { icon: CheckCircle2, label: 'Approved', className: 'text-green-500' },
  rejected: { icon: AlertCircle, label: 'Revision Required', className: 'text-red-500' },
  reviewed: { icon: CheckCircle2, label: 'Reviewed', className: 'text-blue-500' },
};

/**
 * SophisticatedDocumentViewer — Institutional In-App OOXML + PDF Viewer
 *
 * Uses `docx-preview` (browser-side OOXML renderer) for .docx files — faithfully
 * reproduces indentation, centering, heading styles, fonts, tables, page margins,
 * and all Word formatting without any server-side HTML conversion.
 *
 * Uses native browser <iframe> with PDF.js for PDF manuscripts.
 */
export default function SophisticatedDocumentViewer({
  open,
  onOpenChange,
  submission,
  fileUrl: fallbackFileUrl,
  portalTarget,
  initialViewMode = 'manuscript',
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showMetadata, setShowMetadata] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [viewMode, setViewMode] = useState(initialViewMode); // 'manuscript' | 'diff'
  const [compareWithId, setCompareWithId] = useState(null);

  const {
    data: diffData,
    isLoading: isDiffLoading,
    error: diffError,
    refetch: refetchDiff,
  } = useSubmissionRevisionDiff(submission?._id, {
    compareWithId,
    enabled: open && viewMode === 'diff' && Boolean(submission?._id),
  });

  const modalRef = useRef(null);
  const docxContainerRef = useRef(null);
  const renderAbortRef = useRef(null);

  // Lock body & main layout scroll while modal is open
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const mainEl = document.querySelector('main');
    const originalMainOverflow = mainEl ? mainEl.style.overflow : '';
    if (mainEl) mainEl.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (mainEl) mainEl.style.overflow = originalMainOverflow;
    };
  }, [open]);

  // Handle ESC key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onOpenChange(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isFullscreen, onOpenChange]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setDocxLoading(false);
      setDocxError(null);
      setIframeLoading(true);
      setZoom(100);
      setViewMode(initialViewMode || 'manuscript');
      setCompareWithId(null);
    }
  }, [open, initialViewMode]);

  if (!open || !submission) return null;

  const fileName = submission.fileName || 'Manuscript Document';
  const isDocx =
    fileName.toLowerCase().endsWith('.docx') || submission.fileType?.includes('wordprocessingml');
  const isPdf = fileName.toLowerCase().endsWith('.pdf') || submission.fileType?.includes('pdf');

  const streamFileUrl = `/api/submissions/${submission._id}/file`;
  const chapterNum = submission.chapter;
  const chapterTitle = CHAPTER_LABELS[chapterNum] || `Chapter ${chapterNum || 1} Manuscript`;
  const versionBadge = submission.version ? `v${submission.version}` : 'v1';
  const fileSizeLabel = formatFileSize(submission.fileSize);

  const originalityScore =
    submission.originalityScore !== null && submission.originalityScore !== undefined
      ? submission.originalityScore
      : submission.plagiarismResult?.originalityScore !== null &&
          submission.plagiarismResult?.originalityScore !== undefined
        ? submission.plagiarismResult.originalityScore
        : null;

  const statusInfo = STATUS_CONFIG[submission.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `${streamFileUrl}?download=true`;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dialogElement = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-background/80 backdrop-blur-md animate-in fade-in-0 duration-200 overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) {
          onOpenChange(false);
        }
      }}
    >
      <div
        ref={modalRef}
        className={`relative flex flex-col border-border/80 bg-card shadow-2xl overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-200 overscroll-contain ${
          isFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-0'
            : 'w-full max-w-6xl h-[95vh] sm:h-[92vh]'
        }`}
      >
        {/* ── Top Control Bar ── */}
        <header className="shrink-0 flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 sm:px-4 py-2.5 sm:py-3 gap-2 sm:gap-3">
          {/* Left: Document Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              {isPdf ? (
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3
                  id="document-viewer-title"
                  className="text-xs sm:text-base font-bold text-foreground truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none"
                >
                  {chapterTitle}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 font-mono shrink-0"
                >
                  {versionBadge}
                </Badge>
                {isDocx && (
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex text-[10px] px-1.5 py-0 h-4 font-sans shrink-0"
                  >
                    Word Document
                  </Badge>
                )}
                {isPdf && (
                  <Badge
                    variant="secondary"
                    className="hidden sm:inline-flex text-[10px] px-1.5 py-0 h-4 font-sans shrink-0"
                  >
                    PDF Manuscript
                  </Badge>
                )}
                {originalityScore !== null && (
                  <Badge
                    variant="outline"
                    className={`hidden sm:inline-flex text-[10px] px-1.5 py-0 h-4 font-mono shrink-0 items-center gap-1 ${
                      originalityScore >= 75
                        ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                        : 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                    }`}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    <span>{originalityScore}% Original</span>
                  </Badge>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate flex items-center gap-1">
                <span className="truncate max-w-[140px] sm:max-w-none">{fileName}</span>
                <span>·</span>
                <span className="shrink-0">{fileSizeLabel}</span>
              </p>
            </div>
          </div>

          {/* Center: View Mode Toggle & Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60 bg-background/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('manuscript')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'manuscript'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label="View Formatted Manuscript"
              >
                {isPdf ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span className="hidden xs:inline">Manuscript</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('diff')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'diff'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Compare changes with previous version (Git-style diff)"
                aria-label="View Revision Diff"
              >
                <GitCommit className="h-3.5 w-3.5" />
                <span>Revision Diff (+/-)</span>
                {submission?.version > 1 && (
                  <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                    v{submission.version - 1}→v{submission.version}
                  </span>
                )}
              </button>
            </div>

            {/* Zoom Controls (DOCX only & in manuscript mode) */}
            {isDocx && viewMode === 'manuscript' && (
              <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-1.5 py-1 text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  title="Zoom out (-15%)"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 font-mono text-[11px] font-semibold hover:bg-muted rounded text-foreground transition-colors"
                  title="Reset zoom to 100%"
                  aria-label="Reset zoom"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  title="Zoom in (+15%)"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="h-3.5 w-px bg-border/60 mx-1" />
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset view"
                  aria-label="Reset view"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata((prev) => !prev)}
              className={`h-8 px-2.5 text-xs gap-1.5 border-border/60 ${
                showMetadata ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
              title="Toggle document information"
              aria-label="Toggle document details"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Details</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2.5 text-xs gap-1.5 border-border/60 hover:bg-muted text-foreground"
              title="Download original manuscript"
              aria-label="Download original manuscript"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
              title="Close viewer"
              aria-label="Close document viewer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── Main Canvas Area ── */}
        <div className="relative flex-1 flex overflow-hidden bg-muted/20">
          {/* Document Content Canvas */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {viewMode === 'diff' ? (
              <RevisionDiffViewer
                diffData={diffData}
                isLoading={isDiffLoading}
                error={diffError}
                onSelectCompareVersion={setCompareWithId}
                onRefresh={refetchDiff}
              />
            ) : isDocx ? (
              /* ── DOCX: docx-preview OOXML renderer ── */
              <DocxPreviewRenderer
                submissionId={submission._id}
                streamFileUrl={streamFileUrl}
                zoom={zoom}
                chapterTitle={chapterTitle}
                versionBadge={versionBadge}
                fileName={fileName}
                onDownload={handleDownload}
              />
            ) : isPdf ? (
              /* ── PDF: Native browser iframe renderer with scroll isolation ── */
              <div
                className="relative flex-1 flex flex-col overflow-hidden overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
              >
                {iframeLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 z-10 gap-3 text-muted-foreground">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Loading manuscript stream...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Retrieving PDF from institutional archive.
                    </p>
                  </div>
                )}
                <iframe
                  src={`${streamFileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  title="Manuscript PDF Viewer"
                  className="flex-1 w-full border-0 min-h-0"
                  onLoad={() => setIframeLoading(false)}
                />
              </div>
            ) : (
              /* ── Fallback: Download prompt ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 rounded-2xl border border-dashed border-border/80 bg-card/60 m-8">
                <FileText className="h-12 w-12 text-muted-foreground/60 mb-3" />
                <h4 className="text-base font-semibold text-foreground">Document Ready</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                  This file ({fileName}) is stored securely in the BukSU institutional capstone
                  archive.
                </p>
                <Button onClick={handleDownload} className="gap-2 text-xs">
                  <Download className="h-4 w-4" />
                  Download &amp; Open Document ({fileSizeLabel})
                </Button>
              </div>
            )}
          </main>

          {/* ── Collapsible Metadata Drawer (Right Side) ── */}
          {showMetadata && (
            <aside className="w-72 sm:w-80 shrink-0 border-l border-border/60 bg-card p-4 sm:p-5 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Manuscript Record
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">Archival submission metadata</p>
              </div>

              <div className="space-y-3 divide-y divide-border/40 text-xs">
                <div className="pt-2 first:pt-0 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Chapter &amp; Version
                  </span>
                  <p className="font-semibold text-foreground">{chapterTitle}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Round / Revision: {versionBadge}
                  </p>
                </div>

                <div className="pt-3 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Review Status
                  </span>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.className}`} />
                    <span className={`font-medium ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="pt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    File Details
                  </span>
                  <p className="font-medium text-foreground truncate">{fileName}</p>
                  <p className="text-muted-foreground">
                    Size: {fileSizeLabel} · Type:{' '}
                    {isPdf ? 'PDF Document' : isDocx ? 'Word Document' : 'Document'}
                  </p>
                </div>

                <div className="pt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Submission Timestamp
                  </span>
                  <p className="text-foreground">
                    {submission.createdAt
                      ? format(new Date(submission.createdAt), 'MMM dd, yyyy · hh:mm a')
                      : 'Recently submitted'}
                  </p>
                  {submission.isLate && (
                    <Badge variant="warning" className="text-[9px] py-0 px-1.5 h-4">
                      Late Submission
                    </Badge>
                  )}
                </div>

                {submission.remarks && (
                  <div className="pt-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Proponent Remarks
                    </span>
                    <p className="text-foreground leading-relaxed italic bg-muted/20 p-2 rounded-lg border border-border/40">
                      &quot;{submission.remarks}&quot;
                    </p>
                  </div>
                )}

                {submission.reviewNote && (
                  <div className="pt-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Adviser Feedback
                    </span>
                    <p className="text-foreground leading-relaxed bg-primary/5 p-2 rounded-lg border border-primary/20">
                      {submission.reviewNote}
                    </p>
                  </div>
                )}

                {submission.originalityScore !== null &&
                  submission.originalityScore !== undefined && (
                    <div className="pt-3 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Plagiarism Engine Score
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">
                          {submission.originalityScore}% Originality
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-mono">
                          HNSW Vector
                        </Badge>
                      </div>
                      {/* Originality bar */}
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            submission.originalityScore >= 75
                              ? 'bg-green-500'
                              : submission.originalityScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${submission.originalityScore}%` }}
                        />
                      </div>
                    </div>
                  )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full text-xs gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Original File
                </Button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );

  if (portalTarget === false || typeof document === 'undefined') {
    return dialogElement;
  }

  const target = portalTarget || document.body;
  return createPortal(dialogElement, target);
}

/**
 * DocxPreviewRenderer — Fetches the raw .docx binary and renders it with
 * `docx-preview` (browser-side OOXML engine). Preserves all Word formatting:
 * indentation, centering, font sizes, bold/italic, tables, page margins,
 * headers, footers, and run-level styles.
 */
export function DocxPreviewRenderer({
  submissionId,
  streamFileUrl,
  zoom,
  chapterTitle,
  versionBadge,
  fileName,
  onDownload,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const renderDocx = useCallback(async () => {
    if (!containerRef.current || !submissionId) return;

    // Abort any in-flight render
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      // Fetch raw .docx binary — cookies are sent automatically (withCredentials)
      const response = await fetch(streamFileUrl, {
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      if (controller.signal.aborted) return;

      // Clear previous render
      containerRef.current.innerHTML = '';

      // Render with docx-preview — full OOXML fidelity
      await renderAsync(arrayBuffer, containerRef.current, null, {
        className: 'docx-preview-root',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      });

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[DocxPreviewRenderer] Render failed:', err);
      setError(err.message || 'Failed to render document.');
      setLoading(false);
    }
  }, [submissionId, streamFileUrl]);

  useEffect(() => {
    renderDocx();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [renderDocx]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 z-10 gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Rendering Manuscript...</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Parsing OOXML document structure with full formatting fidelity.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 z-10 gap-4 p-6">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Document Render Failed</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={renderDocx} className="text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
            <Button size="sm" onClick={onDownload} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download Instead
            </Button>
          </div>
        </div>
      )}

      {/* docx-preview render target — scrollable canvas with zoom */}
      <div className="flex-1 overflow-auto bg-[#f0f0f0] dark:bg-neutral-800">
        <div
          className="docx-zoom-wrapper origin-top transition-transform duration-150"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            // Expand the wrapper height so scrollbar reflects zoomed size
            minHeight: zoom !== 100 ? `${zoom}%` : undefined,
          }}
        >
          {/* docx-preview injects .docx-wrapper > .docx > pages here */}
          <div ref={containerRef} className="docx-outer-container" />
        </div>
      </div>
    </div>
  );
}

DocxPreviewRenderer.propTypes = {
  submissionId: PropTypes.string.isRequired,
  streamFileUrl: PropTypes.string.isRequired,
  zoom: PropTypes.number.isRequired,
  chapterTitle: PropTypes.string.isRequired,
  versionBadge: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  onDownload: PropTypes.func.isRequired,
};

SophisticatedDocumentViewer.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  submission: PropTypes.object,
  fileUrl: PropTypes.string,
};
