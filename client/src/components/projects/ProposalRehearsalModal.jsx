import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog';
import ProposalSlideCanvas from '@/components/projects/ProposalSlideCanvas';
import FullscreenToolbar from '@/components/projects/presentation/FullscreenToolbar';
import { usePresentationEditor } from '@/hooks/usePresentationEditor';
import { cn } from '@/lib/utils';

/**
 * ProposalRehearsalModal — True Fullscreen Institutional Presentation & Rehearsal Editor
 *
 * Uses the shared Radix Dialog portal to escape enclosing layout containers, providing
 * a dedicated 100vw x 100vh theater experience with live slide editing.
 *
 * Features:
 * - FullscreenToolbar with real-time per-slide Text Size Adjuster (- / + stepper)
 * - "Edit Mode" toggle (Mini PowerPoint live in-place slide editor)
 * - Persistent slide customization state via Zustand store (survives exiting & page reload)
 * - Native HTML5 Fullscreen API toggle ([F])
 * - 16:9 widescreen canvas box scaling with smooth aspect ratio containment
 * - Keyboard navigation (Arrow keys, Space, Home, End, Esc, F) with contentEditable input guards
 */
export default function ProposalRehearsalModal({
  isOpen,
  onClose,
  deckId: propDeckId,
  title = 'Capstone Title Proposal',
  slides = [],
  activeSlideIndex = 0,
  onSlideChange,
  teamName = '',
  proponents = '',
  academicYear = 'AY 2024–2025',
  onExportPptx,
  isExportingPptx = false,
  onExportPdf,
  isExportingPdf = false,
  portalContainer,
  dataTestId = 'fullscreen-rehearsal-modal',
  closeTestId = 'close-fullscreen-button',
}) {
  const modalRef = useRef(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // Generate deterministic deckId based on title or prop
  const resolvedDeckId = propDeckId || `deck_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  // Hook connecting to Zustand persistent store for rehearsal editing
  const {
    isEditMode,
    toggleEditMode,
    setEditMode,
    activeSlide,
    mergedSlides,
    currentFontSize,
    setFontSize,
    increaseFontSize,
    decreaseFontSize,
    updateActiveSlideField,
    resetCurrentSlide,
    hasEdits,
  } = usePresentationEditor({
    deckId: resolvedDeckId,
    slides,
    activeSlideIndex,
    onSlideChange,
  });

  // Track HTML5 browser fullscreen changes
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle native HTML5 fullscreen
  const toggleNativeFullscreen = useCallback(async () => {
    try {
      if (typeof document === 'undefined') return;
      if (!document.fullscreenElement) {
        if (modalRef.current?.requestFullscreen) {
          await modalRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native fullscreen toggle error:', err);
    }
  }, []);

  // Handle modal close (exiting native fullscreen if needed)
  const handleClose = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Keyboard navigation & contentEditable protection
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Ignore when user is actively focused on an input, textarea, or contentEditable element
      const target = e.target;
      const isInputActive =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
        target?.isContentEditable ||
        target?.getAttribute?.('contenteditable') === 'true';
      const isControlActive = target?.closest?.('button, a, [role="button"], [role="slider"]');

      if (isInputActive || isControlActive) {
        return;
      }

      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' '
      ) {
        e.preventDefault();
        if (onSlideChange && activeSlideIndex < slides.length - 1) {
          onSlideChange(activeSlideIndex + 1);
        }
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp' ||
        e.key === 'Backspace'
      ) {
        e.preventDefault();
        if (onSlideChange && activeSlideIndex > 0) {
          onSlideChange(activeSlideIndex - 1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (onSlideChange) onSlideChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (onSlideChange) onSlideChange(slides.length - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleNativeFullscreen();
      } else if ((e.key === 'e' || e.key === 'E') && (e.ctrlKey || e.metaKey)) {
        // Ctrl+E shortcut to toggle edit mode
        e.preventDefault();
        toggleEditMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    activeSlideIndex,
    slides.length,
    onSlideChange,
    toggleNativeFullscreen,
    toggleEditMode,
  ]);

  if (!isOpen || !slides || slides.length === 0) return null;

  const currentSlide = activeSlide || slides[activeSlideIndex] || slides[0];

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        showClose={false}
        portalContainer={portalContainer}
        onEscapeKeyDown={(event) => {
          const target = event.target;
          const isInputActive =
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
            target?.isContentEditable ||
            target?.getAttribute?.('contenteditable') === 'true';

          if (isInputActive) {
            event.preventDefault();
            target.blur();
          } else if (isEditMode) {
            event.preventDefault();
            setEditMode(false);
          }
        }}
        className="fixed inset-0 left-0 top-0 z-[60] flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none outline-none sm:w-screen"
      >
        <DialogTitle className="sr-only">Proposal Defense Rehearsal: {title}</DialogTitle>
        <DialogDescription className="sr-only">
          Full-screen proposal presentation with slide navigation, editing, and export controls.
        </DialogDescription>
        <div
          ref={modalRef}
          data-testid={dataTestId}
          className="flex h-full min-h-0 w-full select-none flex-col justify-between overflow-hidden bg-background text-foreground"
        >
          {/* ========================================================= */}
          {/* 1. TOP HUD BAR: FULLSCREEN TOOLBAR WITH REHEARSAL CONTROLS */}
          {/* ========================================================= */}
          <FullscreenToolbar
            title={title}
            teamName={teamName}
            activeSlideIndex={activeSlideIndex}
            totalSlides={slides.length}
            currentFontSize={currentFontSize}
            onIncreaseFontSize={increaseFontSize}
            onDecreaseFontSize={decreaseFontSize}
            onResetFontSize={() => setFontSize(100)}
            isEditMode={isEditMode}
            onToggleEditMode={toggleEditMode}
            hasSlideEdits={hasEdits}
            onResetSlideEdits={resetCurrentSlide}
            onExportPptx={onExportPptx}
            isExportingPptx={isExportingPptx}
            onExportPdf={onExportPdf}
            isExportingPdf={isExportingPdf}
            isNativeFullscreen={isNativeFullscreen}
            onToggleNativeFullscreen={toggleNativeFullscreen}
            onClose={handleClose}
            closeTestId={closeTestId}
          />

          {/* ========================================================= */}
          {/* 2. CENTER STAGE: RESPONSIVE 16:9 PROPOSAL CANVAS          */}
          {/* ========================================================= */}
          <main className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden p-3 sm:p-6 md:p-8">
            {/* Floating Previous Slide Arrow Button */}
            <Button
              type="button"
              disabled={activeSlideIndex === 0}
              onClick={() => onSlideChange && onSlideChange(Math.max(0, activeSlideIndex - 1))}
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full border border-border/70 bg-card/95 text-foreground shadow-md hover:bg-accent disabled:opacity-40 sm:left-6 sm:h-12 sm:w-12 md:left-8"
              aria-label="Previous slide"
              title="Previous Slide (←)"
            >
              <ChevronLeft aria-hidden="true" className="h-5 w-5" />
            </Button>

            {/* 16:9 Canvas Box — dynamically scaled to viewport height & width */}
            <div
              data-testid="proposal-canvas-frame"
              className={cn(
                'relative flex aspect-video w-full flex-col justify-between overflow-hidden rounded-lg border border-border/70 bg-white shadow-xl ring-1 ring-border/70 transition-shadow duration-150',
                isEditMode && 'ring-2 ring-primary/70',
              )}
              style={{
                maxHeight: 'calc(100dvh - 140px)',
                maxWidth: 'min(calc(100vw - 48px), calc((100dvh - 140px) * 16 / 9))',
              }}
            >
              <ProposalSlideCanvas
                slide={currentSlide}
                proponents={proponents}
                teamName={teamName}
                academicYear={academicYear}
                fullscreen
                isEditMode={isEditMode}
                onEditField={updateActiveSlideField}
              />
            </div>

            {/* Floating Next Slide Arrow Button */}
            <Button
              type="button"
              disabled={activeSlideIndex === slides.length - 1}
              onClick={() =>
                onSlideChange && onSlideChange(Math.min(slides.length - 1, activeSlideIndex + 1))
              }
              variant="ghost"
              size="icon"
              className="absolute right-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full border border-border/70 bg-card/95 text-foreground shadow-md hover:bg-accent disabled:opacity-40 sm:right-6 sm:h-12 sm:w-12 md:right-8"
              aria-label="Next slide"
              title="Next Slide (→)"
            >
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            </Button>
          </main>

          {/* ========================================================= */}
          {/* 3. BOTTOM NAVIGATION BAR: SLIDE SCRUBBER & SHORTCUT HINTS  */}
          {/* ========================================================= */}
          <footer className="relative z-20 grid min-h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-border bg-card px-3 py-2 text-muted-foreground sm:h-14 sm:px-6">
            {/* Left: Keyboard shortcuts hint */}
            <div className="hidden items-center gap-2 text-xs md:flex">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                  ←
                </kbd>
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                  →
                </kbd>
                Navigate
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                  Space
                </kbd>
                Next
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                  Ctrl+E
                </kbd>
                Edit Mode
              </span>
            </div>

            {/* Center: Interactive Slide Scrubber & Navigation Controls */}
            <div className="mx-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === 0}
                onClick={() => onSlideChange && onSlideChange(Math.max(0, activeSlideIndex - 1))}
                className="h-8 gap-1.5 px-2 text-xs sm:px-3"
                aria-label="Previous slide"
              >
                <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <div
                role="group"
                aria-label="Choose slide"
                className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-muted/50 p-1"
              >
                {mergedSlides.map((slide, idx) => {
                  const isActive = activeSlideIndex === idx;
                  const slideLabel = slide.category || slide.title || `Slide ${idx + 1}`;
                  return (
                    <Button
                      key={slide.id || idx}
                      type="button"
                      variant={isActive ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => onSlideChange && onSlideChange(idx)}
                      className="h-6 w-6 min-w-6 rounded-full p-0"
                      title={`Slide ${idx + 1}: ${slideLabel}`}
                      aria-label={`Go to slide ${idx + 1}: ${slideLabel}`}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-2 w-2 rounded-full',
                          isActive ? 'bg-primary-foreground' : 'bg-current',
                        )}
                      />
                    </Button>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeSlideIndex === slides.length - 1}
                onClick={() =>
                  onSlideChange && onSlideChange(Math.min(slides.length - 1, activeSlideIndex + 1))
                }
                className="h-8 gap-1.5 px-2 text-xs sm:px-3"
                aria-label="Next slide"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right: Category / Section Label */}
            <div className="hidden min-w-0 justify-self-end lg:flex">
              <Badge variant="secondary" className="max-w-[15rem] truncate">
                {currentSlide?.category || currentSlide?.title || 'Defense Deck'}
              </Badge>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );

  return modalContent;
}

ProposalRehearsalModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  deckId: PropTypes.string,
  title: PropTypes.string,
  slides: PropTypes.arrayOf(PropTypes.object),
  activeSlideIndex: PropTypes.number,
  onSlideChange: PropTypes.func,
  teamName: PropTypes.string,
  proponents: PropTypes.string,
  academicYear: PropTypes.string,
  onExportPptx: PropTypes.func,
  isExportingPptx: PropTypes.bool,
  onExportPdf: PropTypes.func,
  isExportingPdf: PropTypes.bool,
  portalContainer: PropTypes.any,
  dataTestId: PropTypes.string,
  closeTestId: PropTypes.string,
};
