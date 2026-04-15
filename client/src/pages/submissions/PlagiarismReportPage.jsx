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
 * The `fullReport` object comes from the Python PlagiarismEngine and contains:
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
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { usePlagiarismReport } from '../../hooks/useSubmissions';
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

function MatchCard({ match, isSelected, onSelect, submittedText, panelRef }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((match.similarity_score ?? 0) * 100);
  const title = match.source_metadata?.title || 'Unknown source';
  const author = match.source_metadata?.author || null;
  const chapter = match.source_metadata?.chapter
    ? `Chapter ${match.source_metadata.chapter}`
    : null;
  const submittedExcerpt = extractSubmittedExcerpt(submittedText, match);
  const band = similarityBand((match.similarity_score ?? 0) * 1);

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
  const sourceItemRefs = useRef(new Map());

  const { data, isLoading, isError, error } = usePlagiarismReport(submissionId);

  const rawMatches = useMemo(() => data?.fullReport?.matches ?? data?.matchedSources ?? [], [data]);

  const matches = useMemo(
    () => (Array.isArray(rawMatches) ? rawMatches.filter(Boolean).map(normalizeMatch) : []),
    [rawMatches],
  );

  const viewerMatches = useMemo(() => matches.filter((match) => match.hasPosition), [matches]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)),
    [matches],
  );

  const handleSelectMatch = useCallback((match) => {
    setSelectedMatchId((prev) => (prev === match.match_id ? null : match.match_id));
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;
    const node = sourceItemRefs.current.get(selectedMatchId);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedMatchId]);

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

  const originality = data?.originalityScore ?? data?.fullReport?.originality_score ?? null;
  const plagiarismPct =
    data?.fullReport?.plagiarism_score ??
    (originality !== null && originality !== undefined ? 100 - originality : null);
  const overallSimilarity = Math.max(0, Math.min(100, Math.round(plagiarismPct ?? 0)));
  const processedAt = data?.processedAt ? new Date(data.processedAt).toLocaleDateString() : null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
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
                {originality !== null && originality !== undefined && (
                  <ScoreBadge score={originality} />
                )}
                <Badge variant="outline">
                  {sortedMatches.length} source{sortedMatches.length !== 1 ? 's' : ''} detected
                </Badge>
                {processedAt && <Badge variant="secondary">Checked {processedAt}</Badge>}
              </div>
            </div>
          </CardHeader>
          {data?.fullReport && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {data.fullReport.total_characters?.toLocaleString() ?? '—'}
                  </span>{' '}
                  total chars
                </span>
                <span>
                  <span className="font-medium text-destructive">
                    {data.fullReport.matched_characters?.toLocaleString() ?? '—'}
                  </span>{' '}
                  matched chars ({Math.round(plagiarismPct ?? 0)}%)
                </span>
                <span>
                  <span className="font-medium text-foreground">
                    {data.fullReport.candidates_evaluated ?? '—'}
                  </span>{' '}
                  candidates evaluated
                </span>
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

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)] gap-4 min-h-[60vh]">
          <section aria-label="Submission text with highlighted matches">
            <Card className="h-full border-border/70 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Submission Text</CardTitle>
                  {selectedMatchId && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedMatchId(null)}>
                      Clear selection
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <VirtualizedPlagiarismViewer
                  text={data?.extractedText ?? ''}
                  matches={viewerMatches}
                  selectedMatchId={selectedMatchId}
                  onSelectMatch={handleSelectMatch}
                />
                {matches.length > 0 && viewerMatches.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Source matches are available, but this report does not include character-level
                    spans for in-text highlighting.
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
                  Select a source to focus the matching section in the submission text.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex h-[calc(60vh-1rem)] flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {sortedMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-foreground">No matches found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This submission appears to be original.
                      </p>
                    </div>
                  ) : (
                    sortedMatches.map((match) => (
                      <MatchCard
                        key={match.match_id ?? `${match.start_index}-${match.end_index}`}
                        match={match}
                        isSelected={selectedMatchId === match.match_id}
                        onSelect={handleSelectMatch}
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

                <div className="mt-3 border-t border-border pt-2">
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                    <FileText size={12} className="flex-shrink-0 mt-0.5" />
                    Red highlights are 90%+, orange highlights are 70-89% match overlap.
                  </p>
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                    Expanded cards show submitted-vs-archived evidence for reviewer comparison.
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
