import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActionDoneMatrixSection from './ActionDoneMatrixSection';

vi.mock('./ActionDoneMatrixTab', () => ({
  default: ({ initialMilestone }) => <div data-testid="adm-tab">{initialMilestone}</div>,
}));

const project = { capstonePhase: 2, actionDoneMatrix: [] };

describe('ActionDoneMatrixSection shadcn presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the inline expand/collapse state and the milestone summary', () => {
    render(<ActionDoneMatrixSection project={project} milestone="CAPSTONE_2" />);

    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(screen.getByText(/Official BukSU Form RU-F-033/)).toBeInTheDocument();
    expect(screen.queryByTestId('adm-tab')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand ADM Matrix' }));
    expect(screen.getByTestId('adm-tab')).toHaveTextContent('CAPSTONE_2');

    fireEvent.click(screen.getByRole('button', { name: 'Collapse ADM Matrix' }));
    expect(screen.queryByTestId('adm-tab')).not.toBeInTheDocument();
  });

  it('uses the shared dialog semantics and closes through the named action', async () => {
    const onModalOpenChange = vi.fn();
    render(
      <ActionDoneMatrixSection
        project={project}
        milestone="CAPSTONE_2"
        onModalOpenChange={onModalOpenChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View ADM' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(/Official BukSU Form RU-F-033/)).toBeInTheDocument();
    expect(within(dialog).getByTestId('adm-tab')).toHaveTextContent('CAPSTONE_2');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close ADM Dialog' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onModalOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports close intent without overriding a controlled modal state', async () => {
    const onModalOpenChange = vi.fn();
    render(
      <ActionDoneMatrixSection
        project={project}
        milestone="CAPSTONE_2"
        isModalOpen
        onModalOpenChange={onModalOpenChange}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close ADM Dialog' }));

    expect(onModalOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal on Escape through the shared Dialog behavior', async () => {
    render(<ActionDoneMatrixSection project={project} milestone="CAPSTONE_2" />);
    fireEvent.click(screen.getByRole('button', { name: 'View ADM' }));
    await screen.findByRole('dialog');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
