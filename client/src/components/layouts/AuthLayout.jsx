import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

/* ─── Wave + Skyline SVGs (shared across all auth pages) ─── */

function AuthCitySkyline() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-full pointer-events-none">
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        <rect x="40" y="180" width="55" height="220" rx="3" fill="white" fillOpacity="0.22" />
        <rect x="110" y="120" width="60" height="280" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="138" y="90" width="3" height="30" fill="white" fillOpacity="0.3" />
        <rect x="185" y="200" width="40" height="200" rx="2" fill="white" fillOpacity="0.18" />
        <rect x="240" y="100" width="65" height="300" rx="3" fill="white" fillOpacity="0.3" />
        <rect x="270" y="60" width="4" height="40" fill="white" fillOpacity="0.32" />
        <circle cx="272" cy="57" r="4" fill="white" fillOpacity="0.4" />
        <rect x="320" y="160" width="50" height="240" rx="2" fill="white" fillOpacity="0.2" />
        <rect x="385" y="130" width="55" height="270" rx="3" fill="white" fillOpacity="0.24" />
        <rect x="455" y="190" width="45" height="210" rx="2" fill="white" fillOpacity="0.18" />
        <rect x="515" y="80" width="60" height="320" rx="3" fill="white" fillOpacity="0.26" />
        <rect x="543" y="50" width="3" height="30" fill="white" fillOpacity="0.3" />
        <rect x="590" y="170" width="50" height="230" rx="2" fill="white" fillOpacity="0.2" />
        <rect x="660" y="110" width="55" height="290" rx="3" fill="white" fillOpacity="0.25" />
        <rect x="730" y="200" width="40" height="200" rx="2" fill="white" fillOpacity="0.18" />
        <rect x="790" y="140" width="65" height="260" rx="3" fill="white" fillOpacity="0.22" />
        <rect x="870" y="180" width="50" height="220" rx="2" fill="white" fillOpacity="0.2" />
        <rect x="940" y="100" width="55" height="300" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="968" y="70" width="3" height="30" fill="white" fillOpacity="0.3" />
        <rect x="1010" y="200" width="45" height="200" rx="2" fill="white" fillOpacity="0.18" />
        <rect x="1070" y="120" width="60" height="280" rx="3" fill="white" fillOpacity="0.24" />
        <rect x="1145" y="170" width="45" height="230" rx="2" fill="white" fillOpacity="0.2" />
      </svg>
    </div>
  );
}

function AuthWavePanel() {
  return (
    <div className="auth-wave-panel relative hidden lg:flex flex-col items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ff5722] via-[#e91e63] via-[#9c27b0] to-[#673ab7]" />

      {/* City skyline */}
      <AuthCitySkyline />

      {/* Centered branding */}
      <div className="auth-wave-content relative z-10 px-10 text-center text-white">
        <h2 className="text-4xl font-bold tracking-tight drop-shadow-lg">CMS</h2>
        <p className="mt-2 text-lg font-medium text-white/90 drop-shadow">
          Capstone Management System
        </p>
        <p className="mt-4 max-w-xs mx-auto text-sm text-white/70 leading-relaxed">
          Streamline your capstone journey — from proposal to defense and beyond.
        </p>
      </div>

      {/* Decorative wave edge (right side) */}
      <svg
        className="absolute right-0 top-0 h-full w-16 translate-x-1/2"
        viewBox="0 0 80 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,0 C20,100 60,150 50,250 C40,350 70,400 55,500 C40,600 65,650 50,750 C35,850 60,880 0,900 L0,0 Z"
          fill="url(#authEdgeGrad)"
        />
        <defs>
          <linearGradient id="authEdgeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5722" />
            <stop offset="50%" stopColor="#9c27b0" />
            <stop offset="100%" stopColor="#673ab7" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── Main Layout ─── */

/**
 * AuthLayout — split-screen layout for authentication pages.
 * Left: scrollable form panel. Right: gradient wave panel (hidden on mobile).
 *
 * Props:
 *   children     — form content
 *   title        — heading text
 *   description  — sub-heading text
 *   wide         — if true, form column uses more width (e.g. register page)
 */
export default function AuthLayout({ children, title, description, wide = false }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Kick off the stagger entry animation after mount.
    const raf = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ── Left: Wave panel ── */}
      <AuthWavePanel />

      {/* ── Right: Form panel ── */}
      <div className="relative flex flex-col items-center justify-center overflow-y-auto bg-background px-6 py-12 sm:px-10">
        {/* Theme toggle */}
        <div className="absolute right-4 top-4 z-20">
          <ThemeToggle />
        </div>

        {/* Logo (mobile only — desktop has it on the wave panel) */}
        <div className="mb-6 text-center lg:hidden">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold tracking-tight text-primary">CMS</h1>
            <p className="text-xs text-muted-foreground">Capstone Management System</p>
          </Link>
        </div>

        {/* Form card */}
        <div
          className={`auth-form w-full ${wide ? 'max-w-xl' : 'max-w-md'} ${loaded ? 'auth-loaded' : ''}`}
        >
          {title && (
            <div className="auth-item mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}
