import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationTemplateBuilderPage from './EvaluationTemplateBuilderPage';

const mocks = vi.hoisted(() => ({
  useTemplates: vi.fn(),
  save: vi.fn(),
  archive: vi.fn(),
}));

vi.mock('@/hooks/useEvaluations', () => ({
  useEvaluationTemplates: (...args) => mocks.useTemplates(...args),
  useSaveEvaluationTemplate: () => ({ mutate: mocks.save, isPending: false }),
  useDeleteEvaluationTemplate: () => ({ mutate: mocks.archive, isPending: false }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const configuredTemplate = {
  _id: 'template-proposal-1',
  name: 'Proposal Rubric',
  description: 'Standard capstone proposal assessment',
  defenseType: 'proposal',
  isDefault: true,
  criteria: [
    { name: 'Problem formulation', maxScore: 40, description: 'Clear problem scope' },
    { name: 'Methodology', maxScore: 60, description: 'Sound approach' },
  ],
};

describe('EvaluationTemplateBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.ResizeObserver ??= class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    Element.prototype.scrollIntoView ??= vi.fn();
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.setPointerCapture ??= vi.fn();
    Element.prototype.releasePointerCapture ??= vi.fn();
    mocks.useTemplates.mockReturnValue({ data: [], isLoading: false });
  });

  it('announces loading templates with shared skeleton placeholders', () => {
    mocks.useTemplates.mockReturnValue({ data: [], isLoading: true });
    render(<EvaluationTemplateBuilderPage />);

    expect(screen.getByRole('status', { name: 'Loading evaluation templates' })).toBeTruthy();
    expect(screen.getByText('Evaluation Rubric Builder')).toBeTruthy();
  });

  it('switches the configured rubric list by defense phase', () => {
    render(<EvaluationTemplateBuilderPage />);
    const finalFilter = screen.getByRole('button', { name: 'Final Defense Rubrics' });

    fireEvent.click(finalFilter);

    expect(finalFilter.getAttribute('aria-pressed')).toBe('true');
    expect(mocks.useTemplates).toHaveBeenLastCalledWith('final');
  });

  it('preserves the rubric creation payload and scoring criteria', async () => {
    render(<EvaluationTemplateBuilderPage />);
    fireEvent.change(screen.getByLabelText('Template Name *'), {
      target: { value: 'Final Defense Rubric 2026' },
    });
    await fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Defense Phase' }), {
      button: 0,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Final Defense' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Evaluation Template' }));

    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Final Defense Rubric 2026',
        defenseType: 'final',
        isDefault: false,
        criteria: expect.arrayContaining([
          expect.objectContaining({ name: 'Problem Formulation & Objectives', maxScore: 25 }),
        ]),
      }),
    );
  });

  it('requires confirmation before archiving a rubric and preserves cancel behavior', () => {
    mocks.useTemplates.mockReturnValue({ data: [configuredTemplate], isLoading: false });
    render(<EvaluationTemplateBuilderPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Archive Proposal Rubric' }));
    expect(screen.getByRole('alertdialog').textContent).toContain('Proposal Rubric');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mocks.archive).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Archive Proposal Rubric' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive Template' }));
    expect(mocks.archive).toHaveBeenCalledWith('template-proposal-1');
  });
});
