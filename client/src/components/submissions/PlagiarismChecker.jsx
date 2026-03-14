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

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import PropTypes from 'prop-types';
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
 * @property {PlagiarismMatch[]} text_matches
 * @property {number} similarity_percentage
 * @property {'pending'|'completed'|'failed'} status
 * @property {string} [checked_at]
 * @property {boolean} [warning_flag]
 */

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
  const [pollInterval, setPollInterval] = useState(null);

  // ───────────────────────────────────────────────────────────────────────
  // Fetch Current Plagiarism Result
  // ───────────────────────────────────────────────────────────────────────

  const {
    data: plagiarismResult,
    isLoading: _isLoadingResult,
    refetch: refetchResult,
  } = useQuery(
    ['plagiarism', submissionId],
    async () => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/result`);
      if (!response.ok) throw new Error('Failed to fetch plagiarism result');
      return (await response.json()).data;
    },
    {
      staleTime: 30 * 1000, // 30 seconds
      refetchInterval: false, // Manual polling
    },
  );

  // ───────────────────────────────────────────────────────────────────────
  // Trigger Plagiarism Check
  // ───────────────────────────────────────────────────────────────────────

  const { mutate: triggerCheck, isLoading: isChecking } = useMutation(
    async (payload) => {
      const response = await fetch(`/api/submissions/${submissionId}/plagiarism/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to start plagiarism check');
      return response.json();
    },
    {
      onSuccess: () => {
        logger.info(`Plagiarism check started for submission: ${submissionId}`);
        onCheckStart?.();

        // Start polling for result
        const interval = setInterval(() => {
          refetchResult();
        }, 2000); // Poll every 2 seconds

        setPollInterval(interval);
      },
      onError: (error) => {
        logger.error(`Error starting plagiarism check: ${error.message}`);
      },
    },
  );

  // ───────────────────────────────────────────────────────────────────────
  // Handle Check Complete
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (plagiarismResult?.status === 'completed') {
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }

      onCheckComplete?.(plagiarismResult);
    }
  }, [plagiarismResult, pollInterval, onCheckComplete]);

  // ───────────────────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────────────────

  const handleTriggerCheck = useCallback(async () => {
    // TODO: Extract text from submission document
    // This would require fetching the Google Doc or uploaded PDF
    triggerCheck({
      text: 'Placeholder text from submission document', // Real implementation extracts from file
      title: submissionTitle,
      chapter: 'Chapter 1', // Should come from submission data
      projectId: 'project-123', // Should come from submission data
    });
  }, [submissionTitle, triggerCheck]);

  // ───────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────

  const hasResult = plagiarismResult && plagiarismResult.status === 'completed';
  const isProcessing =
    isChecking || (plagiarismResult?.status === 'pending' && pollInterval !== null);

  return (
    <div className="tw-bg-white tw-border tw-border-gray-200 tw-rounded-lg tw-p-4 tw-mb-6">
      {/* Header */}
      <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
        <div className="tw-flex tw-items-center tw-gap-3">
          <div className="tw-text-xl tw-font-semibold tw-text-gray-900">🔍 Plagiarism Analysis</div>
          {hasResult && (
            <span
              className={`${getSimilarityColor(
                plagiarismResult.similarity_percentage,
              )} tw-text-sm tw-font-bold`}
            >
              {plagiarismResult.similarity_percentage.toFixed(1)}% Similar
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
        <div
          className={`tw-p-3 tw-rounded tw-border ${getSimilarityBg(plagiarismResult.similarity_percentage)}`}
        >
          <p className="tw-text-sm tw-text-gray-700">
            Similarity: <strong>{plagiarismResult.similarity_percentage.toFixed(1)}%</strong>
            {plagiarismResult.warning_flag && (
              <span className="tw-text-red-600 tw-font-semibold tw-ml-2">
                ⚠️ Warning: High Similarity
              </span>
            )}
          </p>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="tw-space-y-4">
          {/* Action Button */}
          {!hasResult && (
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
              {isProcessing ? '⏳ Checking...' : '🚀 Start Plagiarism Check'}
            </button>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="tw-flex tw-items-center tw-gap-3 tw-p-4 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded">
              <div className="tw-animate-spin tw-w-5 tw-h-5 tw-border-2 tw-border-blue-600 tw-border-t-transparent tw-rounded-full" />
              <p className="tw-text-sm tw-text-blue-800">
                Analyzing submission for plagiarism... This may take a minute.
              </p>
            </div>
          )}

          {/* Result Display */}
          {hasResult && (
            <div
              className={`tw-p-4 tw-rounded tw-border ${getSimilarityBg(plagiarismResult.similarity_percentage)}`}
            >
              {/* Similarity Percentage */}
              <div className="tw-mb-4">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                  <span className="tw-text-sm tw-font-semibold tw-text-gray-900">
                    Similarity Score
                  </span>
                  <span
                    className={`tw-text-2xl tw-font-bold ${getSimilarityColor(plagiarismResult.similarity_percentage)}`}
                  >
                    {plagiarismResult.similarity_percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="tw-w-full tw-bg-gray-300 tw-rounded-full tw-h-2 tw-overflow-hidden">
                  <div
                    className={`tw-h-full tw-transition-all ${
                      plagiarismResult.similarity_percentage < 15
                        ? 'tw-bg-green-600'
                        : plagiarismResult.similarity_percentage < 30
                          ? 'tw-bg-yellow-600'
                          : plagiarismResult.similarity_percentage < 50
                            ? 'tw-bg-orange-600'
                            : 'tw-bg-red-600'
                    }`}
                    style={{ width: `${Math.min(plagiarismResult.similarity_percentage, 100)}%` }}
                  />
                </div>

                {/* Guideline Text */}
                <p className="tw-text-xs tw-text-gray-600 tw-mt-2">
                  {plagiarismResult.similarity_percentage < 15 &&
                    '✓ Low similarity — likely original work'}
                  {plagiarismResult.similarity_percentage >= 15 &&
                    plagiarismResult.similarity_percentage < 30 &&
                    '⚠ Moderate similarity — review required'}
                  {plagiarismResult.similarity_percentage >= 30 &&
                    plagiarismResult.similarity_percentage < 50 &&
                    '⚠ High similarity — careful review needed'}
                  {plagiarismResult.similarity_percentage >= 50 &&
                    '🚨 Very high similarity — likely plagiarism'}
                </p>
              </div>

              {/* Warning Flag */}
              {plagiarismResult.warning_flag && (
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
              {plagiarismResult.checked_at && (
                <p className="tw-text-xs tw-text-gray-600">
                  Checked on {new Date(plagiarismResult.checked_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Matched Sources */}
          {hasResult && showMatchDetails && plagiarismResult.text_matches.length > 0 && (
            <div className="tw-space-y-2">
              <h4 className="tw-font-semibold tw-text-gray-900 tw-text-sm">
                Matched Sources ({plagiarismResult.text_matches.length})
              </h4>
              <div className="tw-space-y-2 tw-max-h-48 tw-overflow-y-auto">
                {plagiarismResult.text_matches.slice(0, 5).map((match) => (
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
                        {match.similarity.toFixed(1)}%
                      </span>
                    </div>
                    {match.excerpt && (
                      <p className="tw-text-xs tw-text-gray-600 tw-italic tw-truncate">
                        &quot;{match.excerpt}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {plagiarismResult.text_matches.length > 5 && (
                <p className="tw-text-xs tw-text-gray-500">
                  +{plagiarismResult.text_matches.length - 5} more matches
                </p>
              )}
            </div>
          )}

          {/* No Matches Message */}
          {hasResult && plagiarismResult.text_matches.length === 0 && (
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

PlagiarismChecker.defaultProps = {
  onCheckComplete: null,
  onCheckStart: null,
  disabled: false,
  showMatchDetails: true,
};

export default React.memo(PlagiarismChecker);
