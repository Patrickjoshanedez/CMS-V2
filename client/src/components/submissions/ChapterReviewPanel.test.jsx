import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChapterReviewPanel from './ChapterReviewPanel';
import { SUBMISSION_STATUSES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock('@/hooks/useSubmissions', () => ({
  useReviewSubmission: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, submission }) =>
    open ? <div data-testid="doc-viewer-modal">Doc Viewer: {submission?._id}</div> : null,
}));

describe('ChapterReviewPanel Component', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = (props = {}) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
            <ChapterReviewPanel
              submissions={props.submissions || []}
              chapters={props.chapters || [1, 2, 3]}
              {...props}
            />
          </MemoryRouter>
        </QueryClientProvider>,
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

  it('renders chapter headers and progression gate', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain('Chapter Submissions');
    expect(view.container.textContent).toContain('Chapter 1');
    expect(view.container.textContent).toContain('Chapter 2');
    expect(view.container.textContent).toContain('Chapter 3');

    view.unmount();
  });

  it('displays rounds, status, Read Document button, and Review Studio button', () => {
    const mockSubmissions = [
      {
        _id: 'sub-ch1-v1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: SUBMISSION_STATUSES.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const view = renderComponent({ submissions: mockSubmissions });

    expect(view.container.textContent).toContain('Round 1');
    expect(view.container.textContent).toContain('Pending Review');
    expect(view.container.textContent).toContain('Read Document');
    expect(view.container.textContent).toContain('Review Studio');
    expect(view.container.textContent).toContain('Approve & Lock');
    expect(view.container.textContent).toContain('Request Revision');

    view.unmount();
  });

  it('displays previous round feedback callout on revised rounds', () => {
    const mockSubmissions = [
      {
        _id: 'sub-ch1-v2',
        type: 'chapter',
        chapter: 1,
        version: 2,
        status: SUBMISSION_STATUSES.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'sub-ch1-v1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        reviewNote: 'Please clarify the problem statement in Section 1.2.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const view = renderComponent({ submissions: mockSubmissions });

    expect(view.container.textContent).toContain('Previous Round 1 Feedback to Verify:');
    expect(view.container.textContent).toContain(
      'Please clarify the problem statement in Section 1.2.',
    );

    view.unmount();
  });

  it('opens SophisticatedDocumentViewer when Read Document is clicked', () => {
    const mockSubmissions = [
      {
        _id: 'sub-ch1-v1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: SUBMISSION_STATUSES.PENDING,
      },
    ];

    const view = renderComponent({ submissions: mockSubmissions });

    const readDocButton = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Read Document'),
    );
    expect(readDocButton).toBeDefined();

    act(() => {
      readDocButton.click();
    });

    expect(view.container.textContent).toContain('Doc Viewer: sub-ch1-v1');

    view.unmount();
  });
});
