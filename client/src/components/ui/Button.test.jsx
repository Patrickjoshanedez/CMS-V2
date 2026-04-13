import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Button } from './Button.jsx';

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
});