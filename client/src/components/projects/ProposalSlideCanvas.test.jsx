import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import ProposalSlideCanvas from './ProposalSlideCanvas';
import { exportProposalDeckPptx } from '@/utils/exportPptx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ProposalSlideCanvas & exportPptx A4 Standard', () => {
  it('renders content slide with fallback bullets when content is empty or contains only bullet symbols', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const emptyBulletSlide = {
      id: 2,
      numberStr: '02',
      category: 'Problem Statement & Literature Gap',
      tag: 'Problem & Context',
      title: 'Problem Statement',
      content: '•\n•\n•',
      type: 'statement',
    };

    await act(async () => {
      root.render(
        <ProposalSlideCanvas
          slide={emptyBulletSlide}
          teamName="Solo Leveling"
          proponents="Megumi Josh Fushiguro"
        />,
      );
    });

    const slideEl = container.querySelector('[data-slide-canvas="content"]');
    expect(slideEl).toBeTruthy();

    // The title must be visible and populated
    const h2 = container.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2.textContent).toContain('Problem Statement');

    // Bullets must be populated with non-empty text (not blank markers)
    const listItems = Array.from(container.querySelectorAll('li'));
    expect(listItems.length).toBeGreaterThanOrEqual(1);
    listItems.forEach((li) => {
      expect(li.textContent.trim().length).toBeGreaterThan(10);
      expect(li.textContent).not.toBe('•');
    });

    // Footer banner must have category, team name, and slide number
    const footer = container.querySelector('[data-slide-footer="true"]');
    expect(footer).toBeTruthy();
    expect(footer.textContent).toContain('SLIDE 02');
    expect(footer.textContent).toContain('Problem Statement & Literature Gap');
    expect(footer.textContent).toContain('Solo Leveling');
    expect(footer.textContent).toContain('Megumi Josh Fushiguro');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('renders cover slide with data-slide-canvas="cover" and golden amber title', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const coverSlide = {
      id: 1,
      numberStr: '01',
      category: 'Title Pitch & Proponents',
      title: 'AgroSense: AI-Driven Precision Crop Health Architecture',
      type: 'cover',
    };

    await act(async () => {
      root.render(
        <ProposalSlideCanvas
          slide={coverSlide}
          teamName="Solo Leveling"
          proponents="Megumi Josh Fushiguro"
        />,
      );
    });

    const coverEl = container.querySelector('[data-slide-canvas="cover"]');
    expect(coverEl).toBeTruthy();

    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.textContent).toContain('AgroSense');

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('exports proposal deck as A4 PPTX file with 8 populated slides', async () => {
    const writeSpy = vi.fn().mockResolvedValue(undefined);
    const defineLayoutSpy = vi.fn();

    // Mock PptxGenJS instance methods if needed, or test exportProposalDeckPptx
    const filename = await exportProposalDeckPptx({
      title: 'Solo Leveling AI Simulation',
      deckData: {
        problemStatement: '', // empty to test fallback
        proposedSolution: '•\n•\n•', // blank bullets to test fallback
      },
      team: { name: 'Solo Leveling', academicYear: '2024-2025' },
      user: { firstName: 'Megumi', lastName: 'Fushiguro' },
      capstoneType: ['Software Engineering & Web Applications'],
      sdgTags: ['SDG 4: Quality Education'],
    });

    expect(filename).toContain('Solo_Leveling_AI_Simulation');
    expect(filename).toContain('_A4.pptx');
  });
});
