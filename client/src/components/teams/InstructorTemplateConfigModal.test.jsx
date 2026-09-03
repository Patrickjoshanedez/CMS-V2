import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorTemplateConfigModal } from './InstructorTemplateConfigModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockMutate = vi.fn();
vi.mock('@/hooks/useTeams', () => ({
  useUpdateManuscriptTemplate: (options = {}) => ({
    mutate: (data) => {
      mockMutate(data);
      options.onSuccess?.({ success: true });
    },
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InstructorTemplateConfigModal', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    act(() => {
      root.render(<InstructorTemplateConfigModal {...props} />);
    });
  };

  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };

  it('renders trigger button and opens dialog on click', () => {
    renderComponent({ academicYear: '2025-2026' });

    const triggerBtn = container.querySelector('button');
    expect(triggerBtn.textContent).toContain('Configure Manuscript Template');

    act(() => {
      triggerBtn.click();
    });

    expect(container.textContent).toContain('Manage Institutional Manuscript Template');
    expect(container.textContent).toContain('Google Docs Copy Link');
    expect(container.textContent).toContain('Direct File Upload (.DOCX)');

    cleanup();
  });

  it('submits form and triggers mutation with updated template payload', () => {
    const onSaved = vi.fn();
    renderComponent({ academicYear: '2025-2026', onSaved });

    // Open modal
    const triggerBtn = container.querySelector('button');
    act(() => {
      triggerBtn.click();
    });

    // Find the save button
    const submitBtn = container.querySelector('button[type="submit"]');
    expect(submitBtn.textContent).toContain('Save & Cascade to All Approved Teams');

    act(() => {
      submitBtn.click();
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYear: '2025-2026',
        distributionType: 'google_docs',
        versionLabel: 'AY 2025-2026 v2.1',
      }),
    );
    expect(onSaved).toHaveBeenCalled();

    cleanup();
  });
});
