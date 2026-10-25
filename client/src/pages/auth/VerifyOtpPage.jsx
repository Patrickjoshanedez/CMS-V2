import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';

import AuthLayout from '@/components/layouts/AuthLayout';
import AuthStatusAlert from '@/components/auth/AuthStatusAlert';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

const OTP_LENGTH = 6;

/**
 * VerifyOtpPage — 6-digit OTP input page.
 * Expects { email, type } in route state from registration or forgot-password flow.
 */
export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp, loading, error, clearError } = useAuthStore();

  const email = location.state?.email;
  const type = location.state?.type || 'verification';

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const inputRefs = useRef([]);

  // Start resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus the first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if no email provided (user landed here directly)
  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (index, value) => {
    // Only single digits allowed
    if (value && !/^\d$/.test(value)) return;

    clearError();
    setSuccessMessage('');

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits filled
    if (newOtp.every((digit) => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, event) => {
    // Backspace: go to previous input
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, OTP_LENGTH).split('');
    const newOtp = Array(OTP_LENGTH).fill('');
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    // Focus the next empty or the last input
    const nextEmpty = newOtp.findIndex((d) => d === '');
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();

    // Auto-submit if all digits are filled
    if (newOtp.every((digit) => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code) => {
    try {
      await verifyOtp({ email, code, type });

      if (type === 'verification') {
        // Account verified — redirect to login
        navigate('/login', {
          state: { message: 'Account verified! You can now sign in.' },
          replace: true,
        });
      } else {
        // Password reset — redirect to reset-password page with OTP
        navigate('/reset-password', {
          state: { email, code },
          replace: true,
        });
      }
    } catch {
      // Reset OTP inputs on error
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      clearError();
      await resendOtp({ email, type });
      setSuccessMessage('A new OTP has been sent to your email.');
      setResendCooldown(60);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <AuthLayout title="Verify your email" description={`We sent a 6-digit code to ${email}`}>
      {/* Error alert */}
      <AuthStatusAlert message={error} />

      {/* Success alert */}
      <AuthStatusAlert message={successMessage} variant="success" />

      {/* OTP input grid */}
      <fieldset className="auth-item">
        <legend className="mb-3 w-full text-center text-xs font-medium text-muted-foreground">
          Enter the 6-digit verification code *
        </legend>
        <div className="flex justify-center gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              aria-label={`Verification code digit ${index + 1} of ${OTP_LENGTH}`}
              aria-required="true"
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="h-12 w-11 rounded-md text-center text-lg font-semibold sm:h-14 sm:w-14"
              disabled={loading}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
            />
          ))}
        </div>
      </fieldset>

      {/* Loading indicator */}
      {loading && (
        <div
          className="auth-item mt-4 flex items-center justify-center text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Spinner className="mr-2 size-4" />
          Verifying…
        </div>
      )}

      {/* Resend OTP */}
      <div className="auth-item mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the code?{' '}
          <Button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            variant="link"
            className="h-auto min-h-0 min-w-0 px-0 py-0 align-baseline font-medium"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
          </Button>
        </p>
      </div>
    </AuthLayout>
  );
}
