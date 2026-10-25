import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { GoogleLogin } from '@react-oauth/google';

import AuthLayout from '@/components/layouts/AuthLayout';
import { FloatingInput } from '@/components/ui/FloatingInput';
import AuthStatusAlert from '@/components/auth/AuthStatusAlert';
import AuthSubmitButton from '@/components/auth/AuthSubmitButton';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { getGoogleAuthRuntimeConfig } from '@/utils/googleAuth';
import { registerSchema } from './registerSchema';

const getGoogleOriginMismatchMessage = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'your frontend origin';
  return `Google sign-up failed. If you see "The given origin is not allowed for the given client ID" or "Error 400: origin_mismatch", add ${origin} to Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs > Authorized JavaScript origins.`;
};

/* ─── Password Strength Meter ─── */

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: '', color: '', className: '' },
    { label: 'Weak', color: 'hsl(var(--destructive))', className: 'text-destructive' },
    { label: 'Fair', color: 'hsl(var(--warning))', className: 'text-warning' },
    { label: 'Good', color: 'hsl(var(--foreground))', className: 'text-foreground' },
    { label: 'Strong', color: 'hsl(var(--primary))', className: 'text-primary' },
    { label: 'Very strong', color: 'hsl(var(--primary))', className: 'text-primary font-semibold' },
  ];

  return { score, ...levels[score] };
}

