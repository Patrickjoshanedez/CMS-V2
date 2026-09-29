import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import 'pdfjs-dist/web/pdf_viewer.css';
import {
  PdfLoader,
  PdfHighlighter,
  TextHighlight,
  useHighlightContainerContext,
} from 'react-pdf-highlighter-plus';
import 'react-pdf-highlighter-plus/style/style.css';
import 'react-pdf-highlighter-plus/style/pdf_viewer.css';
import TurnitinHighlightOverlay from './TurnitinHighlightOverlay';

// Ensure PDF.js worker is registered locally
import '@/utils/pdfWorker';

import {
  MessageSquare,
  AlertTriangle,
  Send,
  Plus,
  FileSpreadsheet,
  ShieldAlert,
  Clock,
  User,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  annotateOverlappingHighlights,
  resolvePlagiarismHighlights,
} from '@/utils/plagiarismHighlightAdapter';

/**
 * Custom Highlight Popover & Content Container
 */
export function HighlightPopupContent({
  highlight,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  onClose,
  canReply = true,
  isArchive = false,
}) {
  const isArchiveMode = Boolean(
    isArchive ||
    highlight.meta?.isArchive ||
    (typeof window !== 'undefined' && window.location?.pathname?.startsWith('/archive')),
  );
  const isOverlap = highlight.isCrossLayerOverlap || highlight.isOverlap;
  const isPlagiarism = highlight.type?.startsWith('plagiarism_');
  const isComment = highlight.type === 'faculty_comment';

  const [activeTab, setActiveTab] = useState(
    isOverlap ? 'comment' : isComment ? 'comment' : 'plagiarism',
  );
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Find linked overlap highlight if applicable
  const linkedHighlight = highlight.overlappingHighlights?.[0] || null;
  const commentItem = isComment
    ? highlight
    : linkedHighlight?.type === 'faculty_comment'
      ? linkedHighlight
      : null;
  const plagiarismItem = isPlagiarism
    ? highlight
    : linkedHighlight?.type?.startsWith('plagiarism_')
      ? linkedHighlight
      : null;

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !onAddReply || !commentItem) return;
    setSubmittingReply(true);
    try {
      await onAddReply(commentItem.meta?.commentId || commentItem.id, replyText.trim());
      setReplyText('');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolve = () => {
    if (!onResolveComment || !commentItem) return;
    const nextStatus = commentItem.meta?.status === 'resolved' ? 'open' : 'resolved';
    onResolveComment(commentItem.meta?.commentId || commentItem.id, nextStatus);
  };

  return (
    <div
      role="dialog"
      aria-label="Annotation details"
      className="bg-popover text-popover-foreground border border-border/80 shadow-2xl rounded-xl p-3.5 w-80 sm:w-96 text-xs space-y-3 z-50 animate-in fade-in-50 zoom-in-95 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isOverlap ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-400 border-purple-500/30 flex items-center gap-1 font-semibold"
            >
              <Sparkles className="h-3 w-3" />
              Cross-Layer Overlap
            </Badge>
          ) : isComment ? (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 bg-indigo-500/10 text-indigo-400 border-indigo-500/30 flex items-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              {highlight.meta?.authorRole
                ? highlight.meta.authorRole.replace('_', ' ').toUpperCase()
                : 'COMMENT'}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 bg-rose-500/10 text-rose-400 border-rose-500/30 flex items-center gap-1"
            >
              <ShieldAlert className="h-3 w-3" />
              {isArchiveMode ? 'SIMILARITY' : 'PLAGIARISM'}{' '}
              {highlight.meta?.similarityScore ? `(${highlight.meta.similarityScore}%)` : ''}
            </Badge>
          )}

          {highlight.meta?.category && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30 font-medium"
            >
              {highlight.meta.category}
            </Badge>
          )}

          <span className="text-[10px] text-muted-foreground font-mono">
            Page {highlight.position?.pageNumber || 1}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground rounded p-0.5 transition-colors"
          aria-label="Close popover"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Segmented Switcher for Overlapping Matches */}
      {isOverlap && (
        <div className="flex border-b border-border/40 text-[11px] font-medium">
          <button
            type="button"
            className={`flex-1 py-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
              activeTab === 'comment'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('comment')}
          >
            <MessageSquare className="h-3 w-3 text-indigo-400" />
            Comment
          </button>
          <button
            type="button"
            className={`flex-1 py-1 text-center transition-colors border-b-2 flex items-center justify-center gap-1 ${
              activeTab === 'plagiarism'
                ? 'border-rose-500 text-rose-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('plagiarism')}
          >
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            {isArchiveMode ? 'Similarity' : 'Plagiarism'} (
            {plagiarismItem?.meta?.similarityScore || 0}%)
          </button>
        </div>
      )}

      {/* Tab A: Faculty Comment Thread */}
      {(activeTab === 'comment' || (!isOverlap && isComment)) && commentItem && (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 font-semibold text-foreground text-[11px]">
                <div className="h-5 w-5 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                  {commentItem.meta?.authorName?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                </div>
                <span>{commentItem.meta?.authorName || 'Faculty Member'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                <span>Page {commentItem.position?.pageNumber || 1}</span>
                {commentItem.meta?.status && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] py-0 px-1 uppercase ${
                      commentItem.meta.status === 'resolved'
                        ? 'border-emerald-500/40 text-emerald-400'
                        : 'border-amber-500/40 text-amber-400'
                    }`}
                  >
                    {commentItem.meta.status}
                  </Badge>
                )}
              </div>
            </div>
            {onResolveComment && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                onClick={handleResolve}
              >
                {commentItem.meta?.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </Button>
            )}
          </div>

          <p className="text-foreground text-xs leading-relaxed bg-muted/20 p-2 rounded-lg border border-border/40">
            {commentItem.meta?.commentText ||
              commentItem.content?.text ||
              'No comment text provided.'}
          </p>

          {/* Threaded Replies List */}
          {Array.isArray(commentItem.meta?.replies) && commentItem.meta.replies.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border/40 max-h-36 overflow-y-auto">
              {commentItem.meta.replies.map((reply, rIdx) => (
                <div
                  key={reply._id || rIdx}
                  className="text-[11px] p-1.5 bg-muted/30 rounded border border-border/30 space-y-0.5"
                >
                  <div className="flex items-center justify-between text-muted-foreground text-[9px] mb-0.5">
                    <span className="font-semibold text-foreground">
                      {reply.authorName || 'User'}
                    </span>
                    <span>{reply.authorRole ? reply.authorRole.toUpperCase() : ''}</span>
                  </div>
                  <p className="text-foreground">{reply.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply Form */}
          {canReply && (
            <form onSubmit={handleSendReply} className="flex gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-background border border-border/80 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!replyText.trim() || submittingReply}
                className="h-7 px-2 text-xs"
              >
                <Send className="h-3 w-3" />
              </Button>
            </form>
          )}

          {/* Comment Actions */}
          <div className="flex items-center justify-between pt-1 text-[10px]">
            {onAddToAdm && (
              <button
                type="button"
                onClick={() => {
                  const directive = {
                    pageNumbers: String(
                      commentItem.position?.pageNumber || commentItem.pageNumber || 1,
                    ),
                    suggestion:
                      commentItem.commentText || commentItem.text || 'Panel Recommendation',
                    expectedAction:
                      'Address panel recommendation and update manuscript accordingly.',
                    panelName: commentItem.meta?.authorName || 'Panel Member',
                    milestone: 'CAPSTONE_2',
                  };
                  onAddToAdm(directive);
                  onClose?.();
                }}
                className="text-primary hover:underline flex items-center gap-1 ml-auto font-medium"
              >
                <Plus className="h-3 w-3" />+ Add to ADM Directive
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab B: Plagiarism Source Inspection */}
      {(activeTab === 'plagiarism' || (!isOverlap && isPlagiarism)) && plagiarismItem && (
        <div className="space-y-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
              Matched Repository Record
            </span>
            <p className="font-semibold text-foreground text-[11px] mt-0.5 leading-snug">
              {plagiarismItem.meta?.sourceTitle || 'Archived Institutional Manuscript'}
            </p>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px]">
            <span className="text-muted-foreground">
              {isArchiveMode ? 'Content Similarity:' : 'Originality Similarity:'}
            </span>
            <span className="font-bold text-rose-500">
              {plagiarismItem.meta?.similarityScore || 0}% Match
            </span>
          </div>

          {plagiarismItem.content?.text && (
            <div className="bg-muted/30 p-2 rounded-lg border border-border/50 space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold">
                {isArchiveMode ? 'Similar Manuscript Passage:' : 'Flagged Manuscript Passage:'}
              </span>
              <p className="text-[11px] text-foreground leading-relaxed italic">
                &ldquo;{plagiarismItem.content.text}&rdquo;
              </p>
            </div>
          )}

          {/* Direct Redirection to Source in Archive or External */}
          {(plagiarismItem.meta?.projectId ||
            plagiarismItem.meta?.matchedSourceId ||
            plagiarismItem.meta?.sourceId ||
            plagiarismItem.meta?.doi ||
            plagiarismItem.meta?.sourceUrl ||
            isArchiveMode) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const meta = plagiarismItem.meta || {};
                const sourceId = meta.projectId || meta.matchedSourceId || meta.sourceId;
                if (meta.doi) {
                  const doiUrl = meta.doi.startsWith('http')
                    ? meta.doi
                    : `https://doi.org/${meta.doi}`;
                  window.open(doiUrl, '_blank', 'noopener,noreferrer');
                } else if (meta.sourceUrl) {
                  window.open(meta.sourceUrl, '_blank', 'noopener,noreferrer');
                } else if (sourceId && String(sourceId).length === 24) {
                  window.location.href = `/archive/document/${sourceId}`;
                } else if (meta.sourceTitle) {
                  window.location.href = `/archive?q=${encodeURIComponent(meta.sourceTitle)}`;
                }
              }}
              className="w-full text-xs gap-1.5 border border-border/60 hover:bg-accent text-foreground mt-1 font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Open Source Publication in Archive
            </Button>
          )}

          {!isArchiveMode && onAddToAdm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const directive = {
                  pageNumbers: String(
                    plagiarismItem.position?.pageNumber || plagiarismItem.meta?.pageNumber || 1,
                  ),
                  suggestion: `[Academic Integrity Flag - ${plagiarismItem.meta?.similarityScore || 0}% Match]: "${plagiarismItem.content?.text || plagiarismItem.meta?.sourceTitle || 'Flagged citation'}"`,
                  expectedAction:
                    'Properly cite original work, rephrase theoretical formulation, or provide verifiable attribution.',
                  panelName: plagiarismItem.meta?.authorName || 'Defense Committee',
                  milestone: 'CAPSTONE_2',
                  sourceTitle: plagiarismItem.meta?.sourceTitle,
                  similarityScore: plagiarismItem.meta?.similarityScore,
                };
                onAddToAdm(directive);
                onClose?.();
              }}
              className="w-full text-xs gap-1.5 border-rose-500/40 text-rose-400 hover:bg-rose-500/10 mt-1 font-semibold"
            >
              <FileSpreadsheet className="h-3 w-3" />+ Add to ADM Directive
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Custom Highlight Badge component rendered onto PDF.js canvas layers
 */
