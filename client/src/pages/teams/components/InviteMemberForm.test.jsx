import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const teamHooks = vi.hoisted(() => ({
  useInviteCandidates: vi.fn(),
  useInviteMember: vi.fn(),
}));

vi.mock('@/hooks/useTeams', () => teamHooks);
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import InviteMemberForm from './InviteMemberForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function renderForm() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<InviteMemberForm teamId="team-1" />));
}

function setInputValue(input, value) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function waitForSearch() {
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 260)));
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('InviteMemberForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamHooks.useInviteCandidates.mockReturnValue({ data: [], isFetching: false });
    teamHooks.useInviteMember.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('selects an eligible candidate from the shared popover and submits the team invite', async () => {
    const candidate = {
      _id: 'student-1',
      fullName: 'Ava Student',
      email: 'ava@example.test',
      canInvite: true,
      warnings: [{ blocksInvite: false, message: 'Complete the team profile soon.' }],
    };
    const mutate = vi.fn();
    teamHooks.useInviteCandidates.mockImplementation((_teamId, query) => ({
      data: query.length >= 2 ? [candidate] : [],
      isFetching: false,
    }));
    teamHooks.useInviteMember.mockReturnValue({ mutate, isPending: false });
    renderForm();

    const input = container.querySelector('input');
    act(() => setInputValue(input, 'av'));
    await waitForSearch();

    expect(document.body.textContent).toContain('Complete the team profile soon.');
    const option = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent.includes(candidate.email),
    );
    expect(option).toBeDefined();
    act(() => option.click());
    act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(mutate).toHaveBeenCalledWith({ teamId: 'team-1', email: candidate.email });
  });

  it('keeps a blocking candidate from being invited and reports the institutional reason', async () => {
    const candidate = {
      _id: 'student-2',
      fullName: 'Ben Student',
      email: 'ben@example.test',
      canInvite: false,
      warnings: [{ blocksInvite: true, message: 'Complete your student profile first.' }],
    };
    const mutate = vi.fn();
    teamHooks.useInviteCandidates.mockImplementation((_teamId, query) => ({
      data: query.length >= 2 ? [candidate] : [],
      isFetching: false,
    }));
    teamHooks.useInviteMember.mockReturnValue({ mutate, isPending: false });
    renderForm();

    act(() => setInputValue(container.querySelector('input'), 'be'));
    await waitForSearch();
    const option = [...document.body.querySelectorAll('button')].find((button) =>
      button.textContent.includes(candidate.email),
    );
    act(() => option.click());
    act(() => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    expect(mutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Complete your student profile first.');
  });

  it('shows the generated invite code in the shared success alert after an invite succeeds', async () => {
    let mutationOptions;
    teamHooks.useInviteMember.mockImplementation((options) => {
      mutationOptions = options;
      return { mutate: vi.fn(), isPending: false };
    });
    renderForm();

    await act(async () =>
      mutationOptions.onSuccess({ data: { invite: { inviteCode: 'AB12CD' } } }),
    );

    expect(container.textContent).toContain('Invite sent! Share this code with your teammate:');
    expect(container.textContent).toContain('AB12CD');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });
});
