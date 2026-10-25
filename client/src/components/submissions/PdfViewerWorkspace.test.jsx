import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HighlightPopupContent } from './PdfViewerWorkspace';

const overlappingHighlight = {
  id: 'comment-1',
  type: 'faculty_comment',
  isCrossLayerOverlap: true,
  position: { pageNumber: 2 },
  content: { text: 'Please support this claim with a source.' },
  meta: {
    commentId: 'comment-1',
    authorName: 'Adviser',
    authorRole: 'adviser',
    status: 'open',
    commentText: 'Please support this claim with a source.',
  },
  overlappingHighlights: [
    {
      id: 'match-1',
      type: 'plagiarism_exact',
      position: { pageNumber: 2 },
      content: { text: 'A matched manuscript passage.' },
      meta: { similarityScore: 91, sourceTitle: 'Repository record' },
    },
  ],
};

describe('PdfViewerWorkspace annotation popup', () => {
  it('uses shared dialog controls to switch overlap layers and close the popup', () => {
    const onClose = vi.fn();
    render(<HighlightPopupContent highlight={overlappingHighlight} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Annotation details' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comment' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Plagiarism/ }));
    expect(screen.getByRole('button', { name: /Plagiarism/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Repository record')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close popover' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps reply and ADM callbacks intact with the shared input and buttons', async () => {
    const onAddReply = vi.fn().mockResolvedValue(undefined);
    const onAddToAdm = vi.fn();
    const { rerender } = render(
      <HighlightPopupContent
        highlight={overlappingHighlight}
        onAddReply={onAddReply}
        onAddToAdm={onAddToAdm}
      />,
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Write a reply' }), {
      target: { value: 'Updated with a source.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() =>
      expect(onAddReply).toHaveBeenCalledWith('comment-1', 'Updated with a source.'),
    );

    fireEvent.click(screen.getByRole('button', { name: /Add to ADM Directive/ }));
    expect(onAddToAdm).toHaveBeenCalledWith(
      expect.objectContaining({ pageNumbers: '2', panelName: 'Adviser', milestone: 'CAPSTONE_2' }),
    );

    rerender(<HighlightPopupContent highlight={overlappingHighlight} canReply={false} />);
    expect(screen.queryByRole('textbox', { name: 'Write a reply' })).not.toBeInTheDocument();
  });
});