function CustomHighlightRenderer({
  highlight,
  isSelected,
  activeHighlightId,
  onClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
}) {
  const [showPopup, setShowPopup] = useState(false);

  const isCrossLayerOverlap = highlight.isCrossLayerOverlap;
  const isOverlap = highlight.isOverlap;
  const isPlagiarism = highlight.type?.startsWith('plagiarism_');
  const isComment = highlight.type === 'faculty_comment';

  const isMatchSelected =
    Boolean(isSelected) ||
    Boolean(
      activeHighlightId &&
      (highlight.id === activeHighlightId ||
        highlight.meta?.matchedSourceId === activeHighlightId ||
        String(highlight.id).includes(activeHighlightId)),
    );

  const firstRect = highlight.position?.boundingRect || highlight.position?.rects?.[0] || null;

  let highlightClass = 'highlight-custom';
  if (isCrossLayerOverlap || isOverlap) {
    highlightClass = 'archive-mark-overlap';
  } else if (isPlagiarism) {
    const tierClass = highlight.meta?.scoreTierClass || 'highlight-plagiarism--medium';
    const signalClass =
      highlight.meta?.contextSignal === 'paraphrase'
        ? 'paraphrase'
        : highlight.meta?.contextSignal === 'verbatim'
          ? 'verbatim'
          : highlight.meta?.isExact
            ? 'exact'
            : 'semantic';
    highlightClass = `highlight-plagiarism ${tierClass} ${signalClass}`;
  } else if (isComment) {
    highlightClass = 'highlight-faculty';
  }

  if (isMatchSelected) {
    highlightClass += ' archive-mark-active';
  }

  const resolvedColor = isPlagiarism
    ? highlight.meta?.palette?.color ||
      (highlight.meta?.similarityScore >= 90
        ? 'rgba(185, 28, 28, 0.85)'
        : highlight.meta?.similarityScore >= 70
          ? 'rgba(244, 63, 94, 0.85)'
          : highlight.meta?.similarityScore >= 50
            ? 'rgba(249, 115, 22, 0.85)'
            : 'rgba(234, 179, 8, 0.85)')
    : isComment
      ? 'rgba(59, 130, 246, 0.85)'
      : 'rgba(168, 85, 247, 0.85)';

  const partStyle = {
    borderBottom: `2px solid ${resolvedColor}`,
    borderRadius: '2px',
    cursor: 'pointer',
    opacity: 'var(--plagiarism-opacity, 0.85)',
    transition: 'all 0.15s ease-in-out',
    ...(isMatchSelected
      ? {
          outline: `2px solid ${resolvedColor}`,
          boxShadow: `0 0 8px ${resolvedColor}`,
        }
      : {}),
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setShowPopup(!showPopup);
    if (onClick) onClick(highlight);
  };

  return (
    <div className="relative group">
      <TextHighlight
        highlight={highlight}
        onClick={handleClick}
        className={highlightClass}
        highlightColor={resolvedColor}
        style={partStyle}
      />
      {/* Margin Gutter Split-Pills with Quick Anchors */}
      <div
        className="absolute -left-12 gutter-split-pill z-20 pointer-events-auto"
        style={firstRect ? { top: `${firstRect.top}px` } : { top: '-4px' }}
        onClick={handleClick}
        title={
          isCrossLayerOverlap
            ? `Overlap: 1 Comment + ${highlight.meta?.similarityScore || 0}% Plagiarism Match`
            : isComment
              ? `Faculty Comment (${highlight.meta?.authorRole || 'Faculty'})`
              : `Plagiarism Match (${highlight.meta?.similarityScore || 0}%)`
        }
      >
        {(isComment || isCrossLayerOverlap) && (
          <span
            className="pill-comment"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(true);
              if (onClick) onClick(highlight);
            }}
          >
            <MessageSquare className="h-2.5 w-2.5" />
            <span>{highlight.meta?.replies?.length ? highlight.meta.replies.length + 1 : 1}</span>
          </span>
        )}
        {(isPlagiarism || isCrossLayerOverlap) && (
          <span
            className="pill-plagiarism"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(true);
              if (onClick) onClick(highlight);
            }}
          >
            <ShieldAlert className="h-2.5 w-2.5" />
            <span>
              {highlight.meta?.contextSignal === 'paraphrase'
                ? '~'
                : highlight.meta?.contextSignal === 'verbatim'
                  ? '!!'
                  : ''}
              {highlight.meta?.similarityScore || 0}%
            </span>
          </span>
        )}
      </div>

      {/* Popover Card */}
      {(showPopup || isMatchSelected) && firstRect && (
        <div
          className="absolute z-50 pointer-events-auto"
          style={{
            left: `${firstRect.left}px`,
            top: `${firstRect.top + firstRect.height + 6}px`,
          }}
        >
          <HighlightPopupContent
            highlight={highlight}
            onAddReply={onAddReply}
            onResolveComment={onResolveComment}
            onAddToAdm={onAddToAdm}
            onClose={() => setShowPopup(false)}
          />
        </div>
      )}
    </div>
  );
}

