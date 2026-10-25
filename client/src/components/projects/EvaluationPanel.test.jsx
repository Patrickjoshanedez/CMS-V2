import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EvaluationPanel from './EvaluationPanel';
import { useAuthStore } from '@/stores/authStore';
import {
  useMyEvaluation,
  useProjectEvaluations,
  useUpdateEvaluation,
  useSubmitEvaluation,
  useUnlockEvaluation,
  useReleaseEvaluations,
} from '@/hooks/useEvaluations';

vi.mock('@/stores/authStore', () => ({ useAuthStore: vi.fn() }));
vi.mock('@/hooks/useEvaluations', () => ({
  useMyEvaluation: vi.fn(),
  useProjectEvaluations: vi.fn(),
  useUpdateEvaluation: vi.fn(),
  useSubmitEvaluation: vi.fn(),
  useUnlockEvaluation: vi.fn(),
  useReleaseEvaluations: vi.fn(),
}));

describe('EvaluationPanel committee-role resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.mockImplementation((selector) =>
      selector({ user: { role: 'faculty', facultyRole: null } }),
    );
    useUpdateEvaluation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useSubmitEvaluation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useUnlockEvaluation.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    useReleaseEvaluations.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('shows the rubric to an assigned faculty panelist whose account has no facultyRole', () => {
    useMyEvaluation.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        _id: 'evaluation-1',
        status: 'draft',
        decision: null,
        overallComment: '',
        totalScore: 0,
        maxTotalScore: 15,
        criteria: [
          { name: 'Problem Definition and Objectives', maxScore: 3, score: null, comment: '' },
        ],
      },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="proposal" />);

    expect(screen.getByText('Your Evaluation')).toBeInTheDocument();
    expect(screen.queryByText('Evaluation Summary')).not.toBeInTheDocument();
  });

  it('keeps non-panelist faculty on the summary when the panelist check is forbidden', () => {
    useMyEvaluation.mockReturnValue({
      isLoading: false,
      data: null,
      error: { response: { status: 403 }, message: 'Not assigned.' },
    });
    useProjectEvaluations.mockReturnValue({
      isLoading: false,
      error: null,
      data: { evaluations: [], summary: { totalPanelists: 0, submittedCount: 0 } },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="proposal" />);

    expect(screen.getByText('Evaluation Summary')).toBeInTheDocument();
    expect(screen.queryByText('Your Evaluation')).not.toBeInTheDocument();
  });

  it('requires confirmation before saving and submitting an evaluation', async () => {
    const saveEvaluation = vi.fn().mockResolvedValue({});
    const submitEvaluation = vi.fn().mockResolvedValue({});
    useUpdateEvaluation.mockReturnValue({ mutateAsync: saveEvaluation, isPending: false });
    useSubmitEvaluation.mockReturnValue({ mutateAsync: submitEvaluation, isPending: false });
    useMyEvaluation.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        _id: 'evaluation-1',
        status: 'draft',
        decision: null,
        overallComment: '',
        maxTotalScore: 3,
        criteria: [{ name: 'Problem Definition', maxScore: 3, score: null, comment: '' }],
      },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="proposal" />);
    fireEvent.click(screen.getByRole('button', { name: 'Submit Evaluation' }));

    const confirmation = screen.getByRole('alertdialog');
    expect(confirmation).toHaveTextContent('You cannot edit after submission.');
    expect(saveEvaluation).not.toHaveBeenCalled();
    expect(submitEvaluation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }));
    expect(saveEvaluation).not.toHaveBeenCalled();
    expect(submitEvaluation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Evaluation' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Submit Evaluation' }),
    );
    await waitFor(() => {
      expect(saveEvaluation).toHaveBeenCalledWith({
        evaluationId: 'evaluation-1',
        criteria: [{ name: 'Problem Definition', maxScore: 3, score: null, comment: '' }],
        overallComment: '',
        decision: null,
      });
      expect(submitEvaluation).toHaveBeenCalledWith('evaluation-1');
    });
  });

  it('keeps unreleased evaluation details hidden from students', () => {
    useAuthStore.mockImplementation((selector) => selector({ user: { role: 'student' } }));
    useProjectEvaluations.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        evaluations: [
          { _id: 'draft-evaluation', status: 'draft', criteria: [] },
          { _id: 'submitted-evaluation', status: 'submitted', criteria: [] },
        ],
        summary: { totalPanelists: 2 },
      },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="proposal" />);

    expect(screen.getByText('Grades Pending Panel Sign-Off')).toBeInTheDocument();
    expect(screen.queryByText('Evaluation Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Panelist')).not.toBeInTheDocument();
  });

  it('requires instructor confirmation before releasing completed evaluations', async () => {
    const releaseEvaluations = vi.fn().mockResolvedValue({});
    useAuthStore.mockImplementation((selector) => selector({ user: { role: 'instructor' } }));
    useReleaseEvaluations.mockReturnValue({ mutateAsync: releaseEvaluations, isPending: false });
    useProjectEvaluations.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        evaluations: [
          { _id: 'submitted-evaluation', status: 'submitted', criteria: [] },
          { _id: 'released-evaluation', status: 'released', criteria: [] },
        ],
        summary: { totalPanelists: 2, averageScore: 13, averageMaxScore: 15 },
      },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="final" />);
    fireEvent.click(screen.getByRole('button', { name: 'Release All Evaluations' }));

    const confirmation = screen.getByRole('alertdialog');
    expect(confirmation).toHaveTextContent('This cannot be undone.');
    expect(releaseEvaluations).not.toHaveBeenCalled();

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(releaseEvaluations).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Release All Evaluations' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Release evaluations',
      }),
    );

    await waitFor(() => {
      expect(releaseEvaluations).toHaveBeenCalledWith({
        projectId: 'project-1',
        defenseType: 'final',
      });
    });
  });

  it('keeps the release action disabled while any panelist has not submitted', () => {
    const releaseEvaluations = vi.fn();
    useAuthStore.mockImplementation((selector) => selector({ user: { role: 'instructor' } }));
    useReleaseEvaluations.mockReturnValue({ mutateAsync: releaseEvaluations, isPending: false });
    useProjectEvaluations.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        evaluations: [
          { _id: 'submitted-evaluation', status: 'submitted', criteria: [] },
          { _id: 'draft-evaluation', status: 'draft', criteria: [] },
        ],
        summary: { totalPanelists: 2 },
      },
    });

    render(<EvaluationPanel projectId="project-1" defenseType="final" />);

    expect(screen.getByRole('button', { name: 'Release All Evaluations' })).toBeDisabled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(releaseEvaluations).not.toHaveBeenCalled();
  });
});
