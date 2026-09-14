import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import ChapterProgressWithRounds from './ChapterProgressWithRounds';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: () => <div data-testid="sophisticated-doc-viewer" />,
}));

describe('ChapterProgressWithRounds Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    document.body.innerHTML = '';
  });

  it('renders reviewer full name when reviewedBy is populated', async () => {
    const project = {
      _id: 'proj-1',
      title: 'Test Capstone Project',
      adviserId: {
        _id: 'adv-1',
        firstName: 'Steven Joe',
        lastName: 'Bautista',
        fullName: 'Steven Joe Bautista',
      },
    };

    const submissions = [
      {
        _id: 'sub-1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: 'approved',
        reviewNote: 'Methodology looks solid. Approved for Capstone 2 defense.',
        reviewedBy: {
          _id: 'adv-1',
          firstName: 'Steven Joe',
          lastName: 'Bautista',
          fullName: 'Steven Joe Bautista',
        },
        uploadedAt: new Date().toISOString(),
      },
    ];

    await act(async () => {
      root.render(
        <ChapterProgressWithRounds
          project={project}
          submissions={submissions}
          chapters={[1, 2, 3]}
        />,
      );
    });

    expect(container.textContent).toContain(
      'Methodology looks solid. Approved for Capstone 2 defense.',
    );
    expect(container.textContent).toContain('Reviewer: Steven Joe Bautista');
    expect(container.textContent).not.toContain('Reviewer: —');
  });

  it('renders assigned adviser name when round has not yet been reviewed', async () => {
    const project = {
      _id: 'proj-1',
      title: 'Test Capstone Project',
      adviserId: {
        _id: 'adv-1',
        firstName: 'Steven Joe',
        lastName: 'Bautista',
        fullName: 'Steven Joe Bautista',
      },
    };

    const submissions = [
      {
        _id: 'sub-1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: 'under_review',
        reviewNote: null,
        reviewedBy: null,
        uploadedAt: new Date().toISOString(),
      },
    ];

    await act(async () => {
      root.render(
        <ChapterProgressWithRounds
          project={project}
          submissions={submissions}
          chapters={[1, 2, 3]}
        />,
      );
    });

    expect(container.textContent).toContain('No adviser comment yet.');
    expect(container.textContent).toContain('Reviewer: Steven Joe Bautista (Assigned Adviser)');
    expect(container.textContent).not.toContain('Reviewer: —');
  });

  it('falls back to Awaiting Adviser Review when no adviser is assigned', async () => {
    const project = {
      _id: 'proj-1',
      title: 'Test Capstone Project',
      adviserId: null,
    };

    const submissions = [
      {
        _id: 'sub-1',
        type: 'chapter',
        chapter: 1,
        version: 1,
        status: 'under_review',
        reviewNote: null,
        reviewedBy: null,
        uploadedAt: new Date().toISOString(),
      },
    ];

    await act(async () => {
      root.render(
        <ChapterProgressWithRounds
          project={project}
          submissions={submissions}
          chapters={[1, 2, 3]}
        />,
      );
    });

    expect(container.textContent).toContain('Reviewer: Awaiting Adviser Review');
    expect(container.textContent).not.toContain('Reviewer: —');
  });
});
