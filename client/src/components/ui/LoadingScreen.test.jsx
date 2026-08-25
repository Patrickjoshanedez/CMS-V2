import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import LoadingScreen from './LoadingScreen.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('LoadingScreen', () => {
  let container = null;
  let root = null;

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
  });

  it('renders with default message and brand title in fullScreen mode', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen />);
    });

    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.className).toContain('fixed inset-0');
    expect(container.textContent).toContain('CMS');
    expect(container.textContent).toContain('BukSU');
    expect(container.textContent).toContain('Capstone Management System');
    expect(container.textContent).toContain('Loading...');
  });

  it('renders with custom message and embedded mode when fullScreen is false', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <LoadingScreen
          fullScreen={false}
          message="Loading project workspace..."
          subtitle="BukSU College of Technologies"
        />,
      );
    });

    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.className).not.toContain('fixed inset-0');
    expect(statusEl.className).toContain('min-h-[300px]');

    expect(container.textContent).toContain('Loading project workspace...');
    expect(container.textContent).toContain('BukSU College of Technologies');
  });

  it('supports size presets', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen size="sm" fullScreen={false} />);
    });

    const badge = container.querySelector('.cms-badge-pop');
    expect(badge).not.toBeNull();
    expect(badge.className).toContain('h-12 w-12');
  });
});
