import { useState, useMemo, useRef } from 'react';
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

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name must not exceed 50 characters.'),
    middleName: z
      .string()
      .max(50, 'Middle name must not exceed 50 characters.')
      .optional()
      .default(''),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name must not exceed 50 characters.'),
    email: z.string().email('Please enter a valid email address.'),
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
    { label: '', color: '' },
    { label: 'Weak', color: '#ff5722' },
    { label: 'Fair', color: '#ff9800' },
    { label: 'Good', color: '#e91e63' },
    { label: 'Strong', color: '#9c27b0' },
    { label: 'Very strong', color: '#673ab7' },
  ];

  return { score, ...levels[score] };
}

function PasswordStrengthMeter({ password }) {
  const { score, label, color } = useMemo(() => getPasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      {/* Bar track */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="strength-bar h-full rounded-full"
          style={{
            width: `${(score / 5) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="text-xs font-medium" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

/**
 * RegisterPage — student self-registration with floating inputs,
 * password strength meter, gradient button, and stagger animations.
 */
export default function RegisterPage() {
  const isRecaptchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED !== 'false';
  const navigate = useNavigate();
  const { register: registerUser, googleLogin, loading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const recaptchaRef = useRef(null);
  const { theme } = useTheme();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  /* ─── Google OAuth Handlers ─── */
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleError('');
      clearError();
      await googleLogin(credentialResponse.credential);
      navigate('/dashboard', { replace: true });
    } catch {
      // Error is handled by the store
    }
  };

  const handleGoogleError = () => {
    setGoogleError('Google sign-up failed. Please try again.');
  };

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

      await registerUser({
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
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
  };

  return (
    <AuthLayout
      title="Create an account"
      description="Register to get started with the system."
      wide
    >
      {/* Error alert */}
      {error && (
        <div className="auth-item mb-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* First name + Last name */}
        <div className="auth-item mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="First name"
                autoComplete="given-name"
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
                label="Last name"
                autoComplete="family-name"
                error={errors.lastName?.message}
              />
            )}
          />
        </div>

        {/* Middle name (optional) */}
        <div className="auth-item mb-4">
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

        {/* Password + strength meter */}
        <div className="auth-item mb-4">
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <FloatingInput
                {...field}
                label="Password"
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
                label="Confirm password"
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
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </form>

      {/* ─── Divider ─── */}
      <div className="auth-item my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* ─── Google Sign-Up Button ─── */}
      <div className="auth-item flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          theme={theme === 'dark' ? 'filled_black' : 'outline'}
          size="large"
          text="signup_with"
          shape="rectangular"
          width="100%"
        />
      </div>

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
            className="font-semibold text-[#673ab7] hover:text-[#9c27b0] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
