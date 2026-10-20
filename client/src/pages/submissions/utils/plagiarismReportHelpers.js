/* ──────────────────────────────────────────────────────────────
   Color palette for source highlighting (Turnitin-style bands)
   Uses translucent RGBA so marks render beautifully in light & dark modes
   ────────────────────────────────────────────────────────────── */
export const SOURCE_PALETTE = [
  {
    badgeStyle: {
      background: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.35)',
    },
    dot: '#ef4444',
    mark: { background: 'rgba(239, 68, 68, 0.22)', outline: '1px solid rgba(239, 68, 68, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(249, 115, 22, 0.15)',
      color: '#f97316',
      border: '1px solid rgba(249, 115, 22, 0.35)',
    },
    dot: '#f97316',
    mark: { background: 'rgba(249, 115, 22, 0.22)', outline: '1px solid rgba(249, 115, 22, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(234, 179, 8, 0.15)',
      color: '#ca8a04',
      border: '1px solid rgba(234, 179, 8, 0.35)',
    },
    dot: '#ca8a04',
    mark: { background: 'rgba(234, 179, 8, 0.22)', outline: '1px solid rgba(234, 179, 8, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.35)',
    },
    dot: '#10b981',
    mark: { background: 'rgba(16, 185, 129, 0.22)', outline: '1px solid rgba(16, 185, 129, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.35)',
    },
    dot: '#3b82f6',
    mark: { background: 'rgba(59, 130, 246, 0.22)', outline: '1px solid rgba(59, 130, 246, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(168, 85, 247, 0.15)',
      color: '#a855f7',
      border: '1px solid rgba(168, 85, 247, 0.35)',
    },
    dot: '#a855f7',
    mark: { background: 'rgba(168, 85, 247, 0.22)', outline: '1px solid rgba(168, 85, 247, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(20, 184, 166, 0.15)',
      color: '#14b8a6',
      border: '1px solid rgba(20, 184, 166, 0.35)',
    },
    dot: '#14b8a6',
    mark: { background: 'rgba(20, 184, 166, 0.22)', outline: '1px solid rgba(20, 184, 166, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(236, 72, 153, 0.15)',
      color: '#ec4899',
      border: '1px solid rgba(236, 72, 153, 0.35)',
    },
    dot: '#ec4899',
    mark: { background: 'rgba(236, 72, 153, 0.22)', outline: '1px solid rgba(236, 72, 153, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(34, 197, 94, 0.15)',
      color: '#22c55e',
      border: '1px solid rgba(34, 197, 94, 0.35)',
    },
    dot: '#22c55e',
    mark: { background: 'rgba(34, 197, 94, 0.22)', outline: '1px solid rgba(34, 197, 94, 0.45)' },
  },
  {
    badgeStyle: {
      background: 'rgba(244, 63, 94, 0.15)',
      color: '#f43f5e',
      border: '1px solid rgba(244, 63, 94, 0.35)',
    },
    dot: '#f43f5e',
    mark: { background: 'rgba(244, 63, 94, 0.22)', outline: '1px solid rgba(244, 63, 94, 0.45)' },
  },
];

/* ── Score-gradient highlight system ──────────────────────────────────
   Modulates highlight intensity based on individual block similarity score.
   Keeps source hue (from palette.dot) but varies opacity by score severity.
   ──────────────────────────────────────────────────────────────────── */
