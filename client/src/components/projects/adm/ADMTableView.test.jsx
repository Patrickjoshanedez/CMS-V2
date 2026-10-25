import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ADMTableView from './ADMTableView';

const defaultProps = {
  pageRows: [],
  displayedRows: [],
  pageIdx: 0,
  totalPages: 1,
};

describe('ADMTableView shared table controls', () => {
  it('keeps the institutional table headings and student-specific empty state', () => {
    render(<ADMTableView {...defaultProps} isCurrentUserStudent />);

    expect(
      screen.getByRole('region', { name: 'Action Done Matrix recommendations table' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name of Panel' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Suggestion of the Panel(s)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action Taken' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Page Number/s' })).toBeInTheDocument();
    expect(
      screen.getByText('No recommendations recorded yet by the defense committee or panel.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Panelist Row' })).not.toBeInTheDocument();
  });

  it('adds a row to the current sheet through the shared Button when permitted', () => {
    const handleAddRowToPage = vi.fn();
    render(
      <ADMTableView
        {...defaultProps}
        pageIdx={2}
        canAddRow
        handleAddRowToPage={handleAddRowToPage}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Panelist Row' }));

    expect(handleAddRowToPage).toHaveBeenCalledOnce();
    expect(handleAddRowToPage).toHaveBeenCalledWith(2);
  });

  it('uses the semantic muted foreground token for the screen-only helper text', () => {
    render(<ADMTableView {...defaultProps} />);

    expect(screen.getByText('Tables dynamically allocate space as you type.')).toHaveClass(
      'text-paper-muted',
    );
  });
});
