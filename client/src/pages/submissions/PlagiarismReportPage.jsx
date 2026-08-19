import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Loader2,
  RefreshCcw,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { usePlagiarismReport } from '../../hooks/useSubmissions';

/* ──────────────────────────────────────────────────────────────
   Color palette for source highlighting (Turnitin-style bands)
   Uses inline RGBA so marks render correctly without Tailwind
   ────────────────────────────────────────────────────────────── */
const SOURCE_PALETTE = [
  {
    badgeStyle: { background: '#fde8ea', color: '#c0243c', border: '1px solid #f5b8be' },
    dot: '#e63946',
    mark: { background: '#fde8ea', outline: '1px solid #f5b8be' },
  },
  {
    badgeStyle: { background: '#fef0e6', color: '#b85c1e', border: '1px solid #f5cba0' },
    dot: '#e07b39',
    mark: { background: '#fef0e6', outline: '1px solid #f5cba0' },
  },
  {
    badgeStyle: { background: '#fefbe6', color: '#91700d', border: '1px solid #f0d87c' },
    dot: '#d4a017',
    mark: { background: '#fefbe6', outline: '1px solid #f0d87c' },
  },
  {
    badgeStyle: { background: '#e6f7f5', color: '#1d7069', border: '1px solid #9dd4cf' },
    dot: '#2a9d8f',
    mark: { background: '#e6f7f5', outline: '1px solid #9dd4cf' },
  },
  {
    badgeStyle: { background: '#e8f0fb', color: '#2a56b0', border: '1px solid #9fb8ef' },
    dot: '#457b9d',
    mark: { background: '#e8f0fb', outline: '1px solid #9fb8ef' },
  },
  {
    badgeStyle: { background: '#f3e8fb', color: '#7a2db5', border: '1px solid #d0a5f0' },
    dot: '#a855f7',
    mark: { background: '#f3e8fb', outline: '1px solid #d0a5f0' },
  },
  {
    badgeStyle: { background: '#e6fbf7', color: '#137d65', border: '1px solid #94d6cc' },
    dot: '#14b8a6',
    mark: { background: '#e6fbf7', outline: '1px solid #94d6cc' },
  },
  {
    badgeStyle: { background: '#fde8fb', color: '#a32399', border: '1px solid #eda5e8' },
    dot: '#ec4899',
    mark: { background: '#fde8fb', outline: '1px solid #eda5e8' },
  },
  {
    badgeStyle: { background: '#e8fde8', color: '#1d7a2a', border: '1px solid #9de0a4' },
    dot: '#22c55e',
    mark: { background: '#e8fde8', outline: '1px solid #9de0a4' },
  },
  {
    badgeStyle: { background: '#fdf0e8', color: '#934a12', border: '1px solid #f0bda0' },
    dot: '#f97316',
    mark: { background: '#fdf0e8', outline: '1px solid #f0bda0' },
  },
];

/* ── Helpers ──────────────────────────────────────────────── */

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const toSimilarityPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1 ? clampPercent(numeric) : clampPercent(numeric * 100);
};

