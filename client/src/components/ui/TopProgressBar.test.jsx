import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopProgressBar from './TopProgressBar';
import { topProgress } from '@/lib/topProgress';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TopProgressBar', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    topProgress.clear();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
    container = null;
    root = null;
    topProgress.clear();
  });

  it('renders nothing when status is idle and progress is 0', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
    });

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeNull();
  });

  it('restores navigation listeners and clears timers when the bar unmounts', () => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
    });
    topProgress.start('/pending-route');

    act(() => {
      root.unmount();
    });
    root = null;

    expect(topProgress.status).toBe('idle');
    expect(topProgress.safetyTimer).toBeNull();
    expect(window.history.pushState).toBe(originalPushState);
    expect(window.history.replaceState).toBe(originalReplaceState);
  });

  it('renders an accessible indeterminate progressbar while a route is pending', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
    });

    act(() => {
      topProgress.start();
    });

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar.getAttribute('aria-label')).toBe('Loading page');
    expect(progressBar.className).toContain('fixed inset-x-0 top-0');
    expect(progressBar.className).toContain('z-[999999]');

    const innerBar = progressBar.firstElementChild;
    expect(innerBar).not.toBeNull();
    expect(progressBar.hasAttribute('aria-valuenow')).toBe(false);
    expect(progressBar.hasAttribute('aria-valuemin')).toBe(false);
    expect(progressBar.hasAttribute('aria-valuemax')).toBe(false);
    expect(innerBar.style.width).toBe('');
    expect(innerBar.className).toContain('cms-route-progress-indicator');
  });

  it('does not expose the controller trickle as a measured percentage', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
    });

    act(() => {
      topProgress.start();
      topProgress.trickle();
    });

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    const innerBar = progressBar.firstElementChild;
    expect(topProgress.progress).toBeGreaterThan(24);
    expect(progressBar.hasAttribute('aria-valuenow')).toBe(false);
    expect(innerBar.style.width).toBe('');
  });

  it('ignores stale completion and Suspense cleanup from an older route generation', () => {
    const firstGeneration = topProgress.start('/first-route');
    const suspenseGeneration = topProgress.setSuspended(true, firstGeneration);
    const secondGeneration = topProgress.start('/second-route');

    expect(secondGeneration).toBeGreaterThan(firstGeneration);
    expect(topProgress.setSuspended(false, suspenseGeneration)).toBe(false);
    expect(topProgress.done(firstGeneration)).toBe(false);
    expect(topProgress.status).toBe('loading');
    expect(topProgress.done(secondGeneration)).toBe(true);
    expect(topProgress.status).toBe('completing');
  });

  it('clears a stalled route without announcing successful completion', () => {
    vi.useFakeTimers();
    const observedStates = [];
    const unsubscribe = topProgress.subscribe((state) => observedStates.push(state));

    try {
      topProgress.start('/stalled-route');
      topProgress.setSuspended(true);
      vi.advanceTimersByTime(6000);

      expect(topProgress.status).toBe('idle');
      expect(topProgress.progress).toBe(0);
      expect(topProgress.isSuspended).toBe(false);
      expect(observedStates.some((state) => state.status === 'completing')).toBe(false);
    } finally {
      unsubscribe();
      vi.useRealTimers();
    }
  });

  it('surges to 100% on done and resets', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
      topProgress.start();
    });

    act(() => {
      topProgress.done();
    });

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    const innerBar = progressBar.firstElementChild;
    expect(innerBar.style.width).toBe('100%');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('keeps progress active and does not prematurely complete while Suspense is active', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<TopProgressBar />);
      topProgress.setSuspended(true);
    });

    expect(topProgress.isSuspended).toBe(true);
    expect(topProgress.status).toBe('loading');

    // Attempt premature completion (e.g. from location change)
    act(() => {
      topProgress.done();
    });

    // Bar MUST still be in loading state, not completed
    expect(topProgress.status).toBe('loading');
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    const innerBar = progressBar.firstElementChild;
    expect(innerBar.style.width).not.toBe('100%');

    // Now resolve Suspense (component finished mounting)
    act(() => {
      topProgress.setSuspended(false);
    });

    expect(topProgress.status).toBe('completing');
    expect(innerBar.style.width).toBe('100%');
  });
});
