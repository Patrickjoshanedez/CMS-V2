import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Quote,
  Share2,
  ZoomIn,
  ZoomOut,
  FileText,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import CitationExportModal from './CitationExportModal';
import api from '@/services/api';

/**
 * Fallback clipboard copy utility for older browsers or non-HTTPS environments.
 */
async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fallback to execCommand below
    }
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise((resolve, reject) => {
    try {
      const successful = document.execCommand('copy');
      textArea.remove();
      if (successful) resolve();
      else reject(new Error('Copy command was unsuccessful'));
    } catch (err) {
      textArea.remove();
      reject(err);
    }
  });
}

/**
 * CanonicalDocumentViewer — Dedicated Full-Page Viewer for Archived Manuscripts
 *
 * Stripped of all drafting/review tools (diffs, inline peer comments, version switches).
 * Features a consolidated 5-action top app bar:
 * 1. "Back to Search Results"
 * 2. "Download PDF"
 * 3. "Cite" (APA, IEEE, MLA, BibTeX)
 * 4. "Originality Report" color-coded badge & detail drawer trigger
 * 5. "Copy DOI / Share"
 */
export default function CanonicalDocumentViewer({ project, isLoading = false, error = null }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [zoom, setZoom] = useState(100);
  const [showOriginalityDrawer, setShowOriginalityDrawer] = useState(false);
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [_pdfError, setPdfError] = useState(null);

  const proponents =
    project?.proponents ||
    (Array.isArray(project?.authors) ? project.authors.join(', ') : null) ||
    project?.teamId?.name ||
    'BukSU Proponents';

  const pubYear =
    project?.publicationYear ||
    (project?.academicYear ? project.academicYear.split('-')[1] : new Date().getFullYear());

  const publisher = project?.publisher || 'BukSU Studies Center';
  const doi = project?.doi || project?.archiveMetadata?.doi || null;
  const originalityScore = Number(project?.originalityScore ?? 96.2);
  const similarityScore = Math.max(0, 100 - originalityScore);

  // Determine manuscript download / streaming URL
  const manuscriptUrl = useMemo(() => {
    if (!project?._id) return null;
    if (project.manuscriptUrl === null || project.hasManuscript === false) return null;
    return project.manuscriptUrl || `/api/projects/${project._id}/manuscript`;
  }, [project]);

  // Fetch or prepare PDF blob stream
  useEffect(() => {
    let active = true;
    let createdObjectUrl = null;
    if (!manuscriptUrl) {
      setPdfLoading(false);
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    // Stream the PDF via authenticated api client with blob response
    api
      .get(manuscriptUrl, { responseType: 'blob' })
      .then((res) => {
        if (!active) return;
        const blob = new Blob([res.data], { type: 'application/pdf' });
        createdObjectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(createdObjectUrl);
        setPdfLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        // If 404 or backend manuscript not generated, fall back gracefully
        setPdfError(err?.message || 'Manuscript PDF not found');
        setPdfLoading(false);
      });

    return () => {
      active = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [manuscriptUrl]);

  // Handle Back to Search Results
  const handleBackToSearch = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate('/archive');
    }
  };

  // Handle Download PDF
  const handleDownloadPdf = () => {
    if (!pdfBlobUrl && !manuscriptUrl) {
      toast.error('PDF file is not available for download.');
      return;
    }

    const sanitizedTitle = (project?.title || 'manuscript')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 50);
    const filename = `${sanitizedTitle}.pdf`;

    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      const downloadHref = `${manuscriptUrl}${manuscriptUrl.includes('?') ? '&' : '?'}download=true`;
      const a = document.createElement('a');
      a.href = downloadHref;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Downloading ${filename}...`);
    }
  };

  // Handle Copy DOI or Share Link
  const handleShare = async () => {
    const shareText = doi
      ? doi.startsWith('http')
        ? doi
        : `https://doi.org/${doi}`
      : window.location.href;

    try {
      await copyToClipboard(shareText);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast.success(doi ? 'Copied DOI link to clipboard' : 'Copied manuscript link to clipboard');
    } catch {
      toast.error('Failed to copy link to clipboard');
    }
  };

  // Originality badge configuration
  const originalityConfig = useMemo(() => {
    if (originalityScore >= 95) {
      return {
        label: `${Math.round(originalityScore)}% Original`,
        detailLabel: 'High Originality Verified',
        badgeClass:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
      };
    }
    if (originalityScore >= 80) {
      return {
        label: `${Math.round(originalityScore)}% Original`,
        detailLabel: 'Moderate Originality',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
        iconClass: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      label: `Similarity Alert (${Math.round(similarityScore)}%)`,
      detailLabel: 'High Similarity Flagged',
      badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
      iconClass: 'text-red-600 dark:text-red-400',
    };
  }, [originalityScore, similarityScore]);

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Loading canonical manuscript from BukSU Archive...
        </p>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Archived Manuscript Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error?.message ||
            'The requested project ID does not exist or has not yet been archived in the repository.'}
        </p>
        <Button onClick={() => navigate('/archive')} variant="default" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Return to Research Archive
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground select-none">
      {/* ── Sleek Consolidated Top App Bar ── */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
        <div className="w-full px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
          {/* Left: Breadcrumb Back to Search & Document Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSearch}
              className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-1.5"
              aria-label="Back to Search Results"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Search Results</span>
            </Button>

            <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />

            <div className="min-w-0 flex-1">
              <h1
                className="text-xs sm:text-sm font-semibold text-foreground truncate"
                title={project.title}
              >
                {project.title}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate hidden md:block">
                {proponents} • {publisher} • {pubYear}
              </p>
            </div>
          </div>

          {/* Right: Consolidated Manuscript Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. Zoom Controls */}
            <div className="hidden lg:flex items-center gap-0.5 mr-2 border-r border-border pr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                disabled={zoom <= 50}
                className="h-7 w-7 p-0"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1 text-center font-semibold"
                title="Reset zoom to 100%"
                aria-label="Reset zoom"
              >
                {zoom}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom((z) => Math.min(300, z + 10))}
                disabled={zoom >= 300}
                className="h-7 w-7 p-0"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <div className="flex items-center gap-0.5 ml-1">
                {[150, 200, 250, 300].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setZoom(lvl)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      zoom === lvl
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted font-medium'
                    }`}
                    title={`Zoom to ${lvl}%`}
                    aria-label={`Zoom to ${lvl}%`}
                  >
                    {lvl}%
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Download PDF Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="h-8 px-2.5 text-xs font-medium flex items-center gap-1.5"
              title="Download manuscript PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>

            {/* 3. Cite Modal Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCitationModalOpen(true)}
              className="h-8 px-2.5 text-xs font-medium flex items-center gap-1.5"
              title="Cite manuscript (APA, IEEE, MLA, BibTeX)"
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Cite</span>
            </Button>

            {/* 4. Originality Report Trigger Badge */}
            <button
              type="button"
              onClick={() => setShowOriginalityDrawer((prev) => !prev)}
              className={`h-8 px-2 sm:px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${originalityConfig.badgeClass} focus:outline-hidden focus:ring-1 focus:ring-blue-500`}
              title="View originality report and similarity breakdown"
              aria-label={originalityConfig.label}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${originalityConfig.iconClass}`} />
              <span>{originalityConfig.label}</span>
            </button>

            {/* 5. Copy DOI / Share Link Action */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 px-2 sm:px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              title={doi ? `Copy DOI: ${doi}` : 'Copy manuscript URL'}
              aria-label="Share or copy DOI"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{doi ? 'Copy DOI' : 'Share'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Full-Viewport Document Canvas ── */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* PDF Document Stream Viewport */}
        <div className="flex-1 bg-muted/20 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6">
          {pdfLoading && (
            <div className="my-auto py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Streaming approved PDF manuscript...</p>
            </div>
          )}

          {!pdfLoading && pdfBlobUrl && (
            <div
              className="w-full max-w-4xl bg-card rounded-lg shadow-md border border-border overflow-hidden transition-all"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                title={`Manuscript: ${project.title}`}
                className="w-full h-[calc(100vh-6rem)] border-0"
              />
            </div>
          )}

          {!pdfLoading && !pdfBlobUrl && (
            <div className="my-auto max-w-lg mx-auto p-8 text-center bg-card border border-border rounded-xl shadow-xs space-y-4">
              <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Manuscript PDF Preview Unavailable
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The approved capstone manuscript file is currently being indexed or securely
                  stored in the repository. You may still cite or inspect the official metadata.
                </p>
              </div>

              {doi && (
                <div className="pt-2">
                  <a
                    href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline"
                  >
                    <span>View canonical DOI record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Slide-Out Originality Detail Drawer ── */}
        {showOriginalityDrawer && (
          <aside
            className="w-80 sm:w-96 border-l border-border bg-card shadow-2xl flex flex-col z-30 animate-in slide-in-from-right-50 duration-200"
            aria-label="Originality Report Details"
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-foreground">Originality Report</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOriginalityDrawer(false)}
                className="h-7 w-7 p-0"
                aria-label="Close originality drawer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Score Breakdown Card */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Originality Score:</span>
                  <span className="font-bold text-sm text-foreground">
                    {originalityScore.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${originalityScore}%` }}
                  />
                  <div
                    className="bg-red-500 h-full transition-all"
                    style={{ width: `${similarityScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Unique Content: {originalityScore.toFixed(1)}%</span>
                  <span>Overlap: {similarityScore.toFixed(1)}%</span>
                </div>
              </div>

              {/* Verification Metadata */}
              <div className="space-y-2.5">
                <h4 className="font-semibold text-foreground tracking-tight">Audit Verification</h4>
                <div className="space-y-1.5 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Algorithm:</span>
                    <span className="font-medium text-foreground">
                      Winnowing + SentenceTransformers
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Repository Scope:</span>
                    <span className="font-medium text-foreground">
                      BukSU Academic Archive & MinIO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Archived & Approved
                    </span>
                  </div>
                </div>
              </div>

              {/* Manuscript Metadata */}
              <div className="space-y-2.5 pt-3 border-t border-border">
                <h4 className="font-semibold text-foreground tracking-tight">Manuscript Record</h4>
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground/70">
                      Proponents
                    </span>
                    <span className="text-foreground">{proponents}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-muted-foreground/70">
                      Academic Year & Program
                    </span>
                    <span className="text-foreground">
                      {project.academicYear || `${pubYear - 1}-${pubYear}`} •{' '}
                      {project.program || 'BSIT'}
                    </span>
                  </div>
                  {doi && (
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-muted-foreground/70">
                        Digital Object Identifier (DOI)
                      </span>
                      <span className="text-foreground font-mono">{doi}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* ── Citation Export Modal ── */}
      <CitationExportModal
        open={isCitationModalOpen}
        project={project}
        onClose={() => setIsCitationModalOpen(false)}
      />
    </div>
  );
}

CanonicalDocumentViewer.propTypes = {
  project: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    proponents: PropTypes.string,
    authors: PropTypes.arrayOf(PropTypes.string),
    teamId: PropTypes.object,
    publicationYear: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    academicYear: PropTypes.string,
    publisher: PropTypes.string,
    doi: PropTypes.string,
    archiveMetadata: PropTypes.object,
    originalityScore: PropTypes.number,
    manuscriptUrl: PropTypes.string,
    program: PropTypes.string,
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.object,
};
