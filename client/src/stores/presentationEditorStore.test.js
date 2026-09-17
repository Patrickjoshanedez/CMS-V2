import { beforeEach, describe, expect, it } from 'vitest';
import {
  usePresentationEditorStore,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_PRESETS,
} from './presentationEditorStore';

describe('presentationEditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    usePresentationEditorStore.setState({
      deckEdits: {},
      isEditMode: false,
    });
    localStorage.clear();
  });

  it('initializes with default state', () => {
    const state = usePresentationEditorStore.getState();
    expect(state.isEditMode).toBe(false);
    expect(state.deckEdits).toEqual({});
  });

  it('toggles edit mode on and off', () => {
    const { toggleEditMode, setEditMode } = usePresentationEditorStore.getState();

    toggleEditMode();
    expect(usePresentationEditorStore.getState().isEditMode).toBe(true);

    toggleEditMode();
    expect(usePresentationEditorStore.getState().isEditMode).toBe(false);

    setEditMode(true);
    expect(usePresentationEditorStore.getState().isEditMode).toBe(true);
  });

  it('updates text fields for a specific slide in a deck', () => {
    const { updateSlideField, getSlideEdits } = usePresentationEditorStore.getState();
    const deckId = 'test_deck_1';
    const slideId = 2;

    updateSlideField(deckId, slideId, 'title', 'Custom Problem Statement');
    updateSlideField(deckId, slideId, 'content', 'Custom point 1\nCustom point 2');

    const edits = getSlideEdits(deckId, slideId);
    expect(edits.title).toBe('Custom Problem Statement');
    expect(edits.content).toBe('Custom point 1\nCustom point 2');
    expect(edits.updatedAt).toBeDefined();
  });

  it('sets and clamps font size for a slide', () => {
    const { setSlideFontSize, getSlideEdits } = usePresentationEditorStore.getState();
    const deckId = 'test_deck_1';
    const slideId = 1;

    setSlideFontSize(deckId, slideId, 130);
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(130);

    // Clamps below 60 to 60
    setSlideFontSize(deckId, slideId, 40);
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(60);

    // Clamps above 200 to 200
    setSlideFontSize(deckId, slideId, 250);
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(200);
  });

  it('steps font size up and down through presets', () => {
    const { stepSlideFontSize, getSlideEdits } = usePresentationEditorStore.getState();
    const deckId = 'test_deck_1';
    const slideId = 3;

    // Default is 100%, stepping up should reach 115%
    stepSlideFontSize(deckId, slideId, 'increase');
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(115);

    stepSlideFontSize(deckId, slideId, 'increase');
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(130);

    stepSlideFontSize(deckId, slideId, 'decrease');
    expect(getSlideEdits(deckId, slideId).fontSize).toBe(115);
  });

  it('manages font size per-slide independently', () => {
    const { setSlideFontSize, getSlideEdits } = usePresentationEditorStore.getState();
    const deckId = 'test_deck_independent';

    setSlideFontSize(deckId, 1, 145);
    setSlideFontSize(deckId, 2, 85);

    expect(getSlideEdits(deckId, 1).fontSize).toBe(145);
    expect(getSlideEdits(deckId, 2).fontSize).toBe(85);
  });

  it('resets a single slide or the entire deck', () => {
    const { updateSlideField, setSlideFontSize, resetSlideEdits, resetDeckEdits, getSlideEdits } =
      usePresentationEditorStore.getState();
    const deckId = 'test_deck_reset';

    updateSlideField(deckId, 1, 'title', 'Custom Title');
    setSlideFontSize(deckId, 1, 130);
    updateSlideField(deckId, 2, 'title', 'Custom Title 2');

    resetSlideEdits(deckId, 1);
    expect(getSlideEdits(deckId, 1)).toEqual({});
    expect(getSlideEdits(deckId, 2).title).toBe('Custom Title 2');

    resetDeckEdits(deckId);
    expect(getSlideEdits(deckId, 2)).toEqual({});
  });
});
