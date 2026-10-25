import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RouteErrorBoundary from './RouteErrorBoundary';
import { topProgress } from '@/lib/topProgress';

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
    expect(view.container.querySelector('[role="alert"]')).not.toBeNull();

    const details = view.container.querySelector('details');
    expect(details).not.toBeNull();
    await act(async () => details.querySelector('summary').click());
    expect(details.open).toBe(true);

    consoleSpy.mockRestore();
    view.unmount();
  });

  it('clears pending route progress when rendering fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    topProgress.clear();
    topProgress.start('/broken-route');

    const view = await renderWithRouter(
      <RouteErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </RouteErrorBoundary>,
    );

    expect(view.container.textContent).toContain('Something went wrong');
    expect(topProgress.status).toBe('idle');
    expect(topProgress.progress).toBe(0);

    view.unmount();
    topProgress.clear();
    consoleSpy.mockRestore();
  });
});
