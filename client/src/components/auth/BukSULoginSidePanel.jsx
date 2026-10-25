import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Compass, ShieldCheck, Cpu, GitBranch, Layers, Database } from 'lucide-react';
import buksuLogo from '@/assets/buksu-logo.png';

/**
 * BukSULoginSidePanel — Institutional side panel for authentication layouts.
 * Shows the CMS-V2 academic lifecycle using the shared theme and institutional identity.
 */
export function BukSULoginSidePanel() {
  const CAPSTONE_STAGES = [
    {
      phase: 'Phase 0-1',
      title: 'Proposal & Title Defense',
      desc: 'Roster lock, SDG & discipline alignment, live vector archive similarity pre-scan.',
      icon: GitBranch,
      badge: 'Similarity Engine',
    },
    {
      phase: 'Phase 2',
      title: 'Chapters 1–3 Manuscript',
      desc: 'Dual plagiarism screening (Winnowing + SentenceTransformers), ADM v1 sign-off.',
      icon: Layers,
      badge: 'Integrity Check',
    },
    {
      phase: 'Phase 3',
      title: 'Prototype & Gantt Milestones',
      desc: 'System implementation tracking, milestone gating, and progress defense evaluation.',
      icon: Cpu,
      badge: 'Milestone Gate',
    },
    {
      phase: 'Phase 4',
      title: 'Final Defense & Archival',
      desc: 'Secretary compliance endorsement gate, 3-tier ADM ratification, MinIO permanent vault.',
      icon: ShieldCheck,
      badge: 'Permanent Archival',
    },
  ];

  return (
    <div className="relative sticky top-0 hidden h-dvh max-h-dvh w-full select-none flex-col justify-between overflow-hidden bg-primary px-8 pb-10 pt-8 text-primary-foreground lg:flex xl:px-12 xl:pb-12 xl:pt-10">
      {/* Institutional canopy line art */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/4 z-0 h-[420px] w-[420px] text-primary-foreground opacity-10"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <polygon points="0,20 80,0 100,60 20,90" />
        <line x1="0" y1="20" x2="100" y2="60" />
        <line x1="80" y1="0" x2="20" y2="90" />
      </svg>

      {/* 2. Top Header & Official BukSU Institutional Seal (Clickable to Landing Page) */}
      <div className="relative z-10 flex-shrink-0">
        <Button
          asChild
          variant="ghost"
          className="group h-auto min-h-11 gap-3.5 rounded-lg p-0 text-left text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:ring-warning"
        >
          <Link to="/" title="Return to BukSU Capstone Portal Home">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-buksu-gold-500 bg-white p-1 shadow-lg shadow-black/30 transition-transform group-hover:scale-105">
              <img
                src={buksuLogo}
                alt="Bukidnon State University Seal"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-widest text-buksu-gold-400 transition-colors group-hover:text-buksu-gold-300">
                Bukidnon State University
              </span>
              <span className="block text-[11px] font-medium tracking-tight text-primary-foreground/80 transition-colors group-hover:text-primary-foreground">
                College of Technologies · BSIT Capstone Studio
              </span>
            </span>
          </Link>
        </Button>
      </div>

      {/* 3. Center Narrative & Real System Architecture Stack */}
      <div className="relative z-10 max-w-lg space-y-4 xl:space-y-5 my-auto py-3 xl:py-4">
        <Badge
          variant="outline"
          className="gap-2 rounded-full border-primary-foreground/30 px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>System Architecture & Lifecycle Engine</span>
        </Badge>

        <h1 className="text-2xl font-bold leading-snug tracking-tight text-primary-foreground xl:text-3xl">
          Academic capstone governance from <br />
          <span className="text-buksu-gold-300">title proposal</span> to university archival.
        </h1>

        <p className="max-w-md text-xs leading-relaxed text-primary-foreground/80 xl:text-sm">
          Standardized submission lifecycle, dual plagiarism screening, Action Done Matrix (ADM)
          endorsement, and permanent archival under BukSU institutional standards.
        </p>

        {/* Capstone lifecycle overview */}
        <Card className="relative overflow-hidden rounded-xl border border-primary-foreground/20 bg-primary/80 p-4 text-primary-foreground shadow-lg">
          <div className="mb-3.5 flex items-center justify-between border-b border-primary-foreground/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-xs shadow-success/50" />
              <span className="text-xs font-bold uppercase tracking-wider text-primary-foreground/85">
                4-Phase Capstone Lifecycle
              </span>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-primary-foreground/30 px-2.5 py-0.5 text-[11px] font-semibold tracking-tight text-primary-foreground"
            >
              Deterministic Gating
            </Badge>
          </div>

          <div className="space-y-2.5">
            {CAPSTONE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <Card
                  key={stage.phase}
                  className="flex items-start gap-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 p-2.5 text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                >
                  <div className="mt-0.5 flex shrink-0 flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary-foreground/80">
                          {stage.phase}
                        </span>
                        <span className="text-[10px] text-primary-foreground/50">·</span>
                        <h3 className="truncate text-xs font-semibold leading-tight text-primary-foreground">
                          {stage.title}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary-foreground/25 bg-primary-foreground/5 px-1.5 py-0.5 text-[9.5px] font-mono text-primary-foreground/80"
                      >
                        {stage.badge}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-primary-foreground/75">
                      {stage.desc}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* System Security & Compliance Footer */}
          <div className="mt-3.5 flex items-center justify-between border-t border-primary-foreground/20 px-1 pt-3 text-[10.5px]">
            <span className="flex items-center gap-1.5 font-medium text-primary-foreground/85">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> Secretary Compliance Gate
            </span>
            <span className="flex items-center gap-1.5 font-medium text-primary-foreground/80">
              <Database className="h-3.5 w-3.5" /> MinIO Vault
            </span>
          </div>
        </Card>
      </div>

      {/* 4. Bottom System Architectural Badge */}
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between border-t border-primary-foreground/20 pt-3 text-xs text-primary-foreground/75">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="font-medium text-primary-foreground/85">
            BukSU CMS V2 · Full-Stack Capstone System
          </span>
        </div>
        <span className="text-[11px] font-medium text-buksu-gold-300">College of Technologies</span>
      </div>
    </div>
  );
}

export default BukSULoginSidePanel;
