/**
 * VersionCompare.jsx
 * Side-by-side comparison of two submission versions.
 * Shows metadata changes, and provides split-screen viewer for documents.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';

const VersionCompare = ({ submissionId, version1Id, version2Id }) => {
  // In a full implementation, this would:
  // 1. Fetch both version documents via API
  // 2. Use a diff library to highlight changes
  // 3. Render split-screen PDF/document viewer
  // 4. Show metadata comparison table

  const comparisons = [
    { label: 'Submission Date', v1: 'Mar 15, 2024', v2: 'Mar 20, 2024', changed: true },
    { label: 'Size', v1: '2.3 MB', v2: '2.1 MB', changed: false },
    { label: 'Plagiarism Score', v1: '15%', v2: '8%', changed: true },
    { label: 'Status', v1: 'Revisions Required', v2: 'Under Review', changed: true },
  ];

  return (
    <div className="tw-p-6 tw-space-y-6">
      {/* Metadata Comparison */}
      <div className="tw-bg-gray-50 tw-rounded-lg tw-overflow-hidden">
        <table className="tw-w-full">
          <thead className="tw-bg-gray-200 tw-border-b tw-border-gray-300">
            <tr>
              <th className="tw-text-left tw-px-4 tw-py-3 tw-font-semibold tw-text-gray-900">
                Property
              </th>
              <th className="tw-text-left tw-px-4 tw-py-3 tw-font-semibold tw-text-gray-900">
                Version 1
              </th>
              <th className="tw-text-left tw-px-4 tw-py-3 tw-font-semibold tw-text-gray-900">
                Version 2
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, idx) => (
              <tr
                key={row.label}
                className={`tw-border-b tw-border-gray-200 ${
                  idx % 2 === 0 ? 'tw-bg-white' : 'tw-bg-gray-50'
                } ${row.changed ? 'tw-bg-yellow-50' : ''}`}
              >
                <td className="tw-px-4 tw-py-3 tw-font-medium tw-text-gray-900">{row.label}</td>
                <td className="tw-px-4 tw-py-3 tw-text-gray-700">{row.v1}</td>
                <td className="tw-px-4 tw-py-3 tw-text-gray-700">
                  {row.changed ? (
                    <span className="tw-font-semibold tw-text-blue-600">{row.v2}</span>
                  ) : (
                    row.v2
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Document Viewer Placeholder */}
      <div className="tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-p-6">
        <h3 className="tw-font-semibold tw-text-gray-900 tw-mb-4">Document Comparison</h3>
        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
          <div className="tw-bg-gray-100 tw-rounded tw-h-96 tw-flex tw-items-center tw-justify-center">
            <p className="tw-text-center tw-text-gray-500">
              Version 1<br />
              <span className="tw-text-sm">(PDF Viewer)</span>
            </p>
          </div>
          <div className="tw-bg-gray-100 tw-rounded tw-h-96 tw-flex tw-items-center tw-justify-center">
            <p className="tw-text-center tw-text-gray-500">
              Version 2<br />
              <span className="tw-text-sm">(PDF Viewer)</span>
            </p>
          </div>
        </div>
        <p className="tw-text-xs tw-text-gray-500 tw-mt-3">
          Integration with PDF.js or Google Docs viewer would render documents here.
        </p>
      </div>

      {/* Changes Summary */}
      <div className="tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-lg tw-p-4">
        <p className="tw-text-sm tw-text-blue-900">
          <strong>Summary:</strong> 3 properties changed between versions. Plagiarism score improved
          by 7%.
        </p>
      </div>
    </div>
  );
};

VersionCompare.propTypes = {
  submissionId: PropTypes.string.isRequired,
  version1Id: PropTypes.string.isRequired,
  version2Id: PropTypes.string.isRequired,
};

export default VersionCompare;
