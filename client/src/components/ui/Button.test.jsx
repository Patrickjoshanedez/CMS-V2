import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button.jsx';
import { preloadRoute } from '@/utils/routePreload';

vi.mock('@/utils/routePreload', () => ({
  preloadRoute: vi.fn(),
  normalizeRoutePath: (path) => path,
  isRoutePreloaded: vi.fn(() => false),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Button', () => {
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
    vi.clearAllMocks();
  });

  it('renders the child element when asChild is enabled', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <Button asChild variant="secondary">
          <a href="/team">Open team</a>
        </Button>,
      );
    });

    const anchor = container.querySelector('a');

    expect(container.querySelector('button')).toBeNull();
    expect(anchor).not.toBeNull();
    expect(anchor.textContent).toBe('Open team');
    expect(anchor.getAttribute('href')).toBe('/team');
    expect(anchor.className).toContain('bg-secondary');
    expect(anchor.className).toContain('text-secondary-foreground');
  });

  it('renders a spinner and disables button when loading is true', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<Button loading>Submit Proposal</Button>);
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('svg')).not.toBeNull();
    expect(button.textContent).toContain('Submit Proposal');
  });

  it('renders loadingText when loading is true and loadingText is provided', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(
        <Button loading loadingText="Saving changes...">
          Save
        </Button>,
      );
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.textContent).toContain('Saving changes...');
    expect(button.textContent).not.toContain('Save');
  });

  it('triggers route preloading when to or href is provided on click or interaction', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<Button to="/projects">View Projects</Button>);
    });

    const button = container.querySelector('button');
    expect(button).not.toBeNull();

    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(preloadRoute).toHaveBeenCalledWith('/projects');
  });
});
