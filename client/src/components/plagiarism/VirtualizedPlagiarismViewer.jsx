/**
 * VirtualizedPlagiarismViewer
 *
 * Renders a long plain-text document with matched plagiarism spans highlighted
 * in-place.  Uses react-window's FixedSizeList to efficiently handle documents
 * with hundreds of paragraphs without DOM bloat.
 *
 * Props
 * -----
 * text          {string}               Full extracted plain text of the submission.
 * matches       {MatchResult[]}        From PlagiarismReport.matches — each has
 *                                      { start_index, end_index, match_id,
 *                                        similarity_score, source_metadata }.
 * selectedMatchId {string|null}        match_id of the currently focused match.
 * onSelectMatch   {(match) => void}    Fired when user clicks a highlighted span.
 *
 * How spans map to rows
 * ----------------------
 * We split the cleaned text into paragraphs (split on double-newline or each
 * newline) and track the cumulative character offset of each paragraph so we
 * can intersect match spans against paragraph boundaries.
 * Within a paragraph that contains one or more spans, the text is split into
 * plain and highlighted fragments and rendered with <mark> elements.
 *
 * Accessibility
 * -------------
 * Highlighted spans carry aria-label + role="mark" so screen readers announce
 * the similarity score alongside the matched excerpt.
 */
import React, { useMemo, useRef, useCallback } from 'react';
import * as ReactWindow from 'react-window';
const { FixedSizeList: List } = ReactWindow;
import PropTypes from 'prop-types';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const ROW_HEIGHT = 56; // px — approximate height of one paragraph row
const VIEWER_HEIGHT = 640; // px — overall list height

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Split `text` into paragraph objects, each tracking its start/end char offset.
 *
 * @param {string} text
 * @returns {{ text: string, start: number, end: number }[]}
 */
function buildParagraphs(text) {
  if (!text) return [];
  const paragraphs = [];
  let cursor = 0;

  for (const line of text.split('\n')) {
    const trimmed = line.trimEnd();
    if (trimmed.length > 0) {
      paragraphs.push({
        text: trimmed,
        start: cursor,
        end: cursor + trimmed.length,
      });
    }
    cursor += line.length + 1; // +1 for the \n we split on
  }

  return paragraphs;
}

/**
 * Build a list of text fragments for a single paragraph, splitting on all
 * match spans that intersect with [paraStart, paraEnd].
 *
 * Returns fragments: { text, isMatch, match, relStart, relEnd }
 */
function buildFragments(paraText, paraStart, paraEnd, sortedMatches) {
  const fragments = [];
  let cursor = 0;

  const intersecting = sortedMatches.filter(
    (m) => m.end_index > paraStart && m.start_index < paraEnd,
  );

  for (const match of intersecting) {
    // Clamp match span to this paragraph's boundaries
    const mStart = Math.max(match.start_index, paraStart) - paraStart;
    const mEnd = Math.min(match.end_index, paraEnd) - paraStart;

    // Plain text before this span
    if (mStart > cursor) {
      fragments.push({ text: paraText.slice(cursor, mStart), isMatch: false });
    }

    // Highlighted matched text
    if (mEnd > mStart) {
      fragments.push({
        text: paraText.slice(mStart, mEnd),
        isMatch: true,
        match,
        relStart: mStart,
        relEnd: mEnd,
      });
    }

    cursor = mEnd;
  }

  // Trailing plain text
  if (cursor < paraText.length) {
    fragments.push({ text: paraText.slice(cursor), isMatch: false });
  }

  return fragments;
}

/**
 * Map a 0-1 similarity_score to a Tailwind tw- highlight colour class.
 */
function highlightClass(score) {
  if (score >= 0.85) return 'tw-bg-red-200 tw-text-red-900';
  if (score >= 0.65) return 'tw-bg-orange-200 tw-text-orange-900';
  return 'tw-bg-yellow-200 tw-text-yellow-900';
}

/* ─── ParagraphRow ───────────────────────────────────────────────────────── */

const ParagraphRow = React.memo(function ParagraphRow({
  style,
  para,
  sortedMatches,
  selectedMatchId,
  onSelectMatch,
}) {
  const fragments = useMemo(
    () => buildFragments(para.text, para.start, para.end, sortedMatches),
    [para, sortedMatches],
  );

  return (
    <div
      style={style}
      className="tw-px-4 tw-py-2 tw-text-sm tw-leading-relaxed tw-text-gray-800 tw-border-b tw-border-gray-100"
    >
      {fragments.map((frag, idx) => {
        if (!frag.isMatch) {
          return <span key={idx}>{frag.text}</span>;
        }

        const isSelected = selectedMatchId === frag.match.match_id;
        const pct = Math.round(frag.match.similarity_score * 100);

        return (
          <mark
            key={idx}
            role="mark"
            aria-label={`Matched excerpt — similarity ${pct}%`}
            tabIndex={0}
            onClick={() => onSelectMatch(frag.match)}
            onKeyDown={(e) => e.key === 'Enter' && onSelectMatch(frag.match)}
            className={[
              'tw-cursor-pointer tw-rounded tw-px-0.5 tw-transition-all',
              highlightClass(frag.match.similarity_score),
              isSelected
                ? 'tw-ring-2 tw-ring-offset-1 tw-ring-blue-500'
                : 'hover:tw-ring-1 hover:tw-ring-offset-1 hover:tw-ring-blue-300',
            ].join(' ')}
          >
            {frag.text}
          </mark>
        );
      })}
    </div>
  );
});

