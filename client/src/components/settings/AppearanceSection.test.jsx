import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import AppearanceSection from './AppearanceSection';
import { useSettingsStore, ZOOM_OPTIONS } from '@/stores/settingsStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AppearanceSection Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
    document.documentElement.style.fontSize = '16px';
    document.documentElement.removeAttribute('data-font-size');
    document.documentElement.removeAttribute('data-high-contrast');
    useSettingsStore.getState().setZoomLevel('100');
    useSettingsStore.getState().setHighContrast(false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = () => {
    act(() => {
      root.render(<AppearanceSection />);
    });

    return {
      zoomSelect: container.querySelector('#font-size-select'),
      highContrastToggle: container.querySelector('#high-contrast-toggle'),
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders all 7 synchronized zoom options in the font scaling dropdown', () => {
    const { zoomSelect, unmount } = renderComponent();
    expect(zoomSelect).not.toBeNull();
    expect(zoomSelect.value).toBe('100');

    const options = zoomSelect.querySelectorAll('option');
    expect(options.length).toBe(7);

    const values = Array.from(options).map((opt) => opt.value);
    expect(values).toEqual(['75', '90', '100', '110', '125', '140', '150']);

    // Check descriptive text next to select
    expect(container.textContent).toContain('100% (16px base)');
    unmount();
  });

  it('updates root document font size and store when selecting Extra Large 140%', () => {
    const { zoomSelect, unmount } = renderComponent();

    act(() => {
      zoomSelect.value = '140';
      zoomSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(zoomSelect.value).toBe('140');
    expect(document.documentElement.style.fontSize).toBe('22.4px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('xl');
    expect(localStorage.getItem('app_text_scale')).toBe('140');
    expect(localStorage.getItem('cms-font-size')).toBe('xl');
    expect(useSettingsStore.getState().zoomLevel).toBe('140');
    expect(useSettingsStore.getState().fontSize).toBe('xl');

    // Descriptive text should update reactively
    expect(container.textContent).toContain('140% (22.4px base)');
    unmount();
  });

  it('synchronizes reactively when store zoomLevel is updated externally', () => {
    const { zoomSelect, unmount } = renderComponent();

    act(() => {
      useSettingsStore.getState().setZoomLevel('75');
    });

    expect(zoomSelect.value).toBe('75');
    expect(document.documentElement.style.fontSize).toBe('12px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('compact');
    expect(container.textContent).toContain('75% (12px base)');

    act(() => {
      useSettingsStore.getState().setZoomLevel('150');
    });

    expect(zoomSelect.value).toBe('150');
    expect(document.documentElement.style.fontSize).toBe('24px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('max');
    expect(container.textContent).toContain('150% (24px base)');

    unmount();
  });

  it('toggles high-contrast accessibility interface mode', () => {
    const { highContrastToggle, unmount } = renderComponent();
    expect(highContrastToggle).not.toBeNull();
    expect(highContrastToggle.checked).toBe(false);

    act(() => {
      highContrastToggle.click();
    });

    expect(useSettingsStore.getState().highContrast).toBe(true);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
    expect(localStorage.getItem('cms-high-contrast')).toBe('true');
    unmount();
  });
});
