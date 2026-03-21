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

  let colorClass = 'bg-green-100 text-green-800 border-green-300';
  if (pct < 70) colorClass = 'bg-red-100 text-red-800 border-red-300';
  else if (pct < 85) colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${colorClass}`}
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

  let borderColor = 'border-yellow-300';
  if (pct >= 85) borderColor = 'border-red-400';
  else if (pct >= 65) borderColor = 'border-orange-400';

  return (
    <div
      className={[
        'border-l-4 rounded-lg bg-white shadow-sm overflow-hidden transition-shadow',
        borderColor,
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="w-full text-left px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          {(author || chapter) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {[author, chapter].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xs font-bold ${
                pct >= 85 ? 'text-red-700' : pct >= 65 ? 'text-orange-700' : 'text-yellow-700'
              }`}
            >
              {pct}% similarity
            </span>
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
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
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
      {expanded && match.source_snippet && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mt-2 mb-1 font-medium">Source excerpt:</p>
          <blockquote className="text-xs text-gray-600 italic bg-gray-50 rounded p-2 border-l-2 border-gray-300 line-clamp-5">
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading plagiarism report…</p>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Failed to load report</h2>
          <p className="text-sm text-gray-500">
            {error?.response?.data?.message || error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Go back to submission detail"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-900">Plagiarism Report</h1>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-3">
          {originality !== null && originality !== undefined && <ScoreBadge score={originality} />}
          {sortedMatches.length > 0 && (
            <span className="text-xs text-gray-500">
              {sortedMatches.length} source{sortedMatches.length !== 1 ? 's' : ''} detected
            </span>
          )}
          {processedAt && (
            <span className="text-xs text-gray-400 hidden sm:inline">Checked {processedAt}</span>
          )}
        </div>
      </header>

      {/* ── Summary bar ── */}
      {data?.fullReport && (
        <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-6 text-xs text-gray-500">
          <span>
            <span className="font-medium text-gray-700">
              {data.fullReport.total_characters?.toLocaleString() ?? '—'}
            </span>{' '}
            total chars
          </span>
          <span>
            <span className="font-medium text-red-600">
              {data.fullReport.matched_characters?.toLocaleString() ?? '—'}
            </span>{' '}
            matched chars ({Math.round(plagiarismPct ?? 0)}%)
          </span>
          <span>
            <span className="font-medium text-gray-700">
              {data.fullReport.candidates_evaluated ?? '—'}
            </span>{' '}
            candidates evaluated
          </span>
          {data.fullReport.processing_time_ms !== null &&
            data.fullReport.processing_time_ms !== undefined && (
              <span>
                Processed in{' '}
                <span className="font-medium text-gray-700">
                  {(data.fullReport.processing_time_ms / 1000).toFixed(1)}s
                </span>
              </span>
            )}
        </div>
      )}

      {/* ── Split pane body ── */}
      <main className="flex flex-1 overflow-hidden gap-0">
        {/* Left pane — Viewer */}
        <section
          className="flex-1 min-w-0 flex flex-col border-r border-gray-200 overflow-hidden"
          aria-label="Submission text with highlighted matches"
        >
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Submission Text</h2>
            {selectedMatchId && (
              <button
                onClick={() => setSelectedMatchId(null)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
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
          className="w-80 flex-shrink-0 flex flex-col bg-gray-50 overflow-hidden"
          aria-label="Detected plagiarism sources"
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h2 className="text-sm font-semibold text-gray-700">Detected Sources</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click a source to scroll to its match in the text.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sortedMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm font-medium text-gray-700">No matches found</p>
                <p className="text-xs text-gray-400 mt-1">
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
          <div className="px-3 py-2 border-t border-gray-200 bg-white">
            <p className="flex items-start gap-1.5 text-xs text-gray-400">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              Scores combine lexical fingerprinting (70%) and semantic similarity (30%).
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
