import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectMilestoneDeadlines } from './useProjectMilestoneDeadlines';

const { getMilestoneDeadlines } = vi.hoisted(() => ({ getMilestoneDeadlines: vi.fn() }));

vi.mock('@/services/settingsService', () => ({
  default: { getMilestoneDeadlines },
}));

describe('useProjectMilestoneDeadlines', () => {
  beforeEach(() => {
    getMilestoneDeadlines.mockReset();
    getMilestoneDeadlines.mockResolvedValue({ data: { data: [{ deliverable: 'chapter_1' }] } });
  });

  it('requests deadlines for the active project batch and section', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useProjectMilestoneDeadlines({
          academicYear: '2025-2026',
          sectionId: { _id: 'section-a' },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual([{ deliverable: 'chapter_1' }]));
    expect(getMilestoneDeadlines).toHaveBeenCalledWith({
      batchYear: '2025-2026',
      sectionId: 'section-a',
    });
    client.clear();
  });

  it('does not request unscoped deadlines when the project has no academic batch', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(() => useProjectMilestoneDeadlines({ _id: 'project-a' }), { wrapper });
    expect(getMilestoneDeadlines).not.toHaveBeenCalled();
    client.clear();
  });
});
