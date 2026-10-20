import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import RouteErrorBoundary from './RouteErrorBoundary';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function BuggyComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test Explosion');
  }
  return <div>Healthy Component</div>;
}

const renderWithRouter = async (ui, initialEntries = ['/']) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
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

describe('RouteErrorBoundary', () => {
  it('renders children when no error occurs', async () => {
    const view = await renderWithRouter(
      <RouteErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </RouteErrorBoundary>,
    );

    expect(view.container.textContent).toContain('Healthy Component');
    view.unmount();
  });

  it('catches render error and displays fallback UI', async () => {
    // Suppress console.error in test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const view = await renderWithRouter(
      <RouteErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    expect(view.container.textContent).toContain('Something went wrong');
    expect(view.container.textContent).toContain('Try Again');
    expect(view.container.textContent).toContain('Go to Dashboard');

    consoleSpy.mockRestore();
    view.unmount();
  });
});
