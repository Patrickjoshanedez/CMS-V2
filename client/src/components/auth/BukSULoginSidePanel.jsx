import React from 'react';
import {
  Compass,
  ShieldCheck,
  Cpu,
  Lock,
  GitBranch,
  Layers,
  FileCheck2,
  Database,
  ArrowRight,
} from 'lucide-react';
import buksuLogo from '@/assets/buksu-logo.png';
import { useParallax } from '@/hooks/useParallax';

/**
 * BukSULoginSidePanel — Institutional side panel for authentication layouts.
 * Showcases authentic BukSU CMS-V2 System Architecture and Capstone Progression
 * with CodePen-inspired multi-depth 3D parallax tilt, eliminating arbitrary numbers/metrics.
 */
export function BukSULoginSidePanel() {
  const { ref, coords, getTransform, getStyle } = useParallax({ ease: 0.08 });

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
    <div
      ref={ref}
      className="relative hidden lg:flex flex-col justify-between w-full h-screen max-h-screen sticky top-0 px-8 pt-8 pb-10 xl:px-12 xl:pt-10 xl:pb-12 select-none overflow-hidden"
      style={{
        perspective: '1200px',
      }}
    >
      {/* 1. Subtle Parallax Angular Canopy Facet Vectors */}
      <svg
        className="absolute right-0 top-1/4 w-[420px] h-[420px] opacity-15 text-[#E5A823] pointer-events-none z-1 transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${coords.x * -25}px, ${coords.y * -25}px, 0) rotate(${coords.x * 4}deg)`,
        }}
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
      >
        <polygon points="0,20 80,0 100,60 20,90" />
        <line x1="0" y1="20" x2="100" y2="60" />
        <line x1="80" y1="0" x2="20" y2="90" />
      </svg>

      {/* 2. Top Header & Official BukSU Institutional Seal */}
      <div className="relative z-10 flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white border border-[#E5A823] p-1 flex items-center justify-center shadow-lg shadow-black/30">
            <img
              src={buksuLogo}
              alt="Bukidnon State University Seal"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-[#E5A823] uppercase">
              Bukidnon State University
            </h2>
            <p className="text-[11px] font-mono text-slate-300 tracking-tight">
              College of Technologies · BSIT Capstone Studio
            </p>
          </div>
        </div>
      </div>

      {/* 3. Center Narrative & Real System Architecture Stack */}
      <div className="relative z-10 max-w-lg space-y-4 xl:space-y-5 my-auto py-3 xl:py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5A823]/40 bg-[#0B1B3D]/80 backdrop-blur-md text-[#E5A823] text-xs font-medium shadow-sm">
          <Compass className="w-3.5 h-3.5" />
          <span>System Architecture & Lifecycle Engine</span>
        </div>

        <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug font-serif">
          Academic capstone governance from <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]">
            title proposal
          </span>{' '}
          to university archival.
        </h1>

        <p className="text-xs xl:text-sm text-slate-200/90 leading-relaxed font-sans max-w-md">
          Standardized submission lifecycle, dual plagiarism screening, Action Done Matrix (ADM)
          endorsement, and permanent archival under BukSU institutional standards.
        </p>

        {/* 3D Interactive Parallax Architecture Showcase Card */}
        <div
          className="relative rounded-xl bg-[#071329]/80 border border-white/15 backdrop-blur-xl p-4 shadow-2xl transition-transform duration-100 ease-out overflow-hidden group"
          style={getStyle(18, 9)}
        >
          {/* Specular light highlight following mouse */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(229, 168, 35, 0.22) 0%, transparent 60%)`,
            }}
          />

          <div className="relative z-10 flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase">
                4-Phase Capstone Lifecycle
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E5A823]/20 border border-[#E5A823]/40 text-[#F5C253]">
              Deterministic Gating
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-2.5">
            {CAPSTONE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-[#E5A823]/40 hover:bg-white/10 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-[#E5A823] font-bold uppercase tracking-wider">
                      {stage.phase}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h3 className="text-xs font-semibold text-white leading-tight">{stage.title}</h3>
                  <p className="text-[10px] text-slate-300/80 leading-snug line-clamp-2">
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* System Security & Compliance Footer */}
          <div className="relative z-10 mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Secretary Compliance Gate
            </span>
            <span className="flex items-center gap-1 text-[#E5A823]">
              <Database className="w-3 h-3" /> MinIO Vault
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom System Architectural Badge */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between text-xs text-slate-400 font-mono pt-3 border-t border-white/15 dark:border-[#1E3356]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">
            BukSU CMS V2 · Full-Stack Capstone System
          </span>
        </div>
        <span className="text-[11px] text-[#E5A823]">College of Technologies</span>
      </div>
    </div>
  );
}

export default BukSULoginSidePanel;
