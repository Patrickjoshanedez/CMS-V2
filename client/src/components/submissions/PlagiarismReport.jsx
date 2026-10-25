import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { PLAGIARISM_STATUSES } from '@cms/shared';
import OriginalityBadge from './OriginalityBadge';
import { buildTopSourceColorMap } from '../../hooks/useSubmissions';

const toSourceKey = (source = {}, fallbackIndex = 0) => {
  const candidate = source.sourceId || source.id || source.documentId || source.title;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  if (Number.isFinite(candidate)) return String(candidate);
  return `source-${fallbackIndex}`;
};

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
      <Card className={className} aria-busy="true">
        <CardHeader>
          <CardTitle className="text-base">Originality Report</CardTitle>
          <CardDescription>Loading plagiarism check results…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonText className="h-4 w-1/3" />
              <SkeletonText className="h-3 w-2/3" />
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
          <CardDescription>No originality check has been run for this submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="info">
            <AlertDescription>
              Results will appear here after the document has been checked.
            </AlertDescription>
          </Alert>
        </CardContent>
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
          <div className="flex items-center gap-3" role="status" aria-live="polite">
            <Spinner className="text-primary" />
            <Badge variant="info" className="capitalize">
              {status}
            </Badge>
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
          <Alert variant="destructive">
            <AlertDescription>
              The system could not process this document. Please try re-uploading or contact your
              adviser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  /* ────── Completed — score + matched sources ────── */
  const scoreNum = typeof score === 'number' ? score : 0;

  // Ring colour based on score
  let scoreTone = {
    text: 'text-destructive-text',
    indicator: 'bg-destructive',
    badge: 'destructive',
  }; // < 60
  if (scoreNum >= 80) {
    scoreTone = {
      text: 'text-success-foreground',
      indicator: 'bg-success',
      badge: 'success',
    };
  } else if (scoreNum >= 60) {
    scoreTone = {
      text: 'text-warning-foreground',
      indicator: 'bg-warning',
      badge: 'warning',
    };
  }

  const paletteInput = matchedSources.map((source, index) => ({
    id: source.sourceId || source.id || source.documentId || `source-${index}`,
    similarity_score: Number(source.matchPercentage ?? source.similarity ?? 0) / 100,
    source_metadata: {
      title: source.title || source.sourceId || 'Unknown source',
      document_id: source.sourceId || source.id || source.documentId || null,
    },
  }));

  const { sourceMap } = buildTopSourceColorMap(paletteInput, 10);

  const decoratedSources = matchedSources.map((source, index) => {
    const sourceKey = toSourceKey(source, index);
    const sourceStyle = sourceMap.get(sourceKey);

    return {
      ...source,
      sourceKey,
      sourceNumber: sourceStyle?.sourceNumber ?? index + 1,
      badgeClass: sourceStyle?.badgeClass || 'border-border bg-muted text-muted-foreground',
    };
  });

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
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 font-bold ${scoreTone.text}`}
            style={{ borderColor: 'currentColor' }}
            aria-label={`${scoreNum}% original`}
          >
            <Badge variant={scoreTone.badge}>{scoreNum}%</Badge>
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
        <Progress
          value={scoreNum}
          aria-label={`Originality score: ${scoreNum}%`}
          indicatorClassName={scoreTone.indicator}
        />

        {decoratedSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {decoratedSources.slice(0, 5).map((source) => (
              <span
                key={`palette-${source.sourceKey}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs"
              >
                <span
                  className={[
                    'inline-flex h-4 min-w-4 items-center justify-center rounded border px-1 text-[10px] font-semibold',
                    source.badgeClass,
                  ].join(' ')}
                >
                  {source.sourceNumber}
                </span>
                <span className="max-w-[10rem] truncate">
                  {source.title || source.sourceId || 'Source'}
                </span>
              </span>
            ))}
            {decoratedSources.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{decoratedSources.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* ── Matched sources table ── */}
        {decoratedSources.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source #</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Match %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decoratedSources.map((src, idx) => (
                <TableRow key={src.sourceId || src.sourceKey || idx}>
                  <TableCell>
                    <span
                      className={[
                        'inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 text-[11px] font-semibold',
                        src.badgeClass,
                      ].join(' ')}
                    >
                      {src.sourceNumber}
                    </span>
                  </TableCell>
                  <TableCell>{src.title || src.sourceId || 'Unknown'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {typeof src.matchPercentage === 'number'
                      ? `${src.matchPercentage.toFixed(1)}%`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
