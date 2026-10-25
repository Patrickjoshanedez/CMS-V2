import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PLAGIARISM_STATUSES } from '@cms/shared';
import PlagiarismReport from './PlagiarismReport';

describe('PlagiarismReport', () => {
  it('shows a skeleton while the report is loading', () => {
    render(<PlagiarismReport isLoading />);

    expect(screen.getByText('Loading plagiarism check results…')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Originality Report' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Originality Report' }).closest('.card'),
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('explains when no originality check is available', () => {
    render(<PlagiarismReport />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Results will appear here after the document has been checked.',
    );
  });

  it.each([PLAGIARISM_STATUSES.QUEUED, PLAGIARISM_STATUSES.PROCESSING])(
    'announces the %s state accessibly',
    (status) => {
      render(<PlagiarismReport plagiarismResult={{ status }} />);

      expect(screen.getByRole('status')).toHaveTextContent(status);
    },
  );

  it('renders the score band and matched-source table without changing source order', () => {
    render(
      <PlagiarismReport
        plagiarismResult={{
          status: PLAGIARISM_STATUSES.COMPLETED,
          score: 42,
          matchedSources: [
            { sourceId: 'source-a', title: 'First Source', matchPercentage: 28.5 },
            { sourceId: 'source-b', title: 'Second Source', matchPercentage: 15 },
          ],
        }}
      />,
    );

    expect(screen.getByText('Low Originality — Review Needed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getAllByText('First Source')).toHaveLength(2);
    expect(screen.getAllByText('Second Source')).toHaveLength(2);
    expect(screen.getByText('28.5%')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('shows a clear failure message when the check fails', () => {
    render(<PlagiarismReport plagiarismResult={{ status: PLAGIARISM_STATUSES.FAILED }} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The system could not process this document.',
    );
  });
});
