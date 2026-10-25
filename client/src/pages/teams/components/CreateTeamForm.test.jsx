import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const teamHooks = vi.hoisted(() => ({
  useCreateTeamInviteCandidates: vi.fn(),
  useInviteMember: vi.fn(),
  useBulkInviteMembers: vi.fn(),
  useCreateTeam: vi.fn(),
}));

vi.mock('@/hooks/useTeams', () => teamHooks);

import CreateTeamForm from './CreateTeamForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function renderForm() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<CreateTeamForm onCancel={vi.fn()} />));
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('CreateTeamForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamHooks.useCreateTeamInviteCandidates.mockReturnValue({ data: [], isFetching: false });
    teamHooks.useInviteMember.mockReturnValue({ mutate: vi.fn(), isPending: false });
    teamHooks.useBulkInviteMembers.mockReturnValue({ mutate: vi.fn(), isPending: false });
    teamHooks.useCreateTeam.mockReturnValue({ mutate: vi.fn(), isPending: false, error: null });
  });

  it('submits a trimmed team name through the shared form controls', () => {
    const mutate = vi.fn();
    teamHooks.useCreateTeam.mockReturnValue({ mutate, isPending: false, error: null });
    renderForm();

    const nameInput = container.querySelector('#teamName');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
        nameInput,
        '  Research Group  ',
      );
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(mutate).toHaveBeenCalledWith({ name: 'Research Group' });
  });

  it('announces creation errors and disables form actions while pending', () => {
    teamHooks.useCreateTeam.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: { response: { data: { error: { message: 'Team name is unavailable.' } } } },
    });
    renderForm();

    expect(container.querySelector('[role="alert"]').textContent).toContain('Team name is unavailable.');
    expect(container.querySelector('#teamName').disabled).toBe(true);
    expect(container.querySelector('#createTeamInvite').disabled).toBe(true);
    expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
  });

  it('stages a searched classmate and removes them with shared popover and button controls', async () => {
    teamHooks.useCreateTeamInviteCandidates.mockImplementation((query) => ({
      data:
        query.length >= 2
          ? [{ _id: 'student-1', fullName: 'Ava Student', email: 'ava@example.test' }]
          : [],
      isFetching: false,
    }));
    renderForm();

    const inviteInput = container.querySelector('#createTeamInvite');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(
        inviteInput,
        'av',
      );
      inviteInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 260)));

    expect(document.body.textContent).toContain('ava@example.test');
    const candidate = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent.includes('ava@example.test'),
    );
    expect(candidate).toBeDefined();
    act(() => candidate.click());
    expect(container.textContent).toContain('Ava Student');

    const removeButton = document.body.querySelector('[aria-label="Remove Ava Student"]');
    expect(removeButton).not.toBeNull();
    act(() => removeButton.click());
    expect(container.textContent).not.toContain('Ava Student');
  });
});
