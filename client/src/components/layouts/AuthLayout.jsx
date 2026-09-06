import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ThemeToggle from '@/components/ThemeToggle';
import BukSULoginSidePanel from '@/components/auth/BukSULoginSidePanel';
import buksuLogo from '@/assets/buksu-logo.png';
import buksuCampusGate from '@/assets/buksu-campus-gate.jpg';

/**
 * AuthLayout — Split-screen layout for authentication pages.
 * Left: BukSU Main Campus Gate architectural panel with deep navy & gold overlays.
 * Right: High-contrast, clean manuscript form container with smooth light/dark mode transitions.
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
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 selection:bg-[#E5A823] selection:text-[#071329] transition-colors duration-300 overflow-x-hidden">
      {/* ── Master Full-Bleed BukSU Campus Gate Backdrop (Continuous across both columns) ── */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={buksuCampusGate}
          alt="BukSU Campus Main Gate"
          className="w-full h-full object-cover object-[center_32%] filter brightness-[0.92] contrast-[1.06] transform scale-102"
        />

        {/* Dark Mode Gradient Overlay: Rich Obsidian & Institutional Navy */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              'linear-gradient(105deg, rgba(7, 19, 41, 0.88) 0%, rgba(11, 27, 61, 0.80) 45%, rgba(7, 19, 41, 0.88) 100%)',
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              'radial-gradient(circle at 20% 30%, rgba(229, 168, 35, 0.12) 0%, transparent 60%)',
          }}
        />

        {/* Light Mode Gradient Overlay: Architectural Navy wash on left, seamlessly transitioning to frosted Ivory on right */}
        <div
          className="absolute inset-0 block dark:hidden"
          style={{
            background:
              'linear-gradient(100deg, rgba(7, 19, 41, 0.84) 0%, rgba(11, 27, 61, 0.72) 36%, rgba(15, 30, 60, 0.35) 48%, rgba(241, 245, 249, 0.72) 62%, rgba(248, 250, 252, 0.82) 100%)',
          }}
        />
        <div
          className="absolute inset-0 block dark:hidden"
          style={{
            background:
              'radial-gradient(circle at 80% 20%, rgba(229, 168, 35, 0.08) 0%, transparent 50%)',
          }}
        />

        {/* Shared Institutional Blueprint Coordinate Grid */}
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1E3A8A 1px, transparent 1px),
              linear-gradient(to bottom, #1E3A8A 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Atmospheric Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#E5A823]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-[#1A448A]/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Two-Column Responsive Content Grid ── */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_minmax(28rem,38rem)] xl:grid-cols-[minmax(0,1.3fr)_minmax(30rem,42rem)]">
        {/* Left Column: BukSU Campus Architectural Side Panel (Desktop) */}
        <BukSULoginSidePanel />

        {/* Right Column: Credentials Form Panel with Frosted Glassmorphic Canvas */}
        <div className="relative flex flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-12 lg:px-14 xl:px-16">
          {/* Theme toggle in upper corner */}
          <div className="absolute right-6 top-6 z-20">
            <ThemeToggle />
          </div>

          {/* Institutional Branding (Mobile Only Header) */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <Link to="/" className="inline-flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E5A823] p-1.5 flex items-center justify-center shadow-xl">
                <img src={buksuLogo} alt="BukSU Logo" className="w-full h-full object-contain" />
              </div>
              <div className="mt-1">
                <h1 className="text-xl font-bold tracking-tight text-white font-serif drop-shadow-md">
                  BukSU CMS
                </h1>
                <p className="text-[11px] font-mono text-[#E5A823] tracking-wider uppercase font-semibold drop-shadow-xs">
                  Capstone Management System
                </p>
              </div>
            </Link>
          </div>

          {/* Form Card Container — Frosted Institutional Glass */}
          <div
            className={`auth-form w-full ${
              wide ? 'max-w-xl' : 'max-w-md'
            } ${loaded ? 'auth-loaded' : ''} p-7 sm:p-9 rounded-2xl bg-white/95 dark:bg-[#0B1B3D]/85 backdrop-blur-xl border border-slate-300/90 dark:border-[#1E3356] shadow-2xl shadow-slate-900/10 dark:shadow-black/70 transition-all`}
          >
            {/* Form Title & Subtitle */}
            {title && (
              <div className="auth-item mb-6">
                <div className="hidden lg:flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5A823] shadow-xs shadow-[#E5A823]/50" />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    Bukidnon State University · Portal Authentication
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-serif">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed font-sans">
                    {description}
                  </p>
                )}
              </div>
            )}

            {children}
          </div>

          {/* Institutional Compliance & Archival Tag */}
          <div className="mt-8 text-center text-xs text-slate-600 dark:text-slate-400 font-mono select-none px-3.5 py-1 rounded-full bg-white/60 dark:bg-transparent backdrop-blur-xs border border-slate-200/50 dark:border-transparent">
            BukSU College of Technologies · CHED CMO 25 Compliant
          </div>
        </div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  wide: PropTypes.bool,
};
