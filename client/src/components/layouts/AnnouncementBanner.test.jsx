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

  const renderBanner = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<AnnouncementBanner />);
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
});
