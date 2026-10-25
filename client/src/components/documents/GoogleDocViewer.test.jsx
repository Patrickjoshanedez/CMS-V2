import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GoogleDocViewer from './GoogleDocViewer';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('GoogleDocViewer', () => {
  it('shows an accessible loading skeleton and clears it after the document loads', () => {
    render(
      <GoogleDocViewer
        embedUrl="https://docs.google.com/document/d/example/preview"
        title="Chapter One"
        canEdit
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading document');
    expect(screen.getByText('Edit mode')).toBeInTheDocument();

    fireEvent.load(screen.getByTitle('Chapter One'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports a failed iframe load and preserves the open-in-new-tab action', async () => {
    const embedUrl = 'https://docs.google.com/document/d/example/preview';
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<GoogleDocViewer embedUrl={embedUrl} title="Chapter One" />);

    fireEvent.click(screen.getByRole('button', { name: 'Open document in new tab' }));
    expect(openSpy).toHaveBeenCalledWith(embedUrl, '_blank', 'noopener,noreferrer');

    fireEvent.error(screen.getByTitle('Chapter One'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load the document'),
    );
  });

  it('exposes fullscreen state to assistive technology', () => {
    render(<GoogleDocViewer embedUrl="https://docs.google.com/document/d/example/preview" />);

    const fullscreenButton = screen.getByRole('button', { name: 'Enter fullscreen' });
    fireEvent.click(fullscreenButton);

    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a semantic error when no embed URL is provided', () => {
    render(<GoogleDocViewer />);
    expect(screen.getByRole('alert')).toHaveTextContent('No document URL provided.');
  });
});
