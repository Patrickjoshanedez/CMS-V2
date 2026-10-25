import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SUBMISSION_STATUSES } from '@cms/shared';
import SubmissionStatusBadge from './SubmissionStatusBadge';

const statusExpectations = [
  [SUBMISSION_STATUSES.PENDING, 'Pending', 'bg-warning/10'],
  [SUBMISSION_STATUSES.PENDING_STUDENT_UPLOAD, 'Pending Student Upload', 'border-input'],
  [SUBMISSION_STATUSES.PENDING_INSTRUCTOR_REVIEW, 'Pending Instructor Review', 'bg-warning/10'],
  [SUBMISSION_STATUSES.UNDER_REVIEW, 'Under Review', 'bg-info/10'],
  [SUBMISSION_STATUSES.APPROVED, 'Approved', 'bg-success/10'],
  [SUBMISSION_STATUSES.ACCEPTED, 'Accepted', 'bg-success/10'],
  [SUBMISSION_STATUSES.REVISIONS_REQUIRED, 'Revisions Required', 'bg-warning/10'],
  [SUBMISSION_STATUSES.REJECTED, 'Rejected', 'bg-destructive'],
  [SUBMISSION_STATUSES.LOCKED, 'Approved', 'bg-success/10'],
];

describe('SubmissionStatusBadge', () => {
  it.each(statusExpectations)(
    'maps %s to its institutional label and semantic variant',
    (status, label, variantClass) => {
      render(<SubmissionStatusBadge status={status} />);

      const badge = screen.getByText(label);
      expect(badge).toHaveClass(variantClass);
    },
  );

  it('keeps an unknown status visible with the outline variant', () => {
    render(<SubmissionStatusBadge status="future_status" />);

    expect(screen.getByText('future_status')).toHaveClass('border');
  });
});
