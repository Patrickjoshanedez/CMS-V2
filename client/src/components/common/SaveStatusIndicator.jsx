import React from 'react';
import PropTypes from 'prop-types';

/**
 * SaveStatusIndicator
 *
 * Reactive status chip reflecting current form persistence state:
 * - 'saving': Amber pulse indicator with "Saving..." text
 * - 'unsaved': Rose indicator with "Unsaved changes" text
 * - 'saved': Emerald indicator with "Draft (Auto-saved)" text
 */
export function SaveStatusIndicator({ status = 'saved', className = '' }) {
  if (status === 'saving') {
    return (
      <span
        data-testid="save-status-saving"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 transition-colors ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Saving...
      </span>
    );
  }

  if (status === 'unsaved') {
    return (
      <span
        data-testid="save-status-unsaved"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 transition-colors ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Unsaved changes
      </span>
    );
  }

  return (
    <span
      data-testid="save-status-saved"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 transition-colors ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Draft (Auto-saved)
    </span>
  );
}

SaveStatusIndicator.propTypes = {
  status: PropTypes.oneOf(['saved', 'saving', 'unsaved']),
  className: PropTypes.string,
};

export default SaveStatusIndicator;
