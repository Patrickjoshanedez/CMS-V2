/**
 * Splits extractedText into annotated segments for rendering.
 * Returns: [{text, highlighted, sourceId, similarity}]
 */
export function buildSegments(extractedText, mergedIntervals) {
  const safeText = typeof extractedText === 'string' ? extractedText : '';
  if (!safeText) {
    return [];
  }

  const normalizedIntervals = Array.isArray(mergedIntervals)
    ? mergedIntervals
        .map((interval) => ({
          ...interval,
          startIndex: Number(interval.startIndex),
          endIndex: Number(interval.endIndex),
          similarity: Number(interval.similarity ?? 0),
        }))
        .filter(
          (interval) =>
            Number.isFinite(interval.startIndex) &&
            Number.isFinite(interval.endIndex) &&
            interval.endIndex > interval.startIndex,
        )
        .sort((left, right) => left.startIndex - right.startIndex)
    : [];

  const segments = [];
  let cursor = 0;

  for (const interval of normalizedIntervals) {
    const start = Math.max(cursor, Math.max(0, interval.startIndex));
    const end = Math.min(safeText.length, Math.max(start, interval.endIndex));

    if (cursor < start) {
      segments.push({
        text: safeText.slice(cursor, start),
        highlighted: false,
      });
    }

    if (end > start) {
      segments.push({
        text: safeText.slice(start, end),
        highlighted: true,
        sourceId: interval.sourceId,
        similarity: interval.similarity,
        startIndex: start,
        endIndex: end,
        overlap: Boolean(interval.overlap),
        overlapCount: Number(interval.overlapCount ?? 1),
      });
    }

    cursor = end;
  }

  if (cursor < safeText.length) {
    segments.push({ text: safeText.slice(cursor), highlighted: false });
  }

  return segments;
}
