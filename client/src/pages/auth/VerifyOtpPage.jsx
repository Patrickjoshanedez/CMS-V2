import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import AuthLayout from '@/components/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuthStore } from '@/stores/authStore';

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

  // Redirect if no email provided (user landed here directly)
  if (!email) {
    return <Navigate to="/login" replace />;
  }

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
    <AuthLayout
      title="Verify your email"
      description={`We sent a 6-digit code to ${email}`}
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* OTP input grid */}
      <div className="flex justify-center gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={loading}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying…
        </div>
      )}

      {/* Resend OTP */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
