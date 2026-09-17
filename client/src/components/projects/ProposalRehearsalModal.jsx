import React, { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ProposalSlideCanvas from '@/components/projects/ProposalSlideCanvas';
import FullscreenToolbar from '@/components/projects/presentation/FullscreenToolbar';
import { usePresentationEditor } from '@/hooks/usePresentationEditor';
import { cn } from '@/lib/utils';

/**
 * ProposalRehearsalModal — True Fullscreen Institutional Presentation & Rehearsal Editor
 *
 * Escapes enclosing layout containers via createPortal to document.body, providing
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

  // Determine target portal container
  const resolvedPortalContainer =
    portalContainer !== undefined
      ? portalContainer
      : typeof document !== 'undefined'
        ? typeof process !== 'undefined' && process.env?.NODE_ENV === 'test'
          ? null
          : document.body
        : null;

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

  // Lock document body scroll while modal is active
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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
      const isInputActive =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) ||
        e.target?.isContentEditable ||
        e.target?.getAttribute?.('contenteditable') === 'true';

      if (isInputActive) {
        // If Escape pressed while typing inside slide text, blur out of input
        if (e.key === 'Escape') {
          e.target.blur();
        }
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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isEditMode) {
          setEditMode(false);
        } else {
          handleClose();
        }
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
    handleClose,
    toggleNativeFullscreen,
    isEditMode,
    setEditMode,
    toggleEditMode,
  ]);

  if (!isOpen || !slides || slides.length === 0) return null;

  const currentSlide = activeSlide || slides[activeSlideIndex] || slides[0];

  const modalContent = (
    <div
      ref={modalRef}
      data-testid={dataTestId}
      className="fixed inset-0 z-[99999] w-screen h-screen bg-[#05070B] text-slate-100 flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200"
      style={{ margin: 0, padding: 0 }}
    >
      {/* Ambient Theater Backdrop Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-transparent to-transparent pointer-events-none" />

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
      <main className="relative z-10 flex-1 w-full min-h-0 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden">
        {/* Floating Previous Slide Arrow Button */}
        <button
          type="button"
          disabled={activeSlideIndex === 0}
          onClick={() => onSlideChange && onSlideChange(Math.max(0, activeSlideIndex - 1))}
          className="absolute left-3 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-60 hover:opacity-100 hover:scale-105 disabled:opacity-15 disabled:pointer-events-none shadow-xl cursor-pointer"
          aria-label="Previous Slide"
          title="Previous Slide (←)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {/* 16:9 Canvas Box — dynamically scaled to viewport height & width */}
        <div
          className={cn(
            'aspect-video w-full rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] ring-1 overflow-hidden flex flex-col justify-between bg-white relative transition-all duration-150',
            isEditMode ? 'ring-2 ring-emerald-500/80 shadow-emerald-950/40' : 'ring-white/15',
          )}
          style={{
            maxHeight: 'calc(100vh - 140px)',
            maxWidth: 'min(calc(100vw - 48px), calc((100vh - 140px) * 16 / 9))',
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
        <button
          type="button"
          disabled={activeSlideIndex === slides.length - 1}
          onClick={() =>
            onSlideChange && onSlideChange(Math.min(slides.length - 1, activeSlideIndex + 1))
          }
          className="absolute right-3 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white backdrop-blur-md border border-white/10 flex items-center justify-center transition-all opacity-60 hover:opacity-100 hover:scale-105 disabled:opacity-15 disabled:pointer-events-none shadow-xl cursor-pointer"
          aria-label="Next Slide"
          title="Next Slide (→)"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </main>

      {/* ========================================================= */}
      {/* 3. BOTTOM NAVIGATION BAR: SLIDE SCRUBBER & SHORTCUT HINTS  */}
      {/* ========================================================= */}
      <footer className="relative z-20 h-14 shrink-0 px-4 sm:px-6 bg-black/50 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-4">
        {/* Left: Keyboard shortcuts hint */}
        <div className="hidden md:flex items-center gap-2 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white/10 rounded text-white/80">
              ←
            </kbd>
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white/10 rounded text-white/80">
              →
            </kbd>{' '}
            Navigate
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white/10 rounded text-white/80">
              Space
            </kbd>{' '}
            Next
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white/10 rounded text-white/80">
              Ctrl+E
            </kbd>{' '}
            Edit Mode
          </span>
        </div>

        {/* Center: Interactive Slide Scrubber & Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={activeSlideIndex === 0}
            onClick={() => onSlideChange && onSlideChange(Math.max(0, activeSlideIndex - 1))}
            className="h-8 text-xs gap-1.5 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Interactive Slide Pills */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10">
            {mergedSlides.map((slide, idx) => {
              const isActive = activeSlideIndex === idx;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => onSlideChange && onSlideChange(idx)}
                  className={cn(
                    'h-2.5 rounded-full transition-all cursor-pointer',
                    isActive
                      ? 'w-7 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'w-2.5 bg-white/25 hover:bg-white/60 hover:scale-125',
                  )}
                  title={`Slide ${idx + 1}: ${slide.category || slide.title || ''}`}
                  aria-label={`Jump to slide ${idx + 1}`}
                />
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
            className="h-8 text-xs gap-1.5 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white disabled:opacity-20 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Right: Category / Section Label */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-white/70 shrink-0">
          <span className="font-semibold text-amber-400/90 uppercase tracking-wider text-[10px]">
            {currentSlide?.category || currentSlide?.title || 'Defense Deck'}
          </span>
        </div>
      </footer>
    </div>
  );

  if (resolvedPortalContainer) {
    return createPortal(modalContent, resolvedPortalContainer);
  }

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
