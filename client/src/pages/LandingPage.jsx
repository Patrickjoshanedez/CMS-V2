import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Moon,
  Sun,
  Monitor,
  GraduationCap,
  Archive,
  ShieldCheck,
  Server,
  BookOpen,
  ChevronDown,
  Layers,
  Cpu,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';

/**
 * CitySkylineSVG — Intricate city skyline silhouette embedded inside the gradient wave.
 * Uses a parallax drift effect on scroll.
 */
function CitySkylineSVG() {
  const skylineRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (skylineRef.current) {
        const scrollY = window.scrollY;
        skylineRef.current.style.transform = `translateY(${scrollY * -0.15}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      ref={skylineRef}
      className="landing-skyline absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{ opacity: 0.18 }}
    >
      <svg
        viewBox="0 0 1200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Skyline buildings — varied heights and widths for realism */}
        <rect x="30" y="180" width="50" height="220" rx="2" fill="white" fillOpacity="0.25" />
        <rect x="35" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="50" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="65" y="190" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="35" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="50" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />
        <rect x="65" y="210" width="8" height="12" rx="1" fill="white" fillOpacity="0.15" />

        <rect x="100" y="120" width="45" height="280" rx="2" fill="white" fillOpacity="0.22" />
        <rect x="105" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />
        <rect x="118" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />
        <rect x="131" y="130" width="7" height="10" rx="1" fill="white" fillOpacity="0.13" />

        <rect x="160" y="200" width="60" height="200" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="240" y="80" width="55" height="320" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="248" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="262" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="276" y="90" width="8" height="10" rx="1" fill="white" fillOpacity="0.12" />
        {/* Antenna */}
        <rect x="265" y="50" width="3" height="30" fill="white" fillOpacity="0.3" />
        <circle cx="266.5" cy="48" r="3" fill="white" fillOpacity="0.35" />

        <rect x="310" y="160" width="45" height="240" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="370" y="100" width="70" height="300" rx="3" fill="white" fillOpacity="0.25" />
        <rect x="380" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="397" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />
        <rect x="414" y="108" width="10" height="14" rx="1" fill="white" fillOpacity="0.12" />

        <rect x="460" y="220" width="40" height="180" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="515" y="60" width="60" height="340" rx="3" fill="white" fillOpacity="0.3" />
        {/* Antenna tall */}
        <rect x="543" y="20" width="4" height="40" fill="white" fillOpacity="0.32" />
        <circle cx="545" cy="17" r="4" fill="white" fillOpacity="0.4" />

        <rect x="590" y="150" width="50" height="250" rx="2" fill="white" fillOpacity="0.22" />

        <rect x="660" y="110" width="55" height="290" rx="3" fill="white" fillOpacity="0.26" />

        <rect x="730" y="190" width="40" height="210" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="790" y="70" width="65" height="330" rx="3" fill="white" fillOpacity="0.28" />
        <rect x="820" y="40" width="3" height="30" fill="white" fillOpacity="0.3" />

        <rect x="870" y="180" width="50" height="220" rx="2" fill="white" fillOpacity="0.2" />

        <rect x="940" y="130" width="55" height="270" rx="3" fill="white" fillOpacity="0.24" />

        <rect x="1010" y="200" width="45" height="200" rx="2" fill="white" fillOpacity="0.18" />

        <rect x="1070" y="100" width="60" height="300" rx="3" fill="white" fillOpacity="0.25" />
        <rect x="1098" y="70" width="3" height="30" fill="white" fillOpacity="0.3" />

        <rect x="1145" y="170" width="45" height="230" rx="2" fill="white" fillOpacity="0.2" />
      </svg>
    </div>
  );
}

/**
 * WaveShape — Complex flowing wave SVG that divides the page.
 * Contains the gradient fill and the city skyline.
 */
function WaveShape() {
  return (
    <div className="landing-wave absolute inset-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute top-0 right-0 h-full"
        style={{ width: '65%', minHeight: '100%' }}
        viewBox="0 0 800 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5722" />
            <stop offset="35%" stopColor="#e91e63" />
            <stop offset="70%" stopColor="#9c27b0" />
            <stop offset="100%" stopColor="#673ab7" />
          </linearGradient>
        </defs>
        <path
          d="M200,-20 C180,80 100,120 80,200 C55,300 120,350 100,450 C80,540 20,560 40,650 C60,740 140,760 160,820 C175,870 160,900 200,920 L820,920 L820,-20 Z"
          fill="url(#waveGradient)"
        />
      </svg>
      {/* City skyline inside the wave area */}
      <div className="absolute top-0 right-0 h-full overflow-hidden" style={{ width: '65%' }}>
        <CitySkylineSVG />
      </div>
    </div>
  );
}

/**
 * ThemeButton — Moon/Sun toggle for the landing page header.
 */
function ThemeButton() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  return (
    <button
      onClick={cycleTheme}
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-sm hover:bg-accent transition-all duration-300"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      <Icon className="h-4 w-4 text-foreground transition-transform duration-300" />
    </button>
  );
}

/**
 * useScrollReveal — Intersection Observer hook for section entry animations.
 */
function useScrollReveal() {
  const sectionRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('section-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const addRef = useCallback((el) => {
    if (el && !sectionRefs.current.includes(el)) {
      sectionRefs.current.push(el);
    }
  }, []);

  return addRef;
}

/* =====================================================================
   SPOTLIGHT CARD — Glassmorphism with mouse-tracking glow
   ===================================================================== */
function SpotlightCard({ icon: Icon, title, description }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }
  };

  return (
    <div ref={cardRef} onMouseMove={handleMouseMove} className="spotlight-card rounded-2xl p-8">
      <div className="relative z-10">
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722]/20 to-[#673ab7]/20">
          <Icon className="h-6 w-6 text-[#e91e63]" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* =====================================================================
   FEATURES SECTION — Glassmorphism grid
   ===================================================================== */
const FEATURES = [
  {
    icon: Archive,
    title: 'MERN Archiving',
    description:
      'Efficient management and archiving of capstone projects with full-text search, version control, and dual-format storage for academic and journal versions.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    description:
      'Secure authentication with specific workflows for Students, Advisers, Panelists, and Instructors — each role sees only what they need.',
  },
  {
    icon: Server,
    title: 'System Architecture',
    description:
      'A robust MERN backend optimized for performance and scalability, with real-time notifications, queued jobs, and automated plagiarism checking.',
  },
  {
    icon: BookOpen,
    title: 'Documentation Hub',
    description:
      'Centralized storage for comprehensive capstone manuscripts — submit chapters individually, compile proposals, and track revisions with inline comments.',
  },
];

function FeaturesSection({ sectionRef }) {
  return (
    <section
      id="features"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 -z-10 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #e91e63, transparent)',
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-[#ff5722]/10 to-[#673ab7]/10 text-[#e91e63] mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Everything you need to succeed
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Built specifically for the capstone workflow — from proposal drafting to final defense
            archiving.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   ABOUT SECTION — Bento Grid (System-focused)
   ===================================================================== */
function AboutSection({ sectionRef }) {
  return (
    <section
      id="about"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-[#ff5722]/10 to-[#673ab7]/10 text-[#e91e63] mb-4">
            About
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">What is CMS?</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            A comprehensive capstone management and archiving system designed to streamline the
            entire research lifecycle — from team formation to final defense.
          </p>
        </div>

        {/* Bento grid — 4 columns on lg, 2 on sm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-min">
          {/* Card 1 — Large: System Overview (spans 2 cols + 2 rows) */}
          <div className="bento-card sm:col-span-2 lg:row-span-2 rounded-2xl border border-border bg-card p-8 flex flex-col justify-between">
            <div>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722]/20 to-[#673ab7]/20">
                <Layers className="h-5 w-5 text-[#e91e63]" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                End-to-End Capstone Workflow
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                CMS covers the full capstone lifecycle across four phases — Preliminaries &
                Proposal, Development & Implementation, Final Defense, and Archiving. Students form
                teams, submit proposals, upload chapters for review, and compile final manuscripts —
                all within a single, unified platform.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Built-in plagiarism detection, real-time notifications, and deadline enforcement
                ensure academic integrity at every step, while advisers and panelists collaborate
                through inline document annotations.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-[#ff5722] to-[#673ab7] opacity-40" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Full Lifecycle
              </span>
            </div>
          </div>

          {/* Card 2 — Medium: Tech Stack (spans 2 cols) */}
          <div className="bento-card sm:col-span-2 rounded-2xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722]/20 to-[#673ab7]/20">
              <Cpu className="h-5 w-5 text-[#e91e63]" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-4">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'MongoDB',
                'Express.js',
                'React',
                'Node.js',
                'Tailwind CSS',
                'Socket.io',
                'Redis',
                'Vite',
              ].map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Card 3 — Small: User Roles */}
          <div className="bento-card rounded-2xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722]/20 to-[#673ab7]/20">
              <Users className="h-5 w-5 text-[#e91e63]" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">User Roles</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ff5722] shrink-0" />
                Students & Team Leaders
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#e91e63] shrink-0" />
                Advisers & Panelists
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#673ab7] shrink-0" />
                Instructors (Admin)
              </li>
            </ul>
          </div>

          {/* Card 4 — Small: Key Capabilities */}
          <div className="bento-card rounded-2xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff5722]/20 to-[#673ab7]/20">
              <ClipboardCheck className="h-5 w-5 text-[#e91e63]" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Key Capabilities</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#ff5722] shrink-0" />
                Plagiarism detection & originality scoring
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#673ab7] shrink-0" />
                Searchable research archive with filters
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   FAQ SECTION — Searchable accordion (ghost style)
   ===================================================================== */
const FAQ_DATA = [
  {
    q: 'How does the archiving system handle large manuscript files?',
    a: 'Files are uploaded to cloud storage (S3-compatible) with configurable size limits. The system stores both the full academic version and a condensed journal version, using background jobs for text extraction and plagiarism analysis.',
  },
  {
    q: 'Is CMS compatible with mobile browsers?',
    a: 'Yes. The entire interface is built responsively with Tailwind CSS, ensuring a smooth experience across desktop, tablet, and mobile devices.',
  },
  {
    q: 'What security measures are in place?',
    a: 'CMS uses JWT-based authentication, OTP email verification, role-based access control, rate limiting, CSRF protection, and secure file validation. All API endpoints are protected by layered middleware.',
  },
  {
    q: 'Can panelists review documents directly in the system?',
    a: 'Yes. Advisers and panelists can open documents in a split-screen viewer with inline highlighting and commenting tools, enabling chapter-by-chapter feedback without downloading files.',
  },
  {
    q: 'How does the plagiarism checker work?',
    a: 'Uploaded documents pass through an automated originality pipeline that extracts text, compares it against the archive database, and displays the percentage of original content before advisers review the submission.',
  },
  {
    q: 'What happens if a team misses a submission deadline?',
    a: 'Late submissions are accepted but the system requires the team to add a mandatory "remarks" section explaining the delay. The timestamp is recorded permanently in the audit log.',
  },
  {
    q: 'Can project titles be modified after approval?',
    a: 'Only through a formal request. The team must submit a title modification request to the Instructor, and the title status changes to "Pending" until the Instructor approves the change.',
  },
];

function FAQSection({ sectionRef }) {
  const [search, setSearch] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = FAQ_DATA.filter(
    (item) =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-[#ff5722]/10 to-[#673ab7]/10 text-[#e91e63] mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Frequently asked questions
          </h2>
        </div>

        {/* Search bar */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpenIndex(null);
            }}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#e91e63]/40 transition-all"
          />
        </div>

        {/* Accordion list */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No matching questions found.
            </p>
          )}
          {filtered.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={item.q} className="faq-item rounded-xl px-5">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`faq-answer ${isOpen ? 'faq-open' : ''}`}>
                  <div>
                    <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
   FOOTER
   ===================================================================== */
function Footer() {
  return (
    <footer className="border-t border-border py-10 px-6 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">CMS — Capstone Management System</span>
        </div>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Patrick Josh S. Añedez. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/**
 * LandingPage — Full landing page with hero, about, features, FAQ, and footer.
 */
export default function LandingPage() {
  const heroRef = useRef(null);
  const addSectionRef = useScrollReveal();

  useEffect(() => {
    // Trigger hero entry animations after mount
    const timer = setTimeout(() => {
      heroRef.current?.classList.add('landing-loaded');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-background transition-colors duration-500">
      {/* ===== HERO SECTION ===== */}
      <div ref={heroRef} id="home" className="landing-hero relative min-h-screen overflow-hidden">
        {/* === Gradient Wave Background === */}
        <WaveShape />

        {/* === Subtle shadow overlay on the light foreground side === */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, transparent 55%, rgba(0,0,0,0.03) 55%, rgba(0,0,0,0.03) 100%)',
          }}
        />

        {/* === Header / Navigation === */}
        <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-foreground" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              CMS{' '}
              <span className="font-normal text-muted-foreground">Capstone Management System</span>
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {['Home', 'About', 'Features', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          {/* Right actions */}
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

        {/* === Hero Content (Left Foreground) === */}
        <main className="relative z-10 flex flex-col justify-center px-6 md:px-12 lg:px-20 pt-12 md:pt-24 lg:pt-32 pb-20 max-w-2xl">
          {/* Headline */}
          <h1 className="landing-title text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
            Manage your{' '}
            <span className="bg-gradient-to-r from-[#ff5722] to-[#673ab7] bg-clip-text text-transparent">
              capstone
            </span>{' '}
            projects with confidence.
          </h1>

          {/* Subtext */}
          <p className="landing-subtitle mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-lg">
            A comprehensive archiving and management system for your capstone journey — from
            proposal to final defense. Submit, review, and track your progress in one place.
          </p>

          {/* CTA Buttons */}
          <div className="landing-buttons mt-10 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="landing-btn-gradient inline-flex items-center justify-center rounded-lg px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #ff5722, #e91e63, #673ab7)',
                backgroundSize: '200% 200%',
              }}
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

          {/* Stats strip */}
          <div className="landing-stats mt-16 flex gap-10">
            {[
              { value: '500+', label: 'Projects Archived' },
              { value: '120+', label: 'Teams Active' },
              { value: '98%', label: 'Completion Rate' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </main>

        {/* === Scroll Indicator === */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 landing-scroll-hint">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">Scroll</span>
            <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/40 flex items-start justify-center pt-1">
              <div className="h-2 w-1 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
          </div>
        </div>
      </div>

      {/* ===== ABOUT SECTION ===== */}
      <AboutSection sectionRef={addSectionRef} />

      {/* ===== FEATURES SECTION ===== */}
      <FeaturesSection sectionRef={addSectionRef} />

      {/* ===== FAQ SECTION ===== */}
      <FAQSection sectionRef={addSectionRef} />

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}
