import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcceptInviteForm from './AcceptInviteForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { mockFetchUser, mockMutate, mockUseAcceptInvite, mockToastError, mockToastSuccess } =
  vi.hoisted(() => ({
    mockFetchUser: vi.fn(),
    mockMutate: vi.fn(),
    mockUseAcceptInvite: vi.fn(),
    mockToastError: vi.fn(),
    mockToastSuccess: vi.fn(),
  }));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ fetchUser: mockFetchUser }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useAcceptInvite: (...args) => mockUseAcceptInvite(...args),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}));

describe('AcceptInviteForm', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAcceptInvite.mockReturnValue({ mutate: mockMutate, isPending: false, error: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    act(() => {
      root.render(<AcceptInviteForm {...props} />);
    });
  };

  const submit = () => {
    act(() => {
      container.querySelector('button[type="submit"]').click();
    });
  };

  const cleanup = () => {
    act(() => root.unmount());
    container.remove();
  };

  it('uses labeled shared inputs and submits a normalized six-character invite code', () => {
    renderComponent({ initialToken: 'ab12x9' });

    const inputs = container.querySelectorAll('input[aria-label^="Invite code character"]');
    expect(inputs).toHaveLength(6);
    expect(inputs[0].value).toBe('A');
    expect(inputs[5].value).toBe('9');
    expect(container.querySelector('button[type="submit"]').disabled).toBe(false);

    submit();
    expect(mockMutate).toHaveBeenCalledWith('AB12X9');

    cleanup();
  });

  it('submits a full invite URL through the same acceptance mutation', () => {
    const token = 'https://cms.example/teams/invites/abc123/accept';
    renderComponent({ initialToken: token });

    expect(container.textContent).toContain('Invite link detected');
    expect(container.textContent).toContain(token);
    expect(container.querySelectorAll('input[aria-label^="Invite code character"]')).toHaveLength(0);

    submit();
    expect(mockMutate).toHaveBeenCalledWith(token);

    cleanup();
  });

  it('renders server errors through the shared destructive alert', () => {
    mockUseAcceptInvite.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: { response: { data: { error: { message: 'This invite has expired.' } } } },
    });
    renderComponent();

    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).toContain('This invite has expired.');

    cleanup();
  });

  it('uses the shared busy button and disables code fields while joining', () => {
    mockUseAcceptInvite.mockReturnValue({ mutate: mockMutate, isPending: true, error: null });
    renderComponent({ initialToken: 'ABC123' });

    const submitButton = container.querySelector('button[type="submit"]');
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('input[aria-label="Invite code character 1 of 6"]').disabled).toBe(
      true,
    );

    cleanup();
  });
});
