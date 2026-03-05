import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useCheckTitleSimilarity } from '@/hooks/useProjects';

/**
 * TitleSimilarityChecker — real-time duplicate-title detection widget.
 *
 * Drop this component below a title input. It debounces the raw title,
 * queries the backend similarity endpoint, and renders one of four
 * visual states: idle, loading, warning (matches found), or clear.
 *
 * @param {Object}  props
 * @param {string}  props.title            - The raw (un-debounced) title value from the input.
 * @param {Array}   [props.keywords=[]]    - Optional keyword array to boost similarity scoring.
 * @param {string}  [props.excludeProjectId] - Project ID to exclude from results (for edits).
 * @param {number}  [props.debounceMs=500] - Debounce delay in milliseconds.
 */
export default function TitleSimilarityChecker({
  title,
  keywords = [],
  excludeProjectId,
  debounceMs = 500,
}) {
  const debouncedTitle = useDebounce(title, debounceMs);

  // Only build extraParams when their values are meaningful
  const extraParams = useMemo(
    () => ({
      ...(keywords.length > 0 && { keywords }),
      ...(excludeProjectId && { excludeProjectId }),
    }),
    [keywords, excludeProjectId],
  );

  const { data, isLoading, isFetching, isError } = useCheckTitleSimilarity(
    debouncedTitle,
    extraParams,
  );

  // ----- Idle: title too short to check -----
  const isTooShort = !title || title.trim().length < 10;
  if (isTooShort) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <Search className="h-3 w-3" />
        Enter at least 10 characters to check for similar titles.
      </p>
    );
  }

  // ----- Loading: waiting for debounce or network -----
  if (isLoading || isFetching) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking for similar titles…
      </p>
    );
  }

  // ----- Network error: fail silently with hint -----
  if (isError) {
    return (
      <p className="text-xs text-muted-foreground mt-1">
        Unable to check title similarity right now. You can still proceed.
      </p>
    );
  }

  // ----- Results available -----
  const { similarProjects = [], threshold } = data || {};
  const hasMatches = similarProjects.length > 0;

  if (hasMatches) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertTitle className="flex items-center gap-1.5 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Similar titles detected
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-xs">
            The following existing titles are above the{' '}
            <strong>{Math.round((threshold ?? 0.7) * 100)}%</strong> similarity threshold.
            Consider revising your title to make it more distinct.
          </p>

          <ul className="space-y-1.5">
            {similarProjects.map((match) => (
              <li
                key={match.projectId}
                className="flex items-start justify-between gap-2 rounded-md border border-destructive/20 bg-background/60 px-3 py-2 text-xs"
              >
                <span className="leading-snug text-foreground">{match.title}</span>
                <Badge variant="destructive" className="shrink-0 text-[10px]">
                  {Math.round(match.score * 100)}%
                </Badge>
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  // ----- Clear: no matches -----
  return (
    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-1">
      <CheckCircle2 className="h-3.5 w-3.5" />
      No similar titles found — your title looks unique!
    </p>
  );
}
