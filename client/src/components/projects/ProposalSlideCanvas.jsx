import React from 'react';
import { BUKSU_COT_LOGO_BASE64, BUKSU_IT_LOGO_BASE64 } from '@/assets/logoBase64';
import { cn } from '@/lib/utils';

/**
 * Domain-specific BukSU Capstone Slide Fallbacks
 * Used when a proposal draft has empty fields or only blank bullet markers.
 */
const SLIDE_FALLBACKS = {
  statement: [
    'Current manual and paper-based tracking processes lack real-time visibility and institutional auditability.',
    'Absence of automated validation creates compliance bottlenecks, document loss, and defense scheduling delays.',
    'Lack of centralized tracking creates operational friction between student proponents, advisers, and defense panels.',
  ],
  solution: [
    'An end-to-end web platform integrating automated workflows, real-time tracking, and role-based permissions.',
    'Features integrated originality scanning and multi-signatory digital approvals.',
    'Enforces institutional compliance across all capstone stages from proposal to final archiving.',
  ],
  innovation: [
    'Dual-engine similarity detection combining lexical Rabin-Karp winnowing and semantic vector embeddings.',
    'Automated rubric-driven milestone clearance with real-time Action Done Matrix (ADM) verification.',
    'Strict defense committee governance and automated archival certificate generation.',
  ],
  users: [
    'BukSU BSIT Senior Capstone Students and Proponents.',
    'Faculty Capstone Advisers, Defense Panel Chairs, and Panel Members.',
    'Capstone Coordinators, Department Secretaries, and College Leadership.',
  ],
  impact: [
    'Reduces defense review turnaround times and operational coordination overhead by over 60%.',
    'Eliminates physical routing delays and provides complete tamper-evident audit trails.',
    'Ensures 100% adherence to BukSU College of Technologies capstone policies and standards.',
  ],
  qa: [
    'Open for Defense Committee questions, methodological clarifications, and panel feedback.',
    'Committee remarks will be systematically recorded in the Action Done Matrix (ADM) for revision compliance.',
  ],
};

/**
 * Format string into bullet point items with clean stripping of existing bullets
 * and automatic injection of domain defaults if text is empty or blank.
 */
