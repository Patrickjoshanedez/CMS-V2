import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import TitleSimilarityChecker from './TitleSimilarityChecker';
import * as projectHooks from '@/hooks/useProjects';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/hooks/useProjects', () => ({
  useCheckTitleSimilarity: vi.fn(),
}));

describe('TitleSimilarityChecker component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      title: 'Valid Length Title For Capstone Project',
      keywords: [],
      portal: false,
      ...props,
    };

    act(() => {
      root.render(<TitleSimilarityChecker {...defaultProps} />);
    });

    return {
      props: defaultProps,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders idle prompt when title is shorter than 10 characters', () => {
    projectHooks.useCheckTitleSimilarity.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    const { unmount } = renderComponent({ title: 'Short' });
    expect(container.textContent).toContain('Enter at least 10 characters to check');
    unmount();
  });

  it('renders loading indicator when similarity query is in flight', () => {
    projectHooks.useCheckTitleSimilarity.mockReturnValue({
      data: null,
      isLoading: true,
      isFetching: false,
      isError: false,
    });

    const { unmount } = renderComponent({ title: 'Valid Length Title For Capstone Project' });
    expect(container.textContent).toContain('Checking for similar titles');
    unmount();
  });

  it('renders clean uniqueness message when no similar projects are found', () => {
    projectHooks.useCheckTitleSimilarity.mockReturnValue({
      data: { similarProjects: [], threshold: 0.7 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    const { unmount } = renderComponent({ title: 'Unique Autonomous Drone Navigation System' });
    expect(container.textContent).toContain('No similar titles found');
    unmount();
  });

  it('renders interactive triggers for similar projects and opens modal on click', () => {
    const mockSimilar = [
      {
        id: 'cap-2023-042',
        title: 'Integrated Library Management System with Digital Catalog and RFID Book Tracking',
        similarityScore: 98,
        score: 0.98,
        academicYear: '2023-2024',
        abstract:
          'A campus-wide automated inventory and kiosk system utilizing high-frequency RFID tags for physical collection checkout and shelf scanning.',
        targetBeneficiary: 'Main Campus Library',
        techStack: ['Node.js', 'Express', 'MongoDB', 'RFID RC522', 'React'],
      },
    ];

    projectHooks.useCheckTitleSimilarity.mockReturnValue({
      data: { similarProjects: mockSimilar, threshold: 0.65 },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    const { unmount } = renderComponent({
      title: 'Library Management System with RFID Scanning',
      portal: false,
    });

    // Assert warning header & threshold
    expect(container.textContent).toContain('Similar titles detected');
    expect(container.textContent).toContain('65%');

    // Assert interactive card trigger
    const triggerBtn = container.querySelector(
      '[data-testid="similar-project-trigger-cap-2023-042"]',
    );
    expect(triggerBtn).not.toBeNull();
    expect(triggerBtn.textContent).toContain('View Scope');
    expect(triggerBtn.textContent).toContain('98%');

    // Modal is initially not displayed
    let modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).toBeNull();

    // Click trigger to open preview modal
    act(() => {
      triggerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Modal should now be open
    modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('98% Title Match');
    expect(modal.textContent).toContain('Academic Year 2023-2024');
    expect(modal.textContent).toContain('A campus-wide automated inventory and kiosk system');
    expect(modal.textContent).toContain('Main Campus Library');
    expect(modal.textContent).toContain('RFID RC522');
    expect(modal.textContent).toContain('Divergence Recommendation:');

    // Close via Close button in footer
    const closeButtons = modal.querySelectorAll('button');
    const footerCloseBtn = Array.from(closeButtons).find((b) => b.textContent.includes('Close'));
    expect(footerCloseBtn).not.toBeUndefined();

    act(() => {
      footerCloseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).toBeNull();

    unmount();
  });
});