/**
 * HighlightContainerItem — Context Consumer for PdfHighlighter Children
 *
 * Consumes useHighlightContainerContext to receive the active highlight and scroll state.
 * Routes plagiarism highlights to TurnitinHighlightOverlay and faculty comments to
 * CustomHighlightRenderer.
 */
function HighlightContainerItem({
  activeHighlightId,
  onClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  plagiarismOpacity,
}) {
  const { highlight, isScrolledTo } = useHighlightContainerContext();

  const isSelected = isScrolledTo || highlight.id === activeHighlightId;
  const isPlagiarism = highlight.type?.startsWith('plagiarism_');

  if (isPlagiarism) {
    return (
      <TurnitinHighlightOverlay
        highlight={highlight}
        isSelected={isSelected}
        activeHighlightId={activeHighlightId}
        onClick={onClick}
        onAddReply={onAddReply}
        onResolveComment={onResolveComment}
        onAddToAdm={onAddToAdm}
        opacity={plagiarismOpacity}
      />
    );
  }

  return (
    <CustomHighlightRenderer
      highlight={highlight}
      isSelected={isSelected}
      activeHighlightId={activeHighlightId}
      onClick={onClick}
      onAddReply={onAddReply}
      onResolveComment={onResolveComment}
      onAddToAdm={onAddToAdm}
    />
  );
}

