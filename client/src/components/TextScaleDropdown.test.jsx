import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import TextScaleDropdown from './TextScaleDropdown';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TextScaleDropdown Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.style.fontSize = '16px';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = () => {
    act(() => {
      root.render(<TextScaleDropdown />);
    });

    return {
      select: container.querySelector('select[aria-label="Adjust text scaling"]'),
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders with default 100% scale option', () => {
    const { select, unmount } = renderComponent();
    expect(select).not.toBeNull();
    expect(select.value).toBe('100');
    expect(document.documentElement.style.fontSize).toBe('16px');
    unmount();
  });

  it('adjusts root font size to 1.1x (17.6px) when Medium is selected', () => {
    const { select, unmount } = renderComponent();

    act(() => {
      select.value = '110';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(select.value).toBe('110');
    expect(document.documentElement.style.fontSize).toBe('17.6px');
    expect(localStorage.getItem('app_text_scale')).toBe('110');
    unmount();
  });

  it('adjusts root font size to 1.25x (20px) when Large is selected', () => {
    const { select, unmount } = renderComponent();

    act(() => {
      select.value = '125';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(select.value).toBe('125');
    expect(document.documentElement.style.fontSize).toBe('20px');
    expect(localStorage.getItem('app_text_scale')).toBe('125');
    unmount();
  });
});
