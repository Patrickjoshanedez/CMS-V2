import { Layers, Cpu, Users, ClipboardCheck } from 'lucide-react';

/* =====================================================================
   ABOUT SECTION — Bento Grid (System-focused)
   ===================================================================== */
export function AboutSection({ sectionRef }) {
  return (
    <section
      id="about"
      ref={sectionRef}
      className="landing-section relative py-24 px-6 md:px-12 lg:px-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-gradient-to-r from-brand-orange/10 to-brand-deep-purple/10 text-brand-pink mb-4">
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
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/20 to-brand-deep-purple/20">
                <Layers className="h-5 w-5 text-brand-pink" />
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
              <div className="h-2 flex-1 rounded-full bg-gradient-to-r from-brand-orange to-brand-deep-purple opacity-40" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Full Lifecycle
              </span>
            </div>
          </div>

          {/* Card 2 — Medium: Tech Stack (spans 2 cols) */}
          <div className="bento-card sm:col-span-2 rounded-2xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/20 to-brand-deep-purple/20">
              <Cpu className="h-5 w-5 text-brand-pink" />
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
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/20 to-brand-deep-purple/20">
              <Users className="h-5 w-5 text-brand-pink" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">User Roles</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange shrink-0" />
                Students & Team Leaders
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-pink shrink-0" />
                Advisers & Panelists
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-deep-purple shrink-0" />
                Instructors (Admin)
              </li>
            </ul>
          </div>

          {/* Card 4 — Small: Key Capabilities */}
          <div className="bento-card rounded-2xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/20 to-brand-deep-purple/20">
              <ClipboardCheck className="h-5 w-5 text-brand-pink" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Key Capabilities</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-orange shrink-0" />
                Plagiarism detection & originality scoring
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-deep-purple shrink-0" />
                Searchable research archive with filters
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
