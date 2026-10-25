import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import LoginPage from './LoginPage';

vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }));
vi.mock('react-google-recaptcha', () => ({ default: () => null }));

const renderLoginPage = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard reached</p>} />
      </Routes>
    </MemoryRouter>,
  );

const fillCredentials = () => {
  fireEvent.change(screen.getByLabelText('Email *'), {
    target: { value: 'student@example.edu' },
  });
  fireEvent.change(screen.getByLabelText('Password *'), {
    target: { value: 'ValidPassword123!' },
  });
};

describe('LoginPage', () => {
  let loginRequest;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      sessionLoading: false,
    });
    loginRequest = vi.spyOn(authService, 'login');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      sessionLoading: false,
    });
  });

  it('announces required email and password errors without submitting', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Please enter a valid email address.')).toBeVisible();
    expect(await screen.findByText('Password is required.')).toBeVisible();
    expect(loginRequest).not.toHaveBeenCalled();
  });

  it('locks the submit action while login is pending and navigates on success', async () => {
    let resolveLogin;
    loginRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    renderLoginPage();
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const loadingButton = await screen.findByRole('button', { name: 'Signing in…' });
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loginRequest).toHaveBeenCalledWith({
      email: 'student@example.edu',
      password: 'ValidPassword123!',
    });

    await act(async () => {
      resolveLogin({ data: { data: { user: { _id: 'login-fixture', role: 'student' } } } });
    });

    expect(await screen.findByText('Dashboard reached')).toBeVisible();
  });

  it('shows a server authentication error in an accessible alert', async () => {
    loginRequest.mockRejectedValue({
      response: { data: { error: { code: 'INVALID_CREDENTIALS' } } },
    });
    renderLoginPage();
    fillCredentials();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText('Dashboard reached')).not.toBeInTheDocument();
  });

  it('toggles password visibility with an accessible control', () => {
    renderLoginPage();
    const password = screen.getByLabelText('Password *');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeVisible();
  });
});
