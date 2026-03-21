/**
 * VersionHistory.jsx
 * Displays all versions (upload history) for a submission.
 * Shows version number, date, status, plagiarism score.
 * Allows comparing two versions side-by-side (with VersionCompare).
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import VersionCompare from './VersionCompare';
import { submissionService } from '../../services';

const VersionHistory = ({ submissionId }) => {
  const [selectedVersions, setSelectedVersions] = useState([null, null]);
  const [showCompare, setShowCompare] = useState(false);

  // Fetch version history
  const {
    data: versionsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['submissionVersions', submissionId],
    queryFn: () => submissionService.getSubmissionVersions(submissionId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const versions = versionsData?.data?.versions || [];

  if (isLoading) {
    return (
      <div className="tw-flex tw-items-center tw-justify-center tw-py-8">
        <div className="tw-animate-spin tw-rounded-full tw-h-8 tw-w-8 tw-border-b-2 tw-border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded tw-p-3">
        <p className="tw-text-sm tw-text-red-700">Failed to load version history</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="tw-text-center tw-py-8">
        <p className="tw-text-gray-500">No previous versions</p>
      </div>
    );
  }

  const handleSelectVersion = (index, version) => {
    const newSelected = [...selectedVersions];
    newSelected[index] = version;
    setSelectedVersions(newSelected);
  };

  const canCompare = selectedVersions[0] && selectedVersions[1];

  return (
    <div className="tw-space-y-4">
      {/* Version List */}
      <div className="tw-space-y-2">
        <h3 className="tw-font-medium tw-text-gray-900 tw-mb-3">All Versions</h3>
        {versions.map((version, idx) => (
          <div
            key={version._id}
            className={`tw-border tw-rounded-lg tw-p-4 tw-transition-colors ${
              selectedVersions.includes(version._id)
                ? 'tw-border-blue-500 tw-bg-blue-50'
                : 'tw-border-gray-200 tw-bg-white hover:tw-bg-gray-50'
            }`}
          >
            <div className="tw-flex tw-items-start tw-justify-between">
              <div className="tw-flex-1">
                <div className="tw-flex tw-items-center tw-gap-2 tw-mb-2">
                  <span className="tw-font-medium tw-text-gray-900">v{version.version}</span>
                  {idx === 0 && (
                    <span className="tw-text-xs tw-bg-blue-100 tw-text-blue-700 tw-px-2 tw-py-1 tw-rounded">
                      Latest
                    </span>
                  )}
                  <span className="tw-text-xs tw-bg-gray-100 tw-text-gray-600 tw-px-2 tw-py-1 tw-rounded">
                    {version.status}
                  </span>
                </div>

                <p className="tw-text-sm tw-text-gray-600 tw-mb-2">
                  {format(new Date(version.submittedAt), 'MMM dd, yyyy h:mm aa')}
                </p>

                {version.plagiarismScore !== null && (
                  <p className="tw-text-sm tw-text-gray-600">
                    Originality: <strong>{version.plagiarismScore}%</strong>
                  </p>
                )}

                {version.reviewNote && (
                  <p className="tw-text-sm tw-text-gray-600 tw-mt-2 tw-italic">
                    &ldquo;{version.reviewNote}&rdquo;
                  </p>
                )}
              </div>

              {/* Checkbox for comparison */}
              <input
                type="checkbox"
                checked={selectedVersions.includes(version._id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    const emptyIndex = selectedVersions.findIndex((v) => !v);
                    if (emptyIndex !== -1) {
                      handleSelectVersion(emptyIndex, version._id);
                    }
                  } else {
                    const newSelected = selectedVersions.map((v) => (v === version._id ? null : v));
                    setSelectedVersions(newSelected);
                  }
                }}
                className="tw-w-5 tw-h-5 tw-text-blue-600 tw-rounded tw-cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Compare Button */}
      {canCompare && (
        <button
          onClick={() => setShowCompare(true)}
          className="tw-w-full tw-bg-blue-600 hover:tw-bg-blue-700 tw-text-white tw-py-2 tw-px-4 tw-rounded-lg tw-font-medium tw-transition-colors"
        >
          Compare Selected Versions
        </button>
      )}

      {/* Version Compare Modal/View */}
      {showCompare && canCompare && (
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
          <div className="tw-bg-white tw-rounded-lg tw-w-full tw-max-w-6xl tw-max-h-96 tw-flex tw-flex-col">
            <div className="tw-flex tw-justify-between tw-items-center tw-px-6 tw-py-4 tw-border-b tw-border-gray-200">
              <h2 className="tw-text-lg tw-font-semibold tw-text-gray-900">Compare Versions</h2>
              <button
                onClick={() => setShowCompare(false)}
                className="tw-text-gray-400 hover:tw-text-gray-600 tw-text-2xl"
              >
                ×
              </button>
            </div>

            <div className="tw-flex-1 tw-overflow-y-auto">
              <VersionCompare
                submissionId={submissionId}
                version1Id={selectedVersions[0]}
                version2Id={selectedVersions[1]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

VersionHistory.propTypes = {
  submissionId: PropTypes.string.isRequired,
};

export default VersionHistory;
