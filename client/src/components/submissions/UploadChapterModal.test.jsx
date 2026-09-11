import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import UploadChapterModal from './UploadChapterModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockMutate = vi.fn();
vi.mock('@/hooks/useSubmissions', () => ({
  useUploadChapter: ({ onSuccess, onError }) => ({
    mutate: mockMutate,
    isPending: false,
    error: null,
  }),
}));

describe('UploadChapterModal Component', () => {
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

  it('does not render when isOpen is false', async () => {
    await act(async () => {
      root.render(<UploadChapterModal isOpen={false} onClose={vi.fn()} projectId="proj-123" />);
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders locked revision mode for Chapter 1 with lock badge, next round info, and adviser remarks', async () => {
    const latestSubmission = {
      _id: 'sub-1',
      chapter: 1,
      version: 1,
      revisionRound: 1,
      remarks: 'Expand problem statement in Section 1.1 and provide references.',
    };

    await act(async () => {
      root.render(
        <UploadChapterModal
          isOpen={true}
          onClose={vi.fn()}
          initialChapter={1}
          isLocked={true}
          projectId="proj-123"
          latestSubmission={latestSubmission}
        />,
      );
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Revise Chapter 1');
    expect(dialog.textContent).toContain('Locked');
    expect(dialog.textContent).toContain('Round 2 (v2)');
    expect(dialog.textContent).toContain('Adviser Review Remarks (Required Revisions)');
    expect(dialog.textContent).toContain(
      'Expand problem statement in Section 1.1 and provide references.',
    );
    // Chapter dropdown should NOT be present when locked
    expect(dialog.querySelector('select#modal-chapter')).toBeNull();
  });

  it('renders general unlocked mode with chapter selector when isLocked is false', async () => {
    await act(async () => {
      root.render(
        <UploadChapterModal
          isOpen={true}
          onClose={vi.fn()}
          initialChapter={1}
          isLocked={false}
          projectId="proj-123"
        />,
      );
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Upload Chapter Manuscript');
    expect(dialog.textContent).not.toContain('Locked');
    // Dropdown is present and enabled
    const select = dialog.querySelector('select#modal-chapter');
    expect(select).toBeTruthy();
    expect(select.disabled).toBe(false);
  });
});