export function hexToRgba(hex, alpha) {
  const clean = (hex || '#888888').replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function getScoreHighlightStyle(paletteDot, similarityPercent) {
  // Map 0–100% similarity to opacity band: 0.10 (low) → 0.60 (critical)
  const score = Math.max(0, Math.min(100, similarityPercent)) / 100;
  const bgAlpha = 0.1 + score * 0.5; // 0.10 at 0%, 0.60 at 100%
  const borderAlpha = 0.3 + score * 0.55; // 0.30 → 0.85
  const borderWidth = score >= 0.9 ? '3px' : score >= 0.7 ? '2px' : '1px';
  return {
    background: hexToRgba(paletteDot, bgAlpha),
    outline: `1px solid ${hexToRgba(paletteDot, borderAlpha * 0.5)}`,
    borderBottom: `${borderWidth} solid ${hexToRgba(paletteDot, borderAlpha)}`,
  };
}

/* Derive paraphrase/verbatim/mixed signal from winnow + semantic scores */
export function deriveContextSignal(winnowScore, semanticScore) {
  const w = Number(winnowScore ?? 0);
  const s = Number(semanticScore ?? 0);
  if (s >= 0.7 && w < 0.3) return 'paraphrase';
  if (w >= 0.8) return 'verbatim';
  return 'mixed';
}

/* ── Helpers ──────────────────────────────────────────────── */

export const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

export const toSimilarityPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? clampPercent(numeric) : clampPercent(numeric * 100);
};

export const toSourceId = (match, fallbackIndex) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  const candidate =
    match?.sourceId ||
    match?.submissionId ||
    match?.id ||
    metadata?.document_id ||
    metadata?.title ||
    match?.sourceTitle ||
    match?.projectTitle ||
    match?.title;

  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (Number.isFinite(candidate)) return String(candidate);
  return `source-${fallbackIndex}`;
};

export const toSourceTitle = (match) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  return (
    match?.sourceTitle ||
    metadata?.title ||
    match?.title ||
    match?.projectTitle ||
    metadata?.document_id ||
    'Unknown source'
  );
};

export const toBlockBounds = (block) => {
  const start = Number(
    block?.studentStart ?? block?.start ?? block?.startIndex ?? block?.start_index,
  );
  const end = Number(block?.studentEnd ?? block?.end ?? block?.endIndex ?? block?.end_index);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    studentStart: start,
    studentEnd: end,
    sourceStart: Number.isFinite(Number(block?.sourceStart)) ? Number(block.sourceStart) : null,
    sourceEnd: Number.isFinite(Number(block?.sourceEnd)) ? Number(block.sourceEnd) : null,
    matchedText: typeof block?.matchedText === 'string' ? block.matchedText : '',
    sourceText:
      typeof block?.sourceText === 'string'
        ? block.sourceText
        : typeof block?.source_snippet === 'string'
          ? block.source_snippet
          : '',
  };
};

export const toBlocks = (match, text) => {
  const fromMatchedBlocks = Array.isArray(match?.matchedBlocks)
    ? match.matchedBlocks
    : Array.isArray(match?.matched_blocks)
      ? match.matched_blocks
      : null;

  if (Array.isArray(fromMatchedBlocks) && fromMatchedBlocks.length > 0) {
    return fromMatchedBlocks
      .map((block) => toBlockBounds(block))
      .filter(Boolean)
      .map((block) => ({
        ...block,
        matchedText: block.matchedText || text.slice(block.studentStart, block.studentEnd),
      }));
  }

  if (Array.isArray(match?.spans) && match.spans.length > 0) {
    return match.spans
      .map((span) =>
        toBlockBounds({
          studentStart: span?.start ?? span?.startIndex ?? span?.start_index,
          studentEnd: span?.end ?? span?.endIndex ?? span?.end_index,
        }),
      )
      .filter(Boolean)
      .map((block) => ({
        ...block,
        matchedText: text.slice(block.studentStart, block.studentEnd),
      }));
  }

  const fallback = toBlockBounds({
    studentStart: match?.studentStart ?? match?.startIndex ?? match?.start_index,
    studentEnd: match?.studentEnd ?? match?.endIndex ?? match?.end_index,
  });

  if (!fallback) return [];

  return [
    {
      ...fallback,
      matchedText: text.slice(fallback.studentStart, fallback.studentEnd),
      sourceText: typeof match?.source_snippet === 'string' ? match.source_snippet : '',
    },
  ];
};

