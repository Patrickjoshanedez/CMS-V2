import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ThemeToggle from '@/components/ThemeToggle';
import { Card } from '@/components/ui/Card';
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary/20">
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
        <Card
          className={`auth-form relative z-10 w-full ${wide ? 'max-w-xl' : 'max-w-md'} ${
            loaded ? 'auth-loaded' : ''
          } rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8`}
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
        </Card>
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
