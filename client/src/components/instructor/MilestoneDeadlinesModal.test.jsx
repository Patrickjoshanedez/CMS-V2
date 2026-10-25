import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MilestoneDeadlinesModal from './MilestoneDeadlinesModal';
import api from '@/services/api';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= vi.fn();

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: () => ({ data: ['2026-2027', '2025-2026'] }),
}));

vi.mock('@/services/api', () => ({
  default: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

describe('MilestoneDeadlinesModal', () => {
  let container;
  let root;

  const mockSections = [
    { _id: 'sec-1', name: 'BSIT-4A' },
    { _id: 'sec-2', name: 'BSIT-4B' },
  ];
  const mockBatchYears = ['2026-2027', '2025-2026'];
  const mockDeadlines = [
    {
      _id: 'dl-1',
      batchYear: '2025-2026',
      targetType: 'batch',
      stage: 'capstone_1',
      deliverable: 'chapter_1',
      title: 'Chapter 1 Final Draft',
      description: 'Submit chapters 1-3 draft',
      deadlineDate: '2026-10-15T23:59:59.000Z',
      allowLateSubmission: true,
    },
  ];

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
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderComponent = (props = {}) =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <MilestoneDeadlinesModal
          open={true}
          onClose={vi.fn()}
          sections={mockSections}
          batchYears={mockBatchYears}
          defaultBatch="2025-2026"
          deadlines={mockDeadlines}
          onSaved={vi.fn()}
          {...props}
        />
      </QueryClientProvider>,
    );

  it('does not render when open is false', async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MilestoneDeadlinesModal
            open={false}
            onClose={vi.fn()}
            sections={mockSections}
            batchYears={mockBatchYears}
          />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toBe('');
  });

  it('renders the title proposal phase and three semester-based Capstone courses', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(document.body.textContent).toContain('Set Milestone Submission Deadlines');
    expect(document.body.textContent).toContain('Schedule New Milestone Cutoff');

    const stageSelect = document.body.querySelector('#deadline-stage');
    expect(stageSelect).toBeTruthy();
    await act(async () => {
      stageSelect.click();
    });

    const stageOptions = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent,
    );
    expect(stageOptions).toContain('Phase 1 — Title Proposals & Committee');
    expect(stageOptions).toContain('Phase 2 — Capstone 1 (Chapters 1–3 & Proposal Defense)');
    expect(stageOptions).toContain('Phase 3 — Capstone 2 (System Development & Prototype)');
    expect(stageOptions).toContain('Phase 4 — Capstone 3 (Final Manuscripts & Defense)');
    expect(stageOptions).toHaveLength(4);
  });

  it('toggles target scope between batch-wide and section-specific', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(document.body.textContent).toContain('Batch-Wide');
    expect(document.body.textContent).toContain('Section Only');

    const sectionRadio = document.body.querySelector('#deadline-target-section');
    expect(sectionRadio).toBeTruthy();

    await act(async () => {
      sectionRadio.click();
    });

    // Now Section picker should appear
    expect(document.body.textContent).toContain('Specific Section');
    expect(document.body.querySelector('#deadline-section')).toBeTruthy();
    await act(async () => {
      document.body.querySelector('#deadline-section').click();
    });
    const sectionOptions = Array.from(document.body.querySelectorAll('[role="option"]')).map(
      (option) => option.textContent,
    );
    expect(sectionOptions).toContain('BSIT-4A (IT)');
    expect(sectionOptions).toContain('BSIT-4B (IT)');
  });

  it('submits milestone deadline successfully via POST /settings/deadlines/milestone', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });
    const mockOnSaved = vi.fn();

    await act(async () => {
      renderComponent({ onSaved: mockOnSaved });
    });

    // Set deadline date input
    const dateInput = document.body.querySelector('input[type="date"]');
    expect(dateInput).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeSetter.call(dateInput, '2026-10-20');
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Click submit button
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Set Deadline'),
    );
    expect(submitBtn).toBeTruthy();

    await act(async () => {
      submitBtn.click();
    });

    expect(api.post).toHaveBeenCalledWith(
      '/settings/deadlines/milestone',
      expect.objectContaining({
        batchYear: '2025-2026',
        targetType: 'batch',
        stage: 'proposal',
        deliverable: 'title_proposal',
        deadlineDate: '2026-10-20',
        sectionId: null,
        allowLateSubmission: true,
        isMandatory: true,
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Milestone deadline scheduled successfully.');
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it('requires a section and preserves section targeting and late-submission choices', async () => {
    api.post.mockResolvedValue({ data: { success: true } });

    await act(async () => {
      renderComponent();
    });

    const dateInput = document.body.querySelector('input[type="date"]');
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeSetter.call(dateInput, '2026-10-20');
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      document.body.querySelector('#deadline-target-section').click();
    });
    const submitButton = document.body.querySelector('button[type="submit"]');
    await act(async () => {
      submitButton.click();
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith('Please complete all required fields.');

    await act(async () => {
      document.body.querySelector('#deadline-section').click();
    });
    const sectionOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (option) => option.textContent.includes('BSIT-4A'),
    );
    await act(async () => {
      sectionOption.click();
      document.body.querySelector('#allow-late').click();
    });

    await act(async () => {
      submitButton.click();
    });

    expect(api.post).toHaveBeenCalledWith(
      '/settings/deadlines/milestone',
      expect.objectContaining({
        targetType: 'section',
        sectionId: 'sec-1',
        allowLateSubmission: false,
        isMandatory: true,
      }),
    );
  });

  it('requires confirmation before deleting a milestone deadline', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });
    const mockOnSaved = vi.fn();

    await act(async () => {
      renderComponent({ onSaved: mockOnSaved });
    });

    // Active deadlines list should display Chapter 1 Final Draft
    expect(document.body.textContent).toContain('Chapter 1 Final Draft');
    expect(document.body.textContent).toContain('Active Milestones (1)');

    const deleteBtn = document.body.querySelector(
      'button[aria-label="Delete deadline: Chapter 1 Final Draft"]',
    );
    expect(deleteBtn).toBeTruthy();

    await act(async () => {
      deleteBtn.click();
    });

    expect(document.body.querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(api.delete).not.toHaveBeenCalled();

    const alertDialog = document.body.querySelector('[role="alertdialog"]');
    const cancelButton = Array.from(alertDialog.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Cancel'),
    );
    expect(cancelButton).toBeTruthy();
    await act(async () => {
      cancelButton.click();
    });
    expect(document.body.querySelector('[role="alertdialog"]')).toBeFalsy();
    expect(api.delete).not.toHaveBeenCalled();

    await act(async () => {
      deleteBtn.click();
    });

    const confirmButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Remove deadline'),
    );
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton.click();
    });

    expect(api.delete).toHaveBeenCalledWith('/settings/deadlines/milestone/dl-1');
    expect(mockToastSuccess).toHaveBeenCalledWith('Milestone deadline removed.');
    expect(mockOnSaved).toHaveBeenCalled();
  });
});
