import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PLAGIARISM_STATUSES } from '@cms/shared';
import OriginalityBadge from './OriginalityBadge';

/**
 * PlagiarismReport — detailed originality-check panel for a submission.
 *
 * Shows the overall score with a visual indicator, matched-source table,
 * and handles all async states (loading, queued, processing, failed).
 *
 * @param {Object}  props
 * @param {Object}  [props.plagiarismResult] - The plagiarismResult sub-document.
 * @param {boolean} [props.isLoading]        - True while the query is in flight.
 * @param {string}  [props.className]        - Extra Tailwind classes on the root card.
 */
export default function PlagiarismReport({ plagiarismResult, isLoading = false, className }) {
  /* ────── Loading skeleton ────── */
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Originality Report</CardTitle>
          <CardDescription>Loading plagiarism check results…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ────── No data ────── */
  if (!plagiarismResult || !plagiarismResult.status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Originality Report</CardTitle>
          <CardDescription>No plagiarism check has been run for this submission.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { status, score, matchedSources = [], checkedAt } = plagiarismResult;

  /* ────── Queued / Processing ────── */
  if (status === PLAGIARISM_STATUSES.QUEUED || status === PLAGIARISM_STATUSES.PROCESSING) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Originality Report</CardTitle>
          <CardDescription>
            {status === PLAGIARISM_STATUSES.QUEUED
              ? 'The originality check is queued and will begin shortly.'
              : 'The originality check is currently in progress…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
            <span className="text-sm text-muted-foreground capitalize">{status}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ────── Failed ────── */
  if (status === PLAGIARISM_STATUSES.FAILED) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Originality Report</CardTitle>
          <CardDescription>The plagiarism check could not be completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="destructive">Check Failed</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            The system was unable to process this document. Please try re-uploading or contact your
            adviser.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* ────── Completed — score + matched sources ────── */
  const scoreNum = typeof score === 'number' ? score : 0;

  // Ring colour based on score
  let ringColor = 'text-destructive'; // < 60
  if (scoreNum >= 80) ringColor = 'text-green-600 dark:text-green-400';
  else if (scoreNum >= 60) ringColor = 'text-amber-600 dark:text-amber-400';

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Originality Report</CardTitle>
            {checkedAt && (
              <CardDescription>Checked {new Date(checkedAt).toLocaleString()}</CardDescription>
            )}
          </div>
          <OriginalityBadge plagiarismResult={plagiarismResult} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Score ring ── */}
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-bold ${ringColor}`}
            style={{ borderColor: 'currentColor' }}
            aria-label={`${scoreNum}% original`}
          >
            {scoreNum}%
          </div>
          <div>
            <p className="font-medium">
              {scoreNum >= 80 && 'High Originality'}
              {scoreNum >= 60 && scoreNum < 80 && 'Moderate Originality'}
              {scoreNum < 60 && 'Low Originality — Review Needed'}
            </p>
            <p className="text-sm text-muted-foreground">
              {matchedSources.length === 0
                ? 'No matching sources detected.'
                : `${matchedSources.length} matching source${matchedSources.length > 1 ? 's' : ''} found.`}
            </p>
          </div>
        </div>

        {/* ── Matched sources table ── */}
        {matchedSources.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 font-medium text-right">Match %</th>
                </tr>
              </thead>
              <tbody>
                {matchedSources.map((src, idx) => (
                  <tr key={src.sourceId || idx} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2 pr-4">{src.title || src.sourceId || 'Unknown'}</td>
                    <td className="py-2 text-right font-mono">
                      {typeof src.matchPercentage === 'number'
                        ? `${src.matchPercentage.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