export const normalizeTextMatches = (payload, text) => {
  const rawMatches =
    (Array.isArray(payload?.textMatches) && payload.textMatches) ||
    (Array.isArray(payload?.fullReport?.textMatches) && payload.fullReport.textMatches) ||
    (Array.isArray(payload?.matchedSources) && payload.matchedSources) ||
    (Array.isArray(payload?.fullReport?.matches) && payload.fullReport.matches) ||
    (Array.isArray(payload?.matches) && payload.matches) ||
    [];

  const normalized = rawMatches
    .map((match, index) => {
      const similarityPercentage =
        clampPercent(match?.similarityPercentage) ??
        clampPercent(match?.matchPercentage) ??
        toSimilarityPercent(match?.similarity_score) ??
        toSimilarityPercent(match?.similarity);

      const blocks = toBlocks(match, text).filter(
        (block) =>
          block.studentStart >= 0 &&
          block.studentEnd <= text.length &&
          block.studentEnd > block.studentStart,
      );

      const winnowScore =
        typeof match?.winnow_score === 'number'
          ? match.winnow_score
          : typeof match?.winnowScore === 'number'
            ? match.winnowScore
            : null;
      const semanticScore =
        typeof match?.semantic_score === 'number'
          ? match.semantic_score
          : typeof match?.semanticScore === 'number'
            ? match.semanticScore
            : null;

      return {
        sourceId: toSourceId(match, index),
        sourceTitle: toSourceTitle(match),
        similarityPercentage: similarityPercentage ?? 0,
        winnowScore,
        semanticScore,
        contextSignal: deriveContextSignal(winnowScore, semanticScore),
        matchedBlocks: blocks,
      };
    })
    .filter((match) => match.matchedBlocks.length > 0)
    .sort((left, right) => right.similarityPercentage - left.similarityPercentage);

  return normalized.map((match, index) => ({
    ...match,
    sourceNumber: index + 1,
    palette: SOURCE_PALETTE[index % SOURCE_PALETTE.length],
  }));
};

export const mergeIntervals = (intervals) => {
  const normalized = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (normalized.length === 0) return [];

  const merged = [normalized[0]];
  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    const previous = merged[merged.length - 1];
    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
};

export const computeCoveragePercent = (textLength, matches) => {
  if (!Number.isFinite(textLength) || textLength <= 0) return 0;

  const intervals = matches.flatMap((match) =>
    match.matchedBlocks.map((block) => ({ start: block.studentStart, end: block.studentEnd })),
  );

  const covered = mergeIntervals(intervals).reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0,
  );
  return clampPercent((covered / textLength) * 100) ?? 0;
};

export const flattenHighlights = (matches) =>
  matches.flatMap((match) =>
    match.matchedBlocks.map((block, blockIndex) => ({
      key: `${match.sourceId}-${block.studentStart}-${block.studentEnd}-${blockIndex}`,
      sourceId: match.sourceId,
      sourceTitle: match.sourceTitle,
      sourceNumber: match.sourceNumber,
      similarityPercentage: match.similarityPercentage,
      winnowScore: match.winnowScore,
      semanticScore: match.semanticScore,
      contextSignal: match.contextSignal,
      studentStart: block.studentStart,
      studentEnd: block.studentEnd,
      matchedText: block.matchedText,
      sourceText: block.sourceText,
      sourceStart: block.sourceStart,
      sourceEnd: block.sourceEnd,
      palette: match.palette,
    })),
  );

