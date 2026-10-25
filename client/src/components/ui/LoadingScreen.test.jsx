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

  it('renders an accessible full-screen loading card without the brand mark', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen />);
    });

    expect(container.querySelector('.fixed.inset-0')).not.toBeNull();
    expect(container.querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
      'Loading...',
    );
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
    expect(container.textContent).toContain('Loading...');
    expect(container.textContent).not.toContain('BukSU CMS');
  });

  it('renders the institutional mark and title when showLogo is true', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen showLogo={true} message="Initializing session..." />);
    });

    expect(container.querySelector('svg.size-7')).not.toBeNull();
    expect(container.textContent).toContain('BukSU CMS');
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
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
    expect(container.querySelector('.min-h-60')).not.toBeNull();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.textContent).toContain('Loading project workspace...');
    expect(container.textContent).not.toContain('BukSU CMS');
  });

  it('supports the small icon size preset', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen size="sm" showLogo={true} />);
    });

    expect(container.querySelector('svg.size-5')).not.toBeNull();
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });

  it('supports the large icon size preset', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<LoadingScreen size="lg" showLogo={true} />);
    });

    expect(container.querySelector('svg.size-9')).not.toBeNull();
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
  });
});
