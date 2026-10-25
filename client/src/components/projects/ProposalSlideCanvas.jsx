import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import buksuCotLogo from '@/assets/buksu-cot-logo.png';
import buksuItLogo from '@/assets/buksu-it-logo.png';
import { cn } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

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
      className="bg-slide-brand-orange w-full px-2.5 py-1 sm:px-5 sm:py-2 flex items-center justify-between text-black shrink-0 relative z-10 select-none overflow-hidden"
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
            src={buksuCotLogo}
            alt="BukSU College of Technologies Seal"
            className="h-5 w-5 sm:h-7 sm:w-7 md:h-8 md:w-8 object-contain drop-shadow-xs shrink-0"
          />
          <img
            src={buksuItLogo}
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
          'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-slide-brand-navy relative select-none',
          className,
        )}
      >
        {/* Edit mode indicator */}
        {isEditMode && (
          <Badge
            variant="outline"
            className="absolute top-3 right-4 z-20 gap-1.5 rounded-full border-slide-brand-gold/40 bg-slide-brand-gold/10 px-2.5 py-1 text-[10px] font-bold text-slide-brand-gold shadow-sm animate-in fade-in"
          >
            <Pencil aria-hidden="true" className="h-3 w-3" />
            <span>Click text to edit</span>
          </Badge>
        )}

        {/* Main Title Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-4 sm:py-8 text-center my-auto">
          <h1
            style={{
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
              'line-clamp-3 max-w-full break-words [overflow-wrap:anywhere] font-black tracking-tight text-slide-brand-gold leading-tight sm:max-w-4xl drop-shadow-sm transition-all',
              isEditMode &&
                'border border-dashed border-slide-brand-gold/60 hover:border-slide-brand-gold focus:border-slide-brand-gold focus-visible:ring-2 focus-visible:ring-slide-brand-gold/40 rounded-lg px-3 py-1 cursor-text outline-none bg-slide-brand-gold/5',
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
                  'border border-dashed border-white/30 hover:border-white/60 focus:border-slide-brand-gold focus-visible:ring-2 focus-visible:ring-slide-brand-gold/40 rounded px-2 py-0.5 cursor-text outline-none bg-white/5',
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
        'w-full aspect-video rounded-xl overflow-hidden shadow-lg flex flex-col justify-between bg-white !text-slide-brand-ink relative select-none',
        className,
      )}
    >
      {/* Top Slide Header: Bold + Italic with guaranteed dark contrast */}
      <div className="flex shrink-0 flex-col px-4 pt-2 pb-1 sm:px-10 sm:pt-8 sm:pb-2">
        {isEditMode && (
          <Badge
            variant="success"
            className="mb-1 self-end gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-xs animate-in fade-in"
          >
            <Pencil aria-hidden="true" className="h-3 w-3" />
            <span>Interactive Editor Active</span>
          </Badge>
        )}
        <h2
          style={{
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
            'font-black italic !text-slide-brand-ink tracking-tight transition-all',
            isEditMode &&
              'border border-dashed border-primary/50 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 rounded px-2 py-0.5 cursor-text outline-none bg-primary/5',
          )}
          title={isEditMode ? 'Click to edit slide title' : undefined}
        >
          {slideTitle}
        </h2>
      </div>

      {/* Main Slide Content Area with Bulleted List */}
      <div
        data-slide-content-region="true"
        className="flex-1 px-6 sm:px-10 py-2 sm:py-4 overflow-y-auto my-auto"
      >
        {slide.type === 'alignment' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-1">
            <div className="space-y-2 sm:space-y-3">
              <h3
                style={{
                  fontSize: `calc(clamp(0.75rem, 1.4vw, 1.1rem) * ${fontScale})`,
                }}
                className="font-bold uppercase tracking-wider text-slide-brand-navy"
              >
                IT Fields of Discipline
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-slide-brand-slate list-disc list-inside">
                {(slide.disciplines && slide.disciplines.length > 0
                  ? slide.disciplines
                  : ['Software Engineering & Web Applications']
                ).map((d, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: `calc(clamp(0.8rem, 1.5vw, 1.15rem) * ${fontScale})`,
                    }}
                    className="leading-relaxed !text-slide-brand-slate font-medium"
                  >
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <h3
                style={{
                  fontSize: `calc(clamp(0.75rem, 1.4vw, 1.1rem) * ${fontScale})`,
                }}
                className="font-bold uppercase tracking-wider text-slide-brand-green"
              >
                Target UN SDGs
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-slide-brand-slate list-disc list-inside">
                {(slide.sdgs && slide.sdgs.length > 0
                  ? slide.sdgs
                  : ['SDG 4: Quality Education']
                ).map((s, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: `calc(clamp(0.8rem, 1.5vw, 1.15rem) * ${fontScale})`,
                    }}
                    className="leading-relaxed !text-slide-brand-slate font-medium"
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
            className={cn(
              'list-disc list-outside pl-6 sm:pl-8 !text-slide-brand-ink font-medium leading-relaxed',
              bullets.length <= 2
                ? 'space-y-1 sm:space-y-5 md:space-y-7'
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
                  'marker:text-slide-brand-slate !text-slide-brand-ink font-medium leading-relaxed transition-all',
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
