/**
 * PlagiarismReportPage
 *
 * Full-page plagiarism report viewer with a split-pane layout:
 *
 *  Left pane  — VirtualizedPlagiarismViewer rendering the full submission text
 *               with colour-coded match highlights.  Clicking a highlight
 *               selects that match and syncs the right pane.
 *
 *  Right pane — Match detail panel listing all detected sources.  Selecting a
 *               source scrolls the left pane to the corresponding span.
 *
 * Route params:  /submissions/:submissionId/plagiarism-report
 * Access:         Authenticated — student (own submission), adviser, panelist, instructor.
 *
 * Data flow
 * ---------
 *  usePlagiarismReport(submissionId)
 *    → GET /api/submissions/:id/plagiarism/report
 *    → { originalityScore, extractedText, fullReport, matchedSources, processedAt }
 *
 * The `fullReport` object comes from the Node.js plagiarism worker and contains:
 *   - matches[]  — each with start_index, end_index, similarity_score,
 *                  source_metadata, source_snippet
 *   - originality_score, plagiarism_score, total_characters, matched_characters
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  FileText,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { buildTopSourceColorMap, usePlagiarismReport } from '../../hooks/useSubmissions';
import VirtualizedPlagiarismViewer from '../../components/plagiarism/VirtualizedPlagiarismViewer';

/* ─── Score badge helper ─────────────────────────────────────────────────── */

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const toUnitSimilarity = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value > 1) return clampUnit(value / 100);
  return clampUnit(value);
};

const toMatchId = (value, fallback) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
};

const resolveSourceKey = (match = {}, fallbackIndex = 0) => {
  const sourceMetadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  const candidate =
    sourceMetadata.document_id ||
    match.submissionId ||
    match.id ||
    sourceMetadata.title ||
    match.projectTitle ||
    match.title;

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }

  if (Number.isFinite(candidate)) {
    return String(candidate);
  }

  return `source-${fallbackIndex}`;
};

const toNormalizedSpan = (span = {}) => {
  const start = Number(span?.start ?? span?.start_index);
  const end = Number(span?.end ?? span?.end_index);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return {
    start,
    end,
  };
};

const extractNormalizedSpans = (match = {}) => {
  const normalized = Array.isArray(match?.spans)
    ? match.spans.map((span) => toNormalizedSpan(span)).filter(Boolean)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackSpan = toNormalizedSpan({
    start: match?.start_index,
    end: match?.end_index,
  });

  return fallbackSpan ? [fallbackSpan] : [];
};

