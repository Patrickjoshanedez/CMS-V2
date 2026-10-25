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
      fontScaleTrigger: container.querySelector('#font-size-select'),
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
    Element.prototype.scrollIntoView ||= vi.fn();
    const { fontScaleTrigger, unmount } = renderComponent();
    expect(fontScaleTrigger).not.toBeNull();
    expect(fontScaleTrigger.textContent).toContain('Standard');
    expect(fontScaleTrigger.textContent).toContain('100%');

    act(() => fontScaleTrigger.click());
    const options = document.body.querySelectorAll('[role="option"]');
    expect(options.length).toBe(7);
    expect(Array.from(options).map((option) => option.textContent.trim())).toEqual([
      'Compact — 75%',
      'Small — 90%',
      'Standard — 100%',
      'Medium — 110%',
      'Large — 125%',
      'Extra Large — 140%',
      'Maximum — 150%',
    ]);

    // Check descriptive text next to select
    expect(container.textContent).toContain('100% (16px base)');
    unmount();
  });

  it('updates root document font size and store when selecting Extra Large 140%', () => {
    Element.prototype.scrollIntoView ||= vi.fn();
    const { fontScaleTrigger, unmount } = renderComponent();

    act(() => fontScaleTrigger.click());
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (item) => item.textContent.trim() === 'Extra Large — 140%',
    );
    expect(option).toBeTruthy();
    act(() => option.click());

    expect(fontScaleTrigger.textContent).toContain('Extra Large');
    expect(fontScaleTrigger.textContent).toContain('140%');
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
    const { fontScaleTrigger, unmount } = renderComponent();

    act(() => {
      useSettingsStore.getState().setZoomLevel('75');
    });

    expect(fontScaleTrigger.textContent).toContain('Compact');
    expect(fontScaleTrigger.textContent).toContain('75%');
    expect(document.documentElement.style.fontSize).toBe('12px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('compact');
    expect(container.textContent).toContain('75% (12px base)');

    act(() => {
      useSettingsStore.getState().setZoomLevel('150');
    });

    expect(fontScaleTrigger.textContent).toContain('Maximum');
    expect(fontScaleTrigger.textContent).toContain('150%');
    expect(document.documentElement.style.fontSize).toBe('24px');
    expect(document.documentElement.getAttribute('data-font-size')).toBe('max');
    expect(container.textContent).toContain('150% (24px base)');

    unmount();
  });

  it('toggles high-contrast accessibility interface mode', () => {
    const { highContrastToggle, unmount } = renderComponent();
    expect(highContrastToggle).not.toBeNull();
    expect(highContrastToggle.getAttribute('aria-checked')).toBe('false');

    act(() => {
      highContrastToggle.click();
    });

    expect(highContrastToggle.getAttribute('aria-checked')).toBe('true');
    expect(useSettingsStore.getState().highContrast).toBe(true);
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('true');
    expect(localStorage.getItem('cms-high-contrast')).toBe('true');
    unmount();
  });
});