export const classifyAcademicLine = (trimmed, index) => {
  if (trimmed.length > 120) return 'body';

  if (/^<Title.*>$/i.test(trimmed) || (index === 0 && trimmed.length < 150)) {
    return 'cover-title';
  }
  if (/^(A\s+)?(Capstone|Research|Thesis|Special)\s+Project\s+by/i.test(trimmed)) {
    return 'cover-byline';
  }
  if (/^<Name\s*\d*>$/i.test(trimmed)) {
    return 'cover-author';
  }
  if (/Submitted to\b|College of\b|Department of\b|Bukidnon State University/i.test(trimmed)) {
    return 'cover-affiliation';
  }
  if (/In Partial Fulfillment\b|Requirements for the Degree\b|^<Degree>$/i.test(trimmed)) {
    return 'cover-fulfillment';
  }
  if (
    /^<Month and year.*>$/i.test(trimmed) ||
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i.test(
      trimmed,
    )
  ) {
    return 'cover-date';
  }
  if (/^APPROVAL SHEET$/i.test(trimmed)) {
    return 'approval-heading';
  }
  if (/^This capstone project entitled/i.test(trimmed)) {
    return 'approval-body';
  }
  if (/^(Capstone Project Adviser|Chair,\s*Defense Panel|Panel Member)$/i.test(trimmed)) {
    return 'approval-role';
  }
  if (/^<(Adviser|Chair|Panelist\s*\d*)\s*\(CAPSLOCK\)>$/i.test(trimmed)) {
    return 'approval-name';
  }
  if (
    /^(DEDICATION|ACKNOWLEDGMENTS?|TABLE OF CONTENTS|LIST OF TABLES|LIST OF FIGURES|ABSTRACT|CHAPTER\s+\d+|INTRODUCTION|REVIEW OF RELATED LITERATURE|METHODOLOGY|RESULTS AND DISCUSSION|SUMMARY,\s*CONCLUSIONS,\s*AND\s*RECOMMENDATIONS|REFERENCES|BIBLIOGRAPHY)$/i.test(
      trimmed,
    )
  ) {
    return 'section-heading';
  }
  if (/^\d+\.\d+(\.\d+)?\s+/.test(trimmed)) {
    return 'subheading';
  }
  return 'body';
};

export const paginateLines = (structuredLines) => {
  const pages = [];
  let currentPageLines = [];
  let currentPageType = 'cover';
  let currentPageNumber = 1;

  const pushCurrentPage = () => {
    if (currentPageLines.length > 0) {
      pages.push({
        id: `page-${currentPageNumber}`,
        pageNumber: currentPageNumber,
        pageType: currentPageType,
        lines: [...currentPageLines],
      });
      currentPageNumber += 1;
      currentPageLines = [];
    }
  };

  for (let i = 0; i < structuredLines.length; i++) {
    const line = structuredLines[i];
    const isExplicitBreak = line.text.includes('\x0c') || line.text.includes('\f');
    const isApprovalStart = line.type === 'approval-heading' || /^APPROVAL SHEET/i.test(line.text);
    const isMajorSection =
      (line.type === 'section-heading' || line.type === 'subheading') &&
      /^(DEDICATION|ACKNOWLEDGMENTS?|TABLE OF CONTENTS|LIST OF TABLES|LIST OF FIGURES|ABSTRACT|CHAPTER\s+\d+|REFERENCES|APPENDICES|BIBLIOGRAPHY)/i.test(
        line.text,
      );

    if (isApprovalStart) {
      pushCurrentPage();
      currentPageType = 'approval';
    } else if (isMajorSection) {
      pushCurrentPage();
      currentPageType = /^CHAPTER/i.test(line.text) ? 'chapter' : 'section';
    } else if (isExplicitBreak) {
      pushCurrentPage();
      currentPageType = 'standard';
    } else if (
      currentPageType === 'cover' &&
      !line.type.startsWith('cover-') &&
      line.type !== 'body'
    ) {
      pushCurrentPage();
      currentPageType = 'standard';
    } else if (
      currentPageType !== 'cover' &&
      currentPageType !== 'approval' &&
      currentPageLines.length >= 35
    ) {
      pushCurrentPage();
      currentPageType = 'standard';
    }

    currentPageLines.push(line);
  }

  pushCurrentPage();
  return pages.length > 0 ? pages : [{ id: 'page-1', pageNumber: 1, pageType: 'cover', lines: [] }];
};

