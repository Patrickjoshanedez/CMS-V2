import { useEffect, useMemo, useRef } from 'react';
import { mergeIntervals } from '@/utils/intervalMerge';
import { buildSegments } from '@/utils/highlightBuilder';
import { getSimilarityBand } from '@/utils/similarityColor';

const QUOTE_REGEX = /"([^"\n]{15,})"|'([^'\n]{15,})'/g;

function normalizeSourceId(value, fallbackIndex) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Number.isFinite(value)) return String(value);
  return `source-${fallbackIndex}`;
}

function normalizeSimilarity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric <= 1 ? numeric * 100 : numeric;
}

function normalizeMatches(textMatches) {
  if (!Array.isArray(textMatches)) return [];

  return textMatches
    .map((match, index) => {
      const startIndex = Number(match.startIndex ?? match.start_index);
      const endIndex = Number(match.endIndex ?? match.end_index);

      if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex) || endIndex <= startIndex) {
        return null;
      }

      return {
        ...match,
        sourceId: normalizeSourceId(match.sourceId ?? match.source_id, index),
        similarity: normalizeSimilarity(match.similarity ?? match.similarity_score),
        startIndex,
        endIndex,
      };
    })
    .filter(Boolean);
}

function buildLineRanges(text) {
  const lineRanges = [];
  let cursor = 0;

  for (const line of text.split('\n')) {
    const start = cursor;
    const end = cursor + line.length;
    lineRanges.push({ line, start, end });
    cursor = end + 1;
  }

  return lineRanges;
}

function mergeSimpleRanges(ranges) {
  const sorted = ranges
    .filter(
      (range) =>
        Number.isFinite(range.start) && Number.isFinite(range.end) && range.end > range.start,
    )
    .sort((left, right) => left.start - right.start);

  if (sorted.length === 0) return [];

  const merged = [{ ...sorted[0] }];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function getExclusionRanges(text) {
  const ranges = [];

  // ACCURACY: Quote/bibliography exclusion happens in the backend fingerprinting.
  // Do a best-effort visual exclusion on frontend too (skip highlighting quoted strings),
  // so the UI doesn't mislead users into thinking those are flagged.
  // See: plagiarism.service.js:193–201
  let quotedMatch;
  while ((quotedMatch = QUOTE_REGEX.exec(text)) !== null) {
    ranges.push({
      start: quotedMatch.index,
      end: quotedMatch.index + quotedMatch[0].length,
    });
  }

  const lineRanges = buildLineRanges(text);

  for (const lineRange of lineRanges) {
    if (/^\s*\[\d+\]/.test(lineRange.line.trim())) {
      ranges.push({ start: lineRange.start, end: lineRange.end });
    }
  }

  let cursor = lineRanges.length - 1;
  const bibliographyTail = [];

  while (cursor >= 0) {
    const current = lineRanges[cursor];
    const trimmed = current.line.trim();

    if (!trimmed) {
      cursor -= 1;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(current.line)) {
      bibliographyTail.push({ start: current.start, end: current.end });
      cursor -= 1;
      continue;
    }

    break;
  }

  if (bibliographyTail.length >= 3) {
    ranges.push(...bibliographyTail);
  }

  return mergeSimpleRanges(ranges);
}

function subtractExclusions(match, exclusions) {
  let pieces = [{ ...match }];

  for (const exclusion of exclusions) {
    pieces = pieces.flatMap((piece) => {
      if (exclusion.end <= piece.startIndex || exclusion.start >= piece.endIndex) {
        return [piece];
      }

      const next = [];

      if (piece.startIndex < exclusion.start) {
        next.push({
          ...piece,
          endIndex: Math.min(piece.endIndex, exclusion.start),
        });
      }

      if (piece.endIndex > exclusion.end) {
        next.push({
          ...piece,
          startIndex: Math.max(piece.startIndex, exclusion.end),
        });
      }

      return next;
    });
  }

  return pieces.filter((piece) => piece.endIndex > piece.startIndex);
}

function escapeSelectorValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export default function AnnotatedText({
  extractedText,
  textMatches,
  sourceColorMap,
  activeSourceId,
  highlightedSourceId,
  jumpTarget,
  onSelectSource,
}) {
  const containerRef = useRef(null);

  const exclusionRanges = useMemo(() => getExclusionRanges(extractedText || ''), [extractedText]);

  const filteredMatches = useMemo(() => {
    const normalized = normalizeMatches(textMatches);
    return normalized.flatMap((match) => subtractExclusions(match, exclusionRanges));
  }, [textMatches, exclusionRanges]);

  const mergedIntervals = useMemo(() => mergeIntervals(filteredMatches), [filteredMatches]);

  const segments = useMemo(
    () => buildSegments(extractedText || '', mergedIntervals),
    [extractedText, mergedIntervals],
  );

  useEffect(() => {
    if (!activeSourceId || !containerRef.current) return;

    const escaped = escapeSelectorValue(activeSourceId);
    const target = containerRef.current.querySelector(`mark[data-source-id="${escaped}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSourceId, segments]);

  useEffect(() => {
    if (!jumpTarget?.sourceId || !containerRef.current) return;

    const escaped = escapeSelectorValue(jumpTarget.sourceId);
    const candidates = Array.from(
      containerRef.current.querySelectorAll(`mark[data-source-id="${escaped}"]`),
    );

    if (candidates.length === 0) return;

    const target = candidates.reduce((best, element) => {
      const elementStart = Number(element.getAttribute('data-start-index'));
      const targetStart = Number(jumpTarget.startIndex ?? 0);

      if (!best) return element;

      const bestDistance = Math.abs(Number(best.getAttribute('data-start-index')) - targetStart);
      const currentDistance = Math.abs(elementStart - targetStart);
      return currentDistance < bestDistance ? element : best;
    }, null);

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [jumpTarget, segments]);

  const hasFocusSource = Boolean(activeSourceId || highlightedSourceId);

  return (
    <div
      ref={containerRef}
      className="annotated-text h-full overflow-auto rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm leading-7 text-[var(--color-text-primary)] [font-family:var(--font-mono)]"
    >
      {segments.map((segment, index) => {
        if (!segment.highlighted) {
          return <span key={`plain-${index}`}>{segment.text}</span>;
        }

        const isActive = segment.sourceId === activeSourceId;
        const isHovered = segment.sourceId === highlightedSourceId;
        const emphasize = isActive || isHovered;
        const band = getSimilarityBand(segment.similarity);

        return (
          <mark
            key={`highlight-${segment.startIndex}-${index}`}
            data-source-id={segment.sourceId}
            data-start-index={segment.startIndex}
            className={[
              'archive-mark cursor-pointer rounded px-0.5 transition-all duration-200',
              segment.overlap ? 'archive-mark-overlap' : '',
              emphasize ? 'archive-mark-active' : '',
              hasFocusSource && !emphasize ? 'opacity-60' : '',
            ].join(' ')}
            style={{
              '--match-color': band.color,
              '--match-bg': `${band.fallbackColor}33`,
              '--source-color': sourceColorMap[segment.sourceId] || 'var(--color-neutral)',
            }}
            onClick={() => onSelectSource(segment.sourceId)}
          >
            {segment.text}
          </mark>
        );
      })}
    </div>
  );
}
