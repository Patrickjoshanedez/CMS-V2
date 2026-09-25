import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import MilestoneDeadlinesModal from './MilestoneDeadlinesModal';
import api from '@/services/api';
import { CAPSTONE_STAGES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

  const renderComponent = (props = {}) =>
    root.render(
      <MilestoneDeadlinesModal
        open={true}
        onClose={vi.fn()}
        sections={mockSections}
        batchYears={mockBatchYears}
        defaultBatch="2025-2026"
        deadlines={mockDeadlines}
        onSaved={vi.fn()}
        {...props}
      />,
    );

  it('does not render when open is false', async () => {
    await act(async () => {
      root.render(
        <MilestoneDeadlinesModal
          open={false}
          onClose={vi.fn()}
          sections={mockSections}
          batchYears={mockBatchYears}
        />,
      );
    });

    expect(container.textContent).toBe('');
  });

  it('renders modal with title, batch picker, and strict 4-stage lifecycle without Capstone 4', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Set Milestone Submission Deadlines');
    expect(container.textContent).toContain('Schedule New Milestone Cutoff');

    // Stage dropdown verification
    const stageSelects = Array.from(container.querySelectorAll('select'));
    const stageSelect = stageSelects.find((s) =>
      Array.from(s.options).some((o) => o.value === CAPSTONE_STAGES.CAPSTONE_1),
    );
    expect(stageSelect).toBeTruthy();

    const stageOptions = Array.from(stageSelect.options).map((o) => o.text);
    expect(stageOptions).toContain('Capstone 1 (Proposal & Ch. 1–3)');
    expect(stageOptions).toContain('Capstone 2 (Sprint & System Dev)');
    expect(stageOptions).toContain('Capstone 3 (Results & Progress)');
    expect(stageOptions).toContain('Final (Oral Defense & Archival)');

    // Immutable requirement: Under no circumstances should "Capstone 4" be used
    expect(stageOptions.some((txt) => txt.includes('Capstone 4'))).toBe(false);
    expect(container.textContent).not.toContain('Capstone 4');
  });

  it('toggles target scope between batch-wide and section-specific', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Batch-Wide');
    expect(container.textContent).toContain('Section Only');

    // Click "Section Only" button
    const sectionBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Section Only'),
    );
    expect(sectionBtn).toBeTruthy();

    await act(async () => {
      sectionBtn.click();
    });

    // Now Section picker should appear
    expect(container.textContent).toContain('Target Section');
    expect(container.textContent).toContain('BSIT-4A');
    expect(container.textContent).toContain('BSIT-4B');
  });

  it('submits milestone deadline successfully via POST /settings/deadlines/milestone', async () => {
    api.post.mockResolvedValueOnce({ data: { success: true } });
    const mockOnSaved = vi.fn();

    await act(async () => {
      renderComponent({ onSaved: mockOnSaved });
    });

    // Set deadline date input
    const dateInput = container.querySelector('input[type="date"]');
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
    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
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
        stage: 'capstone_1',
        deliverable: 'chapter_1',
        deadlineDate: '2026-10-20',
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Milestone deadline scheduled successfully.');
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it('deletes a milestone deadline when delete button is confirmed', async () => {
    api.delete.mockResolvedValueOnce({ data: { success: true } });
    const mockOnSaved = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await act(async () => {
      renderComponent({ onSaved: mockOnSaved });
    });

    // Active deadlines list should display Chapter 1 Final Draft
    expect(container.textContent).toContain('Chapter 1 Final Draft');
    expect(container.textContent).toContain('Active Milestones (1)');

    const deleteBtn = container.querySelector('button[title="Delete deadline"]');
    expect(deleteBtn).toBeTruthy();

    await act(async () => {
      deleteBtn.click();
    });

    expect(api.delete).toHaveBeenCalledWith('/settings/deadlines/milestone/dl-1');
    expect(mockToastSuccess).toHaveBeenCalledWith('Milestone deadline removed.');
    expect(mockOnSaved).toHaveBeenCalled();
  });
});
