import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import {
  useArchiveSearchState,
  SCROLL_STORAGE_PREFIX,
  MAX_SAVED_SCROLL_ENTRIES,
  saveScrollPositionWithEviction,
} from './useArchiveSearchState';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useArchiveSearchState Hook', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.sessionStorage?.clear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    container = null;
    root = null;
    window.sessionStorage?.clear();
  });

  function HookHarness({ onState }) {
    const state = useArchiveSearchState(10);
    onState(state);
    return (
      <div>
        <span id="query-display">{state.query}</span>
        <span id="page-display">{state.page}</span>
        <button id="clear-btn" onClick={state.clearQuery}>
          Clear Query
        </button>
        <button id="reset-btn" onClick={state.resetFilters}>
          Reset Filters
        </button>
      </div>
    );
  }

  it('initializes with default state when URL search params are empty', async () => {
    let capturedState;

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/archive']}>
          <HookHarness onState={(s) => (capturedState = s)} />
        </MemoryRouter>,
      );
    });

    expect(capturedState.query).toBe('');
    expect(capturedState.scope).toBe('all');
    expect(capturedState.yearMin).toBe('');
    expect(capturedState.yearMax).toBe('');
    expect(capturedState.program).toBe('all');
    expect(capturedState.sortBy).toBe('relevance');
    expect(capturedState.page).toBe(1);
  });

  it('reads and normalizes defensive parameter aliases (minY/maxY/page)', async () => {
    let capturedState;

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={['/archive?q=sensor&minY=2023&maxY=2025&page=3&program=BSIT&sort=date']}
        >
          <HookHarness onState={(s) => (capturedState = s)} />
        </MemoryRouter>,
      );
    });

    expect(capturedState.query).toBe('sensor');
    expect(capturedState.yearMin).toBe('2023');
    expect(capturedState.yearMax).toBe('2025');
    expect(capturedState.page).toBe(3);
    expect(capturedState.program).toBe('BSIT');
    expect(capturedState.sortBy).toBe('date');
  });

  it('clearQuery resets query to empty and page to 1 while preserving facet filters', async () => {
    let capturedState;

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/archive?q=agriculture&year_min=2024&year_max=2026&program=BSIT&sort=date&p=4',
          ]}
        >
          <HookHarness onState={(s) => (capturedState = s)} />
        </MemoryRouter>,
      );
    });

    expect(capturedState.query).toBe('agriculture');
    expect(capturedState.page).toBe(4);

    const clearButton = container.querySelector('#clear-btn');
    expect(clearButton).toBeTruthy();

    await act(async () => {
      clearButton.click();
    });

    // Query must be reset to empty
    expect(capturedState.query).toBe('');
    // Page must be reset to 1
    expect(capturedState.page).toBe(1);
    // Facet filters must be strictly preserved
    expect(capturedState.yearMin).toBe('2024');
    expect(capturedState.yearMax).toBe('2026');
    expect(capturedState.program).toBe('BSIT');
    expect(capturedState.sortBy).toBe('date');
  });

  it('resetFilters restores all facets back to institutional defaults', async () => {
    let capturedState;

    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[
            '/archive?q=blockchain&year_min=2022&year_max=2025&program=BSCS&sort=citations&p=2',
          ]}
        >
          <HookHarness onState={(s) => (capturedState = s)} />
        </MemoryRouter>,
      );
    });

    const resetButton = container.querySelector('#reset-btn');
    expect(resetButton).toBeTruthy();

    await act(async () => {
      resetButton.click();
    });

    expect(capturedState.query).toBe('blockchain');
    expect(capturedState.scope).toBe('all');
    expect(capturedState.yearMin).toBe('');
    expect(capturedState.yearMax).toBe('');
    expect(capturedState.program).toBe('all');
    expect(capturedState.sortBy).toBe('relevance');
    expect(capturedState.page).toBe(1);
  });

  it('saveScrollPositionWithEviction enforces bounded storage with 20-entry FIFO eviction', () => {
    expect(MAX_SAVED_SCROLL_ENTRIES).toBe(20);

    // Populate 20 entries
    for (let i = 1; i <= 20; i++) {
      saveScrollPositionWithEviction(`${SCROLL_STORAGE_PREFIX}?q=item${i}`, i * 50);
    }

    // Verify 20 items stored
    let count = 0;
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(SCROLL_STORAGE_PREFIX)) count++;
    }
    expect(count).toBe(20);

    // Save the 21st entry
    saveScrollPositionWithEviction(`${SCROLL_STORAGE_PREFIX}?q=item21`, 1050);

    // Must still have exactly 20 entries (oldest evicted)
    count = 0;
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith(SCROLL_STORAGE_PREFIX)) count++;
    }
    expect(count).toBe(20);

    // Verify item 21 exists
    expect(window.sessionStorage.getItem(`${SCROLL_STORAGE_PREFIX}?q=item21`)).toBe('1050');
  });
});
