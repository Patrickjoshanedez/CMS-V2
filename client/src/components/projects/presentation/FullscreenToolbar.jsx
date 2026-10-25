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
        'relative z-20 flex h-14 shrink-0 select-none items-center justify-between gap-2 border-b border-border/60 bg-background px-3 text-foreground shadow-sm sm:gap-3 sm:px-6',
        className,
      )}
    >
      {/* ── Left: Presentation Identity & Title ── */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-warning/20 bg-warning/10 text-warning shadow-sm">
          <Presentation aria-hidden="true" className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-warning">
              Proposal Defense Rehearsal
            </span>
            {teamName && (
              <Badge
                variant="outline"
                className="hidden h-4 border-border/60 bg-muted/40 px-1.5 py-0 text-[10px] text-foreground/80 lg:inline-flex"
              >
                {teamName}
              </Badge>
            )}
            {isEditMode && (
              <Badge
                variant="success"
                className="hidden animate-pulse items-center gap-1 border-success/30 px-1.5 py-0.5 text-[10px] font-bold sm:inline-flex"
              >
                <Pencil aria-hidden="true" className="h-2.5 w-2.5" /> Edit Mode
              </Badge>
            )}
          </div>
          <h3
            className="max-w-[120px] truncate text-xs font-bold text-foreground sm:max-w-xs sm:text-sm md:max-w-md lg:max-w-xl"
            title={title}
          >
            {title}
          </h3>
        </div>
      </div>

      {/* ── Right: Slide Progress, Text Size Adjuster, Edit Mode & Controls ── */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Slide Counter Badge */}
        <Badge
          variant="outline"
          className="shrink-0 gap-1 rounded-full border-border/60 bg-muted/40 px-2 py-1 font-mono text-[11px] font-medium text-foreground/90 sm:gap-1.5 sm:px-2.5 sm:text-xs"
        >
          <span className="font-bold text-warning">{slideNumStr}</span>
          <span className="text-muted-foreground">/</span>
          <span>{totalStr}</span>
        </Badge>

        {/* ── 1. Text Size Adjuster Control (Per-Slide) ── */}
        <div
          className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs text-foreground shadow-xs"
          title={`Adjust text size for Slide ${slideNumStr}`}
        >
          <div className="hidden items-center gap-1 px-1.5 text-muted-foreground sm:flex">
            <Type aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDecreaseFontSize}
            disabled={currentFontSize <= 65}
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Decrease text size (A-)"
            aria-label="Decrease text size"
          >
            <Minus aria-hidden="true" className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFontSize}
            className="px-1.5 py-0.5 font-mono text-[11px] font-semibold text-warning hover:bg-accent hover:text-warning-foreground"
            title="Click to reset slide text size to 100%"
            aria-label="Reset slide text size"
          >
            {currentFontSize}%
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onIncreaseFontSize}
            disabled={currentFontSize >= 180}
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Increase text size (A+)"
            aria-label="Increase text size"
          >
            <Plus aria-hidden="true" className="h-3 w-3" />
          </Button>
        </div>

        {/* ── 2. Inline "Mini PowerPoint" Edit Mode Toggle ── */}
        <Button
          type="button"
          size="sm"
          onClick={onToggleEditMode}
          variant={isEditMode ? 'default' : 'outline'}
          aria-pressed={isEditMode}
          className={cn(
            'h-8 px-2 text-xs font-medium transition-colors sm:px-2.5',
            isEditMode
              ? 'border border-success/70 bg-success text-success-foreground hover:bg-success/90'
              : 'border-border/60 bg-muted/40 text-foreground hover:bg-accent hover:text-accent-foreground',
          )}
          title={isEditMode ? 'Finish editing and save adjustments' : 'Enable inline slide editing'}
        >
          {isEditMode ? (
            <>
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-semibold">Done Editing</span>
              <span className="sm:hidden font-semibold">Done</span>
            </>
          ) : (
            <>
              <Pencil aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
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
            className="hidden h-8 gap-1 px-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-warning md:inline-flex"
            title="Revert slide edits to default proposal pitch"
          >
            <RotateCcw aria-hidden="true" className="h-3 w-3" />
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
            loading={isExportingPptx}
            loadingText="Exporting PPTX..."
            className="hidden h-8 gap-1.5 border-border/60 bg-muted/40 text-xs text-foreground hover:bg-accent hover:text-accent-foreground xl:inline-flex"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
            <span>PPTX</span>
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
            loading={isExportingPdf}
            loadingText="Exporting PDF..."
            className="hidden h-8 gap-1.5 border-border/60 bg-muted/40 text-xs text-foreground hover:bg-accent hover:text-accent-foreground xl:inline-flex"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5 text-warning" />
            <span>PDF</span>
          </Button>
        )}

        {/* Native Fullscreen Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleNativeFullscreen}
          className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={isNativeFullscreen ? 'Exit Native Fullscreen (F)' : 'Enter Native Fullscreen (F)'}
          aria-label={isNativeFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-pressed={isNativeFullscreen}
        >
          {isNativeFullscreen ? (
            <Minimize2 aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>

        {/* Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid={closeTestId}
          className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Close Rehearsal (Esc)"
          aria-label="Close rehearsal"
        >
          <span
            aria-hidden="true"
            className="hidden rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block"
          >
            Esc
          </span>
          <X aria-hidden="true" className="h-4 w-4" />
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
