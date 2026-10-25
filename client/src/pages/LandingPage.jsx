import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, BookOpen, ShieldCheck, FileCheck2, Users, Menu } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
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
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={buksuLogo}
              alt="Bukidnon State University seal"
              className="h-8 w-8 object-contain"
            />
            <span className="text-sm font-semibold tracking-tight">BukSU CMS</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost" size="sm">
              <a href="#features">Features</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#workflow">Workflow</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="#faq">FAQ</a>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent className="inset-y-0 left-auto right-0 top-0 h-dvh max-h-none w-[min(20rem,calc(100vw-1rem))] max-w-none translate-x-0 translate-y-0 gap-6 rounded-l-2xl rounded-r-none border-y-0 border-l p-6 sm:w-[min(22rem,calc(100vw-1rem))]">
                <DialogHeader>
                  <DialogTitle>Explore BukSU CMS</DialogTitle>
                  <DialogDescription>Jump to a section of the capstone portal.</DialogDescription>
                </DialogHeader>
                <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
                  {[
                    ['Features', '#features'],
                    ['Workflow', '#workflow'],
                    ['FAQ', '#faq'],
                  ].map(([label, href]) => (
                    <DialogClose asChild key={href}>
                      <Button asChild variant="ghost" className="w-full justify-start">
                        <a href={href}>{label}</a>
                      </Button>
                    </DialogClose>
                  ))}
                </nav>
              </DialogContent>
            </Dialog>
            {isAuthenticated ? (
              <Button asChild className="h-9 rounded-full px-4 text-sm">
                <Link to="/dashboard" {...prefetchHandlers('/dashboard')}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button asChild className="h-9 rounded-full px-4 text-sm">
                <Link to="/login" {...prefetchHandlers('/login')}>
                  Sign in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-28 sm:pt-28">
            <Badge
              variant="outline"
              className="gap-2 rounded-full border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-buksu-gold-500" aria-hidden="true" />
              BukSU BSIT Capstone Portal
            </Badge>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Manage your capstone projects with{' '}
              <span className="text-primary">institutional rigor</span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              From title proposal to final defense and archival — one place for students, advisers
              and panels to move every capstone forward.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="group px-6 shadow-sm">
                <Link to={primaryTo} {...prefetchHandlers(primaryTo)}>
                  {isAuthenticated ? 'Go to dashboard' : 'Get started'}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-6">
                <a href="#workflow">See how it works</a>
              </Button>
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
                <Card
                  key={title}
                  className="h-full rounded-2xl border-border/60 p-6 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </Card>
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
            <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PHASES.map(({ step, title, desc }) => (
                <li key={step}>
                  <Card className="h-full rounded-2xl p-6">
                    <Badge variant="info" className="px-2 py-1 text-xs font-medium">
                      {step}
                    </Badge>
                    <h3 className="mt-2 font-medium">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
            <Accordion type="single" collapsible className="mt-10 border-y border-border/60">
              {FAQS.map(({ q, a }) => (
                <AccordionItem key={q} value={q} className="border-border/60">
                  <AccordionTrigger>{q}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-24">
          <Card className="relative mx-auto max-w-6xl overflow-hidden rounded-xl border-0 bg-primary px-6 py-14 text-center text-primary-foreground shadow-lg sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground/10 blur-3xl"
            />
            <FileCheck2 className="relative mx-auto h-8 w-8 text-primary-foreground/80" />
            <h2 className="relative mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to start your capstone?
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
              Sign in with your BukSU account to create a team and submit your first title proposal.
            </p>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="relative mt-8 rounded-md bg-primary-foreground px-6 text-primary hover:bg-primary-foreground/90 hover:text-primary"
            >
              <Link to={primaryTo} {...prefetchHandlers(primaryTo)}>
                {isAuthenticated ? 'Go to dashboard' : 'Create your account'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Card>
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
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/login" {...prefetchHandlers('/login')}>
                Sign in
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/register" {...prefetchHandlers('/register')}>
                Register
              </Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
