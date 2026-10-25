import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AcademicJournalArchiveUploadPage from './AcademicJournalArchiveUploadPage';
import AcademicPaperArchiveUploadPage from './AcademicPaperArchiveUploadPage';
import ArchiveDocumentViewerPage from './ArchiveDocumentViewerPage';

const mocks = vi.hoisted(() => ({ useProject: vi.fn() }));

vi.mock('@/hooks/useProjects', () => ({ useProject: (...args) => mocks.useProject(...args) }));

vi.mock('@/components/archive/CanonicalDocumentViewer', () => ({
  default: ({ project, isLoading, error }) => (
    <div
      data-testid="canonical-document-viewer"
      data-project-title={project?.title || ''}
      data-loading={String(isLoading)}
      data-error={error?.message || ''}
    />
  ),
}));

describe('archive route wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/archive/upload/academic-paper', AcademicPaperArchiveUploadPage],
    ['/archive/upload/academic-journal', AcademicJournalArchiveUploadPage],
  ])('%s continues to the canonical capstone archive upload route', (path, Page) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={<Page />} />
          <Route path="/archive/upload/capstone" element={<p>Canonical capstone upload</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Canonical capstone upload')).toBeTruthy();
  });

  it('passes the archive project and query state into the canonical document reader', () => {
    mocks.useProject.mockReturnValue({
      data: { _id: 'project-archive-1', title: 'Archived Capstone Record' },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/archive/document/project-archive-1']}>
        <Routes>
          <Route path="/archive/document/:projectId" element={<ArchiveDocumentViewerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mocks.useProject).toHaveBeenCalledWith('project-archive-1');
    expect(screen.getByTestId('canonical-document-viewer').dataset.projectTitle).toBe(
      'Archived Capstone Record',
    );
  });
});
