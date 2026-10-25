import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChangePasswordForm from './ChangePasswordForm';

const mocks = vi.hoisted(() => ({
  user: null,
  navigate: vi.fn(),
  clearAuthState: vi.fn(),
  changePassword: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) =>
    selector({ user: mocks.user, clearAuthState: mocks.clearAuthState }),
}));

vi.mock('@/services/authService', () => ({
  authService: { changePassword: (...args) => mocks.changePassword(...args) },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));

vi.mock('sonner', () => ({
  toast: { success: (...args) => mocks.toastSuccess(...args), error: (...args) => mocks.toastError(...args) },
}));

describe('ChangePasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { _id: 'user-1', authProvider: 'local', password: 'stored-hash' };
  });

  afterEach(() => cleanup());

  it('uses shared fields and accessible controls when the form is opened', () => {
    render(<ChangePasswordForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));

    const currentPassword = screen.getByLabelText('Current Password *');
    expect(currentPassword.getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show current password' }));
    expect(currentPassword.getAttribute('type')).toBe('text');
    expect(screen.getByLabelText('New Password *').getAttribute('type')).toBe('password');
    expect(screen.getByLabelText('Confirm New Password *').getAttribute('type')).toBe('password');
  });

  it('rejects mismatched passwords without calling the password service', () => {
    render(<ChangePasswordForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    fireEvent.change(screen.getByLabelText('Current Password *'), {
      target: { value: 'current-test-password' },
    });
    fireEvent.change(screen.getByLabelText('New Password *'), {
      target: { value: 'NewPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password *'), {
      target: { value: 'DifferentPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toContain(
      'New password and confirmation do not match.',
    );
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });

  it('explains that Google-only accounts cannot change their password here', () => {
    mocks.user = { _id: 'user-1', authProvider: 'google', password: null };
    render(<ChangePasswordForm />);

    expect(screen.getByText('Google Account')).toBeTruthy();
    expect(screen.getByText(/uses Google sign-in/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Change' })).toBeNull();
  });
});
