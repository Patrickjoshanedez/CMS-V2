import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
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

function ScoreBadge({ value }) {
  const score = Math.round(clampPercent(value) ?? 0);
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'destructive';

  return <Badge variant={variant}>{score}% Originality</Badge>;
}

function SourceRow({ source, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(source.sourceId)}
      className={[
        'w-full rounded-lg border px-3 py-2 text-left transition',
        source.palette.cardClass,
        isActive ? 'ring-2 ring-primary/60 bg-background' : 'bg-background hover:bg-muted/50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={[
              'inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-[11px] font-semibold',
              source.palette.badgeClass,
            ].join(' ')}
          >
            {source.sourceNumber}
          </span>
          <span className="truncate text-sm font-medium text-foreground">{source.sourceTitle}</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {Math.round(source.similarityPercentage)}%
        </span>
      </div>
    </button>
  );
}

function PlagiarismReportPage({ reportData = null, originalText = '' }) {
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

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1680px] space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <CardTitle className="text-lg">Plagiarism Report</CardTitle>
                </div>
                <CardDescription>
                  Color-coded matched blocks with source-focused review popover.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <ScoreBadge value={originalityScore} />
                <Badge variant="outline">{Math.round(overallScore)}% Similarity</Badge>
                <Badge variant="secondary">
                  {sources.length} Source{sources.length !== 1 ? 's' : ''}
                </Badge>
                {processedAt && (
                  <Badge variant="outline">Checked {new Date(processedAt).toLocaleString()}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
          <Card className="min-h-[66vh]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Submission Text</CardTitle>
              <CardDescription>
                Click any highlight to open source details in the sidebar popover.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {text ? (
                <article className="max-h-[68vh] overflow-auto rounded-lg border bg-background px-5 py-4 text-sm leading-7 text-foreground whitespace-pre-wrap">
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
                          'cursor-pointer rounded px-0.5 py-0.5 ring-1 transition',
                          palette.markClass,
                          isActive
                            ? 'ring-2 ring-offset-1 ring-primary'
                            : 'hover:ring-2 hover:ring-primary/40',
                        ].join(' ')}
                        onClick={() => handleHighlightClick(segment.highlight)}
                        title={`Source ${segment.highlight.sourceNumber}: ${segment.highlight.sourceTitle}`}
                      >
                        {segment.text}
                      </mark>
                    );
                  })}
                </article>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No extracted submission text is available yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[66vh]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sources</CardTitle>
              <CardDescription>
                Select a source to filter highlights and inspect matched text side-by-side.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSource && activeHighlight && (
                <div
                  className={[
                    'rounded-lg border bg-background p-3 shadow-sm',
                    activeSource.palette.cardClass,
                  ].join(' ')}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Active Source
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {activeSource.sourceTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(activeSource.similarityPercentage)}% similarity
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setActiveHighlightKey(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-md border bg-card p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Source Context
                      </p>
                      <p className="mt-1 text-xs text-foreground">
                        {activeHighlight.sourceText ||
                          'Source excerpt not available in this report payload.'}
                      </p>
                      {(Number.isFinite(activeHighlight.sourceStart) ||
                        Number.isFinite(activeHighlight.sourceEnd)) && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Source range: {activeHighlight.sourceStart ?? '?'} -{' '}
                          {activeHighlight.sourceEnd ?? '?'}
                        </p>
                      )}
                    </div>

                    <div className="rounded-md border bg-card p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Matched Text
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">
                        {activeHighlight.matchedText || 'Matched text unavailable.'}
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Student range: {activeHighlight.studentStart} - {activeHighlight.studentEnd}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="max-h-[58vh] space-y-2 overflow-auto pr-1">
                {sources.length === 0 ? (
                  <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-green-600" />
                    <p className="text-sm font-medium">No source matches</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This submission currently has no indexed text matches.
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

              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Highlight colors map directly to source rows. Selecting a source narrows the text to
                that source&apos;s matched blocks for focused verification.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PlagiarismReportPage;
