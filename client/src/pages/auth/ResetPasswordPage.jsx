import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import AuthLayout from '@/components/layouts/AuthLayout';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuthStore } from '@/stores/authStore';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must include uppercase, lowercase, and a number.',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

/**
 * ResetPasswordPage — new password form after OTP verification.
 * Expects { email, code } in route state from VerifyOtpPage.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword, loading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const email = location.state?.email;
  const code = location.state?.code;

  // Redirect if required state is missing (after all hooks)
  if (!email || !code) {
    return <Navigate to="/forgot-password" replace />;
  }

  const onSubmit = async (data) => {
    try {
      clearError();
      await resetPassword({
        email,
        newPassword: data.password,
      });
      navigate('/login', {
        state: { message: 'Password reset successfully! You can now sign in.' },
        replace: true,
      });
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <AuthLayout title="Set new password" description="Enter your new password below.">
      {/* Error alert */}
      {error && (
        <div className="auth-item mb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* New password */}
        <div className="auth-item mb-4">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="New password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={errors.password?.message}
                trailing={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            )}
          />
        </div>

        {/* Confirm password */}
        <div className="auth-item mb-6">
          <Controller
            name="confirmPassword"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="Confirm new password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                trailing={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            )}
          />
        </div>

        {/* Submit — gradient button */}
        <div className="auth-item">
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-gradient w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#673ab7]/50 focus:ring-offset-2 focus:ring-offset-background"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting password…
              </>
            ) : (
              'Reset password'
            )}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