function formatToBullets(content, slideType = 'statement', maxBullets = 5) {
  if (!content || typeof content !== 'string') {
    return (
      SLIDE_FALLBACKS[slideType] || ['Capstone research project details under committee review.']
    );
  }

  // Strip leading bullet markers (*, -, •), numbers, and whitespace
  const rawLines = content.split(/\r?\n/);
  const cleanedLines = rawLines
    .map((line) =>
      line
        .replace(/^[-•*]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim(),
    )
    .filter((line) => line.length > 0 && line !== '•' && line !== '-' && line !== '*');

  if (cleanedLines.length > 1) {
    return cleanedLines.slice(0, maxBullets);
  }

  if (cleanedLines.length === 1) {
    const single = cleanedLines[0];
    const sentences = single
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    if (sentences.length > 1) {
      return sentences.slice(0, maxBullets);
    }
    if (sentences.length === 1 && single.length > 8) {
      return [single];
    }
  }

  // Fallback if no valid text was parsed
  return (
    SLIDE_FALLBACKS[slideType] || ['Capstone research project details under committee review.']
  );
}

/**
 * High-fidelity 16:9 BukSU Institutional Proposal Slide Canvas
 * Matches the official university defense deck template.
 */
export default function ProposalSlideCanvas({
  slide,
  proponents = '',
  teamName = '',
  academicYear: _academicYear = 'AY 2025–2026',
  className = '',
  fullscreen: _fullscreen = false,
}) {
  if (!slide) return null;

  const isCover = slide.type === 'cover' || slide.id === 1;
  const slideNumberStr = slide.numberStr || String(slide.id || 1).padStart(2, '0');
  const categoryStr = slide.category || slide.tag || '';
  const slideTitle =
    slide.title || (isCover ? 'Capstone Project Proposal Pitch' : 'Problem Statement');

  // Standard BukSU Institutional Footer Banner
  const renderOrangeBanner = () => (
    <div
      data-slide-footer="true"
      className="bg-[#FF7300] w-full px-2.5 py-1 sm:px-5 sm:py-2 flex items-center justify-between text-black shrink-0 relative z-10 select-none overflow-hidden"
    >
      {/* Discreet Slide Indicator, Category & Proponents info */}
      <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-xs text-black/90 pr-2 overflow-hidden">
        <span className="font-mono font-bold shrink-0 text-black">SLIDE {slideNumberStr}</span>
        <span className="truncate opacity-90 text-black font-medium">
          {categoryStr ? `· ${categoryStr}` : ''}
          {teamName ? ` · ${teamName}` : ''}
          {proponents ? ` (${proponents})` : ''}
        </span>
      </div>

      {/* Right side: Institutional Hierarchy + Two Logos */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
        <div className="text-right leading-[1.1] sm:leading-tight">
          <div className="font-extrabold text-[7.5px] sm:text-[10px] md:text-xs tracking-tight text-black whitespace-nowrap">
            BUKIDNON STATE UNIVERSITY
          </div>
          <div className="font-extrabold text-[7.5px] sm:text-[10px] md:text-xs tracking-tight text-black whitespace-nowrap">
            COLLEGE OF TECHNOLOGIES
          </div>
          <div className="font-normal text-[6.5px] sm:text-[9px] md:text-[11px] text-black whitespace-nowrap">
            Information Technology Department
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <img
            src={BUKSU_COT_LOGO_BASE64}
            alt="BukSU College of Technologies Seal"
            className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 object-contain drop-shadow-xs shrink-0"
          />
          <img
            src={BUKSU_IT_LOGO_BASE64}
            alt="BukSU IT Department Shield"
            className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 object-contain drop-shadow-xs shrink-0"
          />
        </div>
      </div>
    </div>
  );

  if (isCover) {
    return (
      <div
        data-slide-canvas="cover"
        className={cn(
          'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-[#0B3064] relative select-none',
          className,
        )}
      >
        {/* Main Title Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-4 sm:py-8 text-center my-auto">
          <h1
            style={{ color: '#FFA726' }}
            className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[#FFA726] leading-tight max-w-4xl drop-shadow-sm"
          >
            {slideTitle}
          </h1>
        </div>

        {/* Vibrant Orange Footer Banner with Institutional Logos */}
        {renderOrangeBanner()}
      </div>
    );
  }

  // Content Slides
  const bullets =
    slide.type === 'alignment'
      ? []
      : formatToBullets(slide.content || slide.subtitle || '', slide.type || 'statement');

  return (
    <div
      data-slide-canvas="content"
      className={cn(
        'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-white !text-slate-900 relative select-none',
        className,
      )}
    >
      {/* Top Slide Header: Bold + Italic with guaranteed dark contrast */}
      <div className="px-6 sm:px-10 pt-5 sm:pt-8 pb-2 shrink-0">
        <h2
          style={{ color: '#0f172a' }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic !text-slate-900 tracking-tight"
        >
          {slideTitle}
        </h2>
      </div>

      {/* Main Slide Content Area with Bulleted List */}
      <div className="flex-1 px-6 sm:px-10 py-2 sm:py-4 overflow-y-auto my-auto">
        {slide.type === 'alignment' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-1">
            <div className="space-y-2 sm:space-y-3">
              <h3
                style={{ color: '#0B3064' }}
                className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider text-[#0B3064]"
              >
                IT Fields of Discipline
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base lg:text-lg text-slate-700 list-disc list-inside">
                {(slide.disciplines && slide.disciplines.length > 0
                  ? slide.disciplines
                  : ['Software Engineering & Web Applications']
                ).map((d, i) => (
                  <li
                    key={i}
                    style={{ color: '#334155' }}
                    className="leading-relaxed !text-slate-700 font-medium"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h3
                style={{ color: '#047857' }}
                className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider text-emerald-700"
              >
                Target UN SDGs
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base lg:text-lg text-slate-700 list-disc list-inside">
                {(slide.sdgs && slide.sdgs.length > 0
                  ? slide.sdgs
                  : ['SDG 4: Quality Education']
                ).map((s, i) => (
                  <li
                    key={i}
                    style={{ color: '#334155' }}
                    className="leading-relaxed !text-slate-700 font-medium"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul
            style={{ color: '#1e293b' }}
            className={cn(
              'list-disc list-outside pl-6 sm:pl-8 !text-slate-800 font-medium leading-relaxed',
              bullets.length <= 2
                ? 'space-y-4 sm:space-y-6 md:space-y-8 text-sm sm:text-lg md:text-xl lg:text-2xl'
                : bullets.length <= 3
                  ? 'space-y-3 sm:space-y-5 md:space-y-6 text-xs sm:text-base md:text-lg lg:text-xl'
                  : 'space-y-2 sm:space-y-3 md:space-y-4 text-xs sm:text-sm md:text-base lg:text-lg',
            )}
          >
            {bullets.map((item, idx) => (
              <li
                key={idx}
                style={{ color: '#1e293b' }}
                className="marker:text-slate-500 !text-slate-800 font-medium leading-relaxed"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vibrant Orange Footer Banner with Institutional Logos */}
      {renderOrangeBanner()}
    </div>
  );
}