function PdfViewerInner({
  pdfDocument,
  highlights = [],
  plagiarismMatches = [],
  activeHighlightId = null,
  onSelectionFinished,
  onHighlightClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  layerFilter = 'all',
  canComment = true,
  utilsRef,
  plagiarismOpacity = 0.28,
}) {
  const [resolvedPlagiarismHighlights, setResolvedPlagiarismHighlights] = useState([]);

  useEffect(() => {
    let active = true;
    if (pdfDocument && plagiarismMatches && plagiarismMatches.length > 0) {
      resolvePlagiarismHighlights(pdfDocument, plagiarismMatches).then((resolved) => {
        if (active) setResolvedPlagiarismHighlights(resolved || []);
      });
    } else {
      setResolvedPlagiarismHighlights([]);
    }
    return () => {
      active = false;
    };
  }, [pdfDocument, plagiarismMatches]);

  const allHighlights = useMemo(() => {
    return [...highlights, ...resolvedPlagiarismHighlights];
  }, [highlights, resolvedPlagiarismHighlights]);

  // Filter highlights based on active layer toggles
  const filteredHighlights = useMemo(() => {
    if (!Array.isArray(allHighlights)) return [];
    if (layerFilter === 'comments') {
      return allHighlights.filter((h) => h.type === 'faculty_comment');
    }
    if (layerFilter === 'plagiarism') {
      return allHighlights.filter((h) => h.type?.startsWith('plagiarism_'));
    }
    return allHighlights;
  }, [allHighlights, layerFilter]);

  // Enforce overlap metadata calculation across multi-layer highlights
  const annotatedHighlights = useMemo(() => {
    return annotateOverlappingHighlights(filteredHighlights);
  }, [filteredHighlights]);

  // Selection handler converting ScaledPosition from react-pdf-highlighter-plus
  const handleSelection = useCallback(
    (selection) => {
      if (!canComment || !selection) return;

      const { position, content } = selection;
      const selectedText = content?.text?.trim() || '';

      if (onSelectionFinished) {
        onSelectionFinished({
          selectedText,
          position,
          pageNumber: position?.pageNumber || 1,
        });
      }
    },
    [canComment, onSelectionFinished],
  );

  return (
    <PdfHighlighter
      pdfDocument={pdfDocument}
      highlights={annotatedHighlights}
      utilsRef={utilsRef}
      onSelectionFinished={handleSelection}
      onScrollChange={() => {}}
      pdfScaleValue="page-width"
    >
      <HighlightContainerItem
        activeHighlightId={activeHighlightId}
        onClick={onHighlightClick}
        onAddReply={onAddReply}
        onResolveComment={onResolveComment}
        onAddToAdm={onAddToAdm}
        plagiarismOpacity={plagiarismOpacity}
      />
    </PdfHighlighter>
  );
}

