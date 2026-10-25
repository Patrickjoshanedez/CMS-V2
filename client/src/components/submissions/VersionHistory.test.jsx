import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import VersionHistory from './VersionHistory';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@/services/submissionService', () => ({
  submissionService: { getSubmissionVersions: vi.fn() },
}));

const versions = [
  {
    _id: 'version-2',
    version: 2,
    submittedAt: '2026-10-20T12:00:00.000Z',
    status: 'under_review',
    plagiarismScore: 82,
    reviewNote: 'Clarify the evaluation criteria.',
  },
  {
    _id: 'version-1',
    version: 1,
    submittedAt: '2026-10-12T12:00:00.000Z',
    status: 'revisions_required',
    plagiarismScore: 67,
    reviewNote: 'Add more related literature.',
  },
];

const resultWithVersions = { data: { data: { versions } }, isLoading: false, error: null };

describe('VersionHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows shared loading feedback while version data is pending', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<VersionHistory submissionId="submission-1" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading submission versions');
    expect(screen.getByRole('heading', { name: 'Version history' })).toBeInTheDocument();
  });

  it('presents a clear error when the version query fails', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('offline'),
    });

    render(<VersionHistory submissionId="submission-1" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Version history unavailable');
  });

  it('explains when no previous versions exist', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { data: { versions: [] } },
      isLoading: false,
      error: null,
    });

    render(<VersionHistory submissionId="submission-1" />);

    expect(screen.getByRole('heading', { name: 'No previous versions' })).toBeInTheDocument();
  });

  it('compares the two selected records using their actual saved metadata', () => {
    vi.mocked(useQuery).mockReturnValue(resultWithVersions);

    render(<VersionHistory submissionId="submission-1" />);

    expect(screen.getByText('Latest')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select version 2 for comparison' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select version 1 for comparison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compare selected versions' }));

    expect(screen.getByRole('dialog', { name: 'Compare versions' })).toBeInTheDocument();
    expect(screen.getByText('Clarify the evaluation criteria.')).toBeInTheDocument();
    expect(screen.getByText('Add more related literature.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/4 properties differ/);
    expect(screen.queryByText('Mar 15, 2024')).not.toBeInTheDocument();
  });
});
