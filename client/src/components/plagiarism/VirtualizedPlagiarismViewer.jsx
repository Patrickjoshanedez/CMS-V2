/**
 * VirtualizedPlagiarismViewer
 *
 * Renders a long plain-text document with matched plagiarism spans highlighted
 * in-place.  Uses react-window's List to efficiently handle documents
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
import React, { useMemo, useRef } from 'react';
import { List } from 'react-window';
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
 * Map a 0-1 similarity_score to a Tailwind  highlight colour class.
 */
function highlightClass(score) {
  if (score >= 0.9) return 'bg-red-200 text-red-900';
  if (score >= 0.7) return 'bg-orange-200 text-orange-900';
  return 'bg-yellow-200 text-yellow-900';
}

/* ─── ParagraphRow ───────────────────────────────────────────────────────── */

const ParagraphRow = React.memo(function ParagraphRow({
  index,
  style,
  paragraphs,
  sortedMatches,
  selectedMatchId,
  onSelectMatch,
}) {
  const para = paragraphs[index];

  if (!para) {
    return null;
  }

  const fragments = buildFragments(para.text, para.start, para.end, sortedMatches);

  return (
    <div
      style={style}
      className="px-4 py-2 text-sm leading-relaxed text-foreground border-b border-border/40"
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
              'cursor-pointer rounded px-0.5 transition-all',
              highlightClass(frag.match.similarity_score),
              isSelected
                ? 'ring-2 ring-offset-1 ring-primary'
                : 'hover:ring-1 hover:ring-offset-1 hover:ring-primary/50',
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
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired,
  paragraphs: PropTypes.arrayOf(
    PropTypes.shape({
      text: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    }),
  ).isRequired,
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

  // Scroll to the first paragraph containing the selected match
  React.useEffect(() => {
    if (!selectedMatchId || !listRef.current) return;
    const match = sortedMatches.find((m) => m.match_id === selectedMatchId);
    if (!match) return;

    const rowIndex = paragraphs.findIndex(
      (p) => p.start <= match.start_index && p.end >= match.start_index,
    );
    if (rowIndex >= 0) {
      listRef.current.scrollToRow({ index: rowIndex, align: 'center', behavior: 'auto' });
    }
  }, [selectedMatchId, paragraphs, sortedMatches]);

  if (!text) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No extracted text available for this submission.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background/60">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border bg-muted/40 text-xs text-muted-foreground">
        <span className="font-medium">Highlight key:</span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300" />
          Low (&lt;70%)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-200 border border-orange-300" />
          Medium (70–89%)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-200 border border-red-300" />
          High (≥90%)
        </span>
      </div>

      <List
        listRef={listRef}
        rowComponent={ParagraphRow}
        rowCount={paragraphs.length}
        rowHeight={ROW_HEIGHT}
        rowProps={{ paragraphs, sortedMatches, selectedMatchId, onSelectMatch }}
        defaultHeight={VIEWER_HEIGHT}
        className="h-[640px] w-full"
        overscanCount={8}
      />
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
