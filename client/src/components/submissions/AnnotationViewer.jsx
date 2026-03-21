/**
 * AnnotationViewer.jsx
 * Displays a single annotation with:
 * - Page reference
 * - Comment content
 * - Resolved status
 * - Author and timestamp
 */

import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';

const AnnotationViewer = ({ annotation, isExpanded, onToggle }) => {
  const resolvedBadgeClass = annotation.resolved
    ? 'tw-bg-green-100 tw-text-green-700'
    : 'tw-bg-yellow-100 tw-text-yellow-700';

  return (
    <div className="tw-border tw-border-gray-200 tw-rounded-lg tw-overflow-hidden">
      <button
        onClick={onToggle}
        className="tw-w-full tw-text-left tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-3 hover:tw-bg-gray-50 tw-transition-colors tw-bg-white"
      >
        <div className="tw-flex-1 tw-min-w-0">
          <div className="tw-flex tw-items-center tw-gap-3 tw-mb-1">
            <span className="tw-text-sm tw-font-medium tw-text-gray-700">
              Page {annotation.page}
            </span>
            <span className={`tw-text-xs tw-px-2 tw-py-1 tw-rounded-full ${resolvedBadgeClass}`}>
              {annotation.resolved ? '✓ Addressed' : 'Unresolved'}
            </span>
          </div>
          <p className="tw-text-sm tw-text-gray-600 tw-line-clamp-1">{annotation.content}</p>
        </div>
        <span className="tw-ml-2 tw-text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="tw-border-t tw-border-gray-200 tw-bg-gray-50 tw-p-4 tw-space-y-3">
          {annotation.highlightCoords && (
            <div className="tw-bg-white tw-rounded tw-p-3 tw-border tw-border-gray-200">
              <p className="tw-text-xs tw-text-gray-500 tw-mb-1">Highlighted Area</p>
              <p className="tw-text-sm tw-text-gray-700 tw-font-mono">
                {JSON.stringify(annotation.highlightCoords, null, 2)}
              </p>
            </div>
          )}

          <div className="tw-bg-white tw-rounded tw-p-4 tw-border tw-border-gray-200">
            <p className="tw-whitespace-pre-wrap tw-text-sm tw-text-gray-800">
              {annotation.content}
            </p>
          </div>

          <div className="tw-flex tw-justify-between tw-items-center tw-text-xs tw-text-gray-500 tw-pt-2 tw-border-t tw-border-gray-200">
            <span>
              Added {formatDistanceToNow(new Date(annotation.addedAt), { addSuffix: true })}
            </span>
            {annotation.resolved && <span className="tw-text-green-600">Marked as addressed</span>}
          </div>
        </div>
      )}
    </div>
  );
};

AnnotationViewer.propTypes = {
  annotation: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    page: PropTypes.number.isRequired,
    content: PropTypes.string.isRequired,
    highlightCoords: PropTypes.any,
    addedBy: PropTypes.string,
    addedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
    resolved: PropTypes.bool,
  }).isRequired,
  isExpanded: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

AnnotationViewer.defaultProps = {
  isExpanded: false,
};

export default AnnotationViewer;
