import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Search,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  FileCheck2,
  Users,
  Compass,
  ChevronRight,
  Menu,
  X,
  ChevronDown,
  Layers,
  Scale,
  Award,
  FileText,
  Lock,
  Building2,
  MapPin,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/authStore';
import buksuLogo from '@/assets/buksu-logo.png';
import buksuStudiesCenter from '@/assets/buksu-studies-center.jpg';

/**
 * BukSU Institutional Landing Page —
 * Unifies the landing experience with collegiate BukSU identity, university royal blue (#1A448A),
 * academic gold (#E5A823), deep obsidian navy (#071329 / #0B1B3D), and architectural gridlines.
 * Matches the login page and Proposal Studio dashboards with 100% institutional consistency.
 */
export default function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // ---------------------------------------------------------------------------
  // Milestone Pipeline Data (The 4 Stages of Ratification)
  // ---------------------------------------------------------------------------
  const PIPELINE_STAGES = [
    {
      step: '01',
      title: 'Title Screening',
      desc: 'Automated cosine similarity and keyword search against the institutional 5-year BukSU thesis repository to guarantee research novelty.',
      icon: Search,
      tag: 'Capstone 1',
    },
    {
      step: '02',
      title: 'Pitch Ratification',
      desc: 'Defense of candidate proposals before faculty panel to establish problem scope, target beneficiaries, and literature gap.',
      icon: FileCheck2,
      tag: 'Title Defense',
    },
    {
      step: '03',
      title: 'Chapter 1–3 Build',
      desc: 'Standardized manuscript drafting with autosave, automated revision tracking, plagiarism detection (<25%), and APA 7th compliance.',
      icon: BookOpen,
      tag: 'Capstone 2',
    },
    {
      step: '04',
      title: 'Institutional Archival',
      desc: 'Final panel rubric clearance, Dean sign-off, Secretary ADM compliance gate, S3/MinIO digital vaulting, and sealed completion certificates.',
      icon: ShieldCheck,
      tag: 'Capstone 4',
    },
  ];

  // ---------------------------------------------------------------------------
  // Archived Theses Samples (College Research Vault)
  // ---------------------------------------------------------------------------
  const ARCHIVED_THESES = [
    {
      id: 'THESIS-2024-019',
      title: 'Decentralized Barangay Disaster Response and Resource Dispatch Platform',
      year: 'A.Y. 2023–2024',
      beneficiary: 'MDRRMO Malaybalay',
      stack: ['PWA', 'Leaflet.js', 'CouchDB', 'Node.js'],
      score: '11.8% Similarity',
    },
    {
      id: 'THESIS-2024-044',
      title: 'Edge-Based Automated Post-Harvest Grain Defect Classifier with Mechanical Sorting',
      year: 'A.Y. 2023–2024',
      beneficiary: 'Local Agricultural Cooperatives',
      stack: ['Jetson Nano', 'YOLOv8', 'Express', 'MQTT'],
      score: '14.2% Similarity',
    },
    {
      id: 'THESIS-2023-012',
      title: 'Integrated Campus Laboratory Inventory & Equipment Calibration Tracker',
      year: 'A.Y. 2022–2023',
      beneficiary: 'BukSU IT Department',
      stack: ['React', 'Express', 'PostgreSQL', 'Redis'],
      score: '9.6% Similarity',
    },
  ];

  // ---------------------------------------------------------------------------
  // Clearance Standards Matrix
  // ---------------------------------------------------------------------------
  const CLEARANCE_STANDARDS = [
    {
      metric: '≤ 25.0%',
      title: 'Plagiarism Tolerance Cap',
      desc: 'Dual-engine originality screening using Winnowing fingerprinting and SentenceTransformers embeddings across institutional archives.',
      badge: 'Academic Integrity',
    },
    {
      metric: '≥ 75.0%',
      title: 'Composite Defense Passing Threshold',
      desc: 'Consolidated committee rubric scores validated against institutional standards and confirmed by the Defense Panel Chair.',
      badge: 'Panel Evaluation',
    },
    {
      metric: 'Tier-Gated',
      title: 'Secretary Compliance Gate',
      desc: 'Committee digital sign-offs remain locked until the Committee Secretary certifies complete student revision compliance.',
      badge: 'ADM Ratification',
    },
    {
      metric: '100% Vaulted',
      title: 'MinIO Institutional Archival',
      desc: 'Full 5-chapter manuscript and sealed completion certificate PDF securely registered into university permanent storage.',
      badge: 'Permanent Catalog',
    },
  ];

  // ---------------------------------------------------------------------------
  // Institutional FAQ Data
  // ---------------------------------------------------------------------------
  const FAQ_ITEMS = [
    {
      q: 'How does candidate title similarity pre-screening work?',
      a: 'When proponents submit candidate proposals, CMS-V2 extracts the proposed title and abstract, executing real-time cosine similarity pre-scans against the 5-year BukSU thesis archive. Titles exceeding the institutional threshold trigger divergence recommendations to ensure research novelty.',
    },
    {
      q: 'What is the role of the Committee Secretary during defense hearings?',
      a: 'The Committee Secretary logs live defense minutes categorized across 6 institutional domains (Manuscript, System Architecture, UI/UX, Database, Methodology, General). Upon defense conclusion, the Secretary publishes minutes directly into the Action Done Matrix (ADM) and holds the compliance endorsement key.',
    },
    {
      q: 'How does the Secretary Compliance Verification Endorsement Gate work?',
      a: 'Under BukSU institutional capstone governance, committee members cannot digitally sign off on the Action Done Matrix until the Committee Secretary submits formal compliance verification (project.admSignatures.secretary.endorsed = true), confirming that proponents fulfilled all panel critiques.',
    },
    {
      q: 'How are defense committees appointed and structured?',
      a: 'The Course Instructor assigns defense committees exclusively from the Faculty roster: 1 Adviser, 1 Secretary, and 3 Panelists (Lead/Chair, Member, and Panel Member 3). Course Instructors are strictly prohibited from serving on committees to maintain impartial academic oversight.',
    },
    {
      q: 'What happens if a milestone deadline is missed during system development?',
      a: 'The system allows late milestone submissions but strictly intercepts the submission with a mandatory late justification remarks modal (isLate = true). Proponents must state root causes and recovery schedules, which are permanently logged for faculty review.',
    },
    {
      q: 'Can project titles or team rosters be modified after proposal approval?',
      a: 'Team rosters are permanently locked via Phase 0 verification (PATCH /api/teams/:id/lock). Title amendments require a formal institutional request forwarded through the Course Instructor with justification and similarity re-screening before approval.',
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!faqSearch.trim()) return FAQ_ITEMS;
    const q = faqSearch.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
    );
  }, [faqSearch]);

  const toggleFaq = (idx) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 dark:bg-[#071329] dark:text-slate-100 transition-colors duration-200 selection:bg-[#E5A823] selection:text-[#071329]">
      {/* =========================================================================
          1. INSTITUTIONAL NAVBAR (STICKY, FIXED H-20 WITH OFFICIAL BUKSU BRANDING)
         ========================================================================= */}
      <header className="sticky top-0 z-50 border-b border-slate-300 bg-white/95 backdrop-blur-md dark:border-[#1E3356] dark:bg-[#071329]/95 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Official University Monogram & Department Badge */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#E5A823] p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
              <img
                src={buksuLogo}
                alt="Bukidnon State University Seal"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  BukSU CMS
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#E5A823]/20 border border-[#E5A823]/40 text-[#B45309] dark:text-[#E5A823] rounded">
                  COT
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 hidden xs:inline-block">
                Capstone Archiving & Evaluation
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Nodes */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a
              href="#pipeline"
              className="hover:text-[#1A448A] dark:hover:text-[#E5A823] transition-colors"
            >
              Defense Pipeline
            </a>
            <a
              href="#repository"
              className="hover:text-[#1A448A] dark:hover:text-[#E5A823] transition-colors"
            >
              Archived Repositories
            </a>
            <a
              href="#standards"
              className="hover:text-[#1A448A] dark:hover:text-[#E5A823] transition-colors"
            >
              Clearance Standards
            </a>
            <a
              href="#facility"
              className="hover:text-[#1A448A] dark:hover:text-[#E5A823] transition-colors"
            >
              Campus Facility
            </a>
            <a
              href="#faq"
              className="hover:text-[#1A448A] dark:hover:text-[#E5A823] transition-colors"
            >
              Faculty & FAQ
            </a>
          </nav>

          {/* System Utilities & CTAs */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Unified Institutional Theme Toggle */}
            <ThemeToggle />

            {/* Sign In / Dashboard Link */}
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white border border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#0B1B3D] hover:bg-slate-100 dark:hover:bg-[#132752] transition-all"
            >
              {isAuthenticated ? 'Dashboard' : 'Sign In'}
            </Link>

            {/* Submit Proposal Primary Action Button */}
            <Link
              to={isAuthenticated ? '/project/create' : '/login'}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold rounded-lg text-[#071329] bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B] hover:brightness-110 shadow-sm transition-all items-center gap-1.5"
            >
              Submit Proposal <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-[#1E3356] dark:text-slate-300 dark:hover:bg-[#0B1B3D]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-[#1E3356] bg-white dark:bg-[#071329] px-6 py-4 space-y-3">
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5"
            >
              Defense Pipeline
            </a>
            <a
              href="#repository"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5"
            >
              Archived Repositories
            </a>
            <a
              href="#standards"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5"
            >
              Clearance Standards
            </a>
            <a
              href="#facility"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5"
            >
              Campus Facility
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 py-1.5"
            >
              Faculty & FAQ
            </a>
            <div className="pt-2 border-t border-slate-200 dark:border-[#1E3356] flex items-center gap-3">
              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#1E3356] text-slate-700 dark:text-slate-200"
              >
                {isAuthenticated ? 'Dashboard' : 'Sign In'}
              </Link>
              <Link
                to={isAuthenticated ? '/project/create' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-bold rounded-lg text-[#071329] bg-gradient-to-r from-[#F5C253] to-[#E5A823]"
              >
                Submit Proposal
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION: DUAL-COLUMN MANUSCRIPT SHOWCASE
         ========================================================================= */}
      <section className="relative pt-12 pb-24 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Institutional Architectural Grid (Blueprint Texture) */}
        <div
          className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1A448A 1px, transparent 1px),
              linear-gradient(to bottom, #1A448A 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />

        {/* Angular Geometric Louver Vectors (Mindanao & BukSU Canopy Facet Inspiration) */}
        <svg
          className="absolute right-0 top-6 w-[480px] h-[480px] opacity-10 text-[#E5A823] pointer-events-none hidden lg:block"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        >
          <polygon points="0,20 80,0 100,60 20,90" />
          <line x1="0" y1="20" x2="100" y2="60" />
          <line x1="80" y1="0" x2="20" y2="90" />
        </svg>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Narrative Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 bg-white dark:border-[#E5A823]/40 dark:bg-[#E5A823]/10 text-xs font-mono font-medium text-[#1A448A] dark:text-[#E5A823] shadow-sm">
              <Compass className="w-3.5 h-3.5 text-[#E5A823]" />
              BUKSU BSIT CAPSTONE PORTAL · AY 2025–2026
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Manage your capstone projects with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A448A] to-[#2563EB] dark:from-[#F5C253] dark:via-[#E5A823] dark:to-[#C68A1B]">
                institutional rigor.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              The centralized repository and defense management ledger for Bukidnon State
              University. Screen candidate titles for real-time similarity, draft standardized
              proposals, and maintain committee compliance from Title Defense to University Library
              Archiving.
            </p>

            {/* Action Group */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={isAuthenticated ? '/project/create' : '/login'}
                className="px-6 py-3 rounded-lg text-xs sm:text-sm font-bold text-[#071329] bg-gradient-to-r from-[#F5C253] to-[#E5A823] hover:brightness-110 shadow-md shadow-[#E5A823]/20 flex items-center gap-2 transition-all"
              >
                Enter Title Proposal Studio <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#repository"
                className="px-5 py-3 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#0B1B3D] hover:border-slate-400 dark:hover:border-[#E5A823]/40 transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-[#E5A823]" /> Query Archive
              </a>
            </div>

            {/* Verified Institutional Trust Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-6 border-t border-slate-300 dark:border-[#1E3356] font-mono">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-[#071329]/75 border border-slate-200 dark:border-[#1E3356] shadow-sm">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white block">
                  500+
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Archive
                </span>
                <span className="text-[9px] sm:text-[10px] text-[#1A448A] dark:text-[#E5A823] font-sans font-medium block mt-0.5">
                  Ratified Papers
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 dark:bg-[#071329]/75 border border-slate-200 dark:border-[#1E3356] shadow-sm">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white block">
                  ≤ 75%
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#1A448A] dark:text-[#E5A823] uppercase tracking-wider block">
                  Clearance
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium block mt-0.5">
                  Plagiarism Cap
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 dark:bg-[#071329]/75 border border-slate-200 dark:border-[#1E3356] shadow-sm">
                <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white block">
                  100%
                </span>
                <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  Audited
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-sans font-medium block mt-0.5">
                  Panel Verified
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Tactile Academic Manuscript Stack Card */}
          <div className="lg:col-span-5 relative">
            {/* Offset Ambient Glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#1A448A]/20 to-[#E5A823]/20 blur-xl opacity-60 dark:opacity-40 pointer-events-none" />

            <div className="relative rounded-xl border border-slate-300 bg-white p-6 shadow-xl dark:border-[#1E3356] dark:bg-[#0B1B3D] space-y-5">
              {/* Proposal Registry Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1E3356]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                    PROP-2026-BSIT-042
                  </span>
                </div>
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded bg-[#E5A823]/15 border border-[#E5A823]/40 text-[#B45309] dark:text-[#E5A823]">
                  Pre-Defense Stage
                </span>
              </div>

              {/* Candidate Pitch Entry */}
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Candidate Project Title
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  Edge-Assisted Cold Chain Monitoring System for Rural Health Units
                </h3>
              </div>

              {/* Live Plagiarism & Title Clearance Gauge */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-[#1E3356] dark:bg-[#071329] space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">
                    Institutional Similarity Index
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    12.4% (Cleared)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: '12.4%' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 font-mono">
                  <span>Threshold Limit: ≤ 75.0%</span>
                  <span>Status: Eligible for Ratification</span>
                </div>
              </div>

              {/* Committee Verification Badges */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Proponent roster locked with verified student IDs</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Literature gap & architectural framework specified</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>No unmitigated scope collision against archived BukSU records</span>
                </div>
              </div>

              {/* Bottom Verification Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#1E3356] flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>Committee Lead: College of Technologies</span>
                <span className="text-[#1A448A] dark:text-[#E5A823] font-bold">PASS VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SYSTEM PIPELINE (THE 4 STAGES OF RATIFICATION)
         ========================================================================= */}
      <section
        id="pipeline"
        className="py-20 px-4 sm:px-6 border-t border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#071329]"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#1A448A] dark:text-[#E5A823] uppercase">
              Structured Milestone Architecture
            </span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
              From Candidate Pitch to Library Bound
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              A unified lifecycle enforcing institutional research standards across all college
              sections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PIPELINE_STAGES.map((stage, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-300 bg-slate-50 p-6 shadow-sm hover:border-[#1A448A] dark:border-[#1E3356] dark:bg-[#0B1B3D] dark:hover:border-[#E5A823]/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold text-[#1A448A] dark:text-[#E5A823]">
                      {stage.step}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {stage.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <stage.icon className="w-5 h-5 text-[#1A448A] dark:text-[#E5A823]" />
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {stage.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. REPOSITORY ARCHIVE PREVIEW
         ========================================================================= */}
      <section id="repository" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold tracking-widest text-[#1A448A] dark:text-[#E5A823] uppercase">
              College Research Vault
            </span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white mt-1">
              Recently Archived Theses
            </h2>
          </div>
          <Link
            to="/archive"
            className="text-xs font-semibold text-[#1A448A] dark:text-[#E5A823] hover:underline flex items-center gap-1"
          >
            Browse complete university database <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ARCHIVED_THESES.map((thesis) => (
            <div
              key={thesis.id}
              className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm dark:border-[#1E3356] dark:bg-[#0B1B3D] flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>{thesis.id}</span>
                  <span className="text-[#1A448A] dark:text-[#E5A823] font-semibold">
                    {thesis.year}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {thesis.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Beneficiary:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {thesis.beneficiary}
                  </span>
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#1E3356] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {thesis.stack.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 border border-slate-300 text-slate-700 dark:bg-[#071329] dark:border-slate-700 dark:text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {thesis.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. CLEARANCE STANDARDS SECTION
         ========================================================================= */}
      <section
        id="standards"
        className="py-20 px-4 sm:px-6 border-t border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#071329]"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest text-[#1A448A] dark:text-[#E5A823] uppercase">
              Rigorous Evaluation Criteria
            </span>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
              Institutional Clearance Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Deterministic standards established by the College of Technologies to safeguard
              research integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CLEARANCE_STANDARDS.map((std, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-300 bg-slate-50 p-6 shadow-sm dark:border-[#1E3356] dark:bg-[#0B1B3D] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold font-mono text-[#1A448A] dark:text-[#E5A823]">
                    {std.metric}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#E5A823]/15 text-[#B45309] dark:text-[#E5A823] border border-[#E5A823]/30">
                    {std.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {std.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {std.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. BUKSU STUDIES CENTER & RESEARCH INFRASTRUCTURE
         ========================================================================= */}
      <section
        id="facility"
        className="py-20 px-4 sm:px-6 border-t border-slate-300 dark:border-[#1E3356] bg-slate-50 dark:bg-[#060E1D]"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-[#E5A823]/40 bg-white dark:bg-[#0B1B3D] text-xs font-mono font-medium text-[#1A448A] dark:text-[#E5A823]">
                <Building2 className="w-3.5 h-3.5 text-[#E5A823]" />
                <span>CAMPUS RESEARCH INFRASTRUCTURE</span>
              </div>
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
                BukSU Studies Center & IT Laboratories
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
                Where academic rigor meets engineering innovation. Modern defense chambers,
                collaborative development studios, and high-performance plagiarism computing nodes
                powering student capstone excellence in Malaybalay City.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E5A823]" />
                Malaybalay City, Bukidnon
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                8.156° N, 125.127° E
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Building Photo with Architectural Frame */}
            <div className="lg:col-span-7 relative group overflow-hidden rounded-2xl border border-slate-300 dark:border-[#1E3356] shadow-xl">
              <img
                src={buksuStudiesCenter}
                alt="Bukidnon State University Studies Center Architecture"
                className="w-full h-80 sm:h-96 object-cover object-center transform group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071329] via-[#071329]/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-mono">
                <span className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  BukSU Studies Center · Main Campus
                </span>
                <span className="text-[#E5A823] bg-[#071329]/80 px-2.5 py-1 rounded border border-[#E5A823]/40 backdrop-blur-sm">
                  College of Technologies
                </span>
              </div>
            </div>

            {/* Right: Institutional Capabilities Cards */}
            <div className="lg:col-span-5 space-y-4">
              {[
                {
                  title: 'Oral Defense Hearing Chambers',
                  desc: 'Dedicated deliberation suites equipped for hybrid panel hearings, real-time rubric scoring, and Action Done Matrix compliance verification.',
                  icon: Award,
                },
                {
                  title: 'Dual-Engine Plagiarism Cluster',
                  desc: 'High-performance computing cluster executing Winnowing n-gram and SentenceTransformers vector scans across the 5-year thesis repository.',
                  icon: ShieldCheck,
                },
                {
                  title: 'University Library Permanent Vault',
                  desc: 'Dean-ratified atomic archival into BukSU MinIO cloud storage with automated cryptographic completion certificate seals.',
                  icon: Layers,
                },
              ].map((cap, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#0B1B3D] shadow-sm hover:border-[#1A448A] dark:hover:border-[#E5A823]/50 transition-all flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#1A448A]/10 dark:bg-[#E5A823]/10 border border-[#1A448A]/20 dark:border-[#E5A823]/30 flex items-center justify-center flex-shrink-0 text-[#1A448A] dark:text-[#E5A823]">
                    <cap.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {cap.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FACULTY COMMITTEE & FAQ SECTION
         ========================================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold tracking-widest text-[#1A448A] dark:text-[#E5A823] uppercase">
            Committee Governance & Guidelines
          </span>
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Answers to common procedures regarding defense rubrics, committee workflows, and
            archival.
          </p>

          {/* Search Box */}
          <div className="relative max-w-md mx-auto pt-4">
            <Search className="absolute left-3.5 top-7 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search defense guidelines, rubrics, or policies..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-[#1E3356] bg-white dark:bg-[#0B1B3D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A448A] dark:focus:ring-[#E5A823]"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-300 bg-white dark:border-[#1E3356] dark:bg-[#0B1B3D] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? 'rotate-180 text-[#1A448A] dark:text-[#E5A823]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-[#1E3356]/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          8. STANDARDIZED INSTITUTIONAL FOOTER
         ========================================================================= */}
      <footer className="border-t border-slate-300 bg-white dark:border-[#1E3356] dark:bg-[#060E1D] py-12 px-4 sm:px-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Seal & Department Identity */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#E5A823] p-1 flex items-center justify-center shadow-md">
                <img
                  src={buksuLogo}
                  alt="Bukidnon State University"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Bukidnon State University · College of Technologies
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Malaybalay City, Bukidnon, Philippines 8700
                </span>
              </div>
            </div>

            {/* Regulatory & Institutional Compliance Badges */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ETHICS COMPLIANT
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                CHED MEMORANDUM 25 COMPLIANT
              </span>
              <span className="text-[#1A448A] dark:text-[#E5A823] font-bold">AY 2025–2026</span>
            </div>
          </div>

          {/* Institutional Status & Geo-Coordinates Bar (Direct Login Page Parity) */}
          <div className="py-2.5 px-4 rounded-lg bg-slate-50 dark:bg-[#071329] border border-slate-200 dark:border-[#1E3356] flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                PROJECT WORKSPACE V2.6
              </span>
              <span>·</span>
              <span>8.156° N, 125.127° E</span>
            </div>
            <span className="text-slate-600 dark:text-slate-400">
              BukSU College of Technologies · CHED CMO 25 Compliant
            </span>
          </div>

          {/* Bottom Copyright & Fast Links */}
          <div className="pt-6 border-t border-slate-200 dark:border-[#1E3356] flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-4">
            <p>
              &copy; {new Date().getFullYear()} BukSU Capstone Management System (CMS-V2). All
              rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link
                to="/login"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Register
              </Link>
              <Link
                to="/archive"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Archive Vault
              </Link>
              <a
                href="#pipeline"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Milestones
              </a>
              <a
                href="#facility"
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Campus
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
