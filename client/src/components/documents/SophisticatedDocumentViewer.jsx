import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck,
  GitCommit,
  Sliders,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Slider } from '@/components/ui/Slider';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/Sheet';
import { format } from 'date-fns';

// docx-preview: browser-side OOXML renderer — preserves all Word formatting
import { renderAsync } from 'docx-preview';
import RevisionDiffViewer from './RevisionDiffViewer';
import PdfViewerWorkspace from '@/components/submissions/PdfViewerWorkspace';
import { useSubmissionRevisionDiff } from '@/hooks/useSubmissions';
import api from '@/services/api';
import { submissionService } from '@/services/submissionService';

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
  chapter1: 'Chapter 1: Problem Definition & Objectives',
  chapter2: 'Chapter 2: Review of Related Literature & Systems',
  chapter3: 'Chapter 3: Methodology & System Architecture',
  chapter4: 'Chapter 4: Results, Implementation & Discussion',
  chapter5: 'Chapter 5: Conclusions & Recommendations',
};

const STATUS_CONFIG = {
  pending: { icon: Clock, label: 'Pending Review', variant: 'warning' },
  approved: { icon: CheckCircle2, label: 'Approved', variant: 'success' },
  rejected: { icon: AlertCircle, label: 'Revision Required', variant: 'destructive' },
  reviewed: { icon: CheckCircle2, label: 'Reviewed', variant: 'info' },
};

