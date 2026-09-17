import React from 'react';
import PropTypes from 'prop-types';
import {
  Presentation,
  Download,
  Maximize2,
  Minimize2,
  X,
  Pencil,
  Check,
  Type,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

/**
 * FullscreenToolbar Component
 *
 * Dedicated modular HUD bar for Fullscreen Presentation & Interactive Rehearsal Editor.
 * Includes:
 * - Slide counter badge (e.g. 01 / 08)
 * - Real-time per-slide Text Size Adjuster (- / + stepper with % readout)
 * - "Edit Mode" toggle button (Mini PowerPoint inline editor)
 * - Export PPTX / PDF shortcuts
 * - Native Fullscreen toggle & Close (Esc)
 */
export default function FullscreenToolbar({
  title = 'Capstone Title Proposal',
  teamName = '',
  activeSlideIndex = 0,
  totalSlides = 1,
  currentFontSize = 100,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onResetFontSize,
  isEditMode = false,
  onToggleEditMode,
  hasSlideEdits = false,
  onResetSlideEdits,
  onExportPptx,
  isExportingPptx = false,
  onExportPdf,
  isExportingPdf = false,
  isNativeFullscreen = false,
  onToggleNativeFullscreen,
  onClose,
  closeTestId = 'close-fullscreen-button',
  className = '',
}) {
  const slideNumStr = String(activeSlideIndex + 1).padStart(2, '0');
  const totalStr = String(Math.max(1, totalSlides)).padStart(2, '0');

  return (
    <header
      className={cn(
        'relative z-20 h-14 shrink-0 px-3 sm:px-6 bg-black/60 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-2 sm:gap-3 select-none text-white',
        className,
      )}
    >
      {/* ── Left: Presentation Identity & Title ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
          <Presentation className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-wider uppercase font-semibold text-amber-400/90 whitespace-nowrap">
              Proposal Defense Rehearsal
            </span>
            {teamName && (
              <Badge
                variant="outline"
                className="hidden lg:inline-flex bg-white/5 text-white/80 border-white/10 text-[10px] py-0 px-1.5 h-4"
              >
                {teamName}
              </Badge>
            )}
            {isEditMode && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded animate-pulse">
                <Pencil className="h-2.5 w-2.5" /> Edit Mode
              </span>
            )}
          </div>
          <h3
            className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md lg:max-w-xl"
            title={title}
          >
            {title}
          </h3>
        </div>
      </div>

      {/* ── Right: Slide Progress, Text Size Adjuster, Edit Mode & Controls ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Slide Counter Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] sm:text-xs font-mono font-medium text-white/90 shrink-0">
          <span className="text-amber-400 font-bold">{slideNumStr}</span>
          <span className="text-white/40">/</span>
          <span>{totalStr}</span>
        </div>

        {/* ── 1. Text Size Adjuster Control (Per-Slide) ── */}
        <div
          className="flex items-center rounded-lg bg-white/5 border border-white/15 p-0.5 text-xs text-white/90 shadow-xs"
          title={`Adjust text size for Slide ${slideNumStr}`}
        >
          <div className="hidden sm:flex items-center gap-1 px-1.5 text-white/60">
            <Type className="h-3.5 w-3.5 text-amber-400" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDecreaseFontSize}
            disabled={currentFontSize <= 65}
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
            title="Decrease text size (A-)"
            aria-label="Decrease text size"
          >
            <Minus className="h-3 w-3" />
          </Button>

          <button
            type="button"
            onClick={onResetFontSize}
            className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-amber-400/90 hover:text-amber-300 hover:bg-white/10 rounded transition-colors"
            title="Click to reset slide text size to 100%"
          >
            {currentFontSize}%
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onIncreaseFontSize}
            disabled={currentFontSize >= 180}
            className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
            title="Increase text size (A+)"
            aria-label="Increase text size"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* ── 2. Inline "Mini PowerPoint" Edit Mode Toggle ── */}
        <Button
          type="button"
          size="sm"
          onClick={onToggleEditMode}
          className={cn(
            'h-8 px-2 sm:px-2.5 text-xs gap-1 sm:gap-1.5 transition-all cursor-pointer font-medium',
            isEditMode
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-sm shadow-emerald-950/40'
              : 'bg-white/5 border border-white/15 text-white/90 hover:bg-white/10 hover:text-white',
          )}
          title={isEditMode ? 'Finish editing and save adjustments' : 'Enable inline slide editing'}
        >
          {isEditMode ? (
            <>
              <Check className="h-3.5 w-3.5 text-white" />
              <span className="hidden sm:inline font-semibold">Done Editing</span>
              <span className="sm:hidden font-semibold">Done</span>
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Edit Slide</span>
              <span className="sm:hidden">Edit</span>
            </>
          )}
        </Button>

        {/* Reset Edits (Only visible if slide has custom edits) */}
        {hasSlideEdits && onResetSlideEdits && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetSlideEdits}
            className="h-8 px-1.5 text-xs text-white/60 hover:text-amber-400 hover:bg-white/10 gap-1 hidden md:inline-flex"
            title="Revert slide edits to default proposal pitch"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="text-[10px]">Revert</span>
          </Button>
        )}

        {/* Export PPTX (if provided) */}
        {onExportPptx && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPptx}
            disabled={isExportingPptx}
            className="hidden xl:inline-flex h-8 text-xs gap-1.5 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>{isExportingPptx ? 'Exporting...' : 'PPTX'}</span>
          </Button>
        )}

        {/* Export PDF (if provided) */}
        {onExportPdf && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="hidden xl:inline-flex h-8 text-xs gap-1.5 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
          </Button>
        )}

        {/* Native Fullscreen Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleNativeFullscreen}
          className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title={isNativeFullscreen ? 'Exit Native Fullscreen (F)' : 'Enter Native Fullscreen (F)'}
        >
          {isNativeFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        {/* Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid={closeTestId}
          className="h-8 px-2 text-white/70 hover:text-white hover:bg-white/10 gap-1.5 transition-colors"
          title="Close Rehearsal (Esc)"
        >
          <span className="hidden sm:inline-block text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 text-white/60">
            Esc
          </span>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

FullscreenToolbar.propTypes = {
  title: PropTypes.string,
  teamName: PropTypes.string,
  activeSlideIndex: PropTypes.number,
  totalSlides: PropTypes.number,
  currentFontSize: PropTypes.number,
  onIncreaseFontSize: PropTypes.func,
  onDecreaseFontSize: PropTypes.func,
  onResetFontSize: PropTypes.func,
  isEditMode: PropTypes.bool,
  onToggleEditMode: PropTypes.func,
  hasSlideEdits: PropTypes.bool,
  onResetSlideEdits: PropTypes.func,
  onExportPptx: PropTypes.func,
  isExportingPptx: PropTypes.bool,
  onExportPdf: PropTypes.func,
  isExportingPdf: PropTypes.bool,
  isNativeFullscreen: PropTypes.bool,
  onToggleNativeFullscreen: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  closeTestId: PropTypes.string,
  className: PropTypes.string,
};
