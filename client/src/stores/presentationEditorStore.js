import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Available font size percentage presets
 * 75% (Compact) to 160% (Theater Bold)
 */
export const FONT_SIZE_PRESETS = [75, 85, 100, 115, 130, 145, 160];
export const DEFAULT_FONT_SIZE = 100;

/**
 * Presentation Editor Zustand Store
 * Persists per-slide font sizes and user-edited slide text (titles, subtitles, bullets)
 * across fullscreen preview sessions and page refreshes.
 */
export const usePresentationEditorStore = create(
  persist(
    (set, get) => ({
      /**
       * deckEdits: {
       *   [deckId]: {
       *     [slideId]: {
       *       title?: string,
       *       subtitle?: string,
       *       content?: string,
       *       fontSize?: number, // percentage e.g. 100
       *       updatedAt?: number
       *     }
       *   }
       * }
       */
      deckEdits: {},

      /** Global toggle for whether fullscreen presentation is in Edit Mode */
      isEditMode: false,

      /**
       * Toggle edit mode on/off
       */
      toggleEditMode: () =>
        set((state) => ({
          isEditMode: !state.isEditMode,
        })),

      /**
       * Set edit mode explicitly
       */
      setEditMode: (isEditMode) => set({ isEditMode: Boolean(isEditMode) }),

      /**
       * Get edits for a specific slide
       */
      getSlideEdits: (deckId, slideId) => {
        if (!deckId || slideId === undefined || slideId === null) return {};
        const state = get();
        return state.deckEdits[deckId]?.[slideId] || {};
      },

      /**
       * Update a specific field for a slide (e.g. title, subtitle, content)
       */
      updateSlideField: (deckId, slideId, field, value) => {
        if (!deckId || slideId === undefined || slideId === null) return;
        set((state) => {
          const deck = state.deckEdits[deckId] || {};
          const slide = deck[slideId] || {};

          return {
            deckEdits: {
              ...state.deckEdits,
              [deckId]: {
                ...deck,
                [slideId]: {
                  ...slide,
                  [field]: value,
                  updatedAt: Date.now(),
                },
              },
            },
          };
        });
      },

      /**
       * Set font size (percentage) for a specific slide
       */
      setSlideFontSize: (deckId, slideId, fontSize) => {
        if (!deckId || slideId === undefined || slideId === null) return;
        const clampedSize = Math.max(60, Math.min(200, Number(fontSize) || DEFAULT_FONT_SIZE));

        set((state) => {
          const deck = state.deckEdits[deckId] || {};
          const slide = deck[slideId] || {};

          return {
            deckEdits: {
              ...state.deckEdits,
              [deckId]: {
                ...deck,
                [slideId]: {
                  ...slide,
                  fontSize: clampedSize,
                  updatedAt: Date.now(),
                },
              },
            },
          };
        });
      },

      /**
       * Step font size up or down for a specific slide
       * @param {string} deckId
       * @param {number|string} slideId
       * @param {'increase'|'decrease'} direction
       */
      stepSlideFontSize: (deckId, slideId, direction = 'increase') => {
        if (!deckId || slideId === undefined || slideId === null) return;
        const currentEdits = get().getSlideEdits(deckId, slideId);
        const currentSize = currentEdits.fontSize || DEFAULT_FONT_SIZE;

        let nextSize;
        if (direction === 'increase') {
          const higher = FONT_SIZE_PRESETS.find((p) => p > currentSize);
          nextSize = higher !== undefined ? higher : Math.min(200, currentSize + 15);
        } else {
          const lower = [...FONT_SIZE_PRESETS].reverse().find((p) => p < currentSize);
          nextSize = lower !== undefined ? lower : Math.max(60, currentSize - 15);
        }

        get().setSlideFontSize(deckId, slideId, nextSize);
      },

      /**
       * Reset edits for a single slide back to original defaults
       */
      resetSlideEdits: (deckId, slideId) => {
        if (!deckId || slideId === undefined || slideId === null) return;
        set((state) => {
          const deck = { ...(state.deckEdits[deckId] || {}) };
          delete deck[slideId];

          return {
            deckEdits: {
              ...state.deckEdits,
              [deckId]: deck,
            },
          };
        });
      },

      /**
       * Reset all custom edits for an entire deck
       */
      resetDeckEdits: (deckId) => {
        if (!deckId) return;
        set((state) => {
          const nextDecks = { ...state.deckEdits };
          delete nextDecks[deckId];
          return { deckEdits: nextDecks };
        });
      },
    }),
    {
      name: 'buksu-presentation-editor-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ deckEdits: state.deckEdits }),
    },
  ),
);
