import React, { act, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import useAutosave from './useAutosave';
import SaveStatusIndicator from '../components/common/SaveStatusIndicator';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useAutosave Hook and SaveStatusIndicator', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  function TestHarness({ initialData, onRemoteSave, debounceMs = 500 }) {
    const [data, setData] = useState(initialData);
    const { saveStatus } = useAutosave('test-draft-key', data, debounceMs, onRemoteSave);

    return (
      <div>
        <SaveStatusIndicator status={saveStatus} />
        <button
          data-testid="update-btn"
          onClick={() => setData({ ...data, title: 'Updated Title' })}
        >
          Update
        </button>
      </div>
    );
  }

  it('initializes in "saved" state and displays Draft (Auto-saved)', () => {
    act(() => {
      root.render(<TestHarness initialData={{ title: 'Initial' }} />);
    });

    expect(container.querySelector('[data-testid="save-status-saved"]')).not.toBeNull();
    expect(container.textContent).toContain('Draft (Auto-saved)');
  });

  it('transitions to "unsaved" on edit and saves to localStorage debounced', async () => {
    const onRemoteSave = vi.fn().mockResolvedValue();

    act(() => {
      root.render(
        <TestHarness
          initialData={{ title: 'Initial' }}
          onRemoteSave={onRemoteSave}
          debounceMs={500}
        />,
      );
    });

    const btn = container.querySelector('[data-testid="update-btn"]');
    act(() => {
      btn.click();
    });

    // Should immediately transition to unsaved
    expect(container.querySelector('[data-testid="save-status-unsaved"]')).not.toBeNull();
    expect(container.textContent).toContain('Unsaved changes');

    // Advance timer to trigger autosave
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(localStorage.getItem('test-draft-key')).toBe(JSON.stringify({ title: 'Updated Title' }));
    expect(onRemoteSave).toHaveBeenCalledWith({ title: 'Updated Title' }, expect.any(Object));
    expect(container.querySelector('[data-testid="save-status-saved"]')).not.toBeNull();
  });

  it('flushes latest draft synchronously to localStorage on unmount', () => {
    act(() => {
      root.render(
        <TestHarness initialData={{ title: 'Unsaved On Route Change' }} debounceMs={5000} />,
      );
    });

    const btn = container.querySelector('[data-testid="update-btn"]');
    act(() => {
      btn.click();
    });

    // Unmount before debounce timer fires
    act(() => {
      root.unmount();
    });

    // Verify draft was flushed synchronously on unmount
    expect(localStorage.getItem('test-draft-key')).toBe(JSON.stringify({ title: 'Updated Title' }));
  });
});