const DEFAULT_PLAGIARISM_COLOR = 'hsl(var(--destructive))';
const DEFAULT_PLAGIARISM_HIGHLIGHT = 'hsl(var(--destructive) / 0.25)';

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
  open = true,
  onOpenChange,
  submission,
  file,
  fileBlob,
  fileUrl: fallbackFileUrl,
  fileName: propFileName,
  chapterTitle: propChapterTitle,
  portalTarget,
  initialViewMode = 'manuscript',
  embedded = false,
  className = '',
  highlights = [],
  plagiarismMatches = [],
  activeHighlightId = null,
  onSelectionFinished,
  onHighlightClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  layerFilter: initialLayerFilter = 'all',
  commentsOpacity: initialCommentsOpacity = 80,
  plagiarismOpacity: initialPlagiarismOpacity = 80,
  userRole = 'adviser',
  canComment = true,
  pdfUtilsRef,
  useLegacyIframe = false,
  isPlagiarismReport = false,
  isArchive = false,
  showArchiveIdentity = false,
  hideIdentity = false,
  showRevisionDiff = null,
  showComments = null,
  isSubmission = null,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showMetadata, setShowMetadata] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [docxError, setDocxError] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [isConvertedPdf, setIsConvertedPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfReloadTrigger, setPdfReloadTrigger] = useState(0);
  const [viewMode, setViewMode] = useState(initialViewMode); // 'manuscript' | 'diff'
  const [compareWithId, setCompareWithId] = useState(null);
  const [layerFilter, setLayerFilter] = useState(initialLayerFilter);
  const [commentsOpacity, setCommentsOpacity] = useState(initialCommentsOpacity);
  const [plagiarismOpacity, setPlagiarismOpacity] = useState(initialPlagiarismOpacity);
  const [showOpacityControls, setShowOpacityControls] = useState(false);

  // Contextual flags: suppress tracking controls in Archive and Plagiarism Checker
  const currentPath = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
  const isPlagiarismOrArchive = Boolean(
    isPlagiarismReport ||
    isArchive ||
    submission?.isArchive ||
    submission?.isArchiveScan ||
    submission?._id === 'archive-document' ||
    currentPath.includes('/archive') ||
    currentPath.includes('/plagiarism') ||
    currentPath.includes('/scan'),
  );
  const isArchiveDoc = Boolean(
    isArchive ||
    submission?.isArchive ||
    submission?.isArchiveScan ||
    submission?._id === 'archive-document' ||
    currentPath.includes('/archive'),
  );
  const isSubmissionTracking =
    isSubmission !== null
      ? isSubmission
      : !isPlagiarismOrArchive &&
        Boolean(
          submission?._id && submission._id !== 'archive-document' && !submission.isArchiveScan,
        );

  const shouldShowIdentity =
    !hideIdentity &&
    (showArchiveIdentity ||
      (!isPlagiarismOrArchive && (Boolean(propChapterTitle) || isSubmissionTracking)));

  const shouldShowRevisionDiff =
    showRevisionDiff !== null
      ? showRevisionDiff
      : !isPlagiarismOrArchive &&
        Boolean(
          isSubmissionTracking && (submission?.version > 1 || submission?.hasPreviousVersion),
        );

  const shouldShowComments =
    showComments !== null
      ? showComments
      : !isPlagiarismOrArchive &&
        Boolean(canComment || (highlights && highlights.some((h) => h.type === 'faculty_comment')));

  const shouldShowLayers =
    shouldShowComments && Boolean(plagiarismMatches && plagiarismMatches.length > 0);

  const {
    data: diffData,
    isLoading: isDiffLoading,
    error: diffError,
    refetch: refetchDiff,
  } = useSubmissionRevisionDiff(submission?._id, {
    compareWithId,
    enabled: (open || embedded) && viewMode === 'diff' && Boolean(submission?._id),
  });

  const modalRef = useRef(null);
  const docxContainerRef = useRef(null);
  const renderAbortRef = useRef(null);

  // Lock the main layout scroll while the shared modal dialog is open or fullscreen
  useEffect(() => {
    const shouldLock = (!embedded && open) || (embedded && isFullscreen);
    if (!shouldLock || typeof document === 'undefined') return;
    const mainEl = document.querySelector('main');
    const originalMainOverflow = mainEl ? mainEl.style.overflow : '';
    if (mainEl) mainEl.style.overflow = 'hidden';

    return () => {
      if (mainEl) mainEl.style.overflow = originalMainOverflow;
    };
  }, [open, embedded, isFullscreen]);

  // Reset state when closed
  useEffect(() => {
    if (!open && !embedded) {
      setDocxLoading(false);
      setDocxError(null);
      setTextContent('');
      setTextLoading(false);
      setTextError(null);
      setIframeLoading(true);
      setPdfError(null);
      setPdfBlobUrl(null);
      setPdfData(null);
      setIsConvertedPdf(false);
      setZoom(100);
      setViewMode(initialViewMode || 'manuscript');
      setCompareWithId(null);
    }
  }, [open, embedded, initialViewMode]);

  const effectiveFile = file || fileBlob || submission?.file || null;
  const fileName =
    propFileName ||
    submission?.fileName ||
    submission?.filename ||
    effectiveFile?.name ||
    'Manuscript Document';
  const effectiveSubmissionId = submission?._id || submission?.id || '';
  const isDocx = Boolean(
    fileName.toLowerCase().endsWith('.docx') ||
    fileName.toLowerCase().endsWith('.doc') ||
    effectiveFile?.type?.includes('wordprocessingml') ||
    effectiveFile?.type?.includes('msword') ||
    submission?.fileType?.includes('wordprocessingml') ||
    submission?.fileType?.includes('msword') ||
    submission?.fileType?.includes('docx'),
  );
  const isPdf = Boolean(
    fileName.toLowerCase().endsWith('.pdf') ||
    effectiveFile?.type?.includes('pdf') ||
    submission?.fileType?.includes('pdf'),
  );
  const isText = Boolean(
    fileName.toLowerCase().endsWith('.txt') ||
    effectiveFile?.type === 'text/plain' ||
    submission?.fileType === 'text/plain',
  );

  const streamFileUrl =
    fallbackFileUrl ||
    (effectiveSubmissionId ? `/api/submissions/${effectiveSubmissionId}/file` : null);
  const rawChapter = submission?.chapter ?? submission?.chapterNumber ?? 1;
  const parsedNum =
    typeof rawChapter === 'string' ? parseInt(rawChapter.replace(/\D/g, ''), 10) : rawChapter;
  const chapterTitle =
    propChapterTitle ||
    CHAPTER_LABELS[rawChapter] ||
    CHAPTER_LABELS[parsedNum] ||
    (typeof rawChapter === 'string' && rawChapter.trim() && !/^\d+$/.test(rawChapter)
      ? rawChapter.replace(/^(Chapter\s*)+/i, 'Chapter ').trim()
      : `Chapter ${parsedNum || 1} Manuscript`);
  const versionBadge = submission?.version ? `v${submission.version}` : 'v1';
  const fileSizeLabel = formatFileSize(submission?.fileSize || effectiveFile?.size);

  const originalityScore =
    submission?.originalityScore !== null && submission?.originalityScore !== undefined
      ? submission.originalityScore
      : submission?.plagiarismResult?.originalityScore !== null &&
          submission?.plagiarismResult?.originalityScore !== undefined
        ? submission.plagiarismResult.originalityScore
        : null;

  const statusInfo = STATUS_CONFIG[submission?.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;

  // Load document stream via authenticated API service
  useEffect(() => {
    let active = true;
    let objectUrl = null;

    const shouldFetch =
      (isPdf || isDocx || isText || Boolean(submission?.convertedPdfKey)) &&
      (effectiveSubmissionId || streamFileUrl) &&
      (open || embedded);

    if (isText && typeof Blob !== 'undefined' && effectiveFile instanceof Blob) {
      setTextLoading(true);
      setTextError(null);
      effectiveFile
        .text()
        .then((text) => {
          if (active) setTextContent(text);
        })
        .catch((err) => {
          if (active) setTextError(err.message || 'Failed to read text manuscript.');
        })
        .finally(() => {
          if (active) setTextLoading(false);
        });
      return () => {
        active = false;
      };
    }

    // Direct client-side File/Blob for PDF: convert to buffer & object URL directly
    if (isPdf && effectiveFile) {
      if (effectiveFile instanceof Blob || effectiveFile instanceof File) {
        effectiveFile
          .arrayBuffer()
          .then((buf) => {
            if (active) setPdfData(new Uint8Array(buf));
          })
          .catch((err) => {
            console.warn('[SophisticatedDocumentViewer] Could not read PDF file buffer:', err);
          });
      }
      objectUrl = URL.createObjectURL(effectiveFile);
      setPdfBlobUrl(objectUrl);
      setIsConvertedPdf(false);
      setPdfError(null);
      setIframeLoading(false);
      return () => {
        active = false;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      };
    }

    // Direct blob: URL or data: URL provided
    if (
      isPdf &&
      streamFileUrl &&
      (streamFileUrl.startsWith('blob:') || streamFileUrl.startsWith('data:'))
    ) {
      setPdfBlobUrl(streamFileUrl);
      setIsConvertedPdf(false);
      setPdfError(null);
      setIframeLoading(false);
      return undefined;
    }

    if (shouldFetch) {
      setIframeLoading(true);
      setPdfError(null);

      // If streamFileUrl is an external pre-signed URL (e.g., S3 / MinIO signed link), use directly
      if (
        streamFileUrl &&
        (streamFileUrl.startsWith('http://') || streamFileUrl.startsWith('https://'))
      ) {
        if (isText) {
          setTextLoading(true);
          fetch(streamFileUrl)
            .then((response) => {
              if (!response.ok) throw new Error('Failed to retrieve text manuscript.');
              return response.text();
            })
            .then((text) => {
              if (active) setTextContent(text);
            })
            .catch((err) => {
              if (active) setTextError(err.message || 'Failed to retrieve text manuscript.');
            })
            .finally(() => {
              if (active) setTextLoading(false);
            });
          return () => {
            active = false;
          };
        }
        if (streamFileUrl.includes('.pdf')) {
          setPdfBlobUrl(streamFileUrl);
          setIsConvertedPdf(Boolean(isDocx || submission?.convertedPdfKey));
        }
        return;
      }

      const fetchEndpoint = streamFileUrl?.startsWith('/api/')
        ? streamFileUrl.replace(/^\/api/, '')
        : streamFileUrl?.startsWith('/')
          ? streamFileUrl
          : effectiveSubmissionId
            ? `/submissions/${effectiveSubmissionId}/file`
            : null;

      if (!fetchEndpoint) {
        if (isDocx && effectiveFile) {
          setIframeLoading(false);
          return;
        }
        if (isText) setTextError('No document endpoint available.');
        else setPdfError('No document endpoint available.');
        setTextLoading(false);
        setIframeLoading(false);
        return;
      }

      if (isText) {
        setTextLoading(true);
        setTextError(null);
      }
      api
        .get(fetchEndpoint, { responseType: 'blob' })
        .then(async (res) => {
          if (!active) return;
          if (isText) {
            setTextContent(await res.data.text());
            setTextLoading(false);
            setIframeLoading(false);
            return;
          }
          const mimeType = res.data?.type || res.headers?.['content-type'] || '';
          const isPdfStream =
            mimeType.includes('pdf') || isPdf || Boolean(submission?.convertedPdfKey);

          if (isPdfStream) {
            const blob = new Blob([res.data], { type: 'application/pdf' });
            blob
              .arrayBuffer()
              .then((buf) => {
                if (active) setPdfData(new Uint8Array(buf));
              })
              .catch(() => {});
            objectUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(objectUrl);
            setIsConvertedPdf(Boolean(isDocx || submission?.convertedPdfKey));
            setPdfError(null);
          } else {
            // Raw DOCX returned from server (conversion pending or fallback)
            setIsConvertedPdf(false);
            setPdfBlobUrl(null);
            setPdfData(null);
          }
          setIframeLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error('[SophisticatedDocumentViewer] Document fetch failed:', err);
          if (isText) {
            setTextError(err.message || 'Failed to retrieve text manuscript.');
            setTextLoading(false);
            return;
          }
          const errorMsg =
            err.response?.status === 401
              ? 'Server returned 401: Unauthorized'
              : err.message || 'Failed to retrieve manuscript.';
          setPdfError(errorMsg);
          setIframeLoading(false);
        });
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    isPdf,
    isDocx,
    isText,
    effectiveFile,
    submission?._id,
    submission?.convertedPdfKey,
    open,
    embedded,
    streamFileUrl,
    pdfReloadTrigger,
  ]);

  if ((!embedded && !open) || (!submission && !effectiveFile && !streamFileUrl)) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 300));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  const handleDownload = async () => {
    try {
      if (effectiveFile) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(effectiveFile);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (submission?._id) {
        await submissionService.downloadFile(submission._id, fileName);
      } else if (streamFileUrl) {
        const link = document.createElement('a');
        link.href = `${streamFileUrl}?download=true`;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('[SophisticatedDocumentViewer] Download failed:', err);
    }
  };

  const viewerContent = (
    <Sheet open={showMetadata} onOpenChange={setShowMetadata}>
      <div
        ref={modalRef}
        className={`flex min-w-0 flex-col bg-card overflow-hidden transition-all duration-200 overscroll-contain ${
          isFullscreen
            ? 'h-full w-full rounded-none border-0'
            : embedded
              ? `relative w-full h-[780px] rounded-xl border border-border/60 shadow-sm ${className}`
              : 'relative w-full max-w-6xl h-[95dvh] sm:h-[92dvh] border-border/80 shadow-2xl rounded-xl sm:rounded-2xl'
        }`}
      >
        {/* ── Top Control Bar ── */}
        <header className="shrink-0 flex flex-wrap items-center justify-between border-b border-border/60 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 gap-2 sm:gap-4 min-h-[48px] [&_button]:min-h-[44px] [&_button]:min-w-[44px] sm:[&_button]:min-h-0 sm:[&_button]:min-w-0">
          {/* Left: Document Identity (Shown only for submission tracking; hidden on archive/plagiarism checker) */}
          {shouldShowIdentity ? (
            <div className="flex basis-full items-center gap-2.5 sm:basis-auto sm:gap-3 min-w-0 shrink">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                {isPdf ? (
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </div>
              <div className="min-w-0 max-w-full sm:max-w-xs lg:max-w-sm shrink">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3
                    id="document-viewer-title"
                    className="basis-full text-xs sm:basis-auto sm:text-base font-bold text-foreground truncate"
                  >
                    {chapterTitle}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 font-mono shrink-0"
                  >
                    {versionBadge}
                  </Badge>
                  {(!embedded || isFullscreen || showArchiveIdentity) && isDocx && (
                    <Badge
                      variant="secondary"
                      className={`${showArchiveIdentity ? 'inline-flex' : 'hidden xl:inline-flex'} text-[10px] px-1.5 py-0 h-4 font-sans shrink-0`}
                    >
                      Word Document
                    </Badge>
                  )}
                  {(!embedded || isFullscreen || showArchiveIdentity) && isPdf && (
                    <Badge
                      variant="secondary"
                      className={`${showArchiveIdentity ? 'inline-flex' : 'hidden xl:inline-flex'} text-[10px] px-1.5 py-0 h-4 font-sans shrink-0`}
                    >
                      PDF Manuscript
                    </Badge>
                  )}
                  {(!embedded || isFullscreen || showArchiveIdentity) && isText && (
                    <Badge
                      variant="secondary"
                      className={`${showArchiveIdentity ? 'inline-flex' : 'hidden xl:inline-flex'} text-[10px] px-1.5 py-0 h-4 font-sans shrink-0`}
                    >
                      Text Document
                    </Badge>
                  )}
                  {(!embedded || isFullscreen || showArchiveIdentity) &&
                    originalityScore !== null && (
                      <Badge
                        variant="outline"
                        className={`${showArchiveIdentity ? 'inline-flex' : 'hidden 2xl:inline-flex'} text-[10px] px-1.5 py-0 h-4 font-mono shrink-0 items-center gap-1 ${
                          originalityScore >= 75
                            ? 'border-success/50 text-success-foreground bg-success/10'
                            : 'border-warning/50 text-warning-foreground bg-warning/10'
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
          ) : (
            /* Subtle clean filename breadcrumb when identity is hidden */
            <div className="flex items-center gap-2 min-w-0 max-w-[200px] xs:max-w-xs sm:max-w-sm truncate shrink-0">
              <span className="text-xs font-semibold text-foreground truncate" title={fileName}>
                {fileName}
              </span>
              {fileSizeLabel && (
                <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">
                  · {fileSizeLabel}
                </span>
              )}
            </div>
          )}

          {/* Center: View Mode Toggle & Zoom / Annotation Controls */}
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {/* Revision Diff (+/-) Switch — rendered only when submission tracking requires revision comparison */}
            {shouldShowRevisionDiff && (
              <div className="flex items-center rounded-lg border border-border/60 bg-background/80 p-0.5 text-xs shrink-0">
                <Button
                  variant="ghost"
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
                  <span className="hidden sm:inline">Manuscript</span>
                </Button>
                <Button
                  variant="ghost"
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
                    <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[9px] bg-success/10 text-success-foreground font-mono font-semibold">
                      v{submission.version - 1}→v{submission.version}
                    </span>
                  )}
                </Button>
              </div>
            )}

            {/* Zoom Controls (DOCX only & in manuscript mode) */}
            {isDocx && viewMode === 'manuscript' && (
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/80 px-1.5 py-1 text-xs shrink-0">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  title="Zoom out (-15%)"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 font-mono text-[11px] font-semibold hover:bg-muted rounded text-foreground transition-colors"
                  title="Reset zoom to 100%"
                  aria-label="Reset zoom"
                >
                  {zoom}%
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                  title="Zoom in (+15%)"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <div className="h-3.5 w-px bg-border/60 mx-0.5" />
                <div
                  className="hidden 2xl:flex items-center gap-0.5"
                  role="group"
                  aria-label="Zoom presets"
                >
                  {[150, 200, 250, 300].map((level) => (
                    <Button
                      variant="ghost"
                      key={level}
                      type="button"
                      onClick={() => setZoom(level)}
                      className={`px-1.5 py-0.5 font-mono text-[10px] rounded transition-colors ${
                        zoom === level
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
                      }`}
                      title={`Set zoom to ${level}%`}
                      aria-label={`Zoom ${level}%`}
                    >
                      {level}%
                    </Button>
                  ))}
                </div>
                <div className="h-3.5 w-px bg-border/60 mx-0.5" />
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset view"
                  aria-label="Reset view"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Multi-Layer Annotation & Plagiarism Indicator Controls */}
            {viewMode === 'manuscript' && (
              <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                {shouldShowLayers ? (
                  /* Layer Filter Buttons for Multi-layer Submission Review */
                  <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setLayerFilter('all')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        layerFilter === 'all'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Show both Comments and Plagiarism overlays"
                    >
                      All Layers
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setLayerFilter('comments')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        layerFilter === 'comments'
                          ? 'bg-info text-info-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Show faculty comment annotations only"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Comments
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setLayerFilter('plagiarism')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                        layerFilter === 'plagiarism'
                          ? 'bg-destructive text-destructive-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={
                        isArchiveDoc
                          ? 'Show similarity matches only'
                          : 'Show plagiarism matches only'
                      }
                    >
                      <ShieldAlert className="h-3 w-3" />
                      {isArchiveDoc ? 'Similarity' : 'Plagiarism'}
                    </Button>
                  </div>
                ) : shouldShowComments ? (
                  <Badge variant="info" className="inline-flex items-center gap-1.5 text-xs">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Comments Active</span>
                  </Badge>
                ) : plagiarismMatches && plagiarismMatches.length > 0 ? (
                  <Badge variant="destructive" className="inline-flex items-center gap-1.5 text-xs">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>
                      {isArchiveDoc ? 'Similarity Matches' : 'Plagiarism Matches'} (
                      {plagiarismMatches.length})
                    </span>
                  </Badge>
                ) : null}

                {/* Opacity Controls Popover */}
                {(shouldShowComments || (plagiarismMatches && plagiarismMatches.length > 0)) && (
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOpacityControls((prev) => !prev)}
                      className={`h-7 px-2 text-[11px] gap-1 border-border/60 ${
                        showOpacityControls
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title="Adjust overlay layer opacities"
                    >
                      <Sliders className="h-3 w-3 text-primary" />
                      <span>Opacity</span>
                    </Button>

                    {showOpacityControls && (
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-3 shadow-xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-border pb-1.5">
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Sliders className="h-3.5 w-3.5 text-primary" />
                            Layer Opacity
                          </span>
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                              setCommentsOpacity(80);
                              setPlagiarismOpacity(80);
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          >
                            Reset
                          </Button>
                        </div>

                        {shouldShowComments && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-info-foreground font-medium">Comments</span>
                              <span className="font-mono text-muted-foreground">
                                {commentsOpacity}%
                              </span>
                            </div>
                            <Slider
                              min={15}
                              max={100}
                              value={commentsOpacity}
                              onChange={(e) => setCommentsOpacity(Number(e.target.value))}
                              aria-label="Comments overlay opacity"
                            />
                          </div>
                        )}

                        {Boolean(plagiarismMatches && plagiarismMatches.length > 0) && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-destructive-text font-medium">
                                {isArchiveDoc ? 'Similarity' : 'Plagiarism'}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                {plagiarismOpacity}%
                              </span>
                            </div>
                            <Slider
                              min={15}
                              max={100}
                              value={plagiarismOpacity}
                              onChange={(e) => setPlagiarismOpacity(Number(e.target.value))}
                              aria-label="Plagiarism overlay opacity"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 px-2.5 text-xs gap-1.5 border-border/60 ${
                  showMetadata ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
                title="Toggle document information"
                aria-label="Toggle document details"
                aria-controls="document-metadata-sheet"
                aria-expanded={showMetadata}
              >
                <Info className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Details</span>
              </Button>
            </SheetTrigger>

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

            {(!embedded || Boolean(onOpenChange)) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange?.(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                title="Close viewer"
                aria-label="Close document viewer"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </header>

        {/* ── Main Canvas Area ── */}
        <div className="relative flex-1 flex overflow-hidden bg-muted/20">
          {/* Document Content Canvas */}
          <main className="min-w-0 flex-1 flex flex-col overflow-hidden">
            {viewMode === 'diff' ? (
              <RevisionDiffViewer
                diffData={diffData}
                isLoading={isDiffLoading}
                error={diffError}
                onSelectCompareVersion={setCompareWithId}
                onRefresh={refetchDiff}
              />
            ) : pdfBlobUrl || isPdf ? (
              /* ── PDF: Unified PdfViewerWorkspace (react-pdf-highlighter-plus) or legacy iframe fallback ── */
              <div
                className="relative flex-1 flex flex-col overflow-hidden overscroll-contain"
                onWheel={(e) => e.stopPropagation()}
              >
                {pdfError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 z-10 gap-4 p-6">
                    <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-foreground">PDF Stream Failed</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">{pdfError}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPdfReloadTrigger((c) => c + 1)}
                        className="text-xs gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Retry
                      </Button>
                      <Button size="sm" onClick={handleDownload} className="text-xs gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Download Instead
                      </Button>
                    </div>
                  </div>
                ) : useLegacyIframe ? (
                  <>
                    {iframeLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 z-10 gap-3 text-muted-foreground">
                        <Spinner className="size-7 text-primary" />
                        <p className="text-sm font-medium text-foreground">
                          Loading manuscript stream...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Retrieving PDF from institutional archive.
                        </p>
                      </div>
                    )}
                    <iframe
                      src={`${pdfBlobUrl || streamFileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      title="Manuscript PDF Viewer"
                      className="flex-1 w-full border-0 min-h-0"
                      onLoad={() => setIframeLoading(false)}
                    />
                  </>
                ) : (
                  <PdfViewerWorkspace
                    pdfData={pdfData}
                    pdfUrl={pdfData || pdfBlobUrl || streamFileUrl}
                    highlights={highlights}
                    plagiarismMatches={plagiarismMatches}
                    activeHighlightId={activeHighlightId}
                    onSelectionFinished={onSelectionFinished}
                    onHighlightClick={onHighlightClick}
                    onAddReply={onAddReply}
                    onResolveComment={onResolveComment}
                    onAddToAdm={onAddToAdm}
                    layerFilter={layerFilter}
                    commentsOpacity={commentsOpacity}
                    plagiarismOpacity={plagiarismOpacity}
                    userRole={userRole}
                    canComment={canComment}
                    className="flex-1 w-full min-h-0"
                    utilsRef={pdfUtilsRef}
                  />
                )}
              </div>
            ) : isDocx ? (
              /* ── DOCX: docx-preview OOXML renderer fallback when unconverted ── */
              <DocxPreviewRenderer
                submissionId={effectiveSubmissionId}
                streamFileUrl={streamFileUrl}
                file={effectiveFile}
                zoom={zoom}
                chapterTitle={chapterTitle}
                versionBadge={versionBadge}
                fileName={fileName}
                onDownload={handleDownload}
                plagiarismMatches={plagiarismMatches}
                activeHighlightId={activeHighlightId}
                onHighlightClick={onHighlightClick}
                layerFilter={layerFilter}
                plagiarismOpacity={plagiarismOpacity}
              />
            ) : isText ? (
              <div
                className="flex-1 min-h-0 overflow-auto rounded-lg border border-border/60 bg-background p-4 sm:p-6"
                data-testid="text-document-preview"
                aria-busy={textLoading}
              >
                {textLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Spinner />
                    Loading text manuscript...
                  </div>
                ) : textError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {textError}
                  </p>
                ) : (
                  <pre
                    className="whitespace-pre-wrap break-words font-serif text-foreground"
                    style={{ fontSize: `${zoom}%` }}
                  >
                    {textContent}
                  </pre>
                )}
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
          <SheetContent
            id="document-metadata-sheet"
            side="right"
            className="z-[60] w-[min(22rem,92vw)] max-w-full border-l border-border/60 bg-card p-4 sm:p-5 gap-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  Manuscript Record
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Archival submission metadata
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Close document details">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
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
                  <Badge variant={statusInfo.variant} className="gap-1.5">
                    <StatusIcon className="h-3.5 w-3.5" />
                    {statusInfo.label}
                  </Badge>
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
                  {submission?.createdAt
                    ? format(new Date(submission.createdAt), 'MMM dd, yyyy · hh:mm a')
                    : 'Recently submitted'}
                </p>
                {submission?.isLate && (
                  <Badge variant="warning" className="text-[9px] py-0 px-1.5 h-4">
                    Late Submission
                  </Badge>
                )}
              </div>

              {submission?.remarks && (
                <div className="pt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Proponent Remarks
                  </span>
                  <p className="text-foreground leading-relaxed italic bg-muted/20 p-2 rounded-lg border border-border/40">
                    &quot;{submission.remarks}&quot;
                  </p>
                </div>
              )}

              {submission?.reviewNote && (
                <div className="pt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Adviser Feedback
                  </span>
                  <p className="text-foreground leading-relaxed bg-primary/5 p-2 rounded-lg border border-primary/20">
                    {submission.reviewNote}
                  </p>
                </div>
              )}

              {submission?.originalityScore !== null &&
                submission?.originalityScore !== undefined && (
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
                    <Progress
                      value={submission.originalityScore}
                      className="h-1.5"
                      indicatorClassName={
                        submission.originalityScore >= 75
                          ? 'bg-success'
                          : submission.originalityScore >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }
                      aria-label="Originality score"
                    />
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
          </SheetContent>
        </div>
      </div>
    </Sheet>
  );

  // If embedded in the page flow and not fullscreen, return inline element directly
  if (embedded && !isFullscreen) {
    return viewerContent;
  }

  return (
    <Dialog
      open={!embedded ? open : isFullscreen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        if (embedded) setIsFullscreen(false);
        else onOpenChange?.(false);
      }}
    >
      <DialogContent
        showClose={false}
        fullscreen={isFullscreen}
        aria-labelledby="document-viewer-title"
        aria-describedby={undefined}
        onWheel={(event) => event.stopPropagation()}
        onInteractOutside={(event) => {
          if (isFullscreen) event.preventDefault();
        }}
        portal={portalTarget !== false}
        portalContainer={portalTarget === false ? undefined : portalTarget}
        className={
          isFullscreen
            ? 'gap-0 overflow-hidden'
            : 'h-[95dvh] w-[calc(100vw_-_1rem)] max-h-[95dvh] max-w-6xl gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100vw_-_2rem)] md:w-[calc(100vw_-_3rem)]'
        }
      >
        {viewerContent}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Unwraps previous .docx-plagiarism-highlight elements, returning clean DOM text.
 */
function removeDocxHighlights(container) {
  if (!container) return;
  const existingMarks = container.querySelectorAll('.docx-plagiarism-highlight');
  existingMarks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
  });
  container.normalize();
}

/**
 * Searches and highlights plagiarism match excerpts directly inside the rendered docx-preview DOM.
 */
function applyDocxPlagiarismHighlights(
  container,
  matches = [],
  activeHighlightId = null,
  onHighlightClick = null,
  layerFilter = 'all',
  plagiarismOpacity = 80,
) {
  if (!container || !container.children.length) return;

  // 1. Clear existing highlights
  removeDocxHighlights(container);

  if (layerFilter === 'comments' || !Array.isArray(matches) || matches.length === 0) {
    return;
  }

  // 2. Unwind candidate suspect strings from various match formats
  const candidates = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (!m) continue;
    if (Array.isArray(m.matchedBlocks) && m.matchedBlocks.length > 0) {
      for (let b = 0; b < m.matchedBlocks.length; b++) {
        const txt = m.matchedBlocks[b]?.matchedText || m.matchedBlocks[b]?.text || '';
        if (txt.trim().length >= 4) {
          candidates.push({ match: m, text: txt.trim(), key: m.key || `${m.sourceId}-${b}` });
        }
      }
    } else {
      const txt = m.matchedText || m.suspectText || m.text || m.source_snippet || '';
      if (txt.trim().length >= 4) {
        candidates.push({ match: m, text: txt.trim(), key: m.key || `${m.sourceId}-${i}` });
      }
    }
  }

  if (candidates.length === 0) return;

  // Sort candidates by length descending so longer matching phrases take precedence
  candidates.sort((a, b) => b.text.length - a.text.length);

  const blockElements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td');
  if (blockElements.length === 0) return;

  blockElements.forEach((block) => {
    candidates.forEach(({ match, text, key }) => {
      const normalizedPhrase = text
        .replace(/[\u00ad\u200b\ufeff]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
      if (normalizedPhrase.length < 4) return;

      // If snippet is long, split by sentences or ~80 chars to ensure matches across formatting tags
      const searchPhrases =
        normalizedPhrase.length > 100
          ? normalizedPhrase
              .split(/(?<=[.?!])\s+/)
              .map((s) => s.trim())
              .filter((s) => s.length >= 15)
          : [normalizedPhrase];

      if (searchPhrases.length === 0) searchPhrases.push(normalizedPhrase);

      searchPhrases.forEach((phrase) => {
        const blockText = block.textContent.replace(/\s+/g, ' ').toLowerCase();
        if (!blockText.includes(phrase)) return;

        // Collect all text nodes currently in block that are not already highlighted
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.parentElement?.classList?.contains('docx-plagiarism-highlight')) continue;
          textNodes.push(node);
        }

        // Try single text node match first
        let matched = false;
        for (let t = 0; t < textNodes.length; t++) {
          const tNode = textNodes[t];
          const val = tNode.nodeValue || '';
          const cleanVal = val.replace(/\s+/g, ' ').toLowerCase();
          const matchIdx = cleanVal.indexOf(phrase);

          if (matchIdx !== -1) {
            try {
              const start = matchIdx;
              const end = Math.min(val.length, matchIdx + phrase.length);

              const mark = document.createElement('mark');
              mark.className = 'docx-plagiarism-highlight';
              mark.dataset.sourceId = String(match.sourceId || '');
              mark.dataset.matchKey = String(key);

              const isActive =
                Boolean(activeHighlightId) &&
                (match.sourceId === activeHighlightId ||
                  key === activeHighlightId ||
                  `plag-${match.sourceId}` === activeHighlightId);

              if (isActive) {
                mark.classList.add('is-active');
              }

              const score = Math.round(
                Number(match.similarityPercentage || match.similarityScore || match.score || 0),
              );
              mark.title = `[Plagiarism Match (${score}%)]: ${match.sourceTitle || 'Archived source'}`;

              const baseColor = match.palette?.color || DEFAULT_PLAGIARISM_COLOR;
              const bgTint = match.palette?.highlightBg || DEFAULT_PLAGIARISM_HIGHLIGHT;
              mark.style.backgroundColor = bgTint;
              mark.style.borderBottom = `2px solid ${baseColor}`;
              mark.style.borderRadius = '2px';
              mark.style.padding = '0 1px';
              mark.style.cursor = 'pointer';
              mark.style.opacity = String(plagiarismOpacity / 100);
              mark.style.transition = 'all 0.15s ease-in-out';

              if (isActive) {
                mark.style.outline = `2px solid ${baseColor}`;
                mark.style.boxShadow = `0 0 8px ${bgTint}`;
              }

              mark.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onHighlightClick) onHighlightClick(match);
              });

              const mid = tNode.splitText(start);
              mid.splitText(end - start);
              mark.textContent = mid.nodeValue;
              mid.parentNode.replaceChild(mark, mid);
              matched = true;
              break;
            } catch (_e) {
              // Gracefully handle split boundary edge cases
            }
          }
        }

        // If single text node match failed (split across multiple Word run spans):
        if (!matched && textNodes.length > 1) {
          let runningText = '';
          const nodeOffsets = textNodes.map((n) => {
            const start = runningText.length;
            runningText += (n.nodeValue || '').toLowerCase();
            return { node: n, start, end: runningText.length };
          });

          const spanMatchIdx = runningText.indexOf(phrase);
          if (spanMatchIdx !== -1) {
            const mStart = spanMatchIdx;
            const mEnd = spanMatchIdx + phrase.length;

            nodeOffsets.forEach(({ node: tNode, start: nStart, end: nEnd }) => {
              if (nEnd > mStart && nStart < mEnd) {
                try {
                  const localStart = Math.max(0, mStart - nStart);
                  const localEnd = Math.min(tNode.nodeValue.length, mEnd - nStart);
                  if (localEnd > localStart) {
                    const mark = document.createElement('mark');
                    mark.className = 'docx-plagiarism-highlight';
                    mark.dataset.sourceId = String(match.sourceId || '');
                    mark.dataset.matchKey = String(key);

                    const isActive =
                      Boolean(activeHighlightId) &&
                      (match.sourceId === activeHighlightId ||
                        key === activeHighlightId ||
                        `plag-${match.sourceId}` === activeHighlightId);

                    if (isActive) mark.classList.add('is-active');

                    const score = Math.round(
                      Number(
                        match.similarityPercentage || match.similarityScore || match.score || 0,
                      ),
                    );
                    mark.title = `[Plagiarism Match (${score}%)]: ${match.sourceTitle || 'Archived source'}`;

                    const baseColor = match.palette?.color || DEFAULT_PLAGIARISM_COLOR;
                    const bgTint = match.palette?.highlightBg || DEFAULT_PLAGIARISM_HIGHLIGHT;
                    mark.style.backgroundColor = bgTint;
                    mark.style.borderBottom = `2px solid ${baseColor}`;
                    mark.style.borderRadius = '2px';
                    mark.style.padding = '0 1px';
                    mark.style.cursor = 'pointer';
                    mark.style.opacity = String(plagiarismOpacity / 100);
                    mark.style.transition = 'all 0.15s ease-in-out';

                    if (isActive) {
                      mark.style.outline = `2px solid ${baseColor}`;
                      mark.style.boxShadow = `0 0 8px ${bgTint}`;
                    }

                    mark.addEventListener('click', (e) => {
                      e.stopPropagation();
                      if (onHighlightClick) onHighlightClick(match);
                    });

                    const mid = tNode.splitText(localStart);
                    mid.splitText(localEnd - localStart);
                    mark.textContent = mid.nodeValue;
                    mid.parentNode.replaceChild(mark, mid);
                  }
                } catch (_e) {
                  // Gracefully handle split boundary edge cases
                }
              }
            });
          }
        }
      });
    });
  });

  // If an active highlight is selected, scroll the first instance into view
  if (activeHighlightId) {
    const activeEl = container.querySelector('.docx-plagiarism-highlight.is-active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
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
  file,
  zoom,
  chapterTitle,
  versionBadge,
  fileName,
  onDownload,
  plagiarismMatches = [],
  activeHighlightId = null,
  onHighlightClick = null,
  layerFilter = 'all',
  plagiarismOpacity = 80,
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const renderDocx = useCallback(async () => {
    if (!containerRef.current || (!file && !submissionId && !streamFileUrl)) return;

    // Abort any in-flight render
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let arrayBuffer;

      // 1. Direct in-memory File or Blob object
      if (file && typeof file.arrayBuffer === 'function') {
        arrayBuffer = await file.arrayBuffer();
      } else if (file && file instanceof Blob) {
        arrayBuffer = await new Response(file).arrayBuffer();
      }

      // 2. Local blob: URL provided as streamFileUrl
      if (!arrayBuffer && streamFileUrl && streamFileUrl.startsWith('blob:')) {
        const response = await fetch(streamFileUrl, { signal: controller.signal });
        arrayBuffer = await response.arrayBuffer();
      }

      // 3. If streamFileUrl is an external pre-signed URL (e.g. S3 / MinIO signed link), try fetching it
      if (
        !arrayBuffer &&
        streamFileUrl &&
        (streamFileUrl.startsWith('http://') || streamFileUrl.startsWith('https://'))
      ) {
        try {
          const response = await fetch(streamFileUrl, { signal: controller.signal });
          if (response.ok) {
            arrayBuffer = await response.arrayBuffer();
          } else {
            console.warn(
              `[DocxPreviewRenderer] External signed URL returned ${response.status}, falling back to authenticated API endpoint.`,
            );
          }
        } catch (fetchErr) {
          if (controller.signal.aborted) return;
          console.warn(
            '[DocxPreviewRenderer] External signed URL fetch failed, falling back to authenticated API endpoint:',
            fetchErr.message,
          );
        }
      }

      // 4. Fetch via Axios api client with automatic 401 token refresh interceptor
      if (!arrayBuffer) {
        const fetchEndpoint = streamFileUrl?.startsWith('/api/')
          ? streamFileUrl.replace(/^\/api/, '')
          : streamFileUrl?.startsWith('/')
            ? streamFileUrl
            : submissionId
              ? `/submissions/${submissionId}/file`
              : null;

        if (!fetchEndpoint) {
          throw new Error('No submission ID or file stream URL provided.');
        }

        const response = await api.get(fetchEndpoint, {
          responseType: 'arraybuffer',
          signal: controller.signal,
        });
        arrayBuffer = response.data;
      }

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
        renderComments: true,
        experimental: true,
      });

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    } catch (err) {
      if (err.name === 'AbortError' || controller.signal.aborted) return;
      console.error('[DocxPreviewRenderer] Render failed:', err);
      let errorMsg = 'Failed to render document.';
      if (err.response?.status) {
        errorMsg = `Server returned ${err.response.status}: ${err.response.statusText || (err.response.status === 401 ? 'Unauthorized' : 'Error')}`;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setLoading(false);
    }
  }, [submissionId, streamFileUrl, file]);

  useEffect(() => {
    renderDocx();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [renderDocx]);

  // Apply in-document highlights on the rendered DOCX DOM
  useEffect(() => {
    if (!loading && containerRef.current) {
      applyDocxPlagiarismHighlights(
        containerRef.current,
        plagiarismMatches,
        activeHighlightId,
        onHighlightClick,
        layerFilter,
        plagiarismOpacity,
      );
    }
  }, [
    loading,
    plagiarismMatches,
    activeHighlightId,
    onHighlightClick,
    layerFilter,
    plagiarismOpacity,
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 z-10 gap-3">
          <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20">
            <Spinner className="size-6 text-primary" />
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
      <div className="flex-1 overflow-auto bg-muted">
        <div
          className="docx-zoom-wrapper w-max min-w-full origin-top-left"
          style={{
            zoom: zoom / 100,
            width: 'max-content',
            // Expand the wrapper dimensions so scrollbar reflects zoomed size
            minWidth: '100%',
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
  submissionId: PropTypes.string,
  streamFileUrl: PropTypes.string,
  file: PropTypes.any,
  zoom: PropTypes.number.isRequired,
  chapterTitle: PropTypes.string.isRequired,
  versionBadge: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  onDownload: PropTypes.func.isRequired,
  plagiarismMatches: PropTypes.array,
  activeHighlightId: PropTypes.string,
  onHighlightClick: PropTypes.func,
  layerFilter: PropTypes.string,
  plagiarismOpacity: PropTypes.number,
};

SophisticatedDocumentViewer.propTypes = {
  open: PropTypes.bool,
  onOpenChange: PropTypes.func,
  submission: PropTypes.object,
  file: PropTypes.any,
  fileBlob: PropTypes.any,
  fileUrl: PropTypes.string,
  fileName: PropTypes.string,
  chapterTitle: PropTypes.string,
  portalTarget: PropTypes.any,
  initialViewMode: PropTypes.string,
  embedded: PropTypes.bool,
  className: PropTypes.string,
  highlights: PropTypes.array,
  plagiarismMatches: PropTypes.array,
  activeHighlightId: PropTypes.string,
  onSelectionFinished: PropTypes.func,
  onHighlightClick: PropTypes.func,
  onAddReply: PropTypes.func,
  onResolveComment: PropTypes.func,
  onAddToAdm: PropTypes.func,
  layerFilter: PropTypes.string,
  commentsOpacity: PropTypes.number,
  plagiarismOpacity: PropTypes.number,
  userRole: PropTypes.string,
  canComment: PropTypes.bool,
  pdfUtilsRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  useLegacyIframe: PropTypes.bool,
  isPlagiarismReport: PropTypes.bool,
  isArchive: PropTypes.bool,
  showArchiveIdentity: PropTypes.bool,
  hideIdentity: PropTypes.bool,
  showRevisionDiff: PropTypes.bool,
  showComments: PropTypes.bool,
  isSubmission: PropTypes.bool,
};
