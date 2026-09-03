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

  it('renders only the 3D orbit spinner in fullScreen mode without logo — no text content', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen />);
    });

    const statusEl = container.querySelector('[role="status"]');
    expect(statusEl).not.toBeNull();
    expect(statusEl.className).toContain('fixed inset-0');
    expect(container.querySelector('.cms-spinner-box')).not.toBeNull();
    expect(container.querySelector('.cms-orbit-ring-1')).not.toBeNull();
    expect(container.querySelector('.cms-orbit-ring-2')).not.toBeNull();
    expect(container.querySelector('.cms-badge-pop')).toBeNull();
    // No text content rendered when showLogo is false
    expect(container.textContent.trim()).toBe('');
  });

  it('renders brand logo and title when showLogo is true on landing/initial session', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen showLogo={true} message="Initializing session..." />);
    });

    const badge = container.querySelector('.cms-badge-pop');
    expect(badge).not.toBeNull();
    expect(container.textContent).toContain('CMS');
    expect(container.textContent).toContain('BukSU');
    expect(container.textContent).toContain('Capstone Management System');
    expect(container.textContent).toContain('Initializing session...');
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
    expect(container.querySelector('.cms-badge-pop')).toBeNull();
    // No text rendered in embedded mode without showLogo
    expect(container.textContent.trim()).toBe('');
  });

  it('supports size presets (sm)', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen size="sm" showLogo={true} />);
    });

    const badge = container.querySelector('.cms-badge-pop');
    expect(badge).not.toBeNull();
    expect(badge.className).toContain('h-16 w-16');

    const spinnerBox = container.querySelector('.cms-spinner-box');
    expect(spinnerBox.className).toContain('h-32 w-32');

    const track = container.querySelector('.cms-fluid-track');
    expect(track).not.toBeNull();
    expect(track.parentElement.className).toContain('w-32');
  });

  it('supports size presets (lg)', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen size="lg" showLogo={true} />);
    });

    const badge = container.querySelector('.cms-badge-pop');
    expect(badge).not.toBeNull();
    expect(badge.className).toContain('h-24 w-24');

    const spinnerBox = container.querySelector('.cms-spinner-box');
    expect(spinnerBox.className).toContain('h-64 w-64');

    const track = container.querySelector('.cms-fluid-track');
    expect(track).not.toBeNull();
    expect(track.parentElement.className).toContain('w-64');
  });
});
