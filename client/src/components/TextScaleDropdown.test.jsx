import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/react';
import TextScaleDropdown from './TextScaleDropdown';
import { useSettingsStore, ZOOM_OPTIONS } from '../stores/settingsStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('TextScaleDropdown Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.style.fontSize = '16px';
    document.documentElement.removeAttribute('data-font-size');
    useSettingsStore.getState().setZoomLevel('100');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const openOptions = async (trigger) => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      await fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      return await screen.findAllByRole('option');
    } finally {
      if (originalScrollIntoView) {
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      } else {
        delete HTMLElement.prototype.scrollIntoView;
      }
    }
  };

  const renderComponent = () => {
    act(() => {
      root.render(<TextScaleDropdown />);
    });

    return {
      select: container.querySelector('[aria-label="Adjust text scaling"]'),
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders with default 100% scale option and displays all 7 zoom options', async () => {
    const { select, unmount } = renderComponent();
    expect(select).not.toBeNull();
    expect(select.getAttribute('role')).toBe('combobox');
    expect(select.textContent).toContain('100%');
    expect(document.documentElement.style.fontSize).toBe('16px');

    const options = await openOptions(select);
    expect(options.map((option) => option.textContent.trim())).toEqual(
      ZOOM_OPTIONS.map((option) => option.scale),
    );
    unmount();
  });

  it('adjusts root font size to 1.1x (17.6px) when Medium is selected', async () => {
    const { select, unmount } = renderComponent();
    const options = await openOptions(select);
    fireEvent.click(options.find((option) => option.textContent.trim() === '110%'));

    expect(select.textContent).toContain('110%');
    expect(document.documentElement.style.fontSize).toBe('17.6px');
    expect(localStorage.getItem('app_text_scale')).toBe('110');
    expect(localStorage.getItem('cms-font-size')).toBe('medium');
    expect(useSettingsStore.getState().zoomLevel).toBe('110');
    expect(useSettingsStore.getState().fontSize).toBe('medium');
    unmount();
  });

  it('adjusts root font size to 1.25x (20px) when Large is selected', async () => {
    const { select, unmount } = renderComponent();
    const options = await openOptions(select);
    fireEvent.click(options.find((option) => option.textContent.trim() === '125%'));

    expect(select.textContent).toContain('125%');
    expect(document.documentElement.style.fontSize).toBe('20px');
    expect(localStorage.getItem('app_text_scale')).toBe('125');
    expect(localStorage.getItem('cms-font-size')).toBe('large');
    expect(useSettingsStore.getState().zoomLevel).toBe('125');
    expect(useSettingsStore.getState().fontSize).toBe('large');
    unmount();
  });

  it('adjusts root font size to 1.4x (22.4px) for Extra Large 140% (Dr. Aribe requirement)', async () => {
    const { select, unmount } = renderComponent();
    const options = await openOptions(select);
    fireEvent.click(options.find((option) => option.textContent.trim() === '140%'));

    expect(select.textContent).toContain('140%');
    expect(document.documentElement.style.fontSize).toBe('22.4px');
    expect(localStorage.getItem('app_text_scale')).toBe('140');
    expect(localStorage.getItem('cms-font-size')).toBe('xl');
    expect(useSettingsStore.getState().zoomLevel).toBe('140');
    expect(useSettingsStore.getState().fontSize).toBe('xl');
    unmount();
  });

  it('synchronizes dynamically when useSettingsStore setFontSize is called externally', () => {
    const { select, unmount } = renderComponent();

    act(() => {
      useSettingsStore.getState().setFontSize('compact');
    });

    expect(select.textContent).toContain('75%');
    expect(document.documentElement.style.fontSize).toBe('12px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('compact');

    act(() => {
      useSettingsStore.getState().setFontSize('max');
    });

    expect(select.textContent).toContain('150%');
    expect(document.documentElement.style.fontSize).toBe('24px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('max');

    unmount();
  });
});
