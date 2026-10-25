import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import ForgotPasswordPage from './ForgotPasswordPage';
import RegisterPage from './RegisterPage';
import ResetPasswordPage from './ResetPasswordPage';
import VerifyOtpPage from './VerifyOtpPage';

vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => null }));
vi.mock('react-google-recaptcha', () => ({ default: () => null }));

function RouteState() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}

function renderRoutes(initialEntries, routes) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>{routes}</Routes>
    </MemoryRouter>,
  );
}

describe('AuthPages', () => {
  let actions;
  let originalActions;

  beforeEach(() => {
    const state = useAuthStore.getState();
    originalActions = Object.fromEntries(
      [
        'forgotPassword',
        'register',
        'verifyOtp',
        'resendOtp',
        'resetPassword',
        'googleLogin',
        'clearError',
      ].map((key) => [key, state[key]]),
    );
    actions = {
      forgotPassword: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn().mockResolvedValue(undefined),
      resendOtp: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn().mockResolvedValue(undefined),
      googleLogin: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      sessionLoading: false,
    };
    useAuthStore.setState(actions);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    useAuthStore.setState(originalActions);
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      sessionLoading: false,
    });
  });

  it('keeps registration on identity step until required names are valid', async () => {
    renderRoutes(
      [{ pathname: '/register' }],
      [<Route key="register" path="/register" element={<RegisterPage />} />],
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Credentials' }));
    expect(await screen.findByText('First name must be at least 2 characters.')).toBeVisible();
    expect(await screen.findByText('Last name must be at least 2 characters.')).toBeVisible();
    expect(screen.getByText('Step 1 of 2')).toBeVisible();

    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Santos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Credentials' }));

    const credentialsHeading = await screen.findByText('2. Account Credentials');
    expect(credentialsHeading).toBeVisible();
    await waitFor(() => expect(credentialsHeading).toHaveFocus());
    expect(screen.getByText('Step 2 of 2')).toBeVisible();
    expect(screen.getByLabelText('Institutional Email *')).toBeVisible();
    expect(actions.register).not.toHaveBeenCalled();
  });

  it('validates recovery email before sending a code', async () => {
    renderRoutes(
      [{ pathname: '/forgot-password' }],
      [<Route key="forgot" path="/forgot-password" element={<ForgotPasswordPage />} />],
    );

    fireEvent.change(screen.getByLabelText('Institutional Email *'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(await screen.findByText('Please enter a valid email address.')).toBeVisible();
    expect(actions.forgotPassword).not.toHaveBeenCalled();
  });

  it('sends a recovery request and carries password-reset state to OTP verification', async () => {
    renderRoutes(
      [{ pathname: '/forgot-password' }],
      [
        <Route key="forgot" path="/forgot-password" element={<ForgotPasswordPage />} />,
        <Route key="verify" path="/verify-otp" element={<RouteState />} />,
      ],
    );

    fireEvent.change(screen.getByLabelText('Institutional Email *'), {
      target: { value: 'student@student.buksu.edu.ph' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset code' }));

    expect(
      await screen.findByText(/If an account with that email exists, a reset code has been sent/),
    ).toBeVisible();
    expect(actions.forgotPassword).toHaveBeenCalledWith({ email: 'student@student.buksu.edu.ph' });
    expect(screen.getByRole('button', { name: 'Send reset code' })).toBeDisabled();
    expect(await screen.findByText(/"type":"password_reset"/, {}, { timeout: 4000 })).toBeVisible();
  });

  it('verifies a pasted six-digit OTP and forwards the password-reset state', async () => {
    renderRoutes(
      [
        {
          pathname: '/verify-otp',
          state: { email: 'student@student.buksu.edu.ph', type: 'password_reset' },
        },
      ],
      [
        <Route key="verify" path="/verify-otp" element={<VerifyOtpPage />} />,
        <Route key="reset" path="/reset-password" element={<RouteState />} />,
      ],
    );

    const firstDigit = screen.getByLabelText('Verification code digit 1 of 6');
    for (let digit = 1; digit <= 6; digit += 1) {
      expect(screen.getByLabelText(`Verification code digit ${digit} of 6`)).toBeVisible();
    }

    fireEvent.paste(firstDigit, {
      clipboardData: { getData: () => '123456' },
    });

    expect(actions.verifyOtp).toHaveBeenCalledWith({
      email: 'student@student.buksu.edu.ph',
      code: '123456',
      type: 'password_reset',
    });
    expect(await screen.findByText(/"code":"123456"/)).toBeVisible();
    expect(screen.getByText(/"email":"student@student\.buksu\.edu\.ph"/)).toBeVisible();
  });

  it('redirects to recovery when reset-password route state is missing', async () => {
    renderRoutes(
      [{ pathname: '/reset-password' }],
      [
        <Route key="reset" path="/reset-password" element={<ResetPasswordPage />} />,
        <Route key="forgot" path="/forgot-password" element={<p>Recovery form</p>} />,
      ],
    );

    expect(await screen.findByText('Recovery form')).toBeVisible();
    expect(actions.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password with OTP route state before returning to sign in', async () => {
    renderRoutes(
      [
        {
          pathname: '/reset-password',
          state: { email: 'student@student.buksu.edu.ph', code: '123456' },
        },
      ],
      [
        <Route key="reset" path="/reset-password" element={<ResetPasswordPage />} />,
        <Route key="login" path="/login" element={<RouteState />} />,
      ],
    );

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() =>
      expect(actions.resetPassword).toHaveBeenCalledWith({
        email: 'student@student.buksu.edu.ph',
        newPassword: 'Password123',
      }),
    );
    expect(
      await screen.findByText(/Password reset successfully! You can now sign in./),
    ).toBeVisible();
  });
});
