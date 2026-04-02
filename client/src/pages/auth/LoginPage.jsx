import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';

import AuthLayout from '@/components/layouts/AuthLayout';
import { FloatingInput } from '@/components/ui/FloatingInput';
import AuthStatusAlert from '@/components/auth/AuthStatusAlert';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/components/ThemeProvider';
import { getGoogleAuthRuntimeConfig } from '@/utils/googleAuth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const getGoogleOriginMismatchMessage = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'your frontend origin';
  return `Google sign-in failed. If you see "Error 400: origin_mismatch", add ${origin} to Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs > Authorized JavaScript origins.`;
};

/**
 * LoginPage — split-screen login form with floating inputs,
 * gradient submit button, and stagger entry animation.
 */
export default function LoginPage() {
  const isRecaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED !== 'false';
  const googleAuth = getGoogleAuthRuntimeConfig();
  const isGoogleLoginConfigured = googleAuth.isEnabled;
  const navigate = useNavigate();
  const { login, googleLogin, loading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const recaptchaRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    clearError();
  }, [clearError]);

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

  const handleGoogleSuccess = useCallback(
    async (credentialResponse) => {
      if (!credentialResponse?.credential) {
        setGoogleError('Google sign-in did not return a credential. Please try again.');
        return;
      }

      try {
        setGoogleError('');
        clearError();
        await googleLogin(credentialResponse.credential);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        const apiMessage = error?.response?.data?.error?.message;
        setGoogleError(apiMessage || getGoogleOriginMismatchMessage());
      }
    },
    [clearError, googleLogin, navigate],
  );

  const handleGoogleError = useCallback(() => {
    setGoogleError(getGoogleOriginMismatchMessage());
  }, []);

  const googleLoginButton = useMemo(
    () => (
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        theme={theme === 'dark' ? 'filled_black' : 'outline'}
        size="large"
        width={360}
        text="signin_with"
        shape="rectangular"
      />
    ),
    [handleGoogleError, handleGoogleSuccess, theme],
  );

  return (
    <AuthLayout title="Welcome back" description="Sign in to your account to continue.">
      {/* Error alert */}
      <AuthStatusAlert message={error} />

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
              className="h-4 w-4 rounded border-input text-primary focus:ring-primary/40"
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:text-brand-purple transition-colors"
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
          <AuthSubmitButton loading={loading} loadingLabel="Signing in…" idleLabel="Sign in" />
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
      {isGoogleLoginConfigured ? (
        <div className="auth-item flex justify-center">{googleLoginButton}</div>
      ) : (
        <div className="auth-item">
          <p className="text-sm text-destructive text-center">
            {googleAuth.isDisabledByDevPolicy
              ? 'Google Sign-In is disabled in local development. Set VITE_ENABLE_GOOGLE_LOGIN=true after whitelisting your origin in Google Cloud Console.'
              : 'Google Sign-In is unavailable for this environment. Check VITE_GOOGLE_CLIENT_ID and Google OAuth authorized origins.'}
          </p>
        </div>
      )}
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
            className="font-semibold text-primary hover:text-brand-purple transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
