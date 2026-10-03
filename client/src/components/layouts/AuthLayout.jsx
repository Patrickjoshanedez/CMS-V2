import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ThemeToggle from '@/components/ThemeToggle';
import buksuLogo from '@/assets/buksu-logo.png';

/**
 * AuthLayout — Centered single-card layout for authentication pages.
 * Clean token-driven background with a subtle grid and BukSU blue/gold glow.
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased selection:bg-buksu-gold-500/30">
      {/* Background: grid + soft glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_55%_50%_at_50%_0%,black_40%,transparent_100%)]" />
        <div className="absolute left-1/2 top-[-14rem] h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-buksu-blue-500/20 blur-3xl dark:bg-buksu-blue-500/25" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-buksu-gold-500/15 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={buksuLogo}
            alt="Bukidnon State University seal"
            className="h-8 w-8 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight">BukSU CMS</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div
          className={`auth-form w-full ${wide ? 'max-w-xl' : 'max-w-md'} ${
            loaded ? 'auth-loaded' : ''
          } rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur-xl sm:p-8 dark:shadow-black/40`}
        >
          {title && (
            <div className="auth-item mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-xs text-muted-foreground">
        Bukidnon State University · College of Technologies
      </footer>
    </div>
  );
}
AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  wide: PropTypes.bool,
};
