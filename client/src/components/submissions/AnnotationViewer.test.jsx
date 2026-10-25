import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import AnnotationViewer from './AnnotationViewer';

const annotation = {
  _id: 'annotation-42',
  page: 7,
  content: 'Clarify how the participants were selected.\nInclude the criteria.',
  highlightCoords: { x: 12, y: 24, width: 80, height: 20 },
  addedBy: 'reviewer@example.edu',
  addedAt: '2026-10-20T08:00:00.000Z',
  resolved: false,
};

function ControlledAnnotation({ value = annotation, onToggle = vi.fn() }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <AnnotationViewer
      annotation={value}
      isExpanded={isExpanded}
      onToggle={() => {
        onToggle();
        setIsExpanded((expanded) => !expanded);
      }}
    />
  );
}

describe('AnnotationViewer', () => {
  it('exposes a collapsed, labelled region and toggles it from the full-width action', () => {
    const onToggle = vi.fn();
    render(<ControlledAnnotation onToggle={onToggle} />);

    const trigger = screen.getByRole('button', { name: /page 7.*unresolved/i });
    const panel = screen.getByRole('region', { hidden: true });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'annotation-panel-annotation-42');
    expect(panel).toHaveAttribute('aria-labelledby', 'annotation-trigger-annotation-42');
    expect(panel).toHaveAttribute('hidden');
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(trigger);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
    expect(screen.getByText('Highlighted Area')).toBeInTheDocument();
    expect(screen.getByText(/"width": 80/)).toBeInTheDocument();
    expect(screen.getAllByText(/Clarify how the participants were selected/)).toHaveLength(2);
    expect(screen.getByText(/Added/)).toBeInTheDocument();
  });

  it('shows the addressed status and resolution note only when expanded', () => {
    const resolvedAnnotation = { ...annotation, resolved: true };
    render(<ControlledAnnotation value={resolvedAnnotation} />);

    expect(screen.getByText('Addressed')).toBeInTheDocument();
    expect(screen.getByText('Marked as addressed')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /page 7.*addressed/i }));

    expect(screen.getByText('Marked as addressed')).toBeVisible();
  });

  it('omits the highlight details when coordinates are absent', () => {
    render(<ControlledAnnotation value={{ ...annotation, highlightCoords: null }} />);

    fireEvent.click(screen.getByRole('button', { name: /page 7.*unresolved/i }));

    expect(screen.queryByText('Highlighted Area')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Clarify how the participants were selected/)).toHaveLength(2);
  });
});
