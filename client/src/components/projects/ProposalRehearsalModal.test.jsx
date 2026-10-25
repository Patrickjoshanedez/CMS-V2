import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProposalRehearsalModal from './ProposalRehearsalModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProposalRehearsalModal', () => {
  let container;
  let root;
  let portalContainer;

  const mockSlides = [
    {
      id: 1,
      numberStr: '01',
      category: 'Title Pitch & Proponents',
      title: 'Smart Flood Telemetry & AI Early Warning System',
      subtitle: 'IoT-based flood detection for BukSU campus.',
      type: 'cover',
    },
    {
      id: 2,
      numberStr: '02',
      category: 'Problem Statement',
      title: 'Problem Statement',
      content: 'Current flood monitoring is manual and error prone.',
      type: 'statement',
    },
  ];

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
      root = null;
    }
    portalContainer?.remove();
    container?.remove();
    document.body.innerHTML = '';
  });

  it('renders null when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen={false}
          slides={mockSlides}
          activeSlideIndex={0}
          onClose={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toBe('');
  });

  it('renders modal with slide content, top HUD and bottom navigation when isOpen is true', async () => {
    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen={true}
          slides={mockSlides}
          activeSlideIndex={0}
          title="Smart Flood Telemetry & AI Early Warning System"
          teamName="Team Alpha"
          onClose={vi.fn()}
        />,
      );
    });

    expect(document.body.textContent).toContain('Proposal Defense Rehearsal');
    expect(document.body.textContent).toContain('Smart Flood Telemetry & AI Early Warning System');
    expect(document.body.textContent).toContain('01');
    expect(document.body.textContent).toContain('02');
    expect(document.body.textContent).toContain('Previous');
    expect(document.body.textContent).toContain('Next');
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('calls onSlideChange with next index when Next button is clicked', async () => {
    const onSlideChange = vi.fn();
    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen={true}
          slides={mockSlides}
          activeSlideIndex={0}
          onSlideChange={onSlideChange}
          onClose={vi.fn()}
        />,
      );
    });

    const nextBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Next'),
    );
    expect(nextBtn).toBeTruthy();

    await act(async () => {
      nextBtn.click();
    });

    expect(onSlideChange).toHaveBeenCalledWith(1);
  });

  it('navigates with keyboard arrow keys and closes with Escape', async () => {
    const onSlideChange = vi.fn();
    const onClose = vi.fn();

    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen={true}
          slides={mockSlides}
          activeSlideIndex={0}
          onSlideChange={onSlideChange}
          onClose={onClose}
        />,
      );
    });

    // Press ArrowRight
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(onSlideChange).toHaveBeenCalledWith(1);

    // Press Escape
    await act(async () => {
      document.body
        .querySelector('[role="dialog"]')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes from the shared toolbar close button', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(<ProposalRehearsalModal isOpen slides={mockSlides} onClose={onClose} />);
    });

    await act(async () => {
      document.body.querySelector('button[aria-label="Close rehearsal"]').click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body overflow while open and restores on unmount', async () => {
    document.body.style.overflow = 'visible';

    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen={true}
          slides={mockSlides}
          activeSlideIndex={0}
          onClose={vi.fn()}
        />,
      );
    });

    expect(document.body.getAttribute('data-scroll-locked')).toBe('1');

    await act(async () => {
      root.unmount();
    });
    root = null;

    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false);
  });

  it('renders into a caller-provided portal container', async () => {
    portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);

    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen
          portalContainer={portalContainer}
          slides={mockSlides}
          onClose={vi.fn()}
        />,
      );
    });

    expect(portalContainer.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('leaves the rehearsal open when Escape exits edit mode', async () => {
    await act(async () => {
      root.render(
        <ProposalRehearsalModal
          isOpen
          slides={mockSlides}
          activeSlideIndex={0}
          onClose={vi.fn()}
        />,
      );
    });

    const editButton = document.body.querySelector('button[aria-pressed="false"]');
    await act(async () => editButton.click());
    expect(document.body.querySelector('button[aria-pressed="true"]')).not.toBeNull();

    await act(async () => {
      document.body
        .querySelector('[role="dialog"]')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-pressed="false"]')).not.toBeNull();
  });

  it('keeps the rehearsal open when Escape blurs an edited slide field', async () => {
    await act(async () => {
      root.render(<ProposalRehearsalModal isOpen slides={mockSlides} onClose={vi.fn()} />);
    });

    await act(async () => {
      document.body.querySelector('button[title="Enable inline slide editing"]').click();
    });
    const editableTitle = document.body.querySelector('[contenteditable="true"]');
    editableTitle.focus();

    await act(async () => {
      editableTitle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.querySelector('button[aria-pressed="true"]')).not.toBeNull();
    expect(document.activeElement).not.toBe(editableTitle);
  });
});
