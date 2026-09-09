import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import RevisionDiffViewer from './RevisionDiffViewer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockDiffDataInitial = {
  current: {
    id: 'sub-001',
    version: 1,
    chapter: 1,
    fileName: 'Chapter1_Initial.docx',
    extractedText: 'BukSU Capstone Management System provides automated manuscript tracking.',
    annotations: [],
  },
  previous: null,
  availableVersions: [],
};

const mockDiffDataWithRevisions = {
  current: {
    id: 'sub-002',
    version: 2,
    chapter: 1,
    fileName: 'Chapter1_Revision_v2.docx',
    extractedText:
      'BukSU Capstone Management System provides real-time intelligent manuscript tracking and cosine similarity pre-scans.',
    annotations: [],
  },
  previous: {
    id: 'sub-001',
    version: 1,
    chapter: 1,
    fileName: 'Chapter1_Initial.docx',
    extractedText: 'BukSU Capstone Management System provides automated manuscript tracking.',
    annotations: [
      {
        _id: 'ann-1',
        content: 'Please specify the exact algorithm used for similarity detection.',
        selectedText: 'automated manuscript tracking',
        userId: {
          firstName: 'Allan',
          lastName: 'Adviser',
          role: 'adviser',
        },
        resolved: false,
        replies: [],
      },
    ],
  },
  availableVersions: [{ id: 'sub-001', version: 1, fileName: 'Chapter1_Initial.docx' }],
};

describe('RevisionDiffViewer', () => {
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
    document.body.removeChild(container);
  });

  const renderDiffViewer = async (props = {}) => {
    await act(async () => {
      root.render(
        <RevisionDiffViewer
          diffData={mockDiffDataWithRevisions}
          isLoading={false}
          error={null}
          onSelectCompareVersion={vi.fn()}
          onRefresh={vi.fn()}
          {...props}
        />,
      );
    });
    return container;
  };

  it('renders initial submission state when no previous version exists', async () => {
    const el = await renderDiffViewer({ diffData: mockDiffDataInitial });
    expect(el.textContent).toContain('Initial Submission (v1)');
    expect(el.textContent).toContain('How Revision Diffing Works in CMS-V2');
  });

  it('renders loading state when isLoading is true', async () => {
    const el = await renderDiffViewer({ isLoading: true });
    expect(el.textContent).toContain('Extracting manuscript text and calculating revision diff...');
  });

  it('renders error state when error is provided', async () => {
    const errorMsg = 'Failed to download file from S3 storage';
    const el = await renderDiffViewer({ error: new Error(errorMsg) });
    expect(el.textContent).toContain('Failed to Load Revision Diff');
    expect(el.textContent).toContain(errorMsg);
  });

  it('renders revision diff highlights and statistics badges', async () => {
    const el = await renderDiffViewer();
    // Verify comparison bar
    expect(el.textContent).toContain('Comparing:');
    expect(el.textContent).toContain('v2');
    // Verify word counts
    expect(el.textContent).toContain('words');
    // Verify unchanged text is visible
    expect(el.textContent).toContain('BukSU Capstone Management System provides');
  });

  it('opens popover revealing original deleted text when revised span is clicked', async () => {
    const el = await renderDiffViewer();
    // Find highlighted revised text
    const highlights = el.querySelectorAll(
      'span[title*="Revised text"], span[title*="Added text"]',
    );
    expect(highlights.length).toBeGreaterThan(0);

    // Click on the first highlight
    await act(async () => {
      highlights[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Verify popover inspection drawer opens
    const popover = el.querySelector('div[role="dialog"][aria-label="Revision Details"]');
    expect(popover).not.toBeNull();
    expect(popover.textContent).toContain('Current Revised Text');
  });

  it('displays anchored committee comments in the click-to-reveal popover', async () => {
    const el = await renderDiffViewer();
    // Highlights with comments have a comment indicator
    const highlights = el.querySelectorAll('span[title*="Revised text"]');
    expect(highlights.length).toBeGreaterThan(0);

    // Click on the highlight that contains replaced text with the anchored comment
    await act(async () => {
      highlights[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Should contain committee review remark
    expect(el.textContent).toContain('Committee Review Remarks Anchored to this Section');
    expect(el.textContent).toContain('Allan Adviser');
    expect(el.textContent).toContain(
      'Please specify the exact algorithm used for similarity detection.',
    );
    expect(el.textContent).toContain('Open');
  });

  it('switches granularity mode between words, sentences, and lines', async () => {
    const el = await renderDiffViewer();
    const sentenceBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Sentence Diff'),
    );
    expect(sentenceBtn).not.toBeUndefined();

    await act(async () => {
      sentenceBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Verify button is now active
    expect(sentenceBtn.className).toContain('bg-primary');
  });
});
