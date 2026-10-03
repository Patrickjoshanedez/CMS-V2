import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  BookOpen,
  ShieldCheck,
  FileCheck2,
  Users,
  ChevronDown,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import buksuLogo from '@/assets/buksu-logo.png';
import { prefetchRoute, prefetchHandlers } from '@/lib/routePrefetch';

/**
 * BukSU Landing Page — clean, minimal entry surface.
 * Design tokens (`bg-background`, `text-foreground`, `border-border`) carry the theme;
 * BukSU royal blue and academic gold (`buksu-*` Tailwind tokens) are used as accents only.
 */

const FEATURES = [
  {
    icon: Search,
    title: 'Title similarity pre-screening',
    desc: 'Every proposed title is checked against the BukSU thesis archive before it reaches the panel.',
  },
  {
    icon: BookOpen,
    title: 'One document reader',
    desc: 'Read Word and PDF manuscripts in place, with revision diffs between versions.',
  },
  {
    icon: Users,
    title: 'Defense committees',
    desc: 'Advisers, secretaries and panelists review, grade and sign off in one shared space.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure archival',
    desc: 'Approved capstones are archived with a sealed completion certificate.',
  },
];

const PHASES = [
  {
    step: 'Phase 1',
    title: 'Title Defense',
    desc: 'Propose titles, pre-scan for similarity, defend.',
  },
  {
    step: 'Phase 2',
    title: 'Chapters 1–3',
    desc: 'Upload manuscript, plagiarism scan, midterm defense.',
  },
  {
    step: 'Phase 3',
    title: 'System Build',
    desc: 'Track milestones on the Gantt chart, progress defense.',
  },
  {
    step: 'Phase 4',
    title: 'Final Defense',
    desc: 'Multi-tier sign-off, then automatic archival.',
  },
];

const FAQS = [
  {
    q: 'Who can use the portal?',
    a: 'Students, course instructors and faculty of the BukSU College of Technologies. Sign in with your university account.',
  },
  {
    q: 'How does title pre-screening work?',
    a: 'When you submit candidate titles, the system compares them with archived capstones and flags titles that are too similar so you can revise them early.',
  },
  {
    q: 'What is the plagiarism threshold?',
    a: 'Manuscripts must score below 25% similarity to move forward. You can see the report for each chapter you upload.',
  },
  {
    q: 'Can I change my team after it is locked?',
    a: 'No. Rosters are locked once confirmed. Contact your course instructor if a change is truly needed.',
  },
];

export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const primaryTo = isAuthenticated ? '/dashboard' : '/register';

  // Anticipatory background pre-caching of primary destination chunks
  useEffect(() => {
    const warmTargets = ['/login', '/register', '/dashboard'];
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleHandle = window.requestIdleCallback(
        () => warmTargets.forEach((target) => prefetchRoute(target)),
        { timeout: 1500 },
      );
      return () => window.cancelIdleCallback(idleHandle);
    }
    const timer = setTimeout(() => warmTargets.forEach((target) => prefetchRoute(target)), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-buksu-gold-500/30">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={buksuLogo}
              alt="Bukidnon State University seal"
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold tracking-tight">BukSU CMS</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                {...prefetchHandlers('/dashboard')}
                className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                {...prefetchHandlers('/login')}
                className="inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_0%,black_40%,transparent_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[-12rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-buksu-blue-500/20 blur-3xl dark:bg-buksu-blue-500/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-[10%] top-24 h-48 w-48 rounded-full bg-buksu-gold-500/20 blur-3xl"
          />

          <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-buksu-gold-500" />
              BukSU BSIT Capstone Portal
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Manage your capstone projects with{' '}
              <span className="bg-gradient-to-r from-buksu-blue-600 to-buksu-blue-500 bg-clip-text text-transparent dark:from-buksu-gold-400 dark:to-buksu-gold-500">
                institutional rigor
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              From title proposal to final defense and archival — one place for students, advisers
              and panels to move every capstone forward.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={primaryTo}
                {...prefetchHandlers(primaryTo)}
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-buksu-blue-600 px-6 text-sm font-medium text-white shadow-lg shadow-buksu-blue-600/25 transition-colors hover:bg-buksu-blue-700"
              >
                {isAuthenticated ? 'Go to dashboard' : 'Get started'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-muted"
              >
                See how it works
              </a>
            </div>

            <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 border-t border-border/60 pt-8">
              <div>
                <dt className="text-xs text-muted-foreground">Capstone phases</dt>
                <dd className="mt-1 text-xl font-semibold sm:text-2xl">4</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Similarity limit</dt>
                <dd className="mt-1 text-xl font-semibold sm:text-2xl">&lt; 25%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Sign-off tiers</dt>
                <dd className="mt-1 text-xl font-semibold sm:text-2xl">3</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything in one place
              </h2>
              <p className="mt-3 text-muted-foreground">
                The tools your team and committee need, without the paperwork.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-buksu-blue-500/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-buksu-blue-500/10 text-buksu-blue-600 dark:text-buksu-gold-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section
          id="workflow"
          className="scroll-mt-20 border-t border-border/60 bg-muted/30 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Four phases, one path
              </h2>
              <p className="mt-3 text-muted-foreground">
                Teams form and lock their roster first, then move through each phase in order.
              </p>
            </div>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-4">
              {PHASES.map(({ step, title, desc }) => (
                <li key={step} className="bg-background p-6">
                  <span className="text-xs font-medium text-buksu-blue-600 dark:text-buksu-gold-400">
                    {step}
                  </span>
                  <h3 className="mt-2 font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
            <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-buksu-navy-950 px-6 py-14 text-center text-white sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-buksu-gold-500/25 blur-3xl"
            />
            <FileCheck2 className="relative mx-auto h-8 w-8 text-buksu-gold-400" />
            <h2 className="relative mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to start your capstone?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/70 sm:text-base">
              Sign in with your BukSU account to create a team and submit your first title proposal.
            </p>
            <Link
              to={primaryTo}
              {...prefetchHandlers(primaryTo)}
              className="relative mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-buksu-navy-950 transition-colors hover:bg-white/90"
            >
              {isAuthenticated ? 'Go to dashboard' : 'Create your account'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src={buksuLogo} alt="" className="h-5 w-5 object-contain" />
            <span>
              © {new Date().getFullYear()} Bukidnon State University · College of Technologies
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" {...prefetchHandlers('/login')} className="hover:text-foreground">
              Sign in
            </Link>
            <Link
              to="/register"
              {...prefetchHandlers('/register')}
              className="hover:text-foreground"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
