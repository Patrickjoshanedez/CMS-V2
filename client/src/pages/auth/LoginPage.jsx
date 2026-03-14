import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';

import AuthLayout from '@/components/layouts/AuthLayout';
import { FloatingInput } from '@/components/ui/FloatingInput';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/components/ThemeProvider';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

/**
 * LoginPage — split-screen login form with floating inputs,
 * gradient submit button, and stagger entry animation.
 */
export default function LoginPage() {
  const isRecaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED !== 'false';
  const navigate = useNavigate();
  const { login, googleLogin, loading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const recaptchaRef = useRef(null);
  const { theme } = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    try {
      setCaptchaError('');
      setGoogleError('');
      clearError();

      let captchaToken;

      if (isRecaptchaEnabled) {
        captchaToken = recaptchaRef.current?.getValue();
        if (!captchaToken) {
          setCaptchaError('Please complete the reCAPTCHA verification.');
          return;
        }
      }

      await login({ ...data, ...(isRecaptchaEnabled ? { captchaToken } : {}) });
      navigate('/dashboard', { replace: true });
    } catch {
      // Error is handled by the store
      if (isRecaptchaEnabled) {
        recaptchaRef.current?.reset();
      }
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleError('');
      clearError();
      await googleLogin(credentialResponse.credential);
      navigate('/dashboard', { replace: true });
    } catch {
      setGoogleError('Google sign-in failed. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setGoogleError('Google sign-in was unsuccessful. Please try again.');
  };

  return (
    <AuthLayout title="Welcome back" description="Sign in to your account to continue.">
      {/* Error alert */}
      {error && (
        <div className="auth-item mb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Email */}
        <div className="auth-item mb-4">
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="Email"
                type="email"
                autoComplete="email"
                error={errors.email?.message}
              />
            )}
          />
        </div>

        {/* Password */}
        <div className="auth-item mb-2">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
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

        {/* Remember me + Forgot password row */}
        <div className="auth-item mb-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input text-[#673ab7] focus:ring-[#673ab7]/40"
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-[#673ab7] hover:text-[#9c27b0] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* reCAPTCHA widget */}
        {isRecaptchaEnabled && (
          <>
            <div className="auth-item mb-4 flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                theme={theme === 'dark' ? 'dark' : 'light'}
              />
            </div>
            {captchaError && (
              <div className="auth-item mb-4">
                <p className="text-sm text-destructive text-center">{captchaError}</p>
              </div>
            )}
          </>
        )}

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
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="auth-item mt-6 mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          or continue with
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Google Sign-In */}
      <div className="auth-item flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme={theme === 'dark' ? 'filled_black' : 'outline'}
          size="large"
          width={360}
          text="signin_with"
          shape="rectangular"
        />
      </div>
      {googleError && (
        <div className="auth-item mt-2">
          <p className="text-sm text-destructive text-center">{googleError}</p>
        </div>
      )}

      {/* Register link */}
      <div className="auth-item mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-[#673ab7] hover:text-[#9c27b0] transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
