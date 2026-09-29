import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import TurnitinHighlightOverlay from './TurnitinHighlightOverlay';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TurnitinHighlightOverlay', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    container = null;
    root = null;
  });

  const mockHighlight = {
    id: 'plag-source-1-0-0',
    type: 'plagiarism_exact',
    position: {
      boundingRect: { left: 50, top: 100, width: 450, height: 40, pageNumber: 1 },
      rects: [
        { left: 50, top: 100, width: 450, height: 18, pageNumber: 1 },
        { left: 50, top: 122, width: 320, height: 18, pageNumber: 1 },
      ],
      pageNumber: 1,
    },
    content: {
      text: 'Elevation-Aware Domain Adaptation for Semantic Segmentation of Aerial Images',
    },
    meta: {
      sourceNumber: 1,
      similarityScore: 92,
      sourceTitle: 'Remote Sensing Deep Learning Archive',
      matchedSourceId: 'source-1',
      contextSignal: 'verbatim',
      palette: {
        color: '#ef4444',
        dot: '#ef4444',
      },
    },
  };

  it('renders discrete line rectangles without rendering matched text inside the boxes', () => {
    act(() => {
      root.render(<TurnitinHighlightOverlay highlight={mockHighlight} />);
    });

    const rect0 = container.querySelector('[data-testid="turnitin-rect-0"]');
    const rect1 = container.querySelector('[data-testid="turnitin-rect-1"]');

    expect(rect0).not.toBeNull();
    expect(rect1).not.toBeNull();

    // Structural Rule 1: ZERO text children inside the highlight boxes
    // The matched string text must NOT be rendered as children of the highlight rectangles
    expect(rect0.textContent).not.toContain('Elevation-Aware');
    expect(rect1.textContent).not.toContain('Elevation-Aware');
    expect(rect1.textContent).toBe(''); // Subsequent fragments have zero text and zero badges

    // Coordinates check
    expect(rect0.style.left).toBe('50px');
    expect(rect0.style.top).toBe('100px');
    expect(rect0.style.width).toBe('450px');
    expect(rect0.style.height).toBe('18px');
    expect(rect0.style.mixBlendMode).toBe('multiply');

    expect(rect1.style.left).toBe('50px');
    expect(rect1.style.top).toBe('122px');
    expect(rect1.style.width).toBe('320px');
    expect(rect1.style.height).toBe('18px');
    expect(rect1.style.mixBlendMode).toBe('multiply');
  });

  it('anchors the source number pill badge strictly to the first rectangle', () => {
    act(() => {
      root.render(<TurnitinHighlightOverlay highlight={mockHighlight} />);
    });

    const badges = container.querySelectorAll('[data-testid="turnitin-source-badge"]');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toBe('1');

    const rect0 = container.querySelector('[data-testid="turnitin-rect-0"]');
    expect(rect0.contains(badges[0])).toBe(true);

    const rect1 = container.querySelector('[data-testid="turnitin-rect-1"]');
    expect(rect1.querySelector('.turnitin-source-badge')).toBeNull();
  });

  it('triggers onClick handler when clicking a highlight rectangle', () => {
    const handleClick = vi.fn();
    act(() => {
      root.render(<TurnitinHighlightOverlay highlight={mockHighlight} onClick={handleClick} />);
    });

    const rect0 = container.querySelector('[data-testid="turnitin-rect-0"]');
    act(() => {
      rect0.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleClick).toHaveBeenCalledWith(mockHighlight);
  });

  it('renders popover with match details when isSelected is true', () => {
    act(() => {
      root.render(<TurnitinHighlightOverlay highlight={mockHighlight} isSelected={true} />);
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(container.textContent).toContain('Remote Sensing Deep Learning Archive');
    expect(container.textContent).toContain('92% Match');
  });

  it('falls back to boundingRect if rects array is empty', () => {
    const singleLineHighlight = {
      ...mockHighlight,
      position: {
        boundingRect: { left: 40, top: 80, width: 200, height: 16, pageNumber: 1 },
        rects: [],
        pageNumber: 1,
      },
    };

    act(() => {
      root.render(<TurnitinHighlightOverlay highlight={singleLineHighlight} />);
    });

    const rect0 = container.querySelector('[data-testid="turnitin-rect-0"]');
    expect(rect0).not.toBeNull();
    expect(rect0.style.left).toBe('40px');
    expect(rect0.style.top).toBe('80px');
    expect(rect0.style.width).toBe('200px');
    expect(rect0.style.height).toBe('16px');
  });
});
