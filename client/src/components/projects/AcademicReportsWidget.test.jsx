import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicReportsWidget from './AcademicReportsWidget';

const { mockUseArchiveProject, mockMutate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUseArchiveProject: vi.fn(),
  mockMutate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/hooks/useProjects', () => ({ useArchiveProject: mockUseArchiveProject }));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

const project = {
  _id: 'project-123',
  title: 'Accessible Capstone Portal',
  academicYear: '2026–2027',
  courseId: { name: 'BSIT' },
  evaluations: [],
};

describe('AcademicReportsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArchiveProject.mockImplementation((options) => ({
      mutate: mockMutate,
      isPending: false,
      options,
    }));
  });

  it('opens an accessible evaluation dialog and supports close and Escape', () => {
    render(<AcademicReportsWidget project={project} />);

    expect(screen.getByText('Not checked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Archive Capstone/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Evaluation Report/ }));

    const dialog = screen.getByRole('dialog', { name: 'Official Defense Evaluation Report' });
    expect(within(dialog).getByText('Accessible Capstone Portal')).toBeInTheDocument();
    expect(
      within(dialog).getByText('No individual panel evaluations recorded yet.'),
    ).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Official Defense Evaluation Report' }),
    ).not.toBeInTheDocument();
  });

  it('reports similarity policy status from the latest score', () => {
    render(
      <AcademicReportsWidget
        project={{
          ...project,
          plagiarismResult: { overallSimilarityScore: 31 },
        }}
      />,
    );

    expect(screen.getByText('31% similarity')).toHaveClass('bg-destructive');
    fireEvent.click(screen.getByRole('button', { name: /Plagiarism Report/ }));

    const dialog = screen.getByRole('dialog', {
      name: 'Academic Plagiarism & Integrity Report',
    });
    expect(within(dialog).getByText('Review required (> 25%)')).toBeInTheDocument();
    expect(within(dialog).getByText('31%')).toBeInTheDocument();
  });

  it('renders panel evaluation details and treats the 25% threshold as within policy', () => {
    render(
      <AcademicReportsWidget
        project={{
          ...project,
          evaluations: [
            {
              _id: 'evaluation-1',
              panelistId: { firstName: 'Maria', lastName: 'Santos' },
              score: 92,
              remarks: 'Clarify the system boundary in Chapter 3.',
            },
          ],
          plagiarismResult: { overallSimilarityScore: 25 },
        }}
      />,
    );

    expect(screen.getByText('25% similarity')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Evaluation Report/ }));
    const evaluationDialog = screen.getByRole('dialog', {
      name: 'Official Defense Evaluation Report',
    });
    expect(within(evaluationDialog).getByText('Maria Santos')).toBeInTheDocument();
    expect(within(evaluationDialog).getByText('Score: 92%')).toBeInTheDocument();
    expect(evaluationDialog.textContent).toContain('Clarify the system boundary in Chapter 3.');

    fireEvent.click(within(evaluationDialog).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: /Plagiarism Report/ }));
    const plagiarismDialog = screen.getByRole('dialog', {
      name: 'Academic Plagiarism & Integrity Report',
    });
    expect(within(plagiarismDialog).getByText('Within Policy (≤ 25%)')).toBeInTheDocument();
  });

  it('requires an accessible archive confirmation and preserves the archive payload', () => {
    const onArchived = vi.fn();
    render(<AcademicReportsWidget project={project} canManageArchive onArchived={onArchived} />);

    fireEvent.click(screen.getByRole('button', { name: /Archive Capstone/ }));
    const confirmation = screen.getByRole('alertdialog', {
      name: 'Archive this capstone project?',
    });
    expect(within(confirmation).getByText(/read-only archive mode \(FRINS2\)/)).toBeInTheDocument();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Archive Capstone/ }));
    const secondConfirmation = screen.getByRole('alertdialog');
    fireEvent.click(within(secondConfirmation).getByRole('button', { name: 'Archive project' }));

    expect(mockMutate).toHaveBeenCalledWith({
      projectId: 'project-123',
      reason: 'Archived via Instructor Academic Reports panel',
    });

    const { options } = mockUseArchiveProject.mock.results.at(-1).value;
    options.onSuccess();
    expect(mockToastSuccess).toHaveBeenCalledWith('Capstone project successfully archived.');
    expect(onArchived).toHaveBeenCalledOnce();
  });
});
