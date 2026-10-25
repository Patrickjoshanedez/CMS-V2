import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsultationLogWidget from './ConsultationLogWidget';

const { toast } = vi.hoisted(() => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('sonner', () => ({ toast }));

describe('ConsultationLogWidget shared controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes labeled consultation fields and preserves the student submission state', () => {
    render(<ConsultationLogWidget isStudent />);

    const openForm = screen.getByRole('button', { name: 'Log Consultation' });
    expect(openForm).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(openForm);

    expect(screen.getAllByRole('button', { name: 'Cancel' })[0]).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByLabelText('Meeting Date')).toBeRequired();
    expect(screen.getByLabelText('Discussion Topic / Milestone')).toBeRequired();
    expect(screen.getByLabelText('Agreed Action Items & Next Deliverables')).toBeRequired();
    expect(screen.queryByRole('button', { name: 'Sign & Verify Session' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Discussion Topic / Milestone'), {
      target: { value: 'Review Chapter 2 revisions' },
    });
    fireEvent.change(screen.getByLabelText('Agreed Action Items & Next Deliverables'), {
      target: { value: 'Add recent local studies to the synthesis.' },
    });
    fireEvent.submit(document.getElementById('consultation-log-form'));

    expect(screen.getByText(/Review Chapter 2 revisions/)).toBeInTheDocument();
    expect(screen.getByText('Pending Sign-off')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Consultation meeting record logged.');
  });

  it('creates adviser entries as signed and keeps sign-off status semantic', () => {
    render(<ConsultationLogWidget isAdviser />);
    fireEvent.click(screen.getByRole('button', { name: 'Log Consultation' }));
    fireEvent.change(screen.getByLabelText('Discussion Topic / Milestone'), {
      target: { value: 'Approve Chapter 3 methodology' },
    });
    fireEvent.change(screen.getByLabelText('Agreed Action Items & Next Deliverables'), {
      target: { value: 'Proceed with the approved instrument.' },
    });
    fireEvent.submit(document.getElementById('consultation-log-form'));

    expect(screen.getByText(/Approve Chapter 3 methodology/)).toBeInTheDocument();
    expect(screen.getAllByText('Signed by Adviser')).toHaveLength(3);
    expect(toast.success).toHaveBeenCalledWith('Consultation meeting record logged.');
  });
});
