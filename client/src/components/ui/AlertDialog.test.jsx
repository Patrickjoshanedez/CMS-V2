import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './AlertDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function renderDialog(onOpenChange, onConfirm) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this team?</AlertDialogTitle>
            <AlertDialogDescription>
              The roster can only be changed after it is unlocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirm}>
              Lock team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    ),
  );
}

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('AlertDialog', () => {
  it('exposes a named alert dialog with its confirmation context', () => {
    renderDialog(vi.fn(), vi.fn());

    const dialog = document.body.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(dialog.textContent).toContain('The roster can only be changed after it is unlocked.');
  });

  it('closes on cancel and invokes the confirm action before closing', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    renderDialog(onOpenChange, onConfirm);

    act(() => document.body.querySelector('button').click());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => document.body.querySelectorAll('button')[1].click());
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
