import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { getTurnitinSourceColor } from '@/utils/plagiarismHighlightAdapter';
import { HighlightPopupContent } from './PdfViewerWorkspace';

/**
 * TurnitinHighlightOverlay — Canonical Academic Integrity Highlight Geometry
 *
 * Implements the Turnitin visual and structural specification:
 * 1. Zero Child Text: Does NOT render matched text strings inside highlight boxes.
 *    Text remains on the underlying PDF canvas.
 * 2. Multi-Line Rect Decomposition: Matched passages spanning multiple lines are
 *    rendered as discrete bounding boxes (one rectangle per visual line fragment).
 * 3. Exact Coordinate Anchoring: Rectangles are positioned absolutely in PDF viewport
 *    coordinates (left, top, width, height).
 * 4. Crisp Readability: mixBlendMode: 'multiply' and 0.28-0.42 opacity so underlying
 *    canvas text remains sharp and legible.
 * 5. Source Pill Badge: Numbered badge [1], [2]... is anchored exclusively to the
 *    top-left of the first rectangle (rects[0]).
 */
export function TurnitinHighlightOverlay({
  highlight,
  isSelected = false,
  activeHighlightId = null,
  onClick,
  onAddReply,
  onResolveComment,
  onAddToAdm,
  opacity = 0.28,
  sourceColor = null,
  sourceNumber = null,
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const overlayRef = useRef(null);

  const isMatchSelected =
    Boolean(isSelected) ||
    Boolean(
      activeHighlightId &&
      (highlight?.id === activeHighlightId ||
        highlight?.meta?.matchedSourceId === activeHighlightId ||
        String(highlight?.id).includes(activeHighlightId)),
    );

  useEffect(() => {
    setDismissed(false);
  }, [isMatchSelected, activeHighlightId]);

  useEffect(() => {
    if (
      isMatchSelected &&
      overlayRef.current &&
      typeof overlayRef.current.scrollIntoView === 'function'
    ) {
      overlayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isMatchSelected]);

  if (!highlight || !highlight.position) {
    return null;
  }

  const resolvedSourceNumber =
    sourceNumber ??
    highlight.meta?.sourceNumber ??
    (highlight.meta?.matchedSourceIndex !== undefined && highlight.meta?.matchedSourceIndex !== null
      ? highlight.meta.matchedSourceIndex + 1
      : 1);

  const resolvedColor =
    sourceColor ||
    highlight.meta?.palette?.color ||
    highlight.meta?.palette?.dot ||
    getTurnitinSourceColor(resolvedSourceNumber);

  // Extract discrete line rectangles (or fallback to boundingRect if rects empty)
  const rects = (
    highlight.position.rects && highlight.position.rects.length > 0
      ? highlight.position.rects
      : [highlight.position.boundingRect]
  ).filter(Boolean);

  if (rects.length === 0) {
    return null;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    setShowPopup(!showPopup);
    onClick?.(highlight);
  };

  const firstRect = rects[0];
  const shouldShowPopup = (showPopup || isMatchSelected) && !dismissed;

  return (
    <div
      ref={overlayRef}
      className="turnitin-highlight-overlay"
      data-highlight-id={highlight.id}
      data-source-number={resolvedSourceNumber}
    >
      {/* Discrete line rectangles: PURE GEOMETRY, ZERO TEXT CHILDREN */}
      {rects.map((rect, index) => {
        const isFirst = index === 0;
        return (
          <div
            key={`${highlight.id}-rect-${index}`}
            data-testid={`turnitin-rect-${index}`}
            className={cn(
              'turnitin-rect absolute pointer-events-auto cursor-pointer transition-all duration-150',
              isMatchSelected && 'turnitin-rect--active',
            )}
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: resolvedColor,
              opacity: isMatchSelected ? 0.45 : opacity,
              mixBlendMode: 'multiply',
              borderBottom: `2px solid ${resolvedColor}`,
              borderRadius: '2px',
              ...(isMatchSelected
                ? {
                    outline: `2px solid ${resolvedColor}`,
                    boxShadow: `0 0 8px ${resolvedColor}`,
                    zIndex: 15,
                  }
                : {
                    zIndex: 5,
                  }),
            }}
            onClick={handleClick}
            title={`[${resolvedSourceNumber}] ${highlight.meta?.sourceTitle || 'Matched Source'} (${highlight.meta?.similarityScore || 0}%)`}
          >
            {/* Source Number Pill Badge strictly on the first line fragment */}
            {isFirst && (
              <span
                data-testid="turnitin-source-badge"
                className="turnitin-source-badge absolute -top-3.5 left-0 z-30 inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold shadow-xs select-none pointer-events-auto leading-none tracking-tight border border-white/40"
                style={{
                  backgroundColor: resolvedColor,
                  color: '#ffffff',
                }}
                onClick={handleClick}
                title={`[${resolvedSourceNumber}] ${highlight.meta?.sourceTitle || 'Matched Source'} (${highlight.meta?.similarityScore || 0}%)`}
              >
                {resolvedSourceNumber}
              </span>
            )}
          </div>
        );
      })}

      {/* Popover Card anchored below first line fragment */}
      {shouldShowPopup && firstRect && (
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
            onClose={() => {
              setShowPopup(false);
              setDismissed(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

TurnitinHighlightOverlay.propTypes = {
  highlight: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    position: PropTypes.shape({
      boundingRect: PropTypes.object,
      rects: PropTypes.arrayOf(PropTypes.object),
      pageNumber: PropTypes.number,
    }),
    content: PropTypes.shape({
      text: PropTypes.string,
    }),
    meta: PropTypes.shape({
      sourceNumber: PropTypes.number,
      similarityScore: PropTypes.number,
      sourceTitle: PropTypes.string,
      matchedSourceId: PropTypes.string,
      matchedSourceIndex: PropTypes.number,
      palette: PropTypes.object,
      scoreTierClass: PropTypes.string,
      contextSignal: PropTypes.string,
    }),
  }).isRequired,
  isSelected: PropTypes.bool,
  activeHighlightId: PropTypes.string,
  onClick: PropTypes.func,
  onAddReply: PropTypes.func,
  onResolveComment: PropTypes.func,
  onAddToAdm: PropTypes.func,
  opacity: PropTypes.number,
  sourceColor: PropTypes.string,
  sourceNumber: PropTypes.number,
};

export default TurnitinHighlightOverlay;