PdfViewerInner.propTypes = {
  pdfDocument: PropTypes.object.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.object),
  plagiarismMatches: PropTypes.arrayOf(PropTypes.object),
  activeHighlightId: PropTypes.string,
  onSelectionFinished: PropTypes.func,
  onHighlightClick: PropTypes.func,
  onAddReply: PropTypes.func,
  onResolveComment: PropTypes.func,
  onAddToAdm: PropTypes.func,
  layerFilter: PropTypes.string,
  canComment: PropTypes.bool,
  utilsRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  plagiarismOpacity: PropTypes.number,
};

/**
 * PdfViewerWorkspace — Canonical PDF Annotation & Multi-Layer Viewer
 *
 * Implements react-pdf-highlighter-plus for multi-layer annotations, text selection
 * callbacks, and coordinate normalization.
 */
export function PdfViewerWorkspace({
  pdfUrl,
  pdfData = null,
  highlights = [],
  plagiarismMatches = [],
  activeHighlightId = null,
  onSelectionFinished,
  onHighlightClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  layerFilter = 'all', // 'all' | 'comments' | 'plagiarism'
  commentsOpacity = 80,
  plagiarismOpacity = 80,
  userRole = 'adviser',
  canComment = true,
  className = '',
  onUtilsReady,
}) {
  const highlighterUtilsRef = useRef(null);

  const documentSource = useMemo(() => {
    if (pdfData) return pdfData;
    return pdfUrl;
  }, [pdfData, pdfUrl]);

  return (
    <div
      style={{
        '--comments-opacity': Math.max(0.15, Math.min(1, commentsOpacity / 100)),
        '--plagiarism-opacity': Math.max(0.15, Math.min(1, plagiarismOpacity / 100)),
      }}
      className={`relative h-full w-full bg-background overflow-hidden select-text ${className}`}
    >
      <style>{`
        /* Ensure PDF.js text layer is transparent and accurately positioned */
        .textLayer {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          overflow: hidden !important;
          opacity: 1 !important;
          line-height: 1 !important;
        }
        .textLayer :is(span, br) {
          color: transparent !important;
          position: absolute !important;
          white-space: pre !important;
          cursor: text !important;
          transform-origin: 0% 0% !important;
        }
        /* Neutralize internal PDF.js .highlight purple styling so only Turnitin overlay shows */
        .textLayer .highlight {
          background-color: transparent !important;
        }
        .highlight-plagiarism .TextHighlight__part {
          border-bottom: 2px solid currentColor !important;
          border-radius: 2px !important;
          cursor: pointer !important;
          opacity: var(--plagiarism-opacity, 0.85) !important;
          transition: all 0.15s ease-in-out !important;
        }
        .highlight-plagiarism.archive-mark-active .TextHighlight__part {
          outline: 2px solid currentColor !important;
          box-shadow: 0 0 8px currentColor !important;
          z-index: 10 !important;
        }
      `}</style>
      <PdfLoader
        document={documentSource}
        workerSrc="/pdf.worker.min.mjs"
        disableAutoFetch={false}
        beforeLoad={(progress) => (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-20 gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-foreground">Loading manuscript stream...</p>
            <p className="text-xs text-muted-foreground">
              {progress
                ? `Retrieving vector-indexed PDF (${Math.round((progress.loaded / (progress.total || 1)) * 100)}%)...`
                : 'Retrieving vector-indexed PDF...'}
            </p>
          </div>
        )}
        errorMessage={(error) => (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-20 gap-3 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-semibold text-foreground">
              Failed to render PDF manuscript.
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {error?.message ||
                'The file could not be parsed by the PDF engine. Verify that the file is an authentic PDF.'}
            </p>
          </div>
        )}
      >
        {(pdfDocument) => (
          <PdfViewerInner
            pdfDocument={pdfDocument}
            highlights={highlights}
            plagiarismMatches={plagiarismMatches}
            activeHighlightId={activeHighlightId}
            onSelectionFinished={onSelectionFinished}
            onHighlightClick={onHighlightClick}
            onAddReply={onAddReply}
            onResolveComment={onResolveComment}
            onAddToAdm={onAddToAdm}
            layerFilter={layerFilter}
            userRole={userRole}
            canComment={canComment}
            plagiarismOpacity={Math.max(0.15, Math.min(1, plagiarismOpacity / 100))}
            utilsRef={(utils) => {
              highlighterUtilsRef.current = utils;
              if (typeof onUtilsReady === 'function') {
                onUtilsReady(utils);
              }
            }}
          />
        )}
      </PdfLoader>
    </div>
  );
}

PdfViewerWorkspace.propTypes = {
  pdfUrl: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.object),
  plagiarismMatches: PropTypes.arrayOf(PropTypes.object),
  activeHighlightId: PropTypes.string,
  onSelectionFinished: PropTypes.func,
  onHighlightClick: PropTypes.func,
  onAddReply: PropTypes.func,
  onResolveComment: PropTypes.func,
  onAddToAdm: PropTypes.func,
  layerFilter: PropTypes.oneOf(['all', 'comments', 'plagiarism']),
  commentsOpacity: PropTypes.number,
  plagiarismOpacity: PropTypes.number,
  userRole: PropTypes.string,
  canComment: PropTypes.bool,
  className: PropTypes.string,
  onUtilsReady: PropTypes.func,
};

export default PdfViewerWorkspace;
