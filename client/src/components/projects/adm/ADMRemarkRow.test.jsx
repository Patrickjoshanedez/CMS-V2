import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ADMRemarkRow from '@/components/projects/adm/ADMRemarkRow';

const createRowProps = (overrides = {}) => {
  const { row: rowOverrides = {}, ...otherOverrides } = overrides;
  return {
    row: {
      _id: 'row-1',
      panelName: 'Panel Alpha',
      suggestion: 'Clarify the evaluation criteria.',
      actionDone: 'Added the criteria table.',
      pageNumbers: '12',
      status: 'addressed',
      ...rowOverrides,
    },
    rowId: 'row-1',
    pageIdx: 1,
    totalPages: 3,
    canEditPanel: false,
    canEditSuggestion: false,
    canEditAction: false,
    canVerifyRow: true,
    canAddRow: true,
    isReadOnly: false,
    handleToggleFulfillment: vi.fn(),
    handleMoveRowUp: vi.fn(),
    handleMoveRowDown: vi.fn(),
    handleDeleteRow: vi.fn(),
    ...otherOverrides,
  };
};

describe('ADMRemarkRow shared controls', () => {
  it('provides a named verification checkbox and reports its changed state', () => {
    const props = createRowProps();
    render(
      <table>
        <tbody>
          <ADMRemarkRow {...props} />
        </tbody>
      </table>,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Verify fulfillment for Panel Alpha' });
    expect(checkbox).toHaveAttribute('aria-describedby', 'verification-status-row-1');
    expect(screen.getByText('Addressed — Pending Verification')).toBeInTheDocument();

    fireEvent.click(checkbox);

    expect(props.handleToggleFulfillment).toHaveBeenCalledWith('row-1', true);
  });

  it('exposes row allocation and deletion actions as named shared Buttons', () => {
    const props = createRowProps();
    render(
      <table>
        <tbody>
          <ADMRemarkRow {...props} />
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Panel Alpha to page 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Panel Alpha to page 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Panel Alpha' }));

    expect(props.handleMoveRowUp).toHaveBeenCalledWith('row-1', 1);
    expect(props.handleMoveRowDown).toHaveBeenCalledWith('row-1', 1);
    expect(props.handleDeleteRow).toHaveBeenCalledWith('row-1');
  });

  it('keeps verification disabled and removes deletion for a locked row', () => {
    render(
      <table>
        <tbody>
          <ADMRemarkRow
            {...createRowProps({
              row: { isLocked: true },
              canVerifyRow: false,
              isReadOnly: false,
            })}
          />
        </tbody>
      </table>,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Verify fulfillment for Panel Alpha' }),
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Delete Panel Alpha' })).not.toBeInTheDocument();
  });
});
