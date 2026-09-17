import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProposalRehearsalModal from './ProposalRehearsalModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProposalRehearsalModal', () => {
  let container;
  let root;

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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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

    expect(container.textContent).toContain('Proposal Defense Rehearsal');
    expect(container.textContent).toContain('Smart Flood Telemetry & AI Early Warning System');
    expect(container.textContent).toContain('01');
    expect(container.textContent).toContain('02');
    expect(container.textContent).toContain('Previous');
    expect(container.textContent).toContain('Next');
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

    const nextBtn = Array.from(container.querySelectorAll('button')).find((b) =>
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
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onClose).toHaveBeenCalled();
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

    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => {
      root.unmount();
    });

    expect(document.body.style.overflow).toBe('visible');
  });
});