const toSourceId = (match, fallbackIndex) => {
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

const toSourceTitle = (match) => {
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

const toBlockBounds = (block) => {
  const start = Number(block?.studentStart ?? block?.start ?? block?.start_index);
  const end = Number(block?.studentEnd ?? block?.end ?? block?.end_index);

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

const toBlocks = (match, text) => {
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
          studentStart: span?.start ?? span?.start_index,
          studentEnd: span?.end ?? span?.end_index,
        }),
      )
      .filter(Boolean)
      .map((block) => ({
        ...block,
        matchedText: text.slice(block.studentStart, block.studentEnd),
      }));
  }

  const fallback = toBlockBounds({
    studentStart: match?.start_index,
    studentEnd: match?.end_index,
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

const normalizeTextMatches = (payload, text) => {
  const rawMatches =
    (Array.isArray(payload?.textMatches) && payload.textMatches) ||
    (Array.isArray(payload?.fullReport?.textMatches) && payload.fullReport.textMatches) ||
    (Array.isArray(payload?.matchedSources) && payload.matchedSources) ||
    (Array.isArray(payload?.fullReport?.matches) && payload.fullReport.matches) ||
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

      return {
        sourceId: toSourceId(match, index),
        sourceTitle: toSourceTitle(match),
        similarityPercentage: similarityPercentage ?? 0,
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

const mergeIntervals = (intervals) => {
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

const computeCoveragePercent = (textLength, matches) => {
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

const flattenHighlights = (matches) =>
  matches.flatMap((match) =>
    match.matchedBlocks.map((block, blockIndex) => ({
      key: `${match.sourceId}-${block.studentStart}-${block.studentEnd}-${blockIndex}`,
      sourceId: match.sourceId,
      sourceTitle: match.sourceTitle,
      sourceNumber: match.sourceNumber,
      similarityPercentage: match.similarityPercentage,
      studentStart: block.studentStart,
      studentEnd: block.studentEnd,
      matchedText: block.matchedText,
      sourceText: block.sourceText,
      sourceStart: block.sourceStart,
      sourceEnd: block.sourceEnd,
      palette: match.palette,
    })),
  );

const buildTextSegments = (text, highlights) => {
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
function getSimilarityColor(percent) {
  if (percent >= 50) return 'var(--color-accent)'; // #e63946 red
  if (percent >= 25) return 'var(--color-high)'; // #e07b39 orange
  return 'var(--color-ok)'; // #2a9d8f teal
}

/* ──────────────────────────────────────────────────────────────
   SourceRow sub-component
   ────────────────────────────────────────────────────────────── */
function SourceRow({ source, isActive, onSelect }) {
  const percentage = Math.round(source.similarityPercentage);
  const barColor = getSimilarityColor(percentage);

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sourceId)}
      className={[
        'w-full rounded-lg border p-3 text-left transition-all [font-family:var(--font-body)]',
        isActive
          ? 'border-[var(--color-neutral)] bg-[var(--color-surface)] shadow-[0_0_0_2px_var(--color-neutral)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-neutral)]/50 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        {/* Numbered badge */}
        <span
          className="mt-0.5 inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
          style={source.palette.badgeStyle}
        >
          {source.sourceNumber}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)]">
            {source.sourceTitle}
          </p>

          {/* Similarity bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-text-secondary)]">
                {source.matchedBlocks.length} match{source.matchedBlocks.length !== 1 ? 'es' : ''}
              </span>
              <span className="font-semibold" style={{ color: barColor }}>
                {percentage}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_70%,white)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────── */
function PlagiarismReportPage({ reportData = null, originalText = '', onReset = null }) {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const highlightRefs = useRef(new Map());

  const { data, isLoading, isError, error } = usePlagiarismReport(submissionId, {
    enabled: !reportData,
  });

  const payload = reportData || data || null;

  const text = useMemo(() => {
    if (typeof originalText === 'string' && originalText.trim()) return originalText;
    if (typeof payload?.originalText === 'string' && payload.originalText.trim())
      return payload.originalText;
    if (typeof payload?.extractedText === 'string' && payload.extractedText.trim())
      return payload.extractedText;
    return '';
  }, [originalText, payload]);

  const sources = useMemo(() => normalizeTextMatches(payload, text), [payload, text]);
  const allHighlights = useMemo(() => flattenHighlights(sources), [sources]);

  const [activeSourceId, setActiveSourceId] = useState(null);
  const [activeHighlightKey, setActiveHighlightKey] = useState(null);

  const resolvedActiveSourceId = useMemo(() => {
    if (sources.length === 0) return null;
    if (activeSourceId && sources.some((source) => source.sourceId === activeSourceId)) {
      return activeSourceId;
    }
    return sources[0].sourceId;
  }, [sources, activeSourceId]);

  const visibleHighlights = useMemo(
    () =>
      resolvedActiveSourceId
        ? allHighlights.filter((highlight) => highlight.sourceId === resolvedActiveSourceId)
        : allHighlights,
    [allHighlights, resolvedActiveSourceId],
  );

  const textSegments = useMemo(
    () => buildTextSegments(text, visibleHighlights),
    [text, visibleHighlights],
  );

  const activeSource = useMemo(
    () => sources.find((source) => source.sourceId === resolvedActiveSourceId) || null,
    [sources, resolvedActiveSourceId],
  );

  const activeHighlight = useMemo(() => {
    if (!activeSource) return null;
    const direct = allHighlights.find((highlight) => highlight.key === activeHighlightKey);
    if (direct && direct.sourceId === activeSource.sourceId) return direct;
    return allHighlights.find((highlight) => highlight.sourceId === activeSource.sourceId) || null;
  }, [allHighlights, activeHighlightKey, activeSource]);

  useEffect(() => {
    if (!activeHighlight) return;
    const node = highlightRefs.current.get(activeHighlight.key);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [activeHighlight]);

  const overallScore = useMemo(() => {
    const direct =
      clampPercent(payload?.overallScore) ??
      clampPercent(payload?.fullReport?.overallScore) ??
      clampPercent(payload?.fullReport?.plagiarism_score);

    if (direct !== null) return direct;

    const fromOriginality = clampPercent(payload?.originalityScore);
    if (fromOriginality !== null) return clampPercent(100 - fromOriginality) ?? 0;

    return computeCoveragePercent(text.length, sources);
  }, [payload, sources, text.length]);

  const originalityScore = Math.max(0, Math.min(100, 100 - overallScore));

  const processedAt = payload?.processedAt || payload?.fullReport?.checked_at || null;
  const scoreColor = getSimilarityColor(overallScore);

  const handleSourceSelect = (sourceId) => {
    setActiveSourceId(sourceId);
    const firstHighlight = allHighlights.find((highlight) => highlight.sourceId === sourceId);
    if (firstHighlight) setActiveHighlightKey(firstHighlight.key);
  };

  const handleHighlightClick = (highlight) => {
    setActiveSourceId(highlight.sourceId);
    setActiveHighlightKey(highlight.key);
  };

  /* ── Loading state ─────────────────────────────────────── */
  if (isLoading && !reportData) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center [font-family:var(--font-body)]">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--color-neutral)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">Loading plagiarism report…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error state ───────────────────────────────────────── */
  if (isError && !reportData) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg space-y-3 [font-family:var(--font-body)]">
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,white)] p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
            <p className="text-sm font-medium text-[var(--color-accent)]">
              {error?.response?.data?.message ||
                error?.message ||
                'Failed to load plagiarism report.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Main report view ──────────────────────────────────── */
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1800px] space-y-0 [font-family:var(--font-body)]">
        {/* ── Sticky Toolbar ── */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-xl bg-[var(--color-sidebar)] px-4 py-2.5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {typeof onReset === 'function' && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
                Re-scan
              </button>
            )}

            <div className="hidden items-center gap-2 text-sm sm:flex">
              <FileText className="h-4 w-4 text-white/60" />
              <span className="font-semibold text-white/90">Plagiarism Report</span>
            </div>
          </div>

          {/* Circular gauge + meta */}
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke={scoreColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallScore / 100)}`}
                  fill="transparent"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                {Math.round(overallScore)}%
              </span>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-xs uppercase tracking-wider text-[var(--color-sidebar-text)]">
                Similarity
              </p>
              <p className="text-sm font-semibold" style={{ color: scoreColor }}>
                {overallScore >= 50 ? 'High' : overallScore >= 25 ? 'Moderate' : 'Low'}
              </p>
            </div>

            <div className="hidden items-center gap-1.5 text-xs text-[var(--color-sidebar-text)] lg:flex">
              <span>
                {sources.length} source{sources.length !== 1 ? 's' : ''}
              </span>
              {processedAt && <span>· {new Date(processedAt).toLocaleDateString()}</span>}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              title="Export / Print"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ── Stats ribbon ── */}
        <div className="flex flex-wrap items-center gap-3 border-x border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
            style={{
              backgroundColor: `${scoreColor}14`,
              color: scoreColor,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            {Math.round(overallScore)}% Matched
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-ok) 14%, white)',
              color: 'var(--color-ok)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]" />
            {Math.round(originalityScore)}% Original
          </span>

          <span className="ml-auto text-[var(--color-text-secondary)]">
            {text.trim().split(/\s+/).length.toLocaleString()} words · {sources.length} sources
          </span>
        </div>

        {/* ── Main grid: document canvas + sidebar ── */}
        <div
          className="grid grid-cols-1 overflow-hidden rounded-b-xl border-x border-b border-[var(--color-border)] xl:grid-cols-[1fr_350px]"
          style={{ minHeight: '78vh' }}
        >
          {/* Document canvas (Turnitin "paper" look) */}
          <div className="overflow-auto bg-[var(--color-bg)]" style={{ maxHeight: '78vh' }}>
            {text ? (
              <div className="flex justify-center px-4 py-8">
                <article
                  className="w-full max-w-[8.5in] rounded bg-[var(--color-surface)] px-10 py-8 shadow-[0_0_12px_rgba(0,0,0,0.08)] text-sm leading-7 text-[var(--color-text-primary)] whitespace-pre-wrap"
                  style={{
                    fontFamily: "'Times New Roman', 'Georgia', serif",
                    fontSize: '12pt',
                    lineHeight: '2',
                  }}
                >
                  {textSegments.map((segment) => {
                    if (!segment.highlight) {
                      return <span key={segment.key}>{segment.text}</span>;
                    }

                    const isActive = activeHighlight?.key === segment.highlight.key;
                    const { mark } = segment.highlight.palette;

                    return (
                      <mark
                        key={segment.key}
                        id={`highlight-${segment.highlight.key}`}
                        ref={(node) => {
                          if (node) highlightRefs.current.set(segment.highlight.key, node);
                          else highlightRefs.current.delete(segment.highlight.key);
                        }}
                        className={[
                          'cursor-pointer rounded px-0.5 py-0.5 transition-all',
                          isActive ? 'ring-2 ring-offset-1 shadow-md' : 'ring-1 hover:ring-2',
                        ].join(' ')}
                        style={{
                          ...mark,
                          ringColor: isActive ? 'var(--color-neutral)' : mark.outline,
                        }}
                        onClick={() => handleHighlightClick(segment.highlight)}
                        title={`[${segment.highlight.sourceNumber}] ${segment.highlight.sourceTitle} — ${Math.round(segment.highlight.similarityPercentage)}%`}
                      >
                        <sup className="mr-0.5 text-[9px] font-bold opacity-70">
                          {segment.highlight.sourceNumber}
                        </sup>
                        {segment.text}
                      </mark>
                    );
                  })}
                </article>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-[var(--color-text-secondary)]">
                <FileText className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  No extracted text available
                </p>
                <p className="mt-1 text-xs">
                  The document text could not be extracted for analysis.
                </p>
              </div>
            )}
          </div>

          {/* Sources sidebar */}
          <aside
            className="flex flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]"
            style={{ maxHeight: '78vh' }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--color-text-secondary)]" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Match Overview
                </h3>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {sources.length} sources
              </span>
            </div>

            {/* Active source detail popover */}
            {activeSource && activeHighlight && (
              <div className="space-y-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border text-[10px] font-bold"
                        style={activeSource.palette.badgeStyle}
                      >
                        {activeSource.sourceNumber}
                      </span>
                      <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                        {activeSource.sourceTitle}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {Math.round(activeSource.similarityPercentage)}% match
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveHighlightKey(null)}
                    className="h-6 w-6 shrink-0 rounded-md text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    aria-label="Close detail"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Side-by-side comparison */}
                <div className="space-y-2">
                  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Your Text
                    </p>
                    <p className="text-xs leading-relaxed text-[var(--color-text-primary)]">
                      {activeHighlight.matchedText || 'Text unavailable.'}
                    </p>
                  </div>
                  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Source Text
                    </p>
                    <p className="text-xs leading-relaxed text-[var(--color-text-primary)]">
                      {activeHighlight.sourceText || (
                        <span className="flex items-center gap-2 italic text-[var(--color-text-secondary)]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Source excerpt not available for this match.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Source list */}
            <div className="flex-1 space-y-1.5 overflow-auto px-3 py-2">
              {sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-[var(--color-ok)]/50" />
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    No matches found
                  </p>
                  <p className="mt-1 max-w-[200px] text-xs text-[var(--color-text-secondary)]">
                    This submission has no indexed plagiarism matches.
                  </p>
                </div>
              ) : (
                sources.map((source) => (
                  <SourceRow
                    key={source.sourceId}
                    source={source}
                    isActive={source.sourceId === resolvedActiveSourceId}
                    onSelect={handleSourceSelect}
                  />
                ))
              )}
            </div>

            {/* Sidebar footer hint */}
            {sources.length > 0 && (
              <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                Click a source to filter highlights. Numbered badges in the document link to source
                rows.
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PlagiarismReportPage;
