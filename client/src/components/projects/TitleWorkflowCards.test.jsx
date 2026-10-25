import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TITLE_STATUSES } from '@cms/shared';
import TitleActionsSection, {
  PanelistsPendingCard,
  TitlePendingCard,
  WorkflowPrerequisiteBanner,
} from './TitleWorkflowCards';

const mockMutate = vi.fn();

vi.mock('@/hooks/useProjects', () => ({
  useUpdateTitle: () => ({ mutate: mockMutate, isPending: false }),
  useSubmitTitle: () => ({ mutate: mockMutate, isPending: false }),
  useReviseAndResubmit: () => ({ mutate: mockMutate, isPending: false }),
  useRequestTitleModification: () => ({ mutate: mockMutate, isPending: false }),
}));

afterEach(() => {
  cleanup();
  mockMutate.mockClear();
});

const project = (titleStatus, overrides = {}) => ({
  _id: 'project-1',
  title: 'A Capstone Project Title',
  titleStatus,
  ...overrides,
});

function renderInRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TitleWorkflowCards shared UI states', () => {
  it('keeps proposal selection routed through the provided callback', () => {
    const onSelectProposal = vi.fn();
    renderInRouter(
      <TitleActionsSection
        project={project(TITLE_STATUSES.SUBMITTED, {
          titleProposals: ['Proposal A', { title: 'Proposal B' }],
        })}
        onSelectProposal={onSelectProposal}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Proposal 2: Proposal B' }));

    expect(onSelectProposal).toHaveBeenCalledWith(1);
    expect(screen.getByText('Proposals Submitted Successfully')).toBeInTheDocument();
  });

  it('preserves the approved title modification disclosure and fields', () => {
    renderInRouter(<TitleActionsSection project={project(TITLE_STATUSES.APPROVED)} />);

    fireEvent.click(screen.getByRole('button', { name: /request title modification/i }));

    expect(screen.getByLabelText('Proposed New Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Justification')).toBeInTheDocument();
  });

  it('uses the shared semantic status surfaces and retains the chapter lock route action', () => {
    const { container } = renderInRouter(
      <TitlePendingCard titleStatus={TITLE_STATUSES.REVISION_REQUIRED} />,
    );

    expect(screen.getByText('Title Revision Required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open title approval studio/i })).toBeInTheDocument();
    expect(container.querySelector('.border-destructive\\/30')).toBeTruthy();
  });

  it('shows completion for submitted proposals and hides the prerequisite banner only when approved', () => {
    const { rerender } = renderInRouter(
      <WorkflowPrerequisiteBanner titleStatus={TITLE_STATUSES.SUBMITTED} />,
    );

    expect(screen.getByText('Complete These Steps to Unlock Chapters')).toBeInTheDocument();
    expect(screen.getByText('Submit Title')).toHaveClass('text-success-foreground');
    expect(screen.getByText('Get Approved')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <WorkflowPrerequisiteBanner titleStatus={TITLE_STATUSES.APPROVED} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Complete These Steps to Unlock Chapters')).not.toBeInTheDocument();
  });

  it('keeps the panelist assignment waiting message intact', () => {
    render(<PanelistsPendingCard />);

    expect(screen.getByText('Title Approved')).toBeInTheDocument();
    expect(screen.getByText(/waiting for the instructor to assign panelists/i)).toBeInTheDocument();
  });
});
