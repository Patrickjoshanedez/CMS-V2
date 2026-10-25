import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PLAGIARISM_STATUSES } from '@cms/shared';
import OriginalityBadge from './OriginalityBadge';

describe('OriginalityBadge', () => {
  it('renders nothing before a check has a status', () => {
    const { container } = render(<OriginalityBadge />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces queued and processing states accessibly', () => {
    const { rerender } = render(
      <OriginalityBadge plagiarismResult={{ status: PLAGIARISM_STATUSES.QUEUED }} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Originality: Queued');

    rerender(<OriginalityBadge plagiarismResult={{ status: PLAGIARISM_STATUSES.PROCESSING }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking…');
    expect(screen.getByRole('status').parentElement).toHaveClass('bg-info/10');
  });

  it.each([
    [80, 'success', '80% Original'],
    [60, 'warning', '60% Original'],
    [59, 'destructive', '59% Original'],
  ])('maps score %i to the %s variant', (score, variant, label) => {
    render(
      <OriginalityBadge plagiarismResult={{ status: PLAGIARISM_STATUSES.COMPLETED, score }} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(label);
    expect(screen.getByRole('status').parentElement).toHaveClass(
      variant === 'success'
        ? 'bg-success/10'
        : variant === 'warning'
          ? 'bg-warning/10'
          : 'bg-destructive',
    );
  });

  it('shows a shared destructive status for failed checks', () => {
    render(<OriginalityBadge plagiarismResult={{ status: PLAGIARISM_STATUSES.FAILED }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Check Failed');
    expect(screen.getByRole('status').parentElement).toHaveClass('bg-destructive');
  });
});
