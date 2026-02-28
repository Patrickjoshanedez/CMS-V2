import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';

import AuthLayout from '@/components/layouts/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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
    register,
    handleSubmit,
    getValues,
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
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sent && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>
            If an account with that email exists, a reset code has been sent. Redirecting…
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={sent}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading || sent}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code…
            </>
          ) : (
            'Send reset code'
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
