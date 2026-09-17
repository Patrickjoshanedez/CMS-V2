import { useMemo, useCallback } from 'react';
import { usePresentationEditorStore, DEFAULT_FONT_SIZE } from '@/stores/presentationEditorStore';

const EMPTY_DECK_EDITS = Object.freeze({});

/**
 * usePresentationEditor Custom Hook
 *
 * Encapsulates all rehearsal presentation editing logic:
 * - Real-time per-slide text adjustments (titles, subtitles, content bullets)
 * - Per-slide dynamic font size management
 * - Edit mode state & visual toggles
 * - Seamless integration with Zustand persistent storage
 *
 * @param {Object} options
 * @param {string|number} options.deckId - Unique identifier for the presentation deck
 * @param {Array} options.slides - Raw array of slide objects
 * @param {number} options.activeSlideIndex - Currently displayed slide index (0-based)
 * @param {Function} [options.onSlideChange] - Optional slide change callback
 * @returns {Object} Presentation editor controller state & actions
 */
export function usePresentationEditor({
  deckId,
  slides = [],
  activeSlideIndex = 0,
  onSlideChange,
}) {
  const isEditMode = usePresentationEditorStore((s) => s.isEditMode);
  const toggleEditMode = usePresentationEditorStore((s) => s.toggleEditMode);
  const setEditMode = usePresentationEditorStore((s) => s.setEditMode);
  const rawDeckEdits = usePresentationEditorStore((s) =>
    deckId ? s.deckEdits[deckId] : undefined,
  );
  const deckEdits = rawDeckEdits || EMPTY_DECK_EDITS;
  const updateSlideField = usePresentationEditorStore((s) => s.updateSlideField);
  const setSlideFontSize = usePresentationEditorStore((s) => s.setSlideFontSize);
  const stepSlideFontSize = usePresentationEditorStore((s) => s.stepSlideFontSize);
  const resetSlideEdits = usePresentationEditorStore((s) => s.resetSlideEdits);
  const resetDeckEdits = usePresentationEditorStore((s) => s.resetDeckEdits);

  // Merge raw slides with user customized fields from persistent Zustand store
  const mergedSlides = useMemo(() => {
    return slides.map((rawSlide, index) => {
      const slideId = rawSlide.id ?? index + 1;
      const edits = deckEdits[slideId] || {};

      return {
        ...rawSlide,
        id: slideId,
        title: edits.title !== undefined ? edits.title : rawSlide.title,
        subtitle: edits.subtitle !== undefined ? edits.subtitle : rawSlide.subtitle,
        content: edits.content !== undefined ? edits.content : rawSlide.content,
        fontSize: edits.fontSize ?? rawSlide.fontSize ?? DEFAULT_FONT_SIZE,
        hasEdits: Boolean(
          edits.title !== undefined ||
          edits.subtitle !== undefined ||
          edits.content !== undefined ||
          (edits.fontSize && edits.fontSize !== DEFAULT_FONT_SIZE),
        ),
      };
    });
  }, [slides, deckEdits]);

  const activeSlide = mergedSlides[activeSlideIndex] || mergedSlides[0] || null;
  const currentSlideId = activeSlide?.id ?? activeSlideIndex + 1;
  const currentFontSize = activeSlide?.fontSize ?? DEFAULT_FONT_SIZE;

  const handleUpdateActiveField = useCallback(
    (field, value) => {
      if (!deckId || !currentSlideId) return;
      updateSlideField(deckId, currentSlideId, field, value);
    },
    [deckId, currentSlideId, updateSlideField],
  );

  const handleSetFontSize = useCallback(
    (newSize) => {
      if (!deckId || !currentSlideId) return;
      setSlideFontSize(deckId, currentSlideId, newSize);
    },
    [deckId, currentSlideId, setSlideFontSize],
  );

  const handleIncreaseFontSize = useCallback(() => {
    if (!deckId || !currentSlideId) return;
    stepSlideFontSize(deckId, currentSlideId, 'increase');
  }, [deckId, currentSlideId, stepSlideFontSize]);

  const handleDecreaseFontSize = useCallback(() => {
    if (!deckId || !currentSlideId) return;
    stepSlideFontSize(deckId, currentSlideId, 'decrease');
  }, [deckId, currentSlideId, stepSlideFontSize]);

  const handleResetCurrentSlide = useCallback(() => {
    if (!deckId || !currentSlideId) return;
    resetSlideEdits(deckId, currentSlideId);
  }, [deckId, currentSlideId, resetSlideEdits]);

  const handleResetAllDeck = useCallback(() => {
    if (!deckId) return;
    resetDeckEdits(deckId);
  }, [deckId, resetDeckEdits]);

  return {
    isEditMode,
    toggleEditMode,
    setEditMode,
    activeSlide,
    mergedSlides,
    currentFontSize,
    setFontSize: handleSetFontSize,
    increaseFontSize: handleIncreaseFontSize,
    decreaseFontSize: handleDecreaseFontSize,
    updateActiveSlideField: handleUpdateActiveField,
    resetCurrentSlide: handleResetCurrentSlide,
    resetAllDeck: handleResetAllDeck,
    hasEdits: Boolean(activeSlide?.hasEdits),
    onSlideChange,
  };
}
