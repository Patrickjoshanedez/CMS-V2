import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ForbiddenPage from './ForbiddenPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const renderForbiddenPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <ForbiddenPage />
      </MemoryRouter>,
    );
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('ForbiddenPage', () => {
  it('explains the access restriction and offers dashboard and sign-in recovery', () => {
    const view = renderForbiddenPage();

    expect(view.container.querySelector('main h1')?.textContent).toBe('Access denied');
    expect(view.container.textContent).toContain('403 · Access restricted');
    expect(view.container.textContent).toContain("You don't have permission to view this page.");
    expect(view.container.querySelector('a[href="/dashboard"]')?.textContent).toContain(
      'Dashboard',
    );
    expect(view.container.querySelector('a[href="/login"]')?.textContent).toContain('Sign in');

    view.unmount();
  });
});
