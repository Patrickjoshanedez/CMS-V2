import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from './Dialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('Dialog', () => {
  it('keeps its centering independent from animated transforms', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Centered dialog</DialogTitle>
          </DialogContent>
        </Dialog>,
      ),
    );

    const content = document.body.querySelector('[role="dialog"]');
    expect(content).not.toBeNull();
    expect(content).toHaveClass('dialog-centered');
    expect(content).not.toHaveClass('-translate-x-1/2', '-translate-y-1/2');
  });

  it('uses an edge-to-edge surface for fullscreen dialogs', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <Dialog open>
          <DialogContent fullscreen>
            <DialogTitle>Fullscreen dialog</DialogTitle>
          </DialogContent>
        </Dialog>,
      ),
    );

    const content = document.body.querySelector('[role="dialog"]');
    expect(content).toHaveClass('dialog-fullscreen', 'h-dvh', 'w-screen', 'max-w-none');
    expect(content).not.toHaveClass('dialog-centered');
  });
});
