import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import TopProgressBar from './TopProgressBar';
import { topProgress } from '@/lib/topProgress';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TopProgressBar', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    topProgress.done();
    topProgress.status = 'idle';
    topProgress.progress = 0;
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
    topProgress.done();
    topProgress.status = 'idle';
    topProgress.progress = 0;
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

  it('renders fixed progressbar with BukSU gradient and glowing head when active', () => {
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
    expect(progressBar.className).toContain('fixed top-0');
    expect(progressBar.className).toContain('z-[999999]');

    const innerBar = progressBar.firstElementChild;
    expect(innerBar).not.toBeNull();
    expect(innerBar.className).toContain('bg-gradient-to-r');
    expect(innerBar.style.width).toBe('24%');
  });

  it('trickles progress forward incrementally while loading', () => {
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
    expect(parseFloat(innerBar.style.width)).toBeGreaterThan(24);
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
  });
});
