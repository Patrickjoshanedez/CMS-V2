import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import AlignmentSelectorDialog from './AlignmentSelectorDialog';
import { IT_DISCIPLINES, SDG_GOALS } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AlignmentSelectorDialog', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      type: 'discipline',
      selectedItems: ['Software Engineering & Web Applications'],
      proposalIndex: 0,
      onSave: vi.fn(),
      ...props,
    };

    act(() => {
      root.render(<AlignmentSelectorDialog {...defaultProps} />);
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

  it('renders null when open is false', () => {
    const { unmount } = renderDialog({ open: false });
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
    unmount();
  });

  it('renders discipline modal with all disciplines when open is true and type is discipline', () => {
    const { unmount } = renderDialog({
      open: true,
      type: 'discipline',
      selectedItems: ['Software Engineering & Web Applications'],
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Select IT Fields of Discipline');
    expect(dialog.textContent).toContain('Software Engineering & Web Applications');
    expect(dialog.textContent).toContain('Artificial Intelligence & Machine Learning');
    expect(dialog.textContent).toContain('Cloud Computing & Distributed Systems');
    unmount();
  });

  it('renders SDG modal with all 17 SDGs when type is sdg', () => {
    const { unmount } = renderDialog({
      open: true,
      type: 'sdg',
      selectedItems: ['SDG 4: Quality Education'],
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Select Target UN SDGs');
    expect(dialog.textContent).toContain('SDG 1');
    expect(dialog.textContent).toContain('SDG 4');
    expect(dialog.textContent).toContain('SDG 17');
    unmount();
  });

  it('filters items in real time via search input', () => {
    const { unmount } = renderDialog({
      open: true,
      type: 'discipline',
    });

    const searchInput = document.body.querySelector('input[type="text"]');
    expect(searchInput).not.toBeNull();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      setter.call(searchInput, 'robotics');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Cyber-Physical Systems & Robotics');
    expect(dialog.textContent).not.toContain('Software Engineering & Web Applications');
    unmount();
  });

  it('toggles selection and calls onSave with updated items when Apply is clicked', () => {
    const handleSave = vi.fn();
    const handleOpenChange = vi.fn();

    const { unmount } = renderDialog({
      open: true,
      onOpenChange: handleOpenChange,
      type: 'discipline',
      selectedItems: ['Software Engineering & Web Applications'],
      onSave: handleSave,
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    const items = dialog.querySelectorAll('.cursor-pointer');
    const aiItem = Array.from(items).find((el) =>
      el.textContent.includes('Artificial Intelligence & Machine Learning'),
    );
    expect(aiItem).not.toBeNull();

    act(() => {
      aiItem.click();
    });

    const applyButton = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Apply Selection'),
    );
    expect(applyButton).not.toBeNull();

    act(() => {
      applyButton.click();
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        'Software Engineering & Web Applications',
        'Artificial Intelligence & Machine Learning',
      ]),
      'discipline',
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    unmount();
  });
});