ParagraphRow.propTypes = {
  style: PropTypes.object.isRequired,
  para: PropTypes.shape({
    text: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    end: PropTypes.number.isRequired,
  }).isRequired,
  sortedMatches: PropTypes.array.isRequired,
  selectedMatchId: PropTypes.string,
  onSelectMatch: PropTypes.func.isRequired,
};

/* ─── VirtualizedPlagiarismViewer ────────────────────────────────────────── */

export default function VirtualizedPlagiarismViewer({
  text,
  matches,
  selectedMatchId,
  onSelectMatch,
}) {
  const listRef = useRef(null);

  const paragraphs = useMemo(() => buildParagraphs(text), [text]);

  // Sort matches once for deterministic fragment building
  const sortedMatches = useMemo(
    () => [...(matches || [])].sort((a, b) => a.start_index - b.start_index),
    [matches],
  );

  const renderRow = useCallback(
    ({ index, style }) => (
      <ParagraphRow
        style={style}
        para={paragraphs[index]}
        sortedMatches={sortedMatches}
        selectedMatchId={selectedMatchId}
        onSelectMatch={onSelectMatch}
      />
    ),
    [paragraphs, sortedMatches, selectedMatchId, onSelectMatch],
  );

  // Scroll to the first paragraph containing the selected match
  React.useEffect(() => {
    if (!selectedMatchId || !listRef.current) return;
    const match = sortedMatches.find((m) => m.match_id === selectedMatchId);
    if (!match) return;

    const rowIndex = paragraphs.findIndex(
      (p) => p.start <= match.start_index && p.end >= match.start_index,
    );
    if (rowIndex >= 0) {
      listRef.current.scrollToItem(rowIndex, 'center');
    }
  }, [selectedMatchId, paragraphs, sortedMatches]);

  if (!text) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-h-64 tw-text-gray-400 tw-text-sm">
        No extracted text available for this submission.
      </div>
    );
  }

  return (
    <div className="tw-border tw-border-gray-200 tw-rounded-lg tw-overflow-hidden tw-bg-white">
      {/* Legend */}
      <div className="tw-flex tw-items-center tw-gap-4 tw-px-4 tw-py-2 tw-border-b tw-border-gray-200 tw-bg-gray-50 tw-text-xs tw-text-gray-600">
        <span className="tw-font-medium">Highlight key:</span>
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <span className="tw-w-3 tw-h-3 tw-rounded tw-bg-yellow-200 tw-border tw-border-yellow-300" />
          Low (50–64%)
        </span>
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <span className="tw-w-3 tw-h-3 tw-rounded tw-bg-orange-200 tw-border tw-border-orange-300" />
          Medium (65–84%)
        </span>
        <span className="tw-inline-flex tw-items-center tw-gap-1">
          <span className="tw-w-3 tw-h-3 tw-rounded tw-bg-red-200 tw-border tw-border-red-300" />
          High (≥85%)
        </span>
      </div>

      <List
        ref={listRef}
        height={VIEWER_HEIGHT}
        itemCount={paragraphs.length}
        itemSize={ROW_HEIGHT}
        width="100%"
        overscanCount={8}
      >
        {renderRow}
      </List>
    </div>
  );
}

VirtualizedPlagiarismViewer.propTypes = {
  /** Full extracted plain text of the submission. */
  text: PropTypes.string,
  /** Array of MatchResult objects from the PlagiarismReport. */
  matches: PropTypes.arrayOf(
    PropTypes.shape({
      match_id: PropTypes.string.isRequired,
      start_index: PropTypes.number.isRequired,
      end_index: PropTypes.number.isRequired,
      similarity_score: PropTypes.number.isRequired,
    }),
  ),
  /** Currently focused match ID (drives scroll + ring highlight). */
  selectedMatchId: PropTypes.string,
  /** Callback fired when user clicks a matched span. */
  onSelectMatch: PropTypes.func,
};

VirtualizedPlagiarismViewer.defaultProps = {
  text: '',
  matches: [],
  selectedMatchId: null,
  onSelectMatch: () => {},
};
