/**
 * PlagiarismChecker Component
 *
 * UI for displaying and triggering plagiarism analysis.
 * Used by advisers/instructors/panelists when reviewing submissions.
 *
 * Features:
 *  - Trigger plagiarism check
 *  - Poll for results
 *  - Display similarity percentage with color coding
 *  - Show matched sources/passages
 *  - Prevent approval until plagiarism check is complete
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
import { useAuthStore } from '@/stores/authStore';
import { ROLES } from '@cms/shared';
const logger = console;

/**
 * @typedef {Object} PlagiarismMatch
 * @property {string} id
 * @property {string} title
 * @property {string} [url]
 * @property {string} [excerpt]
 * @property {number} similarity
 */

/**
 * @typedef {Object} PlagiarismResult
 * @property {PlagiarismMatch[]} [matchedSources]
 * @property {PlagiarismMatch[]} [text_matches]
 * @property {number} [originalityScore]
 * @property {number} [similarity_percentage]
 * @property {'queued'|'processing'|'pending'|'completed'|'failed'} status
 * @property {string} [processedAt]
 * @property {boolean} [warning_flag]
 */

const clampPercentage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['queued', 'processing', 'pending', 'completed', 'failed'].includes(normalized)) {
    return normalized;
  }
  return null;
};

const inferCorpusState = (resultPayload) => {
  const explicitCorpus =
    resultPayload?.corpus && typeof resultPayload.corpus === 'object' ? resultPayload.corpus : null;

  const reportSource = resultPayload?.fullReport ?? resultPayload;
  const report =
    reportSource && typeof reportSource === 'object'
      ? reportSource.rawData && typeof reportSource.rawData === 'object'
        ? reportSource.rawData
        : reportSource
      : null;

  const indexedAt = explicitCorpus?.indexedAt || report?.indexedAt || null;
  const removedFromCorpusAt =
    explicitCorpus?.removedFromCorpusAt || report?.removedFromCorpusAt || null;
  const indexedAtTs = indexedAt ? Date.parse(indexedAt) : NaN;
  const removedAtTs = removedFromCorpusAt ? Date.parse(removedFromCorpusAt) : NaN;

  let isIndexed = false;
  if (indexedAt && !removedFromCorpusAt) {
    isIndexed = true;
  } else if (indexedAt && removedFromCorpusAt) {
    if (!Number.isNaN(indexedAtTs) && !Number.isNaN(removedAtTs)) {
      isIndexed = indexedAtTs > removedAtTs;
    }
  }

  return {
    indexedAt,
    removedFromCorpusAt,
    isIndexed,
    known:
      typeof explicitCorpus?.known === 'boolean'
        ? explicitCorpus.known
        : Boolean(indexedAt || removedFromCorpusAt),
  };
};

