import React from 'react';
import { BUKSU_COT_LOGO_BASE64, BUKSU_IT_LOGO_BASE64 } from '@/assets/logoBase64';
import { cn } from '@/lib/utils';

/**
 * Format string into bullet point items.
 */
function formatToBullets(content, maxBullets = 5) {
  if (!content || typeof content !== 'string') {
    return ['No details provided for this section.'];
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.slice(0, maxBullets);
  }

  const sentences = content
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (sentences.length > 0) {
    return sentences.slice(0, maxBullets);
  }

  return [content.trim()];
}

/**
 * High-fidelity 16:9 BukSU Institutional Proposal Slide Canvas
 * Matches the official university defense deck template (Images 2 & 3).
 */
export default function ProposalSlideCanvas({
  slide,
  proponents = '',
  teamName = '',
  academicYear = 'AY 2025–2026',
  className = '',
  fullscreen = false,
}) {
  if (!slide) return null;

  const isCover = slide.type === 'cover' || slide.id === 1;
  const slideNumberStr = slide.numberStr || String(slide.id || 1).padStart(2, '0');

  // Standard BukSU Institutional Footer Banner (Images 2 & 3)
  const renderOrangeBanner = () => (
    <div className="bg-[#FF7300] w-full px-2.5 py-1 sm:px-5 sm:py-2 flex items-center justify-between text-black shrink-0 relative z-10 select-none overflow-hidden">
      {/* Discreet Slide Indicator, Category & Proponents info */}
      <div className="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-2 text-[8px] sm:text-xs text-black/90 pr-2 overflow-hidden">
        <span className="font-mono font-bold shrink-0">SLIDE {slideNumberStr}</span>
        <span className="truncate opacity-90">
          {slide.category ? `· ${slide.category}` : ''}
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
        className={cn(
          'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-[#0B3064] relative select-none',
          className,
        )}
      >
        {/* Main Title Area (Image 2) */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-4 sm:py-8 text-center my-auto">
          <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#FFA726] leading-tight max-w-4xl drop-shadow-sm">
            {slide.title}
          </h1>
        </div>

        {/* Vibrant Orange Footer Banner with Institutional Logos */}
        {renderOrangeBanner()}
      </div>
    );
  }

  // Content Slides (Image 3)
  const bullets =
    slide.type === 'alignment' ? [] : formatToBullets(slide.content || slide.subtitle || '');

  return (
    <div
      className={cn(
        'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-white text-slate-900 relative select-none',
        className,
      )}
    >
      {/* Top Slide Header: Bold + Italic (Image 3) */}
      <div className="px-6 sm:px-10 pt-5 sm:pt-8 pb-2 shrink-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold italic text-slate-900 tracking-tight">
          {slide.title}
        </h2>
      </div>

      {/* Main Slide Content Area with Bulleted List */}
      <div className="flex-1 px-6 sm:px-10 py-2 sm:py-4 overflow-y-auto my-auto">
        {slide.type === 'alignment' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0B3064]">
                IT Fields of Discipline
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-700 list-disc list-inside">
                {(slide.disciplines || ['Software Engineering & Web Applications']).map((d, i) => (
                  <li key={i} className="leading-relaxed">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700">
                Target UN SDGs
              </h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-700 list-disc list-inside">
                {(slide.sdgs || ['SDG 4: Quality Education']).map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul className="space-y-2 sm:space-y-3 md:space-y-4 text-xs sm:text-sm md:text-base text-slate-800 list-disc list-outside pl-5 font-normal leading-relaxed">
            {bullets.map((item, idx) => (
              <li key={idx} className="marker:text-slate-500">
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
