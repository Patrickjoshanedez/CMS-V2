import { Archive, ShieldCheck, Server, BookOpen } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

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

export function FeaturesSection({ sectionRef }) {
  return (
    <section
      id="features"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      {/* Subtle gradient backdrop - inline style required for radial-gradient
          #e91e63 = brand-pink (hsl(var(--brand-pink))) */}
      <div className="absolute inset-0 -z-10 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, hsl(var(--brand-pink)), transparent)',
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-brand-orange/10 to-brand-deep-purple/10 text-brand-pink mb-4">
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