export const fragmentLine = (lineText, lineStart, lineEnd, highlights) => {
  const intersecting = highlights.filter(
    (h) => h.studentEnd > lineStart && h.studentStart < lineEnd,
  );
  if (intersecting.length === 0) {
    return [{ key: `plain-${lineStart}-${lineEnd}`, text: lineText, highlight: null }];
  }

  const sorted = [...intersecting].sort((a, b) => a.studentStart - b.studentStart);
  const fragments = [];
  let cursor = 0;

  for (const h of sorted) {
    const relStart = Math.max(0, h.studentStart - lineStart);
    const relEnd = Math.min(lineText.length, h.studentEnd - lineStart);

    if (relStart > cursor) {
      fragments.push({
        key: `plain-${lineStart + cursor}-${lineStart + relStart}`,
        text: lineText.slice(cursor, relStart),
        highlight: null,
      });
    }

    if (relEnd > relStart) {
      fragments.push({
        key: `highlight-${lineStart + relStart}-${lineStart + relEnd}-${h.key}`,
        text: lineText.slice(relStart, relEnd),
        highlight: h,
      });
    }
    cursor = Math.max(cursor, relEnd);
  }

  if (cursor < lineText.length) {
    fragments.push({
      key: `plain-${lineStart + cursor}-${lineEnd}`,
      text: lineText.slice(cursor),
      highlight: null,
    });
  }

  return fragments;
};

export const buildTextSegments = (text, highlights) => {
  if (!text) return [];
  if (!Array.isArray(highlights) || highlights.length === 0) {
    return [{ key: 'plain-0', text, highlight: null }];
  }

  const breakpoints = new Set([0, text.length]);
  for (const highlight of highlights) {
    breakpoints.add(highlight.studentStart);
    breakpoints.add(highlight.studentEnd);
  }

  const sorted = [...breakpoints]
    .filter((value) => value >= 0 && value <= text.length)
    .sort((a, b) => a - b);
  const segments = [];

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) continue;

    const chunk = text.slice(start, end);
    const active = highlights.filter(
      (highlight) => highlight.studentStart < end && highlight.studentEnd > start,
    );

    if (active.length === 0) {
      segments.push({ key: `plain-${start}-${end}`, text: chunk, highlight: null });
      continue;
    }

    active.sort((left, right) => {
      if (right.similarityPercentage !== left.similarityPercentage) {
        return right.similarityPercentage - left.similarityPercentage;
      }
      return right.studentEnd - right.studentStart - (left.studentEnd - left.studentStart);
    });

    segments.push({
      key: `highlight-${start}-${end}-${active[0].key}`,
      text: chunk,
      highlight: active[0],
    });
  }

  return segments;
};

/* ── Utility: resolve similarity color from CMS tokens ─────── */
export function getSimilarityStatus(percent) {
  if (percent >= 50) {
    return {
      color: '#ef4444',
      textClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
      badgeVariant: 'destructive',
      label: 'High Similarity (≥ 50%)',
      statusText: 'Action Required',
    };
  }
  if (percent >= 25) {
    return {
      color: '#f59e0b',
      textClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      badgeVariant: 'warning',
      label: 'Moderate Similarity (25–49%)',
      statusText: 'Review Recommended',
    };
  }
  return {
    color: '#10b981',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    badgeVariant: 'secondary',
    label: 'Compliant (< 25%)',
    statusText: 'Passes BukSU Standard',
  };
}

/* ──────────────────────────────────────────────────────────────────────
   Signal badge config
   ────────────────────────────────────────────────────────────────────── */
export const SIGNAL_CONFIG = {
  verbatim: {
    label: 'VERBATIM',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
  paraphrase: {
    label: 'PARAPHRASE',
    className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  },
  mixed: {
    label: 'MIXED',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
};
