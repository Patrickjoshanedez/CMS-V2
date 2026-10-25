import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { SUBMISSION_STATUSES } from '@cms/shared';
import ChapterCard from './ChapterCard';

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function LocationPath() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderChapterCard(props = {}) {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
      <ChapterCard chapterNumber={1} {...props} />
      <LocationPath />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ChapterCard', () => {
  it('renders the submission version, status, and deadline state', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T00:00:00.000Z'));
    renderChapterCard({
      submission: { _id: 'submission-7', status: SUBMISSION_STATUSES.APPROVED, version: 3 },
      deadline: '2026-11-20T12:00:00.000Z',
    });

    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('The Problem and Its Background')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-deadline-status')).toHaveAttribute('data-status', 'ok');
  });

  it('keeps upload closed when a past deadline disallows late submission', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-23T00:00:00.000Z'));
    renderChapterCard({
      deadline: '2026-10-22T00:00:00.000Z',
      allowLateSubmission: false,
      canUpload: true,
      isStudent: true,
    });

    expect(screen.getByText('Late submissions closed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
  });

  it('routes a student to the latest submission with the existing search suffix', () => {
    renderChapterCard({
      submission: { _id: 'submission-7', status: SUBMISSION_STATUSES.PENDING, version: 1 },
      searchSuffix: '?tab=chapters',
    });

    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/project/submissions/submission-7?tab=chapters',
    );
  });

  it('calls the revision action with the chapter and existing submission', () => {
    const submission = {
      _id: 'submission-8',
      status: SUBMISSION_STATUSES.REVISIONS_REQUIRED,
      version: 2,
    };
    const onRevise = vi.fn();
    renderChapterCard({ submission, canUpload: true, isStudent: true, onRevise });

    fireEvent.click(screen.getByRole('button', { name: /revise/i }));

    expect(onRevise).toHaveBeenCalledWith(1, submission);
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('calls the upload action for an eligible new chapter', () => {
    const onUpload = vi.fn();
    renderChapterCard({ canUpload: true, isStudent: true, onUpload });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(onUpload).toHaveBeenCalledWith(1, undefined);
  });
});