const computeCoveredCharacters = (matches = [], totalLength = 0) => {
  const maxLength = Number(totalLength);
  if (!Number.isFinite(maxLength) || maxLength <= 0) return 0;

  const intervals = [];

  for (const match of matches) {
    for (const span of extractNormalizedSpans(match)) {
      const start = Math.max(0, Math.min(maxLength, span.start));
      const end = Math.max(0, Math.min(maxLength, span.end));
      if (end > start) {
        intervals.push({ start, end });
      }
    }
  }

  if (intervals.length === 0) return 0;

  intervals.sort((left, right) => left.start - right.start || left.end - right.end);

  const merged = [intervals[0]];
  for (let index = 1; index < intervals.length; index += 1) {
    const current = intervals[index];
    const previous = merged[merged.length - 1];
    if (current.start <= previous.end) {
      previous.end = Math.max(previous.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
};

const pickSpanBounds = (match = {}) => {
  const directStart = Number(match.start_index);
  const directEnd = Number(match.end_index);

  if (Number.isFinite(directStart) && Number.isFinite(directEnd) && directEnd > directStart) {
    return { start: directStart, end: directEnd };
  }

  const firstSpan = Array.isArray(match.spans) ? match.spans[0] : null;
  const spanStart = Number(firstSpan?.start_index ?? firstSpan?.start ?? NaN);
  const spanEnd = Number(firstSpan?.end_index ?? firstSpan?.end ?? NaN);

  if (Number.isFinite(spanStart) && Number.isFinite(spanEnd) && spanEnd > spanStart) {
    return { start: spanStart, end: spanEnd };
  }

  return { start: null, end: null };
};

function normalizeMatch(match, index) {
  const { start, end } = pickSpanBounds(match);
  const sourceMetadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};
  const similarityScore = toUnitSimilarity(
    Number(match?.similarity_score ?? match?.similarity ?? match?.matchPercentage ?? 0),
  );

  return {
    ...match,
    match_id: toMatchId(
      match?.match_id ?? match?.submissionId ?? match?.id,
      `match-${index}-${start ?? 'na'}-${end ?? 'na'}`,
    ),
    start_index: start,
    end_index: end,
    hasPosition: Number.isFinite(start) && Number.isFinite(end),
    similarity_score: similarityScore,
    source_key: resolveSourceKey(match, index),
    source_metadata: {
      ...sourceMetadata,
      title: sourceMetadata?.title || match?.projectTitle || match?.title || 'Unknown source',
      author: sourceMetadata?.author || match?.author || null,
      chapter: sourceMetadata?.chapter ?? match?.chapter ?? null,
    },
    source_snippet: match?.source_snippet || match?.sourceSnippet || '',
  };
}

function extractSubmittedExcerpt(submittedText, match) {
  if (!submittedText || typeof submittedText !== 'string') return '';

  const spans = Array.isArray(match?.spans) ? match.spans : [];
  if (spans.length > 0) {
    const firstSpan = spans[0];
    const spanStart = Number(firstSpan?.start ?? firstSpan?.start_index);
    const spanEnd = Number(firstSpan?.end ?? firstSpan?.end_index);
    if (Number.isFinite(spanStart) && Number.isFinite(spanEnd) && spanEnd > spanStart) {
      return submittedText.slice(Math.max(0, spanStart), Math.min(submittedText.length, spanEnd));
    }
  }

  const start = Number(match?.start_index);
  const end = Number(match?.end_index);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return submittedText.slice(Math.max(0, start), Math.min(submittedText.length, end));
  }

  return '';
}

function similarityBand(unitScore) {
  const pct = Math.round((unitScore ?? 0) * 100);
  if (pct >= 90) {
    return {
      label: 'High',
      textClass: 'text-red-700',
      borderClass: 'border-red-400',
      donutClass: 'stroke-red-500',
    };
  }
  if (pct >= 70) {
    return {
      label: 'Medium',
      textClass: 'text-orange-700',
      borderClass: 'border-orange-400',
      donutClass: 'stroke-orange-500',
    };
  }
  return {
    label: 'Low',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-300',
    donutClass: 'stroke-yellow-500',
  };
}

function ScoreBadge({ score }) {
  const pct = Math.round(score ?? 0);

  let variant = 'success';
  if (pct < 70) variant = 'destructive';
  else if (pct < 85) variant = 'warning';

  return <Badge variant={variant}>{pct}% Original</Badge>;
}

function SimilarityDonut({ similarityPercent }) {
  const value = Math.max(0, Math.min(100, Math.round(similarityPercent ?? 0)));
  const band = similarityBand(value / 100);

  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 42 42" className="h-16 w-16 -rotate-90" aria-label="Overall similarity">
        <circle cx="21" cy="21" r="16" fill="none" className="stroke-muted" strokeWidth="4" />
        <circle
          cx="21"
          cy="21"
          r="16"
          fill="none"
          strokeWidth="4"
          strokeDasharray={`${value} 100`}
          strokeLinecap="round"
          className={band.donutClass}
        />
      </svg>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Overall Similarity
        </p>
        <p className={`text-2xl font-bold ${band.textClass}`}>{value}%</p>
      </div>
    </div>
  );
}

/* ─── Match card in the right pane ──────────────────────────────────────── */

