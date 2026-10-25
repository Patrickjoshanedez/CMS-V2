import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAuditTrail from './ProjectAuditTrail';
import { useProjectAuditTrail } from '@/hooks/useAuditLogs';

vi.mock('@/hooks/useAuditLogs', () => ({
  useProjectAuditTrail: vi.fn(),
}));

const auditEvents = [
  {
    _id: 'audit-project-created',
    action: 'project.created',
    description: 'Project workspace created',
    createdAt: '2026-10-22T12:00:00.000Z',
    actor: { firstName: 'Bea', lastName: 'Aguilar', role: 'student' },
  },
  {
    _id: 'audit-chapter-uploaded',
    action: 'submission.chapter_uploaded',
    description: 'Chapter 1 was uploaded',
    createdAt: '2026-10-22T13:00:00.000Z',
    actor: { firstName: 'Maria', lastName: 'Santos', role: 'adviser' },
  },
];

describe('ProjectAuditTrail', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectAuditTrail.mockReturnValue({
      data: auditEvents,
      isLoading: false,
      isError: false,
      refetch,
    });
  });

  afterEach(cleanup);

  it('renders events, actor roles, and semantic action badges', () => {
    render(<ProjectAuditTrail projectId="project-1" />);

    expect(screen.getByText('Project Created')).toBeTruthy();
    expect(screen.getByText('Chapter Uploaded')).toBeTruthy();
    expect(screen.getByText('Bea Aguilar')).toBeTruthy();
    expect(screen.getByText('student')).toBeTruthy();
    expect(screen.getByText('project.created').className).toContain('border-input');
  });

  it('filters by category and search text with pressed-state semantics', () => {
    render(<ProjectAuditTrail projectId="project-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Project' }));
    expect(screen.getByRole('button', { name: 'Project' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByText('Project Created')).toBeTruthy();
    expect(screen.queryByText('Chapter Uploaded')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'All Events' }));
    fireEvent.change(screen.getByPlaceholderText('Search events, actors…'), {
      target: { value: 'Maria' },
    });
    expect(screen.getByText('Chapter Uploaded')).toBeTruthy();
    expect(screen.queryByText('Project Created')).toBeNull();
  });

  it('shows loading and empty states without presenting false audit events', () => {
    useProjectAuditTrail.mockReturnValueOnce({ data: [], isLoading: true, isError: false });
    const { rerender } = render(<ProjectAuditTrail projectId="project-1" />);
    expect(screen.getByText('Loading audit trail…')).toBeTruthy();

    useProjectAuditTrail.mockReturnValueOnce({ data: [], isLoading: false, isError: false });
    rerender(<ProjectAuditTrail projectId="project-1" />);
    expect(screen.getByText('No audit events recorded for this project yet.')).toBeTruthy();
  });

  it('offers a shared retry button when loading fails', () => {
    useProjectAuditTrail.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<ProjectAuditTrail projectId="project-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
