import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const renderNotFoundPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
        <NotFoundPage />
      </MemoryRouter>,
    );
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates one step back when Go Back is clicked', () => {
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});

    const view = renderNotFoundPage();

    const goBackButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Go Back'),
    );

    expect(goBackButton).toBeTruthy();

    act(() => {
      goBackButton.click();
    });

    expect(backSpy).toHaveBeenCalledTimes(1);

    view.unmount();
    backSpy.mockRestore();
  });
});
