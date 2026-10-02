import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import OptimizationEngine from './OptimizationEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('OptimizationEngine Component', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders initial empty state with role scope tabs', () => {
    const handleGenerate = vi.fn();
    act(() => {
      root.render(
        <OptimizationEngine optimization={null} onGenerate={handleGenerate} loading={false} />,
      );
    });

    expect(container.textContent).toContain('Optimization Engine');
    expect(container.textContent).toContain('All Roles');
    expect(container.textContent).toContain('Advisers');
    expect(container.textContent).toContain('Panelists');
    expect(container.textContent).toContain('No optimization snapshot yet');
  });

  it('triggers onGenerate with selected role scope', () => {
    const handleGenerate = vi.fn();
    act(() => {
      root.render(
        <OptimizationEngine optimization={null} onGenerate={handleGenerate} loading={false} />,
      );
    });

    const panelistTab = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Panelists'),
    );
    expect(panelistTab).toBeTruthy();

    act(() => {
      panelistTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const generateBtn = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent.includes('Generate Suggestions'),
    );
    expect(generateBtn).toBeTruthy();

    act(() => {
      generateBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleGenerate).toHaveBeenCalledWith('panelist');
  });

  it('renders balancing suggestions with role badge and score reduction', () => {
    const optimization = {
      suggested: true,
      reason: 'Workload imbalance detected across faculty.',
      suggestions: [
        {
          fromFacultyName: 'Dr. John Doe',
          toFacultyName: 'Prof. Jane Smith',
          roleType: 'panelist',
          action: 'Reassign 1-2 pending panelist assignments to balance load.',
          estimatedScoreGapReduction: 4.5,
        },
      ],
    };

    act(() => {
      root.render(
        <OptimizationEngine optimization={optimization} onGenerate={vi.fn()} loading={false} />,
      );
    });

    expect(container.textContent).toContain('Workload imbalance detected across faculty.');
    expect(container.textContent).toContain(
      'Reassign 1-2 pending panelist assignments to balance load.',
    );
    expect(container.textContent).toContain('Dr. John Doe');
    expect(container.textContent).toContain('Prof. Jane Smith');
    expect(container.textContent).toContain('panelist');
    expect(container.textContent).toContain('Estimated score gap reduction: 4.5');
  });

  it('renders balanced distribution message when suggested=true and suggestions is empty', () => {
    const optimization = {
      suggested: true,
      reason: 'Workload distribution is within acceptable tolerance.',
      suggestions: [],
    };

    act(() => {
      root.render(
        <OptimizationEngine optimization={optimization} onGenerate={vi.fn()} loading={false} />,
      );
    });

    expect(container.textContent).toContain('Current distribution appears balanced');
  });
});
