import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';

import AuthLayout from '@/components/layouts/AuthLayout';
import { FloatingInput } from '@/components/ui/FloatingInput';
import AuthStatusAlert from '@/components/auth/AuthStatusAlert';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import { useAuthStore } from '@/stores/authStore';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

/**
 * ForgotPasswordPage — email input to request a password-reset OTP.
 * On success, redirects to /verify-otp with type 'password_reset'.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, loading, error, clearError } = useAuthStore();
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    try {
      clearError();
      await forgotPassword(data);
      setSent(true);

      // After short delay, redirect to OTP verification
      setTimeout(() => {
        navigate('/verify-otp', {
          state: { email: data.email, type: 'password_reset' },
        });
      }, 2000);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email and we'll send you a reset code."
    >
      {/* Error alert */}
      <AuthStatusAlert message={error} />

      {/* Success alert */}
      <AuthStatusAlert
        message={
          sent
            ? 'If an account with that email exists, a reset code has been sent. Redirecting…'
            : ''
        }
        variant="success"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div className="auth-item mb-6">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="Email"
                type="email"
                autoComplete="email"
                disabled={sent}
                error={errors.email?.message}
              />
            )}
          />
        </div>

        {/* Submit — gradient button */}
        <div className="auth-item">
          <AuthSubmitButton
            loading={loading}
            loadingLabel="Sending code…"
            idleLabel="Send reset code"
            disabled={sent}
          />
        </div>
      </form>

      {/* Back to login — ghost button with gradient border */}
      <div className="auth-item mt-8 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#673ab7]/30 bg-transparent px-4 py-2.5 text-sm font-medium text-[#673ab7] transition-all hover:bg-[#673ab7]/5 hover:border-[#673ab7]/50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
