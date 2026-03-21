/**
 * FeedbackDashboard.jsx
 * Phase 1: Student Feedback Enhancement
 *
 * Displays:
 * - Review timeline (who reviewed, when, deadline)
 * - Annotations/feedback (with page reference, highlight)
 * - Unresolved comments count
 * - Version history link
 * - Plagiarism score
 *
 * Props: submissionId, projectId, chapter
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import AnnotationViewer from './AnnotationViewer';
import VersionHistory from './VersionHistory';
import { submissionService } from '../../services';

const FeedbackDashboard = ({ submissionId, projectId, chapter }) => {
  const [expandedAnnotations, setExpandedAnnotations] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Fetch feedback data
  const {
    data: feedbackData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['submissionFeedback', submissionId],
    queryFn: () => submissionService.getSubmissionFeedback(submissionId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const feedback = feedbackData?.data?.feedback;

  // Calculate display values
  const isOverdue = feedback?.daysRemaining !== null && feedback?.daysRemaining < 0;
  const daysDisplay = feedback?.daysRemaining !== null ? Math.abs(feedback.daysRemaining) : null;
  const deadlineStatus =
    feedback?.daysRemaining === null
      ? 'No deadline'
      : isOverdue
        ? `${daysDisplay} days overdue`
        : `${daysDisplay} days remaining`;

  // Loading state
  if (isLoading) {
    return (
      <div className="tw-bg-white tw-rounded-lg tw-shadow-sm tw-p-6 tw-border tw-border-gray-200">
        <div className="tw-flex tw-items-center tw-justify-center tw-h-64">
          <div className="tw-animate-spin tw-rounded-full tw-h-12 tw-w-12 tw-border-b-2 tw-border-blue-500" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-p-4">
        <div className="tw-flex tw-items-start tw-gap-3">
          <span className="tw-text-red-600 tw-text-2xl">⚠️</span>
          <div>
            <h3 className="tw-font-semibold tw-text-red-800">Failed to load feedback</h3>
            <p className="tw-text-red-700 tw-text-sm tw-mt-1">{error?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!feedback) {
    return (
      <div className="tw-bg-gray-50 tw-border tw-border-gray-200 tw-rounded-lg tw-p-8 tw-text-center">
        <p className="tw-text-gray-500">No feedback available yet</p>
      </div>
    );
  }

  return (
    <div className="tw-space-y-6">
      {/* Review Timeline Card */}
      <div className="tw-bg-white tw-rounded-lg tw-shadow-sm tw-border tw-border-gray-200 tw-p-6">
        <h2 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">Review Timeline</h2>

        <div className="tw-space-y-4">
          {/* Submitted */}
          <div className="tw-flex tw-gap-4">
            <div className="tw-flex tw-flex-col tw-items-center">
              <div className="tw-w-8 tw-h-8 tw-bg-green-100 tw-border-2 tw-border-green-500 tw-rounded-full tw-flex tw-items-center tw-justify-center">
                <span className="tw-text-green-600">✓</span>
              </div>
            </div>
            <div className="tw-flex-1">
              <p className="tw-font-medium tw-text-gray-900">Submitted</p>
              <p className="tw-text-sm tw-text-gray-500">
                {format(new Date(feedback.submittedAt), 'MMM dd, yyyy h:mm aa')}
              </p>
              <p className="tw-text-xs tw-text-gray-400 tw-mt-1">
                {formatDistanceToNow(new Date(feedback.submittedAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {/* Reviewed */}
          {feedback.reviewedAt && (
            <div className="tw-flex tw-gap-4">
              <div className="tw-flex tw-flex-col tw-items-center">
                <div className="tw-w-8 tw-h-8 tw-bg-blue-100 tw-border-2 tw-border-blue-500 tw-rounded-full tw-flex tw-items-center tw-justify-center">
                  <span className="tw-text-blue-600">✓</span>
                </div>
              </div>
              <div className="tw-flex-1">
                <p className="tw-font-medium tw-text-gray-900">Reviewed</p>
                <p className="tw-text-sm tw-text-gray-500">
                  {format(new Date(feedback.reviewedAt), 'MMM dd, yyyy h:mm aa')}
                </p>
                <p className="tw-text-xs tw-text-gray-400 tw-mt-1">
                  {formatDistanceToNow(new Date(feedback.reviewedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}

          {/* Deadline */}
          {feedback.revisionDeadline && (
            <div className="tw-flex tw-gap-4">
              <div className="tw-flex tw-flex-col tw-items-center">
                <div
                  className={`tw-w-8 tw-h-8 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-border-2 ${
                    isOverdue
                      ? 'tw-bg-red-100 tw-border-red-500'
                      : 'tw-bg-yellow-100 tw-border-yellow-500'
                  }`}
                >
                  <span className={isOverdue ? 'tw-text-red-600' : 'tw-text-yellow-600'}>📅</span>
                </div>
              </div>
              <div className="tw-flex-1">
                <p className="tw-font-medium tw-text-gray-900">Revision Deadline</p>
                <p className="tw-text-sm tw-text-gray-500">
                  {format(new Date(feedback.revisionDeadline), 'MMM dd, yyyy')}
                </p>
                <p
                  className={`tw-text-sm tw-font-medium tw-mt-1 ${
                    isOverdue ? 'tw-text-red-600' : 'tw-text-amber-600'
                  }`}
                >
                  {deadlineStatus}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Annotations/Feedback Card */}
      <div className="tw-bg-white tw-rounded-lg tw-shadow-sm tw-border tw-border-gray-200 tw-p-6">
        <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
          <h2 className="tw-text-lg tw-font-semibold tw-text-gray-900">Feedback & Comments</h2>
          <span className="tw-inline-block tw-bg-blue-100 tw-text-blue-700 tw-px-3 tw-py-1 tw-rounded-full tw-text-sm tw-font-medium">
            {feedback.annotations.length} comments
          </span>
        </div>

        {feedback.unaddressedCount > 0 && (
          <div className="tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-rounded tw-p-3 tw-mb-4">
            <p className="tw-text-sm tw-text-yellow-800">
              <strong>{feedback.unaddressedCount}</strong> unresolved comment
              {feedback.unaddressedCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="tw-space-y-3">
          {feedback.annotations.length === 0 ? (
            <p className="tw-text-gray-500 tw-text-center tw-py-8">No feedback yet</p>
          ) : (
            feedback.annotations.map((annotation) => (
              <AnnotationViewer
                key={annotation._id}
                annotation={annotation}
                isExpanded={expandedAnnotations === annotation._id}
                onToggle={() =>
                  setExpandedAnnotations(
                    expandedAnnotations === annotation._id ? null : annotation._id,
                  )
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Plagiarism Score Card */}
      {feedback.plagiarism.status !== 'not_checked' && (
        <div className="tw-bg-white tw-rounded-lg tw-shadow-sm tw-border tw-border-gray-200 tw-p-6">
          <h2 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">
            Originality Check
          </h2>
          <div className="tw-flex tw-items-center tw-gap-4">
            <div className="tw-flex-1">
              <p className="tw-text-sm tw-text-gray-600">Matching Content</p>
              <p className="tw-text-3xl tw-font-bold tw-text-gray-900">
                {feedback.plagiarism.score}%
              </p>
            </div>
            <div
              className={`tw-w-24 tw-h-24 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-white tw-text-center tw-font-bold ${
                feedback.plagiarism.score < 20
                  ? 'tw-bg-green-500'
                  : feedback.plagiarism.score < 50
                    ? 'tw-bg-yellow-500'
                    : 'tw-bg-red-500'
              }`}
            >
              {feedback.plagiarism.score > 0 ? `${feedback.plagiarism.score}%` : 'Checking...'}
            </div>
          </div>
        </div>
      )}

      {/* Version History Button */}
      <div className="tw-bg-white tw-rounded-lg tw-shadow-sm tw-border tw-border-gray-200 tw-p-6">
        <button
          onClick={() => setShowVersionHistory(!showVersionHistory)}
          className="tw-w-full tw-text-left tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-bg-gray-50 hover:tw-bg-gray-100 tw-rounded tw-border tw-border-gray-200 tw-transition-colors"
        >
          <span className="tw-font-medium tw-text-gray-900">📁 View Version History</span>
          <span className="tw-text-gray-500">{showVersionHistory ? '▼' : '▶'}</span>
        </button>

        {showVersionHistory && (
          <div className="tw-mt-4">
            <VersionHistory submissionId={submissionId} />
          </div>
        )}
      </div>
    </div>
  );
};

FeedbackDashboard.propTypes = {
  submissionId: PropTypes.string.isRequired,
  projectId: PropTypes.string.isRequired,
  chapter: PropTypes.oneOf(['1', '2', '3']),
};

FeedbackDashboard.defaultProps = {
  chapter: undefined,
};

export default FeedbackDashboard;
