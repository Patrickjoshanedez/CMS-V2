import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManuscriptTemplateWidget } from './ManuscriptTemplateWidget';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseTeamManuscriptTemplate = vi.fn();
vi.mock('@/hooks/useTeams', () => ({
  useTeamManuscriptTemplate: (...args) => mockUseTeamManuscriptTemplate(...args),
}));

describe('ManuscriptTemplateWidget', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamManuscriptTemplate.mockReturnValue({
      data: null,
      isLoading: false,
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    act(() => {
      root.render(<ManuscriptTemplateWidget {...props} />);
    });
  };

  const cleanup = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };

  it('renders State 1 (Gated/Locked) when isTitleApproved is false', () => {
    renderComponent({ isTitleApproved: false });

    expect(container.textContent).toContain('Official Capstone Manuscript Template');
    expect(container.textContent).toContain('Title Approval Required');
    expect(container.textContent).toContain(
      'Locked until your Capstone 1 title pitch is evaluated and approved',
    );
    expect(container.textContent).toContain('Locked in Proposal Stage');

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(true);

    cleanup();
  });

  it('renders State 2 (Unlocked) with Google Docs copy action when isTitleApproved is true', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderComponent({
      isTitleApproved: true,
      templateData: {
        title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
        type: 'google_docs',
        url: 'https://docs.google.com/document/d/mock-doc-id/copy',
        version: 'AY 2025–2026 v2.1',
        updatedAt: 'Sep 01, 2026',
      },
    });

    expect(container.textContent).toContain(
      'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
    );
    expect(container.textContent).toContain('Unlocked');
    expect(container.textContent).toContain('AY 2025–2026 v2.1');
    expect(container.textContent).toContain('Sep 01, 2026');
    expect(container.textContent).toContain('Use Google Docs Copy');

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);

    act(() => {
      button.click();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://docs.google.com/document/d/mock-doc-id/copy',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
    cleanup();
  });

  it('renders State 2 with Download .DOCX action when type is downloadable_file', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    renderComponent({
      isTitleApproved: true,
      templateData: {
        title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
        type: 'downloadable_file',
        url: 'https://example.com/template.docx',
        version: 'AY 2025–2026 v2.1',
        updatedAt: 'Sep 01, 2026',
      },
    });

    expect(container.textContent).toContain('Download .DOCX Template');

    const button = container.querySelector('button');
    act(() => {
      button.click();
    });

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/template.docx',
      '_blank',
      'noopener,noreferrer',
    );

    openSpy.mockRestore();
    cleanup();
  });

  it('fetches and applies gate status dynamically from hook when teamId is passed', () => {
    mockUseTeamManuscriptTemplate.mockReturnValue({
      data: {
        isUnlocked: true,
        approvedTitle: 'Smart Campus IoT',
        template: {
          title: 'BukSU Official Capstone Manuscript Template (Chapters 1–5)',
          type: 'google_docs',
          url: 'https://docs.google.com/document/d/server-doc/copy',
          version: 'AY 2025–2026 v3.0',
          updatedAt: 'Oct 15, 2026',
        },
      },
      isLoading: false,
    });

    renderComponent({ teamId: 'team-456' });

    expect(container.textContent).toContain('Unlocked');
    expect(container.textContent).toContain('AY 2025–2026 v3.0');
    expect(container.textContent).toContain('Oct 15, 2026');
    expect(container.textContent).toContain('Use Google Docs Copy');

    cleanup();
  });
});
