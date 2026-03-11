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
import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlagiarismReport } from '../../hooks/useSubmissions';
import VirtualizedPlagiarismViewer from '../../components/plagiarism/VirtualizedPlagiarismViewer';

/* ─── Score badge helper ─────────────────────────────────────────────────── */

function ScoreBadge({ score }) {
  const pct = Math.round(score ?? 0);

  let colorClass = 'tw-bg-green-100 tw-text-green-800 tw-border-green-300';
  if (pct < 70) colorClass = 'tw-bg-red-100 tw-text-red-800 tw-border-red-300';
  else if (pct < 85) colorClass = 'tw-bg-yellow-100 tw-text-yellow-800 tw-border-yellow-300';

  return (
    <span
      className={`tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-sm tw-font-semibold tw-border ${colorClass}`}
    >
      {pct}% Original
    </span>
  );
}

/* ─── Match card in the right pane ──────────────────────────────────────── */

function MatchCard({ match, isSelected, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round((match.similarity_score ?? 0) * 100);
  const title = match.source_metadata?.title || 'Unknown source';
  const author = match.source_metadata?.author || null;
  const chapter = match.source_metadata?.chapter
    ? `Chapter ${match.source_metadata.chapter}`
    : null;

  let borderColor = 'tw-border-yellow-300';
  if (pct >= 85) borderColor = 'tw-border-red-400';
  else if (pct >= 65) borderColor = 'tw-border-orange-400';

  return (
    <div
      className={[
        'tw-border-l-4 tw-rounded-lg tw-bg-white tw-shadow-sm tw-overflow-hidden tw-transition-shadow',
        borderColor,
        isSelected ? 'tw-ring-2 tw-ring-blue-500' : 'hover:tw-shadow-md',
      ].join(' ')}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => onSelect(match)}
        className="tw-w-full tw-text-left tw-px-4 tw-py-3 tw-flex tw-items-start tw-justify-between tw-gap-2 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-inset focus:tw-ring-blue-400"
        aria-pressed={isSelected}
      >
        <div className="tw-flex-1 tw-min-w-0">
          <p className="tw-text-sm tw-font-semibold tw-text-gray-900 tw-truncate">{title}</p>
          {(author || chapter) && (
            <p className="tw-text-xs tw-text-gray-500 tw-mt-0.5">
              {[author, chapter].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="tw-mt-1 tw-flex tw-items-center tw-gap-2">
            <span
              className={`tw-text-xs tw-font-bold ${
                pct >= 85
                  ? 'tw-text-red-700'
                  : pct >= 65
                    ? 'tw-text-orange-700'
                    : 'tw-text-yellow-700'
              }`}
            >
              {pct}% similarity
            </span>
            {match.winnow_score !== null && match.winnow_score !== undefined && (
              <span className="tw-text-xs tw-text-gray-400">
                W:{Math.round(match.winnow_score * 100)}% S:
                {Math.round((match.semantic_score ?? 0) * 100)}%
              </span>
            )}
          </div>
        </div>
        {/* Expand snippet toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="tw-text-gray-400 hover:tw-text-gray-600 tw-flex-shrink-0 tw-p-0.5"
          aria-label={expanded ? 'Collapse source snippet' : 'Expand source snippet'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </button>

      {/* Expandable snippet */}
      {expanded && match.source_snippet && (
        <div className="tw-px-4 tw-pb-3 tw-border-t tw-border-gray-100">
          <p className="tw-text-xs tw-text-gray-400 tw-mt-2 tw-mb-1 tw-font-medium">
            Source excerpt:
          </p>
          <blockquote className="tw-text-xs tw-text-gray-600 tw-italic tw-bg-gray-50 tw-rounded tw-p-2 tw-border-l-2 tw-border-gray-300 tw-line-clamp-5">
            {match.source_snippet}
          </blockquote>
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

  const { data, isLoading, isError, error } = usePlagiarismReport(submissionId);

  const matches = useMemo(() => data?.fullReport?.matches ?? data?.matchedSources ?? [], [data]);

  const sortedMatches = useMemo(
    () => [...matches].sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)),
    [matches],
  );

  const handleSelectMatch = useCallback((match) => {
    setSelectedMatchId((prev) => (prev === match.match_id ? null : match.match_id));
  }, []);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gray-50">
        <div className="tw-text-center">
          <div className="tw-animate-spin tw-rounded-full tw-h-10 tw-w-10 tw-border-4 tw-border-blue-600 tw-border-t-transparent tw-mx-auto tw-mb-3" />
          <p className="tw-text-gray-500 tw-text-sm">Loading plagiarism report…</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gray-50 tw-p-4">
        <div className="tw-max-w-md tw-text-center">
          <AlertTriangle className="tw-h-10 tw-w-10 tw-text-red-500 tw-mx-auto tw-mb-3" />
          <h2 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-1">
            Failed to load report
          </h2>
          <p className="tw-text-sm tw-text-gray-500">
            {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="tw-mt-4 tw-inline-flex tw-items-center tw-gap-2 tw-text-sm tw-text-blue-600 hover:tw-text-blue-700"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    );
  }

  const originality = data?.originalityScore ?? data?.fullReport?.originality_score ?? null;
  const plagiarismPct =
    data?.fullReport?.plagiarism_score ??
    (originality !== null && originality !== undefined ? 100 - originality : null);
  const processedAt = data?.processedAt ? new Date(data.processedAt).toLocaleDateString() : null;

  return (
    <div className="tw-flex tw-flex-col tw-min-h-screen tw-bg-gray-50">
      {/* ── Top bar ── */}
      <header className="tw-bg-white tw-border-b tw-border-gray-200 tw-px-6 tw-py-4 tw-flex tw-items-center tw-justify-between tw-flex-shrink-0">
        <div className="tw-flex tw-items-center tw-gap-3">
          <button
            onClick={() => navigate(-1)}
            className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-sm tw-text-gray-500 hover:tw-text-gray-800 tw-transition-colors"
            aria-label="Go back to submission detail"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <span className="tw-text-gray-300">|</span>
          <h1 className="tw-text-base tw-font-semibold tw-text-gray-900">Plagiarism Report</h1>
        </div>

        {/* Summary badges */}
        <div className="tw-flex tw-items-center tw-gap-3">
          {originality !== null && originality !== undefined && <ScoreBadge score={originality} />}
          {sortedMatches.length > 0 && (
            <span className="tw-text-xs tw-text-gray-500">
              {sortedMatches.length} source{sortedMatches.length !== 1 ? 's' : ''} detected
            </span>
          )}
          {processedAt && (
            <span className="tw-text-xs tw-text-gray-400 tw-hidden sm:tw-inline">
              Checked {processedAt}
            </span>
          )}
        </div>
      </header>

      {/* ── Summary bar ── */}
      {data?.fullReport && (
        <div className="tw-bg-white tw-border-b tw-border-gray-100 tw-px-6 tw-py-2 tw-flex tw-items-center tw-gap-6 tw-text-xs tw-text-gray-500">
          <span>
            <span className="tw-font-medium tw-text-gray-700">
              {data.fullReport.total_characters?.toLocaleString() ?? '—'}
            </span>{' '}
            total chars
          </span>
          <span>
            <span className="tw-font-medium tw-text-red-600">
              {data.fullReport.matched_characters?.toLocaleString() ?? '—'}
            </span>{' '}
            matched chars ({Math.round(plagiarismPct ?? 0)}%)
          </span>
          <span>
            <span className="tw-font-medium tw-text-gray-700">
              {data.fullReport.candidates_evaluated ?? '—'}
            </span>{' '}
            candidates evaluated
          </span>
          {data.fullReport.processing_time_ms !== null &&
            data.fullReport.processing_time_ms !== undefined && (
              <span>
                Processed in{' '}
                <span className="tw-font-medium tw-text-gray-700">
                  {(data.fullReport.processing_time_ms / 1000).toFixed(1)}s
                </span>
              </span>
            )}
        </div>
      )}

      {/* ── Split pane body ── */}
      <main className="tw-flex tw-flex-1 tw-overflow-hidden tw-gap-0">
        {/* Left pane — Viewer */}
        <section
          className="tw-flex-1 tw-min-w-0 tw-flex tw-flex-col tw-border-r tw-border-gray-200 tw-overflow-hidden"
          aria-label="Submission text with highlighted matches"
        >
          <div className="tw-px-4 tw-py-3 tw-bg-gray-50 tw-border-b tw-border-gray-200 tw-flex tw-items-center tw-justify-between">
            <h2 className="tw-text-sm tw-font-semibold tw-text-gray-700">Submission Text</h2>
            {selectedMatchId && (
              <button
                onClick={() => setSelectedMatchId(null)}
                className="tw-text-xs tw-text-blue-600 hover:tw-text-blue-700"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="tw-flex-1 tw-overflow-hidden">
            <VirtualizedPlagiarismViewer
              text={data?.extractedText ?? ''}
              matches={matches}
              selectedMatchId={selectedMatchId}
              onSelectMatch={handleSelectMatch}
            />
          </div>
        </section>

        {/* Right pane — Match list */}
        <aside
          className="tw-w-80 tw-flex-shrink-0 tw-flex tw-flex-col tw-bg-gray-50 tw-overflow-hidden"
          aria-label="Detected plagiarism sources"
        >
          <div className="tw-px-4 tw-py-3 tw-border-b tw-border-gray-200 tw-bg-white">
            <h2 className="tw-text-sm tw-font-semibold tw-text-gray-700">Detected Sources</h2>
            <p className="tw-text-xs tw-text-gray-400 tw-mt-0.5">
              Click a source to scroll to its match in the text.
            </p>
          </div>

          <div className="tw-flex-1 tw-overflow-y-auto tw-p-3 tw-space-y-2">
            {sortedMatches.length === 0 ? (
              <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-h-40 tw-text-center">
                <CheckCircle className="tw-h-8 tw-w-8 tw-text-green-500 tw-mb-2" />
                <p className="tw-text-sm tw-font-medium tw-text-gray-700">No matches found</p>
                <p className="tw-text-xs tw-text-gray-400 tw-mt-1">
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
                />
              ))
            )}
          </div>

          {/* Info footer */}
          <div className="tw-px-3 tw-py-2 tw-border-t tw-border-gray-200 tw-bg-white">
            <p className="tw-flex tw-items-start tw-gap-1.5 tw-text-xs tw-text-gray-400">
              <Info size={12} className="tw-flex-shrink-0 tw-mt-0.5" />
              Scores combine lexical fingerprinting (70%) and semantic similarity (30%).
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
