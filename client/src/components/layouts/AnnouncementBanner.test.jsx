import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnnouncementBanner from './AnnouncementBanner.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQuery: (...args) => mockUseQuery(...args),
  };
});

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderBanner = (className) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<AnnouncementBanner className={className} />);
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

  it('TC-SET-002: renders announcement when non-empty', () => {
    mockUseQuery.mockReturnValue({
      data: { systemAnnouncement: 'System will be down at 10PM' },
      isLoading: false,
    });

    const view = renderBanner();

    expect(view.container.textContent).toContain('System Announcement');
    expect(view.container.textContent).toContain('System will be down at 10PM');

    view.unmount();
  });

  it('TC-SET-002: hides banner when announcement is empty/whitespace', () => {
    mockUseQuery.mockReturnValue({
      data: { systemAnnouncement: '   ' },
      isLoading: false,
    });

    const view = renderBanner();

    expect(view.container.textContent).toBe('');

    view.unmount();
  });

  it('uses the shared alert and accessible button to dismiss the announcement', () => {
    mockUseQuery.mockReturnValue({
      data: { systemAnnouncement: 'Review the updated capstone calendar.' },
      isLoading: false,
    });

    const view = renderBanner('mb-6');
    const alert = view.container.querySelector('[role="alert"]');
    const dismissButton = view.container.querySelector('button[aria-label="Dismiss announcement"]');

    expect(alert?.className).toContain('mb-6');
    expect(alert?.textContent).toContain('Review the updated capstone calendar.');
    expect(dismissButton).toBeTruthy();

    act(() => dismissButton.click());

    expect(view.container.querySelector('[role="alert"]')).toBeNull();

    view.unmount();
  });
});
