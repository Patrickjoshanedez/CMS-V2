import React from 'react';
import { Compass, GraduationCap, ShieldCheck, Library } from 'lucide-react';
import buksuCampusGate from '@/assets/buksu-campus-gate.jpg';
import buksuLogo from '@/assets/buksu-logo.png';

/**
 * BukSULoginSidePanel — Institutional side panel for authentication layouts.
 * Seamlessly blends the actual BukSU Main Campus Gate architectural photo with
 * Deep Navy, Academic Gold, blueprint coordinate gridlines, and official BukSU seal.
 */
export function BukSULoginSidePanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between w-full h-screen max-h-screen sticky top-0 px-8 pt-8 pb-10 xl:px-12 xl:pt-10 xl:pb-12 select-none overflow-hidden">
      {/* 1. Angular Canopy Facet Vectors (Inspired by BukSU Gate Architecture) */}
      <svg
        className="absolute right-0 top-1/4 w-[420px] h-[420px] opacity-15 text-[#E5A823] pointer-events-none z-1"
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

      {/* 3. Center Narrative & Institutional Trust Metrics */}
      <div className="relative z-10 max-w-lg space-y-4 xl:space-y-5 my-auto py-4 xl:py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5A823]/40 bg-[#0B1B3D]/80 backdrop-blur-md text-[#E5A823] text-xs font-medium shadow-sm">
          <Compass className="w-3.5 h-3.5" />
          <span>Research Integrity & Archival Registry</span>
        </div>

        <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug font-serif">
          Archiving innovation from <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]">
            proposal defense
          </span>{' '}
          to university catalog.
        </h1>

        <p className="text-xs xl:text-sm text-slate-200/90 leading-relaxed font-sans max-w-md">
          Standardized submission tracking, real-time title similarity clearance, and institutional
          capstone manuscript preservation under the BukSU academic council.
        </p>

        {/* Live Trust Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15 dark:border-[#1E3356]/80 font-mono">
          <div className="p-2.5 xl:p-3 rounded-lg bg-[#071329]/65 border border-white/10 dark:border-[#1E3356]/60 backdrop-blur-sm">
            <span className="text-[10px] xl:text-[11px] text-slate-400 uppercase tracking-wider block">
              Archive
            </span>
            <span className="text-lg xl:text-xl font-bold text-white">500+</span>
            <span className="text-[9px] xl:text-[10px] text-[#E5A823] font-sans font-medium block">
              Ratified Papers
            </span>
          </div>
          <div className="p-2.5 xl:p-3 rounded-lg bg-[#071329]/65 border border-white/10 dark:border-[#1E3356]/60 backdrop-blur-sm">
            <span className="text-[10px] xl:text-[11px] text-slate-400 uppercase tracking-wider block">
              Clearance
            </span>
            <span className="text-lg xl:text-xl font-bold text-white">&lt; 75%</span>
            <span className="text-[9px] xl:text-[10px] text-emerald-400 font-sans font-medium block">
              Plagiarism Cap
            </span>
          </div>
          <div className="p-2.5 xl:p-3 rounded-lg bg-[#071329]/65 border border-white/10 dark:border-[#1E3356]/60 backdrop-blur-sm">
            <span className="text-[10px] xl:text-[11px] text-slate-400 uppercase tracking-wider block">
              Campus
            </span>
            <span className="text-lg xl:text-xl font-bold text-white">Main</span>
            <span className="text-[9px] xl:text-[10px] text-slate-300 font-sans font-medium block">
              Malaybalay City
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom System Tag & Geo-Coordinates */}
      <div className="relative z-10 flex-shrink-0 flex items-center justify-between text-xs text-slate-400 font-mono pt-4 border-t border-white/15 dark:border-[#1E3356]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PROJECT WORKSPACE V2.6</span>
        </div>
        <span className="text-slate-400">8.156° N, 125.127° E</span>
      </div>
    </div>
  );
}

export default BukSULoginSidePanel;
