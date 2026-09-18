import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { BUKSU_COT_LOGO_BASE64, BUKSU_IT_LOGO_BASE64 } from '@/assets/logoBase64';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';

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
function formatToBullets(content, slideType = 'statement', maxBullets = 6) {
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

  return (
    SLIDE_FALLBACKS[slideType] || ['Capstone research project details under committee review.']
  );
}

/**
 * High-fidelity 16:9 BukSU Institutional Proposal Slide Canvas
 * Matches the official university defense deck template with:
 * - Real-time per-slide text size adjustments
 * - Interactive inline editing for titles, subtitles, and bullet points
 */
export default function ProposalSlideCanvas({
  slide,
  proponents = '',
  teamName = '',
  academicYear: _academicYear = 'AY 2025–2026',
  className = '',
  fullscreen: _fullscreen = false,
  isEditMode = false,
  onEditField,
}) {
  const bulletListRef = useRef(null);

  if (!slide) return null;

  const isCover = slide.type === 'cover' || slide.id === 1;
  const slideNumberStr = slide.numberStr || String(slide.id || 1).padStart(2, '0');
  const categoryStr = slide.category || slide.tag || '';
  const slideTitle =
    slide.title || (isCover ? 'Capstone Project Proposal Pitch' : 'Problem Statement');

  // Font scale multiplier (default 100% = 1.0)
  const fontScale = (slide.fontSize || 100) / 100;

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

  // Helper to collect bullets on blur
  const handleBulletBlur = () => {
    if (!onEditField || !bulletListRef.current) return;
    const items = Array.from(bulletListRef.current.querySelectorAll('li[data-bullet-item="true"]'));
    const textLines = items
      .map((li) => li.innerText || li.textContent || '')
      .map((t) => t.trim())
      .filter(Boolean);

    onEditField('content', textLines.join('\n'));
  };

  /* ─────────────────────────────────────────────────────────────
     COVER SLIDE (BLUE THEME)
  ───────────────────────────────────────────────────────────── */
  if (isCover) {
    // Defensively ensure Proposed Solution & Technical Framework never leaks onto Title Screen
    const isProposedSolutionLeak =
      slide.subtitle &&
      (slide.subtitle === slide.proposedSolution ||
        slide.subtitle === slide.content ||
        (slide.proposedSolution &&
          typeof slide.proposedSolution === 'string' &&
          slide.proposedSolution.length > 20 &&
          slide.subtitle.includes(slide.proposedSolution.slice(0, 40))) ||
        (slide.content &&
          typeof slide.content === 'string' &&
          slide.content.length > 20 &&
          slide.subtitle.includes(slide.content.slice(0, 40))));
    const effectiveSubtitle = isProposedSolutionLeak ? '' : slide.subtitle;

    return (
      <div
        data-slide-canvas="cover"
        className={cn(
          'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-[#0B3064] relative select-none',
          className,
        )}
      >
        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-bold text-amber-300 shadow-sm animate-in fade-in">
            <Pencil className="h-3 w-3 text-amber-400" />
            <span>Click text to edit</span>
          </div>
        )}

        {/* Main Title Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-4 sm:py-8 text-center my-auto">
          <h1
            style={{
              color: '#FFA726',
              fontSize: `calc(clamp(1.5rem, 3.8vw, 3.4rem) * ${fontScale})`,
            }}
            contentEditable={isEditMode}
            suppressContentEditableWarning={true}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') e.currentTarget.blur();
            }}
            onBlur={(e) => {
              if (onEditField) {
                const text = e.currentTarget.innerText || e.currentTarget.textContent || '';
                onEditField('title', text.trim());
              }
            }}
            className={cn(
              'font-black tracking-tight text-[#FFA726] leading-tight max-w-4xl drop-shadow-sm transition-all',
              isEditMode &&
                'border border-dashed border-amber-400/60 hover:border-amber-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 rounded-lg px-3 py-1 cursor-text outline-none bg-amber-400/5',
            )}
            title={isEditMode ? 'Click to edit proposal title' : undefined}
          >
            {slideTitle}
          </h1>

          {effectiveSubtitle && (
            <p
              style={{
                fontSize: `calc(clamp(0.85rem, 1.6vw, 1.25rem) * ${fontScale})`,
              }}
              contentEditable={isEditMode}
              suppressContentEditableWarning={true}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') e.currentTarget.blur();
              }}
              onBlur={(e) => {
                if (onEditField) {
                  const text = e.currentTarget.innerText || e.currentTarget.textContent || '';
                  onEditField('subtitle', text.trim());
                }
              }}
              className={cn(
                'mt-3 sm:mt-5 text-white/80 max-w-2xl text-center font-normal transition-all',
                isEditMode &&
                  'border border-dashed border-white/30 hover:border-white/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 rounded px-2 py-0.5 cursor-text outline-none bg-white/5',
              )}
              title={isEditMode ? 'Click to edit subtitle' : undefined}
            >
              {effectiveSubtitle}
            </p>
          )}
        </div>

        {/* Vibrant Orange Footer Banner with Institutional Logos */}
        {renderOrangeBanner()}
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     CONTENT SLIDES (WHITE THEME WITH INSTITUTIONAL NAVY/ORANGE)
  ───────────────────────────────────────────────────────────── */
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
      {/* Edit mode subtle indicator */}
      {isEditMode && (
        <div className="absolute top-2.5 right-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shadow-xs animate-in fade-in">
          <Pencil className="h-3 w-3 text-emerald-600" />
          <span>Interactive Editor Active</span>
        </div>
      )}

      {/* Top Slide Header: Bold + Italic with guaranteed dark contrast */}
      <div className="px-6 sm:px-10 pt-5 sm:pt-8 pb-2 shrink-0">
        <h2
          style={{
            color: '#0f172a',
            fontSize: `calc(clamp(1.35rem, 3.2vw, 2.75rem) * ${fontScale})`,
          }}
          contentEditable={isEditMode}
          suppressContentEditableWarning={true}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          onBlur={(e) => {
            if (onEditField) {
              const text = e.currentTarget.innerText || e.currentTarget.textContent || '';
              onEditField('title', text.trim());
            }
          }}
          className={cn(
            'font-black italic !text-slate-900 tracking-tight transition-all',
            isEditMode &&
              'border border-dashed border-primary/50 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 rounded px-2 py-0.5 cursor-text outline-none bg-primary/5',
          )}
          title={isEditMode ? 'Click to edit slide title' : undefined}
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
                style={{
                  color: '#0B3064',
                  fontSize: `calc(clamp(0.75rem, 1.4vw, 1.1rem) * ${fontScale})`,
                }}
                className="font-bold uppercase tracking-wider text-[#0B3064]"
              >
                IT Fields of Discipline
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-slate-700 list-disc list-inside">
                {(slide.disciplines && slide.disciplines.length > 0
                  ? slide.disciplines
                  : ['Software Engineering & Web Applications']
                ).map((d, i) => (
                  <li
                    key={i}
                    style={{
                      color: '#334155',
                      fontSize: `calc(clamp(0.8rem, 1.5vw, 1.15rem) * ${fontScale})`,
                    }}
                    className="leading-relaxed !text-slate-700 font-medium"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h3
                style={{
                  color: '#047857',
                  fontSize: `calc(clamp(0.75rem, 1.4vw, 1.1rem) * ${fontScale})`,
                }}
                className="font-bold uppercase tracking-wider text-emerald-700"
              >
                Target UN SDGs
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-slate-700 list-disc list-inside">
                {(slide.sdgs && slide.sdgs.length > 0
                  ? slide.sdgs
                  : ['SDG 4: Quality Education']
                ).map((s, i) => (
                  <li
                    key={i}
                    style={{
                      color: '#334155',
                      fontSize: `calc(clamp(0.8rem, 1.5vw, 1.15rem) * ${fontScale})`,
                    }}
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
            ref={bulletListRef}
            style={{ color: '#1e293b' }}
            className={cn(
              'list-disc list-outside pl-6 sm:pl-8 !text-slate-800 font-medium leading-relaxed',
              bullets.length <= 2
                ? 'space-y-3 sm:space-y-5 md:space-y-7'
                : bullets.length <= 3
                  ? 'space-y-2.5 sm:space-y-4 md:space-y-5'
                  : 'space-y-2 sm:space-y-3 md:space-y-3.5',
            )}
          >
            {bullets.map((item, idx) => (
              <li
                key={idx}
                data-bullet-item="true"
                style={{
                  color: '#1e293b',
                  fontSize: `calc(clamp(0.82rem, 1.65vw, 1.35rem) * ${fontScale})`,
                }}
                contentEditable={isEditMode}
                suppressContentEditableWarning={true}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') e.currentTarget.blur();
                }}
                onBlur={handleBulletBlur}
                className={cn(
                  'marker:text-slate-500 !text-slate-800 font-medium leading-relaxed transition-all',
                  isEditMode &&
                    'border border-dashed border-primary/40 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 rounded px-1.5 py-0.5 cursor-text outline-none bg-primary/5',
                )}
                title={isEditMode ? 'Click to edit bullet text' : undefined}
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

ProposalSlideCanvas.propTypes = {
  slide: PropTypes.object,
  proponents: PropTypes.string,
  teamName: PropTypes.string,
  academicYear: PropTypes.string,
  className: PropTypes.string,
  fullscreen: PropTypes.bool,
  isEditMode: PropTypes.bool,
  onEditField: PropTypes.func,
};
