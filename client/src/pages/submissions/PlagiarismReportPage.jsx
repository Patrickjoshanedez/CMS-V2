import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, Layers, RefreshCcw, X } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { usePlagiarismReport } from '../../hooks/useSubmissions';

const SOURCE_PALETTE = [
  {
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    markClass: 'bg-red-100 text-red-900 ring-red-300',
    dotClass: 'bg-red-500',
    cardClass: 'border-red-200',
  },
  {
    badgeClass: 'border-orange-200 bg-orange-50 text-orange-700',
    markClass: 'bg-orange-100 text-orange-900 ring-orange-300',
    dotClass: 'bg-orange-500',
    cardClass: 'border-orange-200',
  },
  {
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    markClass: 'bg-amber-100 text-amber-900 ring-amber-300',
    dotClass: 'bg-amber-500',
    cardClass: 'border-amber-200',
  },
  {
    badgeClass: 'border-lime-200 bg-lime-50 text-lime-700',
    markClass: 'bg-lime-100 text-lime-900 ring-lime-300',
    dotClass: 'bg-lime-500',
    cardClass: 'border-lime-200',
  },
  {
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    markClass: 'bg-emerald-100 text-emerald-900 ring-emerald-300',
    dotClass: 'bg-emerald-500',
    cardClass: 'border-emerald-200',
  },
  {
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-700',
    markClass: 'bg-teal-100 text-teal-900 ring-teal-300',
    dotClass: 'bg-teal-500',
    cardClass: 'border-teal-200',
  },
  {
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    markClass: 'bg-cyan-100 text-cyan-900 ring-cyan-300',
    dotClass: 'bg-cyan-500',
    cardClass: 'border-cyan-200',
  },
  {
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    markClass: 'bg-blue-100 text-blue-900 ring-blue-300',
    dotClass: 'bg-blue-500',
    cardClass: 'border-blue-200',
  },
  {
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    markClass: 'bg-violet-100 text-violet-900 ring-violet-300',
    dotClass: 'bg-violet-500',
    cardClass: 'border-violet-200',
  },
  {
    badgeClass: 'border-pink-200 bg-pink-50 text-pink-700',
    markClass: 'bg-pink-100 text-pink-900 ring-pink-300',
    dotClass: 'bg-pink-500',
    cardClass: 'border-pink-200',
  },
];

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
      segments.push({
        key: `plain-${start}-${end}`,
        text: chunk,
        highlight: null,
      });
      continue;
    }

    active.sort((left, right) => {
      if (right.similarityPercentage !== left.similarityPercentage) {
        return right.similarityPercentage - left.similarityPercentage;
      }
      const leftLength = left.studentEnd - left.studentStart;
      const rightLength = right.studentEnd - right.studentStart;
      return rightLength - leftLength;
    });

    segments.push({
      key: `highlight-${start}-${end}-${active[0].key}`,
      text: chunk,
      highlight: active[0],
    });
  }

  return segments;
};