const parseApiError = async (response, fallbackMessage) => {
  try {
    const payload = await response.json();
    return payload?.error?.message || payload?.message || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

/**
 * Color-coded similarity indicator
 * @param {number} percentage
 * @returns {string}
 */
const getSimilarityColor = (percentage) => {
  if (percentage < 15) return 'tw-text-green-600'; // Low similarity
  if (percentage < 30) return 'tw-text-yellow-600'; // Medium
  if (percentage < 50) return 'tw-text-orange-600'; // High
  return 'tw-text-red-600'; // Very high
};

/**
 * Background color for similarity card
 * @param {number} percentage
 * @returns {string}
 */
const getSimilarityBg = (percentage) => {
  if (percentage < 15) return 'tw-bg-green-50 tw-border-green-200';
  if (percentage < 30) return 'tw-bg-yellow-50 tw-border-yellow-200';
  if (percentage < 50) return 'tw-bg-orange-50 tw-border-orange-200';
  return 'tw-bg-red-50 tw-border-red-200';
};

/**
 * Main Component
 */
const PlagiarismChecker = ({
  submissionId,
  submissionTitle,
  onCheckComplete,
  onCheckStart,
  disabled = false,
  showMatchDetails = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [corpusActionError, setCorpusActionError] = useState('');
  const pollingRef = useRef(null);
  const userRole = useAuthStore((state) => state.user?.role);

  const canManageCorpus = userRole === ROLES.ADVISER || userRole === ROLES.INSTRUCTOR;
  const canSettleWithMock = canManageCorpus;

  // ───────────────────────────────────────────────────────────────────────
  // Fetch Current Plagiarism Result
  // ───────────────────────────────────────────────────────────────────────

  const {
    data: plagiarismResult,
    isLoading: _isLoadingResult,
    refetch: refetchResult,
  } = useQuery({
    queryKey: ['plagiarism', submissionId],
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/result`);
      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to fetch plagiarism result'));
      }
      const payload = await response.json();
      return payload?.data || payload;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Manual polling
  });

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(() => {
      refetchResult();
    }, 2000);
  }, [refetchResult]);

  const stopPolling = useCallback(() => {
    if (!pollingRef.current) return;
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // Trigger Plagiarism Check
  // ───────────────────────────────────────────────────────────────────────

  const { mutate: triggerCheck, isPending: isChecking } = useMutation({
    mutationFn: async (payload) => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to start plagiarism check'));
      }
      return response.json();
    },
    onSuccess: () => {
      logger.info(`Plagiarism check started for submission: ${submissionId}`);
      onCheckStart?.();
      startPolling();
    },
    onError: (error) => {
      logger.error(`Error starting plagiarism check: ${error.message}`);
    },
  });

  const { mutate: addToCorpus, isPending: isAddingToCorpus } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/index`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to add submission to corpus'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setCorpusActionError('');
      await refetchResult();
    },
    onError: (error) => {
      setCorpusActionError(error.message || 'Failed to add submission to corpus');
    },
  });

  const { mutate: removeFromCorpus, isPending: isRemovingFromCorpus } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/index`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response, 'Failed to remove submission from corpus'));
      }

      return response.json();
    },
    onSuccess: async () => {
      setCorpusActionError('');
      await refetchResult();
    },
    onError: (error) => {
      setCorpusActionError(error.message || 'Failed to remove submission from corpus');
    },
  });

  // ───────────────────────────────────────────────────────────────────────
  // Handle Check Complete
  // ───────────────────────────────────────────────────────────────────────

  const status = normalizeStatus(plagiarismResult?.status);

  useEffect(() => {
    if (status === 'queued' || status === 'processing' || status === 'pending') {
      startPolling();
    }

    if (status === 'completed' || status === 'failed') {
      stopPolling();
    }

    if (status === 'completed') {
      onCheckComplete?.(plagiarismResult);
    }
  }, [status, plagiarismResult, onCheckComplete, startPolling, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // ───────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────

  const handleTriggerCheck = useCallback(async () => {
    const detectedTitle =
      typeof plagiarismResult?.detectedTitle === 'string' ? plagiarismResult.detectedTitle : '';
    const detectedAbstract =
      typeof plagiarismResult?.detectedAbstract === 'string'
        ? plagiarismResult.detectedAbstract
        : '';

    triggerCheck({
      title: detectedTitle || submissionTitle || undefined,
      abstract: detectedAbstract || undefined,
    });
  }, [
    plagiarismResult?.detectedAbstract,
    plagiarismResult?.detectedTitle,
    submissionTitle,
    triggerCheck,
  ]);

  const handleSettleWithMock = useCallback(async () => {
    const detectedTitle =
      typeof plagiarismResult?.detectedTitle === 'string' ? plagiarismResult.detectedTitle : '';
    const detectedAbstract =
      typeof plagiarismResult?.detectedAbstract === 'string'
        ? plagiarismResult.detectedAbstract
        : '';

    triggerCheck({
      title: detectedTitle || submissionTitle || undefined,
      abstract: detectedAbstract || undefined,
      mode: 'mock',
    });
  }, [
    plagiarismResult?.detectedAbstract,
    plagiarismResult?.detectedTitle,
    submissionTitle,
    triggerCheck,
  ]);

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  const hasResult = status === 'completed';
  const hasFailed = status === 'failed';
  const isProcessing = isChecking || ['queued', 'processing', 'pending'].includes(status);
  const rawMode =
    plagiarismResult?.mode ||
    plagiarismResult?.fullReport?.mode ||
    plagiarismResult?.fullReport?.rawData?.mode ||
    null;
  const isMockResult = String(rawMode || '')
    .toLowerCase()
    .startsWith('mock');

  const directOriginality = clampPercentage(plagiarismResult?.originalityScore);
  const legacySimilarity = clampPercentage(plagiarismResult?.similarity_percentage);

  const originalityScore =
    directOriginality ??
    (legacySimilarity === null ? null : clampPercentage(100 - legacySimilarity));

  const similarityPercentage =
    originalityScore === null
      ? legacySimilarity || 0
      : clampPercentage(100 - originalityScore) || 0;

  const rawMatches = Array.isArray(plagiarismResult?.matchedSources)
    ? plagiarismResult.matchedSources
    : Array.isArray(plagiarismResult?.text_matches)
      ? plagiarismResult.text_matches
      : [];

  const textMatches = rawMatches.filter(Boolean).map((match, idx) => ({
    id: match.id || match.documentId || match.submissionId || `match-${idx}`,
    title: match.title || 'Untitled source',
    url: match.url || '',
    excerpt: match.excerpt || match.sourceSnippet || '',
    similarity: clampPercentage(match.similarity ?? match.matchPercentage) || 0,
  }));

  const matchCount = Number(textMatches?.length ?? 0);
  const warningFlag = Boolean(plagiarismResult?.warning_flag ?? plagiarismResult?.warningFlag);
  const checkedAt = plagiarismResult?.processedAt || plagiarismResult?.checked_at;
  const failureMessage = plagiarismResult?.error || 'Plagiarism check failed. Please try again.';
  const corpusState = inferCorpusState(plagiarismResult);
  const isIndexedInCorpus = corpusState.isIndexed;
  const isCorpusStateKnown = corpusState.known;
  const corpusActionPending = isAddingToCorpus || isRemovingFromCorpus;

  const handleAddToCorpus = useCallback(() => {
    setCorpusActionError('');
    addToCorpus();
  }, [addToCorpus]);

  const handleRemoveFromCorpus = useCallback(() => {
    setCorpusActionError('');
    removeFromCorpus();
  }, [removeFromCorpus]);

  return (
    <div className="tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-p-4 tw-mb-6">
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-text-xl tw-font-semibold tw-text-gray-900">🔍 Plagiarism Analysis</div>
          {hasResult && (
            <span className={`${getSimilarityColor(similarityPercentage)} tw-text-sm tw-font-bold`}>
              {similarityPercentage.toFixed(1)}% Similarity
            </span>
          )}
          {hasResult && isMockResult && (
            <span className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-px-2 tw-py-1 tw-rounded tw-bg-amber-100 tw-text-amber-800 tw-border tw-border-amber-300">
              Mock Result
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-border tw-border-gray-300 tw-rounded tw-bg-white hover:tw-bg-gray-50 tw-text-gray-700 tw-transition ${
            isExpanded ? 'tw-bg-gray-100' : ''
          }`}
          disabled={disabled}
        >
          {isExpanded ? '▼ Collapse' : '▶ Expand'}
        </button>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && hasResult && (
        <div className={`tw-p-3 tw-rounded tw-border ${getSimilarityBg(similarityPercentage)}`}>
          <p className="tw-text-sm tw-text-gray-700">
            Originality: <strong>{originalityScore?.toFixed(1) ?? '—'}%</strong>
            <span className="tw-ml-2">({similarityPercentage.toFixed(1)}% similarity)</span>
            {warningFlag && (
              <span className="tw-text-red-600 tw-font-semibold tw-ml-2">
                ⚠️ Warning: High Similarity
              </span>
            )}
          </p>
        </div>
      )}

      {!isExpanded && hasFailed && (
        <div className="tw-p-3 tw-rounded tw-border tw-bg-red-50 tw-border-red-200">
          <p className="tw-text-sm tw-text-red-700">
            Plagiarism check failed: <strong>{failureMessage}</strong>
          </p>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="tw-space-y-4">
          {/* Action Button */}
          {!hasResult && (
            <div className="tw-grid tw-gap-2 sm:tw-grid-cols-2">
              <button
                type="button"
                onClick={handleTriggerCheck}
                disabled={disabled || isChecking || isProcessing}
                className={`tw-w-full tw-px-4 tw-py-2 tw-font-medium tw-rounded tw-text-white tw-transition ${
                  disabled || isChecking || isProcessing
                    ? 'tw-bg-gray-400 tw-cursor-not-allowed'
                    : 'tw-bg-blue-600 hover:tw-bg-blue-700'
                }`}
              >
                {isProcessing
                  ? '⏳ Checking...'
                  : hasFailed
                    ? '🔁 Retry Plagiarism Check'
                    : '🚀 Start Plagiarism Check'}
              </button>

              <button
                type="button"
                onClick={handleSettleWithMock}
                disabled={disabled || isChecking || !canSettleWithMock}
                className={`tw-w-full tw-px-4 tw-py-2 tw-font-medium tw-rounded tw-transition ${
                  disabled || isChecking || !canSettleWithMock
                    ? 'tw-bg-gray-200 tw-text-gray-500 tw-cursor-not-allowed'
                    : 'tw-bg-amber-500 hover:tw-bg-amber-600 tw-text-white'
                }`}
                title={
                  canSettleWithMock
                    ? 'Settle now using a temporary mock originality score'
                    : 'Only advisers/instructors can settle with mock score'
                }
              >
                ⚡ Settle With Mock Score
              </button>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="tw-flex tw-items-center tw-gap-3 tw-p-4 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded">
              <div className="tw-animate-spin tw-w-5 tw-h-5 tw-border-2 tw-border-blue-600 tw-border-t-transparent tw-rounded-full" />
              <p className="tw-text-sm tw-text-blue-800">
                {status === 'queued'
                  ? 'Plagiarism check queued. Waiting for processing to start.'
                  : 'Analyzing submission for plagiarism... This may take a minute.'}
              </p>
            </div>
          )}

          {/* Failed State */}
          {hasFailed && (
            <div className="tw-p-4 tw-bg-red-50 tw-border tw-border-red-200 tw-rounded">
              <p className="tw-text-sm tw-font-semibold tw-text-red-800">Plagiarism check failed</p>
              <p className="tw-text-sm tw-text-red-700 tw-mt-1">{failureMessage}</p>
            </div>
          )}

          {/* Result Display */}
          {hasResult && (
            <div className={`tw-p-4 tw-rounded tw-border ${getSimilarityBg(similarityPercentage)}`}>
              {/* Similarity Percentage */}
              <div className="tw-mb-4">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                  <span className="tw-text-sm tw-font-semibold tw-text-gray-900">
                    Originality Score
                  </span>
                  <span
                    className={`tw-text-2xl tw-font-bold ${getSimilarityColor(similarityPercentage)}`}
                  >
                    {originalityScore?.toFixed(1) ?? '—'}%
                  </span>
                </div>

                <p className="tw-text-xs tw-text-gray-600 tw-mb-2">
                  Similarity equivalent: {similarityPercentage.toFixed(1)}%
                </p>

                {/* Progress Bar */}
                <div className="tw-w-full tw-bg-gray-300 tw-rounded-full tw-h-2 tw-overflow-hidden">
                  <div
                    className={`tw-h-full tw-transition-all ${
                      similarityPercentage < 15
                        ? 'tw-bg-green-600'
                        : similarityPercentage < 30
                          ? 'tw-bg-yellow-600'
                          : similarityPercentage < 50
                            ? 'tw-bg-orange-600'
                            : 'tw-bg-red-600'
                    }`}
                    style={{ width: `${Math.min(similarityPercentage, 100)}%` }}
                  />
                </div>

                {/* Guideline Text */}
                <p className="tw-text-xs tw-text-gray-600 tw-mt-2">
                  {similarityPercentage < 15 && '✓ Low similarity — likely original work'}
                  {similarityPercentage >= 15 &&
                    similarityPercentage < 30 &&
                    '⚠ Moderate similarity — review required'}
                  {similarityPercentage >= 30 &&
                    similarityPercentage < 50 &&
                    '⚠ High similarity — careful review needed'}
                  {similarityPercentage >= 50 && '🚨 Very high similarity — likely plagiarism'}
                </p>
              </div>

              {/* Warning Flag */}
              {warningFlag && (
                <div className="tw-p-3 tw-bg-red-100 tw-border tw-border-red-300 tw-rounded tw-mb-4">
                  <p className="tw-text-sm tw-font-semibold tw-text-red-800">
                    ⚠️ High Plagiarism Risk Detected
                  </p>
                  <p className="tw-text-xs tw-text-red-700 tw-mt-1">
                    This submission exceeds the acceptable similarity threshold and may require
                    rejection or revision request.
                  </p>
                </div>
              )}

              {/* Checked At */}
              {checkedAt && (
                <p className="tw-text-xs tw-text-gray-600">
                  Checked on {new Date(checkedAt).toLocaleString()}
                </p>
              )}

              {isMockResult && (
                <p className="tw-text-xs tw-font-medium tw-text-amber-800 tw-mt-2">
                  This result was generated in mock mode for temporary review unblock.
                </p>
              )}
            </div>
          )}

          {/* Faculty Corpus Controls */}
          {canManageCorpus && (
            <div className="tw-space-y-2 tw-p-3 tw-rounded tw-border tw-border-slate-200 tw-bg-slate-50">
              <p className="tw-text-sm tw-font-semibold tw-text-gray-900">Corpus Controls</p>
              <p className="tw-text-xs tw-text-gray-600">
                {isCorpusStateKnown && isIndexedInCorpus
                  ? 'This submission is currently part of the plagiarism corpus.'
                  : isCorpusStateKnown
                    ? 'This submission is currently not part of the plagiarism corpus.'
                    : 'Corpus membership status is currently unknown. You can re-index it to refresh state.'}
              </p>

              <div className="tw-flex tw-flex-wrap tw-gap-2">
                {isCorpusStateKnown && isIndexedInCorpus ? (
                  <button
                    type="button"
                    onClick={handleRemoveFromCorpus}
                    disabled={corpusActionPending}
                    className={`tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded tw-border tw-transition ${
                      corpusActionPending
                        ? 'tw-bg-gray-200 tw-border-gray-300 tw-text-gray-500 tw-cursor-not-allowed'
                        : 'tw-bg-white tw-border-red-300 tw-text-red-700 hover:tw-bg-red-50'
                    }`}
                  >
                    Remove from Corpus
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCorpus}
                    disabled={corpusActionPending}
                    className={`tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded tw-border tw-transition ${
                      corpusActionPending
                        ? 'tw-bg-gray-200 tw-border-gray-300 tw-text-gray-500 tw-cursor-not-allowed'
                        : 'tw-bg-white tw-border-blue-300 tw-text-blue-700 hover:tw-bg-blue-50'
                    }`}
                  >
                    Add to Corpus
                  </button>
                )}
              </div>

              {corpusState.indexedAt && (
                <p className="tw-text-xs tw-text-gray-600">
                  Indexed at: {new Date(corpusState.indexedAt).toLocaleString()}
                </p>
              )}
              {corpusState.removedFromCorpusAt && (
                <p className="tw-text-xs tw-text-gray-600">
                  Removed from corpus at:{' '}
                  {new Date(corpusState.removedFromCorpusAt).toLocaleString()}
                </p>
              )}
              {corpusActionError && (
                <p className="tw-text-xs tw-font-medium tw-text-red-700">{corpusActionError}</p>
              )}
            </div>
          )}

          {/* Matched Sources */}
          {hasResult && showMatchDetails && matchCount > 0 && (
            <div className="tw-space-y-2">
              <h4 className="tw-font-semibold tw-text-gray-900 tw-text-sm">
                Matched Sources ({matchCount})
              </h4>
              <div className="tw-space-y-2 tw-max-h-48 tw-overflow-y-auto">
                {textMatches.slice(0, 5).map((match) => {
                  const matchSimilarity = Number(match?.similarity ?? 0);

                  return (
                    <div
                      key={match.id}
                      className="tw-p-2 tw-bg-gray-100 tw-rounded tw-border tw-border-gray-200"
                    >
                      <div className="tw-flex tw-items-center tw-justify-between tw-mb-1">
                        <a
                          href={match.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tw-text-sm tw-font-medium tw-text-blue-600 hover:tw-underline tw-truncate"
                        >
                          {match.title}
                        </a>
                        <span className="tw-text-xs tw-font-bold tw-text-gray-700">
                          {matchSimilarity.toFixed(1)}%
                        </span>
                      </div>
                      {match.excerpt && (
                        <p className="tw-text-xs tw-text-gray-600 tw-italic tw-truncate">
                          &quot;{match.excerpt}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {matchCount > 5 && (
                <p className="tw-text-xs tw-text-gray-500">+{matchCount - 5} more matches</p>
              )}
            </div>
          )}

          {/* No Matches Message */}
          {hasResult && matchCount === 0 && (
            <div className="tw-p-3 tw-bg-green-50 tw-border tw-border-green-200 tw-rounded">
              <p className="tw-text-sm tw-text-green-800">
                ✓ No plagiarism detected. Submission appears to be original.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

PlagiarismChecker.propTypes = {
  submissionId: PropTypes.string.isRequired,
  submissionTitle: PropTypes.string.isRequired,
  onCheckComplete: PropTypes.func,
  onCheckStart: PropTypes.func,
  disabled: PropTypes.bool,
  showMatchDetails: PropTypes.bool,
};

export default React.memo(PlagiarismChecker);
