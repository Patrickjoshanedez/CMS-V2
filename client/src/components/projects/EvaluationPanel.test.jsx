import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
