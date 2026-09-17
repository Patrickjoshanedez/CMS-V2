import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePresentationEditor } from './usePresentationEditor';
import { usePresentationEditorStore, DEFAULT_FONT_SIZE } from '@/stores/presentationEditorStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(hookFn, { initialProps } = {}) {
  let current;
  let props = initialProps;
  const container = document.createElement('div');
  const root = createRoot(container);

  function TestHarness(p) {
    current = hookFn(p);
    return null;
  }

  act(() => {
    root.render(<TestHarness {...props} />);
  });

  return {
    result: {
      get current() {
        return current;
      },
    },
    rerender: (newProps) => {
      props = newProps;
      act(() => {
        root.render(<TestHarness {...props} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

describe('usePresentationEditor', () => {
  const mockSlides = [
    {
      id: 1,
      title: 'Original Title 1',
      subtitle: 'Original Subtitle 1',
      type: 'cover',
    },
    {
      id: 2,
      title: 'Problem Statement',
      content: 'Line 1\nLine 2',
      type: 'statement',
    },
  ];

  beforeEach(() => {
    usePresentationEditorStore.setState({
      deckEdits: {},
      isEditMode: false,
    });
    localStorage.clear();
  });

  it('merges raw slides with default font size and unedited text', () => {
    const { result } = renderHook(() =>
      usePresentationEditor({
        deckId: 'deck_1',
        slides: mockSlides,
        activeSlideIndex: 0,
      }),
    );

    expect(result.current.isEditMode).toBe(false);
    expect(result.current.currentFontSize).toBe(DEFAULT_FONT_SIZE);
    expect(result.current.activeSlide.title).toBe('Original Title 1');
    expect(result.current.hasEdits).toBe(false);
  });

  it('toggles edit mode', () => {
    const { result } = renderHook(() =>
      usePresentationEditor({
        deckId: 'deck_1',
        slides: mockSlides,
        activeSlideIndex: 0,
      }),
    );

    act(() => {
      result.current.toggleEditMode();
    });
    expect(result.current.isEditMode).toBe(true);

    act(() => {
      result.current.setEditMode(false);
    });
    expect(result.current.isEditMode).toBe(false);
  });

  it('adjusts font size for active slide and keeps other slides independent', () => {
    const { result, rerender } = renderHook(
      ({ activeIdx }) =>
        usePresentationEditor({
          deckId: 'deck_1',
          slides: mockSlides,
          activeSlideIndex: activeIdx,
        }),
      { initialProps: { activeIdx: 0 } },
    );

    // Increase font size on Slide 1
    act(() => {
      result.current.increaseFontSize();
    });
    expect(result.current.currentFontSize).toBe(115);
    expect(result.current.activeSlide.fontSize).toBe(115);

    // Switch to Slide 2
    rerender({ activeIdx: 1 });
    expect(result.current.currentFontSize).toBe(100);
    expect(result.current.activeSlide.fontSize).toBe(100);

    // Set font size directly on Slide 2
    act(() => {
      result.current.setFontSize(145);
    });
    expect(result.current.currentFontSize).toBe(145);

    // Switch back to Slide 1 — should still be 115
    rerender({ activeIdx: 0 });
    expect(result.current.currentFontSize).toBe(115);
  });

  it('updates text fields for the active slide and marks hasEdits as true', () => {
    const { result } = renderHook(() =>
      usePresentationEditor({
        deckId: 'deck_1',
        slides: mockSlides,
        activeSlideIndex: 1,
      }),
    );

    act(() => {
      result.current.updateActiveSlideField('title', 'Refined Problem Statement');
      result.current.updateActiveSlideField('content', 'Rewritten point A\nRewritten point B');
    });

    expect(result.current.activeSlide.title).toBe('Refined Problem Statement');
    expect(result.current.activeSlide.content).toBe('Rewritten point A\nRewritten point B');
    expect(result.current.hasEdits).toBe(true);

    // Reset slide
    act(() => {
      result.current.resetCurrentSlide();
    });
    expect(result.current.activeSlide.title).toBe('Problem Statement');
    expect(result.current.hasEdits).toBe(false);
  });
});