function PasswordStrengthMeter({ password }) {
  const { score, label, color, className } = useMemo(
    () => getPasswordStrength(password),
    [password],
  );

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1" aria-live="polite" aria-atomic="true">
      {/* Bar track */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden" aria-hidden="true">
        <div
          className="strength-bar h-full rounded-full transition-all duration-200"
          style={{
            width: `${(score / 5) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className={`text-xs font-medium ${className}`}>Password strength: {label}</p>
    </div>
  );
}

/**
 * RegisterPage — student self-registration with floating inputs,
 * password strength meter, gradient button, and stagger animations.
 */
export default function RegisterPage() {
  const recaptchaSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
  const isRecaptchaEnabled =
    import.meta.env.VITE_RECAPTCHA_ENABLED !== 'false' && Boolean(recaptchaSiteKey);
  const googleAuth = getGoogleAuthRuntimeConfig();
  const isGoogleLoginConfigured = googleAuth.isEnabled;
  const navigate = useNavigate();
  const { register: registerUser, googleLogin, loading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1);
  const [captchaError, setCaptchaError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const recaptchaRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const { theme } = useThemeStore();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    shouldUnregister: false,
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      studentId: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const handleNextStep = useCallback(async () => {
    const valid = await trigger(['firstName', 'lastName', 'middleName']);
    if (valid) {
      setStep(2);
      setTimeout(() => stepHeadingRef.current?.focus(), 0);
    }
  }, [trigger]);

  const handlePrevStep = useCallback(() => {
    setStep(1);
    setTimeout(() => stepHeadingRef.current?.focus(), 0);
  }, []);

  const passwordValue = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });

  /* ─── Google OAuth Handlers ─── */
  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setGoogleError('Google sign-in did not return a credential. Please try again.');
      return;
    }

    try {
      setGoogleError('');
      clearError();
      await googleLogin(credentialResponse.credential);
      navigate('/dashboard', { replace: true });
    } catch {
      // Backend errors or network timeouts during credential exchange
      // are already captured in the authStore `error` state and displayed via AuthStatusAlert.
      // No need to set googleError here.
    }
  };

  const handleGoogleError = useCallback((err) => {
    if (err) {
      console.warn('[Google Auth Error]', err);
    }
    setGoogleError(getGoogleOriginMismatchMessage());
  }, []);

  const onSubmit = useCallback(
    async (data) => {
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

        await registerUser({
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          studentId: data.studentId?.trim(),
          email: data.email,
          password: data.password,
          ...(isRecaptchaEnabled ? { captchaToken } : {}),
        });
        navigate('/verify-otp', {
          state: { email: data.email, type: 'verification' },
          replace: true,
        });
      } catch {
        // Error is handled by the store
        if (isRecaptchaEnabled) {
          recaptchaRef.current?.reset();
        }
      }
    },
    [clearError, isRecaptchaEnabled, navigate, registerUser],
  );

  const handleFormSubmit = useCallback(
    (event) => {
      void handleSubmit(onSubmit)(event);
    },
    [handleSubmit, onSubmit],
  );

  return (
    <AuthLayout
      title="Create an account"
      description="Register to get started with the system."
      wide
    >
      {/* Error alert */}
      <AuthStatusAlert message={error} />

      <form onSubmit={handleFormSubmit} noValidate>
        <div
          className="mb-4 flex items-center justify-between text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="font-medium text-foreground">Step {step} of 2</span>
          <span>* Indicates a required field</span>
        </div>

        {step === 1 && (
          <fieldset className="mb-5 rounded-lg border border-border bg-background p-4">
            <legend
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mb-3 w-full rounded-md bg-muted/50 px-3 py-1.5 text-base font-semibold text-foreground border-b border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              1. Personal Identity
            </legend>

            {/* First name + Last name */}
            <div className="auth-item mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="First name *"
                    autoComplete="given-name"
                    aria-required="true"
                    error={errors.firstName?.message}
                  />
                )}
              />
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="Last name *"
                    autoComplete="family-name"
                    aria-required="true"
                    error={errors.lastName?.message}
                  />
                )}
              />
            </div>

            {/* Middle name (optional) */}
            <div className="auth-item">
              <Controller
                name="middleName"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="Middle name (optional)"
                    autoComplete="additional-name"
                    error={errors.middleName?.message}
                  />
                )}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={handleNextStep} className="w-full sm:w-auto">
                Continue to Credentials
              </Button>
            </div>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="mb-5 rounded-lg border border-border bg-background p-4">
            <legend
              ref={stepHeadingRef}
              tabIndex={-1}
              className="mb-3 w-full rounded-md bg-muted/50 px-3 py-1.5 text-base font-semibold text-foreground border-b border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              2. Account Credentials
            </legend>

            {/* Email */}
            <div className="auth-item mb-4">
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="Institutional Email *"
                    type="email"
                    autoComplete="email"
                    aria-required="true"
                    error={errors.email?.message}
                  />
                )}
              />
            </div>

            {/* Student ID no. */}
            <div className="auth-item mb-4">
              <Controller
                name="studentId"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    id="studentId"
                    label="Student ID no. *"
                    autoComplete="off"
                    maxLength={32}
                    aria-required="true"
                    error={errors.studentId?.message}
                  />
                )}
              />
            </div>

            {/* Password + strength meter */}
            <div className="auth-item mb-4">
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="Password *"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-required="true"
                    error={errors.password?.message}
                    trailing={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 min-h-8 min-w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    }
                  />
                )}
              />
              <PasswordStrengthMeter password={passwordValue} />
            </div>

            {/* Confirm password */}
            <div className="auth-item mb-4">
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <FloatingInput
                    {...field}
                    label="Confirm password *"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-required="true"
                    error={errors.confirmPassword?.message}
                    trailing={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 min-h-8 min-w-8"
                        onClick={() => setShowConfirm(!showConfirm)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    }
                  />
                )}
              />
            </div>

            {/* reCAPTCHA widget */}
            {isRecaptchaEnabled && (
              <>
                <div className="auth-item mb-4 flex justify-center">
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={recaptchaSiteKey}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                  />
                </div>
                {captchaError && (
                  <div className="auth-item mb-4" aria-live="polite">
                    <p className="text-xs text-destructive text-center">{captchaError}</p>
                  </div>
                )}
              </>
            )}

            <div className="auth-item mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                variant="ghost"
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <AuthSubmitButton
                  loading={loading}
                  loadingLabel="Creating account…"
                  idleLabel="Create account"
                />
              </div>
            </div>
          </fieldset>
        )}
      </form>

      {/* ─── Divider ─── */}
      <div className="auth-item my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ─── Google Sign-Up Button ─── */}
      {isGoogleLoginConfigured ? (
        <div className="auth-item flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme={theme === 'dark' ? 'filled_black' : 'outline'}
            size="large"
            text="signup_with"
            shape="rectangular"
          />
        </div>
      ) : (
        <div className="auth-item">
          <p className="text-sm text-destructive text-center">
            {googleAuth.isDisabledByDevPolicy
              ? 'Google Sign-Up is disabled in local development. Set VITE_ENABLE_GOOGLE_LOGIN=true after whitelisting your origin in Google Cloud Console.'
              : !googleAuth.isOriginAllowed
                ? `Google Sign-Up is unavailable for ${window.location.origin}. Configured VITE_GOOGLE_ALLOWED_ORIGINS: ${googleAuth.allowedOrigins.length ? googleAuth.allowedOrigins.join(', ') : '(none configured)'}. Also add this origin to Google OAuth Authorized JavaScript origins.`
                : googleAuth.isMissingAllowedOriginsInDev
                  ? 'Google Sign-Up is currently using the local loopback fallback because VITE_GOOGLE_ALLOWED_ORIGINS is not set. Set VITE_GOOGLE_ALLOWED_ORIGINS explicitly to keep strict origin checks.'
                  : 'Google Sign-Up is unavailable for this environment. Check VITE_GOOGLE_CLIENT_ID and Google OAuth authorized origins.'}
          </p>
        </div>
      )}

      {googleError && (
        <div className="auth-item mt-3">
          <p className="text-sm text-destructive text-center">{googleError}</p>
        </div>
      )}

      {/* Login link */}
      <div className="auth-item mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
