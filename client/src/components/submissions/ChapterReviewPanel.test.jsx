import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChapterReviewPanel from './ChapterReviewPanel';
import { SUBMISSION_STATUSES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { mockReviewMutate, mockToastError } = vi.hoisted(() => ({
  mockReviewMutate: vi.fn(),
  mockToastError: vi.fn(),
}));

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

vi.mock('@/hooks/useSubmissions', () => ({
  useReviewSubmission: () => ({
    mutate: mockReviewMutate,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: vi.fn() },
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

  it('renders extraItems such as Capstone 1 (1–3 Manuscript) with custom emptyText and rounds', () => {
    const mockExtraItems = [
      {
        id: 'compiled_proposal',
        label: 'Capstone 1 (1–3 Manuscript)',
        filter: (sub) => sub.type === 'proposal',
        emptyText: 'No submissions yet for this compiled manuscript.',
      },
    ];

    const view = renderComponent({
      chapters: [1, 2, 3],
      extraItems: mockExtraItems,
      submissions: [
        {
          _id: 'sub-prop-v1',
          type: 'proposal',
          version: 1,
          status: SUBMISSION_STATUSES.APPROVED,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(view.container.textContent).toContain('Capstone 1 (1–3 Manuscript)');
    expect(view.container.textContent).toContain('Round 1');
    expect(view.container.textContent).toContain('Approved');

    view.unmount();
  });

  it('filters submissions per review session (s1: initial rounds, s2: revisions)', () => {
    const mockSubmissions = [
      {
        _id: 'sub-ch1-v1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: SUBMISSION_STATUSES.APPROVED,
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'sub-ch1-v2',
        type: 'chapter',
        chapter: 1,
        version: 2,
        status: SUBMISSION_STATUSES.PENDING,
        createdAt: new Date().toISOString(),
      },
    ];

    const view = renderComponent({ submissions: mockSubmissions });

    // Initially 'all' shows both Round 2 and Round 1
    expect(view.container.textContent).toContain('Round 2');
    expect(view.container.textContent).toContain('Round 1');

    // Filter to Session 1 (Initial Rounds)
    const select = view.container.querySelector('[data-testid="session-filter-select"]');
    expect(select).not.toBeNull();

    const chooseSession = (label) => {
      act(() => select.click());
      const option = Array.from(document.querySelectorAll('[role="option"]')).find((candidate) =>
        candidate.textContent.includes(label),
      );
      expect(option).toBeTruthy();
      act(() => option.click());
      expect(select.textContent).toContain(label);
    };

    chooseSession('Session 1 (Initial Rounds)');

    expect(view.container.textContent).toContain('Round 1');
    expect(view.container.textContent).not.toContain('Round 2');

    // Filter to Session 2 (Revisions & Defense)
    chooseSession('Session 2 (Revisions & Defense)');

    expect(view.container.textContent).toContain('Round 2');
    expect(view.container.textContent).not.toContain('Round 1');

    view.unmount();
  });

  it('requires revision feedback and submits the trimmed note through the guarded review mutation', () => {
    const mockSubmissions = [
      {
        _id: 'sub-ch1-v2',
        type: 'chapter',
        chapter: 1,
        version: 2,
        status: SUBMISSION_STATUSES.PENDING,
        updatedAt: '2026-10-22T10:00:00.000Z',
      },
    ];
    const view = renderComponent({ submissions: mockSubmissions });

    const requestRevision = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Request Revision'),
    );
    expect(requestRevision).toBeTruthy();
    act(() => requestRevision.click());

    const submitRevision = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Send for Revision'),
    );
    expect(submitRevision).toBeTruthy();
    act(() => submitRevision.click());

    expect(mockReviewMutate).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(
      'Please provide revision feedback before requesting revisions.',
    );

    const feedback = view.container.querySelector('#note-sub-ch1-v2');
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      ).set;
      nativeSetter.call(feedback, '  Clarify the sampling criteria.  ');
      feedback.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => submitRevision.click());

    expect(mockReviewMutate).toHaveBeenCalledWith(
      {
        submissionId: 'sub-ch1-v2',
        status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
        reviewNote: 'Clarify the sampling criteria.',
        expectedUpdatedAt: '2026-10-22T10:00:00.000Z',
      },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    view.unmount();
  });
});
