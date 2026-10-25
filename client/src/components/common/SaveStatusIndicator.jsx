import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from '@/components/ui/Badge';

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
      <Badge
        data-testid="save-status-saving"
        variant="warning"
        className={`gap-1.5 rounded-full px-2.5 py-1 ${className}`}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
        Saving...
      </Badge>
    );
  }

  if (status === 'unsaved') {
    return (
      <Badge
        data-testid="save-status-unsaved"
        variant="destructive"
        className={`gap-1.5 rounded-full px-2.5 py-1 ${className}`}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Unsaved changes
      </Badge>
    );
  }

  return (
    <Badge
      data-testid="save-status-saved"
      variant="success"
      className={`gap-1.5 rounded-full px-2.5 py-1 ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
      Draft (Auto-saved)
    </Badge>
  );
}

SaveStatusIndicator.propTypes = {
  status: PropTypes.oneOf(['saved', 'saving', 'unsaved']),
  className: PropTypes.string,
};

export default SaveStatusIndicator;