function SourceRow({ source, isActive, onSelect }) {
  const percentage = Math.round(source.similarityPercentage);
  const barColor = percentage >= 50 ? '#E63946' : percentage >= 25 ? '#E07B39' : '#2A9D8F';

  return (
    <button
      type="button"
      onClick={() => onSelect(source.sourceId)}
      className={[
        'w-full rounded-lg border p-3 text-left transition-all',
        source.palette.cardClass,
        isActive
          ? 'ring-2 ring-primary/50 bg-background shadow-sm'
          : 'bg-background hover:bg-muted/40 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={[
            'mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[11px] font-bold shrink-0',
            source.palette.badgeClass,
          ].join(' ')}
        >
          {source.sourceNumber}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{source.sourceTitle}</p>
          {/* Similarity bar */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{source.matchedBlocks.length} match{source.matchedBlocks.length !== 1 ? 'es' : ''}</span>
              <span className="font-semibold" style={{ color: barColor }}>{percentage}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: barColor }} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

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

  const handleSourceSelect = (sourceId) => {
    setActiveSourceId(sourceId);
    const firstHighlight = allHighlights.find((highlight) => highlight.sourceId === sourceId);
    if (firstHighlight) setActiveHighlightKey(firstHighlight.key);
  };

  const handleHighlightClick = (highlight) => {
    setActiveSourceId(highlight.sourceId);
    setActiveHighlightKey(highlight.key);
  };

  if (isLoading && !reportData) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading plagiarism report...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError && !reportData) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg space-y-3">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error?.response?.data?.message ||
                error?.message ||
                'Failed to load plagiarism report.'}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }


  const scoreColor = overallScore >= 50 ? '#E63946' : overallScore >= 25 ? '#E07B39' : '#2A9D8F';


  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1800px] space-y-0">
        {/* ── Turnitin-style Sticky Toolbar ── */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-xl bg-[hsl(var(--sidebar))] px-4 py-2.5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {typeof onReset === 'function' && (
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={onReset}>
                <RefreshCcw className="mr-1 h-4 w-4" />
                Re-scan
              </Button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-white/60" />
              <span className="font-medium text-white/90">Plagiarism Report</span>
            </div>
          </div>

          {/* Circular Gauge */}
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="3.5" fill="transparent" />
                <circle cx="20" cy="20" r="16" stroke={scoreColor} strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - overallScore / 100)}`}
                  fill="transparent" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                {Math.round(overallScore)}%
              </span>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-xs text-white/60 uppercase tracking-wider">Similarity</p>
              <p className="text-sm font-semibold" style={{ color: scoreColor }}>
                {overallScore >= 50 ? 'High' : overallScore >= 25 ? 'Moderate' : 'Low'}
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/60">
              <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
              {processedAt && <span>· {new Date(processedAt).toLocaleDateString()}</span>}
            </div>
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── Stats ribbon ── */}
        <div className="flex flex-wrap items-center gap-3 border-x border-b border-border bg-card px-4 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold"
            style={{ backgroundColor: `${scoreColor}14`, color: scoreColor }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            {Math.round(overallScore)}% Matched
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {Math.round(originalityScore)}% Original
          </span>
          <span className="ml-auto text-muted-foreground">
            {text.trim().split(/\s+/).length.toLocaleString()} words · {sources.length} sources
          </span>
        </div>



        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] border-x border-b border-border rounded-b-xl overflow-hidden" style={{ minHeight: '78vh' }}>

          {/* ── Document Canvas (Turnitin "Paper" look) ── */}
          <div className="overflow-auto bg-[#e8e8e8] dark:bg-neutral-900" style={{ maxHeight: '78vh' }}>
            {text ? (
              <div className="flex justify-center py-8 px-4">
                <article
                  className="w-full max-w-[8.5in] rounded bg-white shadow-[0_0_12px_rgba(0,0,0,0.08)] px-10 py-8 text-sm leading-7 text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 whitespace-pre-wrap"
                  style={{ fontFamily: "'Times New Roman', 'Georgia', serif", fontSize: '12pt', lineHeight: '2' }}
                >
                  {textSegments.map((segment) => {
                    if (!segment.highlight) {
                      return <span key={segment.key}>{segment.text}</span>;
                    }

                    const isActive = activeHighlight?.key === segment.highlight.key;
                    const palette = segment.highlight.palette;

                    return (
                      <mark
                        key={segment.key}
                        id={`highlight-${segment.highlight.key}`}
                        ref={(node) => {
                          if (node) highlightRefs.current.set(segment.highlight.key, node);
                          else highlightRefs.current.delete(segment.highlight.key);
                        }}
                        className={[
                          'cursor-pointer rounded px-0.5 py-0.5 ring-1 transition-all',
                          palette.markClass,
                          isActive
                            ? 'ring-2 ring-offset-2 ring-primary shadow-md'
                            : 'hover:ring-2 hover:ring-primary/40',
                        ].join(' ')}
                        onClick={() => handleHighlightClick(segment.highlight)}
                        title={`[${segment.highlight.sourceNumber}] ${segment.highlight.sourceTitle} — ${Math.round(segment.highlight.similarityPercentage)}%`}
                      >
                        <sup className="mr-0.5 text-[9px] font-bold opacity-70">{segment.highlight.sourceNumber}</sup>
                        {segment.text}
                      </mark>
                    );
                  })}
                </article>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                <FileText className="mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">No extracted text available</p>
                <p className="mt-1 text-xs">The document text could not be extracted for analysis.</p>
              </div>
            )}
          </div>

          {/* ── Sources Sidebar ── */}
          <aside className="flex flex-col border-l border-border bg-card" style={{ maxHeight: '78vh' }}>
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Match Overview</h3>
              </div>
              <span className="text-xs text-muted-foreground">{sources.length} sources</span>
            </div>

            {/* Active source detail popover */}
            {activeSource && activeHighlight && (
              <div className="border-b border-border bg-muted/30 p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={['inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-[10px] font-bold', activeSource.palette.badgeClass].join(' ')}>
                        {activeSource.sourceNumber}
                      </span>
                      <p className="text-sm font-semibold text-foreground truncate">{activeSource.sourceTitle}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{Math.round(activeSource.similarityPercentage)}% match</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setActiveHighlightKey(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Side-by-side comparison */}
                <div className="space-y-2">
                  <div className="rounded-md border bg-card p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Your Text</p>
                    <p className="text-xs text-foreground leading-relaxed">{activeHighlight.matchedText || 'Text unavailable.'}</p>
                  </div>
                  <div className="rounded-md border bg-card p-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Source Text</p>
                    <p className="text-xs text-foreground leading-relaxed">
                      {activeHighlight.sourceText || (
                        <span className="flex items-center gap-2 text-muted-foreground italic">
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
            <div className="flex-1 overflow-auto px-3 py-2 space-y-1.5">
              {sources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500/50" />
                  <p className="text-sm font-medium text-foreground">No matches found</p>
                  <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">
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
              <div className="border-t border-border bg-muted/20 px-4 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
                Click a source to filter highlights. Numbered badges in the document link to source rows.
              </div>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PlagiarismReportPage;
