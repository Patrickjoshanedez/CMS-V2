import React from 'react';
import { Link } from 'react-router-dom';
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
      data-dark-surface="true"
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

      {/* 2. Top Header & Official BukSU Institutional Seal (Clickable to Landing Page) */}
      <div className="relative z-10 flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center gap-3.5 group cursor-pointer hover:opacity-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-[#E5A823]/50 rounded-xl"
          title="Return to BukSU Capstone Portal Home"
        >
          <div className="w-11 h-11 rounded-xl bg-white border border-[#E5A823] p-1 flex items-center justify-center shadow-lg shadow-black/30 group-hover:scale-105 group-hover:border-[#F5C253] transition-all">
            <img
              src={buksuLogo}
              alt="Bukidnon State University Seal"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-[#E5A823] group-hover:text-[#F5C253] uppercase transition-colors">
              Bukidnon State University
            </h2>
            <p
              className="text-[11px] font-sans font-medium tracking-tight text-slate-200 group-hover:text-white transition-colors"
              style={{ color: '#e2e8f0' }}
            >
              College of Technologies · BSIT Capstone Studio
            </p>
          </div>
        </Link>
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

        <p
          className="text-xs xl:text-sm leading-relaxed font-sans max-w-md text-slate-200"
          style={{ color: '#e2e8f0' }}
        >
          Standardized submission lifecycle, dual plagiarism screening, Action Done Matrix (ADM)
          endorsement, and permanent archival under BukSU institutional standards.
        </p>

        {/* 3D Interactive Parallax Architecture Showcase Card */}
        <div
          data-dark-surface="true"
          className="relative rounded-2xl bg-[#071329]/92 border border-slate-700/60 dark:border-white/15 backdrop-blur-xl p-4.5 shadow-2xl transition-transform duration-100 ease-out overflow-hidden group"
          style={getStyle(18, 9)}
        >
          {/* Specular light highlight following mouse */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(229, 168, 35, 0.22) 0%, transparent 60%)`,
            }}
          />

          <div className="relative z-10 flex items-center justify-between pb-3 mb-3.5 border-b border-slate-700/60 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/50" />
              <span
                className="text-xs font-sans font-bold tracking-wider text-slate-200 uppercase"
                style={{ color: '#e2e8f0' }}
              >
                4-Phase Capstone Lifecycle
              </span>
            </div>
            <span
              className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#E5A823]/20 border border-[#E5A823]/50 text-[#F5C253] tracking-tight shadow-xs"
              style={{ color: '#F5C253' }}
            >
              Deterministic Gating
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3">
            {CAPSTONE_STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/70 dark:bg-white/5 border border-slate-700/50 dark:border-white/10 hover:border-[#E5A823]/50 hover:bg-slate-800/70 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] font-mono text-[#F5C253] font-bold uppercase tracking-wider"
                      style={{ color: '#F5C253' }}
                    >
                      {stage.phase}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-300" style={{ color: '#cbd5e1' }} />
                  </div>
                  <h3
                    className="text-xs font-semibold text-white leading-tight font-sans"
                    style={{ color: '#ffffff' }}
                  >
                    {stage.title}
                  </h3>
                  <p
                    className="text-[11px] leading-snug line-clamp-2 font-sans text-slate-300"
                    style={{ color: '#cbd5e1' }}
                  >
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* System Security & Compliance Footer */}
          <div className="relative z-10 mt-3.5 pt-3 border-t border-slate-700/60 dark:border-white/10 flex items-center justify-between text-[10.5px] font-sans px-1">
            <span
              className="flex items-center gap-1.5 text-slate-200 font-medium"
              style={{ color: '#e2e8f0' }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secretary Compliance Gate
            </span>
            <span
              className="flex items-center gap-1.5 text-[#F5C253] font-medium"
              style={{ color: '#F5C253' }}
            >
              <Database className="w-3.5 h-3.5" /> MinIO Vault
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom System Architectural Badge */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between text-xs text-slate-300 font-sans pt-3 border-t border-white/15 dark:border-[#1E3356]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-medium" style={{ color: '#e2e8f0' }}>
            BukSU CMS V2 · Full-Stack Capstone System
          </span>
        </div>
        <span className="text-[11px] text-[#F5C253] font-medium">College of Technologies</span>
      </div>
    </div>
  );
}

export default BukSULoginSidePanel;
