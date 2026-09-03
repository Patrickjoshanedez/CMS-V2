/**
 * Merges overlapping intervals, keeping the highest similarity value.
 * Input: [{startIndex, endIndex, sourceId, similarity}]
 * Output: [{startIndex, endIndex, sourceId, similarity}] — no overlaps
 */
export function mergeIntervals(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const sorted = matches
    .map((match) => ({
      ...match,
      startIndex: Number(match.startIndex),
      endIndex: Number(match.endIndex),
      similarity: Number(match.similarity ?? 0),
    }))
    .filter(
      (match) =>
        Number.isFinite(match.startIndex) &&
        Number.isFinite(match.endIndex) &&
        match.endIndex > match.startIndex,
    )
    .sort((left, right) => left.startIndex - right.startIndex);

  if (sorted.length === 0) {
    return [];
  }

  const merged = [{ ...sorted[0], overlap: false, overlapCount: 1 }];

  for (let index = 1; index < sorted.length; index += 1) {
    const last = merged[merged.length - 1];
    const current = sorted[index];

    if (current.startIndex <= last.endIndex) {
      last.endIndex = Math.max(last.endIndex, current.endIndex);
      last.overlap = true;
      last.overlapCount += 1;

      if (current.similarity > last.similarity) {
        last.similarity = current.similarity;
        last.sourceId = current.sourceId;
      }
    } else {
      merged.push({ ...current, overlap: false, overlapCount: 1 });
    }
  }

  return merged;
}