function MatchCard({ match, isSelected, onSelect, onCompare, submittedText, panelRef }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((match.similarity_score ?? 0) * 100);
  const title = match.source_metadata?.title || 'Unknown source';
  const author = match.source_metadata?.author || null;
  const chapter = match.source_metadata?.chapter
    ? `Chapter ${match.source_metadata.chapter}`
    : null;
  const submittedExcerpt = extractSubmittedExcerpt(submittedText, match);
  const band = similarityBand((match.similarity_score ?? 0) * 1);
  const sourceNumber = Number(match?.source_number);
  const badgeClass = match?.badgeClass || 'border-slate-300 bg-slate-100 text-slate-700';

  const borderColor = band.borderClass;

  return (
    <div
      ref={panelRef}
      className={[
        'border-l-4 rounded-lg border border-border bg-card shadow-sm overflow-hidden transition-shadow',
        borderColor,
        isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="w-full text-left px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {Number.isFinite(sourceNumber) && sourceNumber > 0 && (
            <span
              className={[
                'mb-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                badgeClass,
              ].join(' ')}
            >
              Source {sourceNumber}
              {match?.colorHex && <span className="opacity-80">{match.colorHex}</span>}
            </span>
          )}
          <p className="text-sm font-semibold text-foreground truncate">
            {pct}% - Archived Document: {title}
          </p>
          {(author || chapter) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {[author, chapter].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span className={`text-xs font-bold ${band.textClass}`}>{pct}% similarity</span>
            {match.winnow_score !== null && match.winnow_score !== undefined && (
              <span className="text-xs text-gray-400">
                W:{Math.round(match.winnow_score * 100)}% S:
                {Math.round((match.semantic_score ?? 0) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => onSelect(match)}
            className="text-xs font-medium text-primary hover:text-primary/80"
            aria-pressed={isSelected}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
          <button
            type="button"
            onClick={() => onCompare(match)}
            className="text-xs font-medium text-foreground hover:text-primary"
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 hover:text-gray-600 p-0.5"
            aria-label={expanded ? 'Collapse source snippet' : 'Expand source snippet'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable snippet */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border">
          <div className="mt-2 grid grid-cols-1 gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Submitted sentence</p>
              <blockquote className="text-xs text-foreground/80 bg-muted/30 rounded p-2 border-l-2 border-border">
                {submittedExcerpt || 'No character-level span available for this match.'}
              </blockquote>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Archived sentence</p>
              <blockquote className="text-xs text-foreground/80 italic bg-muted/40 rounded p-2 border-l-2 border-border">
                {match.source_snippet || 'No archived source snippet available for this match.'}
              </blockquote>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── PlagiarismReportPage ───────────────────────────────────────────────── */

export default function PlagiarismReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [compareMatchId, setCompareMatchId] = useState(null);
  const [excludedSourceKeys, setExcludedSourceKeys] = useState([]);
  const [minimumSimilarity, setMinimumSimilarity] = useState(0);
  const sourceItemRefs = useRef(new Map());

  const { data, isLoading, isError, error } = usePlagiarismReport(submissionId);

  const rawMatches = useMemo(() => data?.fullReport?.matches ?? data?.matchedSources ?? [], [data]);

  const matches = useMemo(
    () => (Array.isArray(rawMatches) ? rawMatches.filter(Boolean).map(normalizeMatch) : []),
    [rawMatches],
  );

  const { sourceMap } = useMemo(() => buildTopSourceColorMap(matches, 10), [matches]);

  const sourceLegend = useMemo(
    () =>
      [...sourceMap.values()]
        .sort((left, right) => (left.sourceNumber || 0) - (right.sourceNumber || 0))
        .map((item) => ({
          sourceKey: item.sourceKey,
          sourceNumber: item.sourceNumber,
          sourceLabel: item.sourceLabel,
          badgeClass: item.badgeClass,
          colorHex: item.colorHex,
        })),
    [sourceMap],
  );

  const topSourceKeys = useMemo(() => sourceLegend.map((item) => item.sourceKey), [sourceLegend]);

  const decoratedMatches = useMemo(
    () =>
      matches.map((match) => {
        const sourceMeta = sourceMap.get(match.source_key);

        return {
          ...match,
          source_number: sourceMeta?.sourceNumber ?? null,
          badgeClass: sourceMeta?.badgeClass ?? null,
          highlightClass: sourceMeta?.highlightClass ?? null,
          colorHex: sourceMeta?.colorHex ?? null,
        };
      }),
    [matches, sourceMap],
  );

  const sanitizedExcludedSourceKeys = useMemo(
    () => excludedSourceKeys.filter((sourceKey) => topSourceKeys.includes(sourceKey)),
    [excludedSourceKeys, topSourceKeys],
  );

  const filteredMatches = useMemo(
    () =>
      decoratedMatches.filter((match) => {
        if (sanitizedExcludedSourceKeys.includes(match.source_key)) {
          return false;
        }
        const similarityPercent = Math.round((match.similarity_score ?? 0) * 100);
        return similarityPercent >= minimumSimilarity;
      }),
    [decoratedMatches, sanitizedExcludedSourceKeys, minimumSimilarity],
  );

  const viewerMatches = useMemo(
    () => filteredMatches.filter((match) => match.hasPosition),
    [filteredMatches],
  );

  const sortedMatches = useMemo(
    () =>
      [...filteredMatches].sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)),
    [filteredMatches],
  );

  const activeMatchIds = useMemo(
    () => new Set(filteredMatches.map((match) => match.match_id)),
    [filteredMatches],
  );

  const totalCharacters = useMemo(() => {
    const fromReport = Number(data?.fullReport?.total_characters);
    if (Number.isFinite(fromReport) && fromReport > 0) {
      return fromReport;
    }

    const fallbackText = typeof data?.extractedText === 'string' ? data.extractedText : '';
    return fallbackText.length;
  }, [data]);

  const recomputedMatchedCharacters = useMemo(
    () => computeCoveredCharacters(filteredMatches, totalCharacters),
    [filteredMatches, totalCharacters],
  );

  const recomputedSimilarity = useMemo(() => {
    if (totalCharacters <= 0) return 0;
    return Math.max(0, Math.min(100, (recomputedMatchedCharacters / totalCharacters) * 100));
  }, [recomputedMatchedCharacters, totalCharacters]);

  const recomputedOriginality = useMemo(
    () => Math.max(0, Math.min(100, 100 - recomputedSimilarity)),
    [recomputedSimilarity],
  );

  const hasActiveFilters = sanitizedExcludedSourceKeys.length > 0 || minimumSimilarity > 0;
  const hasSpanData = useMemo(
    () => filteredMatches.some((match) => extractNormalizedSpans(match).length > 0),
    [filteredMatches],
  );

  const activeSelectedMatchId =
    selectedMatchId && activeMatchIds.has(selectedMatchId) ? selectedMatchId : null;
  const activeCompareMatchId =
    compareMatchId && activeMatchIds.has(compareMatchId) ? compareMatchId : null;

  const compareMatch = useMemo(
    () => filteredMatches.find((match) => match.match_id === activeCompareMatchId) || null,
    [filteredMatches, activeCompareMatchId],
  );

  const handleSelectMatch = useCallback((match) => {
    setSelectedMatchId((prev) => (prev === match.match_id ? null : match.match_id));
  }, []);

  const handleCompareMatch = useCallback((match) => {
    setCompareMatchId(match.match_id);
    setSelectedMatchId(match.match_id);
  }, []);

  const handleToggleSource = useCallback((sourceKey) => {
    setExcludedSourceKeys((previous) =>
      previous.includes(sourceKey)
        ? previous.filter((key) => key !== sourceKey)
        : [...previous, sourceKey],
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setExcludedSourceKeys([]);
    setMinimumSimilarity(0);
  }, []);

  const handleExcludeAllSources = useCallback(() => {
    setExcludedSourceKeys(topSourceKeys);
  }, [topSourceKeys]);

  const handleIncludeAllSources = useCallback(() => {
    setExcludedSourceKeys([]);
  }, []);

  useEffect(() => {
    if (!activeSelectedMatchId) return;
    const node = sourceItemRefs.current.get(activeSelectedMatchId);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeSelectedMatchId]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading plagiarism report…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error?.response?.data?.message ||
                error?.message ||
                'Failed to load plagiarism report.'}
            </AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} className="mr-2" />
            Go back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const backendOriginality = Number(
    data?.originalityScore ?? data?.fullReport?.originality_score ?? Number.NaN,
  );
  const backendSimilarity = Number(
    data?.fullReport?.plagiarism_score ??
      (Number.isFinite(backendOriginality) ? 100 - backendOriginality : Number.NaN),
  );

  const effectiveSimilarity = Number.isFinite(backendSimilarity)
    ? Math.max(0, Math.min(100, backendSimilarity))
    : 0;

  const overallSimilarity = hasActiveFilters ? recomputedSimilarity : effectiveSimilarity;
  const effectiveOriginality = hasActiveFilters
    ? recomputedOriginality
    : Number.isFinite(backendOriginality)
      ? Math.max(0, Math.min(100, backendOriginality))
      : Math.max(0, Math.min(100, 100 - effectiveSimilarity));

  const processedAt = data?.processedAt
    ? new Date(data.processedAt).toLocaleString()
    : data?.fullReport?.checked_at
      ? new Date(data.fullReport.checked_at).toLocaleString()
      : null;

  const compareSubmittedExcerpt = compareMatch
    ? extractSubmittedExcerpt(data?.extractedText ?? '', compareMatch)
    : '';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1700px] space-y-4">
        <Card className="border-border/70 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} className="mr-1" />
                    Back
                  </Button>
                  <CardTitle className="text-lg">Plagiarism Report</CardTitle>
                </div>
                <CardDescription>
                  Submission-level similarity analysis against indexed archive sources.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ScoreBadge score={effectiveOriginality} />
                {hasActiveFilters && <Badge variant="warning">Filtered view</Badge>}
                <Badge variant="outline">
                  {sortedMatches.length} visible / {matches.length} total source
                  {matches.length !== 1 ? 's' : ''}
                </Badge>
                {!hasActiveFilters && (
                  <Badge variant="outline">
                    {sourceLegend.length} color-coded source{sourceLegend.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {processedAt && <Badge variant="secondary">Checked {processedAt}</Badge>}
              </div>
            </div>
          </CardHeader>
          {data?.fullReport && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {totalCharacters.toLocaleString()}
                  </span>{' '}
                  total chars
                </span>
                <span>
                  <span className="font-medium text-destructive">
                    {Math.round(
                      hasActiveFilters
                        ? recomputedMatchedCharacters
                        : Number(data.fullReport.matched_characters ?? 0),
                    ).toLocaleString()}
                  </span>{' '}
                  matched chars ({Math.round(overallSimilarity)}%)
                </span>
                <span>
                  <span className="font-medium text-foreground">
                    {data.fullReport.candidates_evaluated ?? '—'}
                  </span>{' '}
                  candidates evaluated
                </span>
                {hasActiveFilters && (
                  <span className="font-medium text-amber-700">
                    Frontend recompute active (source + similarity filters)
                  </span>
                )}
                {data.fullReport.processing_time_ms !== null &&
                  data.fullReport.processing_time_ms !== undefined && (
                    <span>
                      Processed in{' '}
                      <span className="font-medium text-foreground">
                        {(data.fullReport.processing_time_ms / 1000).toFixed(1)}s
                      </span>
                    </span>
                  )}
              </div>
            </CardContent>
          )}
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(21rem,3fr)] gap-4 min-h-[60vh]">
          <section aria-label="Submission text with highlighted matches">
            <Card className="h-full border-border/70 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Submission Text</CardTitle>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && <Badge variant="warning">Filtered</Badge>}
                    {activeSelectedMatchId && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMatchId(null)}>
                        Clear selection
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  A4-style document view with source-number highlights for quick review.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mx-auto w-full max-w-[960px] rounded-lg border border-border bg-background shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-medium">Document View</span>
                    <span>
                      Current score:{' '}
                      <strong className="text-foreground">
                        {Math.round(effectiveOriginality)}%
                      </strong>{' '}
                      originality /{' '}
                      <strong className="text-foreground">{Math.round(overallSimilarity)}%</strong>{' '}
                      similarity
                    </span>
                  </div>
                  <VirtualizedPlagiarismViewer
                    text={data?.extractedText ?? ''}
                    matches={viewerMatches}
                    selectedMatchId={activeSelectedMatchId}
                    onSelectMatch={handleSelectMatch}
                    sourceLegend={sourceLegend}
                  />
                </div>

                {filteredMatches.length > 0 && !hasSpanData && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    This report includes source matches, but no character-level spans are available
                    to render inline highlights for the active filter set.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          <aside aria-label="Detected plagiarism sources">
            <Card className="h-full border-border/70 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Match Overview</CardTitle>
                  <SimilarityDonut similarityPercent={overallSimilarity} />
                </div>
                <CardDescription>
                  Filter by source number, exclude noisy references, and compare evidence
                  side-by-side.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex h-[calc(70vh-1rem)] flex-col gap-3">
                <div className="rounded-lg border border-border bg-background/80 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <SlidersHorizontal size={12} />
                      Source Filters
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      disabled={!hasActiveFilters}
                    >
                      <RotateCcw size={12} className="mr-1" />
                      Reset
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Minimum source similarity:{' '}
                      <span className="font-semibold text-foreground">{minimumSimilarity}%</span>
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={minimumSimilarity}
                      onChange={(event) => setMinimumSimilarity(Number(event.target.value) || 0)}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleIncludeAllSources}>
                      Include all
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExcludeAllSources}
                      disabled={topSourceKeys.length === 0}
                    >
                      Exclude all
                    </Button>
                  </div>

                  <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                    {sourceLegend.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No top-source palette assignments yet.
                      </p>
                    ) : (
                      sourceLegend.map((source) => {
                        const isExcluded = sanitizedExcludedSourceKeys.includes(source.sourceKey);
                        const sourceMeta = sourceMap.get(source.sourceKey);
                        const similarityPct = Math.round((sourceMeta?.maxSimilarity ?? 0) * 100);

                        return (
                          <button
                            key={source.sourceKey}
                            type="button"
                            onClick={() => handleToggleSource(source.sourceKey)}
                            className={[
                              'w-full rounded-md border px-2 py-1.5 text-left transition',
                              isExcluded
                                ? 'border-dashed border-border bg-muted/30 text-muted-foreground'
                                : 'border-border bg-background hover:bg-muted/40',
                            ].join(' ')}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className={[
                                    'inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-semibold',
                                    source.badgeClass ||
                                      'border-slate-300 bg-slate-100 text-slate-700',
                                  ].join(' ')}
                                >
                                  {source.sourceNumber}
                                </span>
                                <span className="truncate text-xs font-medium">
                                  {source.sourceLabel}
                                </span>
                              </span>
                              <span className="text-[11px] font-semibold">{similarityPct}%</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {sortedMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-foreground">No matches found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This submission appears to be original for the active filter set.
                      </p>
                    </div>
                  ) : (
                    sortedMatches.map((match) => (
                      <MatchCard
                        key={match.match_id ?? `${match.start_index}-${match.end_index}`}
                        match={match}
                        isSelected={activeSelectedMatchId === match.match_id}
                        onSelect={handleSelectMatch}
                        onCompare={handleCompareMatch}
                        submittedText={data?.extractedText ?? ''}
                        panelRef={(node) => {
                          if (node) {
                            sourceItemRefs.current.set(match.match_id, node);
                          } else {
                            sourceItemRefs.current.delete(match.match_id);
                          }
                        }}
                      />
                    ))
                  )}
                </div>

                <div className="mt-1 border-t border-border pt-2">
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                    <FileText size={12} className="flex-shrink-0 mt-0.5" />
                    Numbered highlight chips map directly to source rows in this panel.
                  </p>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                    Use Compare to inspect submitted and archived excerpts in a focused overlay.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        {compareMatch && (
          <div
            className="fixed inset-0 z-50 bg-black/40 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-label="Compare matched text"
          >
            <div className="mx-auto flex h-full max-w-6xl items-start justify-center overflow-y-auto">
              <div className="w-full rounded-xl border border-border bg-background shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <span
                        className={[
                          'inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-semibold',
                          compareMatch.badgeClass || 'border-slate-300 bg-slate-100 text-slate-700',
                        ].join(' ')}
                      >
                        {compareMatch.source_number || '?'}
                      </span>
                      {compareMatch.source_metadata?.title || 'Source Comparison'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Similarity: {Math.round((compareMatch.similarity_score ?? 0) * 100)}%
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setCompareMatchId(null)}>
                    <X size={14} className="mr-1" />
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Eye size={12} />
                      Submitted Excerpt
                    </p>
                    <blockquote className="min-h-28 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {compareSubmittedExcerpt ||
                        'No submitted excerpt is available for this match.'}
                    </blockquote>
                  </div>

                  <div className="rounded-lg border border-border bg-card/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Archived Source Excerpt
                    </p>
                    <blockquote className="min-h-28 whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {compareMatch.source_snippet ||
                        'No archived source snippet is available for this match.'}
                    </blockquote>
                  </div>
                </div>

                <div className="flex items-center justify-end border-t border-border px-5 py-3">
                  <Button variant="outline" onClick={() => setCompareMatchId(null)}>
                    Close Comparison
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
