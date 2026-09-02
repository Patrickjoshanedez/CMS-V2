import { Link } from 'react-router-dom';
import { Search, GraduationCap } from 'lucide-react';
import { WaveShape } from './WaveShape';
import { ThemeButton } from './ThemeButton';

// ---------------------------------------------------------------------------
// Hero section data
// ---------------------------------------------------------------------------
const NAV_ITEMS = ['Home', 'About', 'Features', 'FAQ'];

const STATS = [
  { value: '500+', label: 'Projects Archived' },
  { value: '120+', label: 'Teams Active' },
  { value: '98%', label: 'Completion Rate' },
];

/**
 * HeroSection — gradient wave hero with navigation, headline, CTA, and stats.
 */
export function HeroSection({ heroRef }) {
  return (
    <div ref={heroRef} id="home" className="landing-hero relative min-h-screen overflow-hidden">
      {/* Gradient Wave Background */}
      <WaveShape />

      {/* Subtle shadow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(135deg, transparent 55%, rgba(0,0,0,0.03) 55%, rgba(0,0,0,0.03) 100%)',
        }}
      />

      {/* Header / Navigation */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-foreground" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            CMS{' '}
            <span className="font-normal text-muted-foreground">Capstone Management System</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeButton />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300"
            aria-label="Search"
          >
            <Search className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative z-10 flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-12 md:pt-24 lg:pt-32 pb-20 max-w-2xl">
        <h1 className="landing-title text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
          Manage your{' '}
          <span className="bg-gradient-to-r from-brand-orange to-brand-deep-purple bg-clip-text text-transparent">
            capstone
          </span>{' '}
          projects with confidence.
        </h1>

        <p className="landing-subtitle mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
          A comprehensive archiving and management system for your capstone journey — from proposal
          to final defense. Submit, review, and track your progress in one place.
        </p>

        <div className="landing-buttons mt-10 flex flex-wrap gap-4">
          <Link
            to="/register"
            className="landing-btn-gradient inline-flex items-center justify-center rounded-lg px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all duration-300"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="landing-btn-solid inline-flex items-center justify-center rounded-lg border border-border bg-foreground px-7 py-3 text-sm font-semibold uppercase tracking-wider text-background shadow-lg transition-all duration-300 hover:scale-105"
          >
            Sign In
          </Link>
        </div>

        <div className="landing-stats mt-16 flex gap-10">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 landing-scroll-hint">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">Scroll</span>
          <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/40 flex items-start justify-center pt-1">
            <div className="h-2 w-1 rounded-full bg-muted-foreground/60 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
