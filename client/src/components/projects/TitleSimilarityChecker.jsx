import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, CheckCircle2, Eye, Loader2, Search } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';
import { useCheckTitleSimilarity } from '@/hooks/useProjects';
import { DEFAULT_TITLE_SIMILARITY_THRESHOLD } from '@cms/shared';
import SimilarProjectModal from '@/components/projects/SimilarProjectModal';

/**
 * TitleSimilarityChecker — real-time duplicate-title detection widget.
 *
 * Drop this component below a title input. It debounces the raw title,
 * queries the backend similarity endpoint, and renders one of four
 * visual states: idle, loading, warning (interactive matches found), or clear.
 *
 * Clicking any similar title opens an institutional preview modal displaying
 * the archived project's abstract, scope, tech stack, and divergence recommendations.
 *
 * @param {Object}   props
 * @param {string}   props.title            - The raw (un-debounced) title value from the input.
 * @param {Array}    [props.keywords=[]]    - Optional keyword array to boost similarity scoring.
 * @param {string}   [props.excludeProjectId] - Project ID to exclude from results (for edits).
 * @param {number}   [props.debounceMs=500] - Debounce delay in milliseconds.
 * @param {boolean}  [props.portal=true]    - Whether SimilarProjectModal renders via portal.
 * @param {Function} [props.onScanStatusChange] - Callback notifying parent of scan state and matches.
 */
export default function TitleSimilarityChecker({
  title,
  keywords = [],
  excludeProjectId,
  debounceMs = 500,
  portal = true,
  onScanStatusChange,
}) {
  const [selectedProject, setSelectedProject] = useState(null);
  const debouncedTitle = useDebounce(title, debounceMs);

  const isDebouncing = Boolean(title && title.trim().length >= 10 && title !== debouncedTitle);

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

  const isChecking = isDebouncing || isLoading || isFetching;

  // Notify parent of live clearance lifecycle and matches
  useEffect(() => {
    if (!title || title.trim().length < 10) {
      onScanStatusChange?.({
        isLoading: false,
        isFetching: false,
        isDebouncing: false,
        hasMatches: false,
        similarProjects: [],
        threshold: DEFAULT_TITLE_SIMILARITY_THRESHOLD,
        title: title || '',
        isTooShort: true,
      });
      return;
    }

    if (isChecking) {
      onScanStatusChange?.({
        isLoading: true,
        isFetching: isFetching || isDebouncing,
        isDebouncing,
        hasMatches: false,
        similarProjects: [],
        threshold: DEFAULT_TITLE_SIMILARITY_THRESHOLD,
        title,
        isTooShort: false,
      });
      return;
    }

    if (isError) {
      onScanStatusChange?.({
        isLoading: false,
        isFetching: false,
        isDebouncing: false,
        hasMatches: false,
        similarProjects: [],
        threshold: DEFAULT_TITLE_SIMILARITY_THRESHOLD,
        title: debouncedTitle,
        isTooShort: false,
        isError: true,
      });
      return;
    }

    if (data) {
      const { similarProjects = [], threshold = DEFAULT_TITLE_SIMILARITY_THRESHOLD } = data;
      onScanStatusChange?.({
        isLoading: false,
        isFetching: false,
        isDebouncing: false,
        hasMatches: similarProjects.length > 0,
        similarProjects,
        threshold,
        title: debouncedTitle,
        isTooShort: false,
      });
    }
  }, [
    title,
    debouncedTitle,
    isChecking,
    isFetching,
    isDebouncing,
    isError,
    data,
    onScanStatusChange,
  ]);

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
  if (isChecking) {
    return (
      <p
        className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 animate-pulse"
        data-testid="similarity-checking-indicator"
      >
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
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
      <>
        <Alert variant="destructive" className="mt-2" data-testid="similarity-conflict-alert">
          <AlertTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Similar titles detected
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-xs">
              The following existing titles are above the{' '}
              <strong>{Math.round((threshold ?? 0.65) * 100)}%</strong> similarity threshold.
              Consider revising your title to make it more distinct.
            </p>

            {/* Similar Titles List (Interactive Triggers) */}
            <div className="space-y-2 mt-3" data-testid="similar-projects-list">
              {similarProjects.map((project) => {
                const scorePct =
                  project.similarityScore ??
                  (typeof project.score === 'number' ? Math.round(project.score * 100) : 0);
                const key = project.id || project.projectId || project.title;

                const stageLabel =
                  project.projectStatus === 'archived' ||
                  project.isArchived ||
                  project.status === 'ARCHIVED'
                    ? 'Archived'
                    : Number(project.capstonePhase) === 4
                      ? 'Final Capstone'
                      : Number(project.capstonePhase) === 3
                        ? 'Capstone 3'
                        : Number(project.capstonePhase) === 2
                          ? 'Capstone 2'
                          : 'Capstone 1 (Proposal)';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className="w-full flex items-center justify-between p-3 bg-card border border-rose-200 dark:border-rose-900/60 rounded-lg shadow-2xs hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md transition-all text-left group cursor-pointer gap-2"
                    data-testid={`similar-project-trigger-${project.id || project.projectId || scorePct}`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {project.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal border-rose-200 dark:border-rose-900/80 text-muted-foreground"
                        >
                          {stageLabel}
                        </Badge>
                        {project.academicYear && (
                          <span className="text-[10px] text-muted-foreground">
                            {project.academicYear}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 text-xs font-semibold text-white bg-rose-500 rounded-full">
                        {scorePct}%
                      </span>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-primary flex items-center gap-1 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                        View Scope &rarr;
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>

        {/* Capstone Detail Preview Modal */}
        <SimilarProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          portal={portal}
        />
      </>
    );
  }

  // ----- Clear: no matches -----
  return (
    <p
      className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 mt-1"
      data-testid="similarity-clear-indicator"
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      No similar titles found — your title looks unique!
    </p>
  );
}

TitleSimilarityChecker.propTypes = {
  title: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  excludeProjectId: PropTypes.string,
  debounceMs: PropTypes.number,
  portal: PropTypes.bool,
  onScanStatusChange: PropTypes.func,
};
