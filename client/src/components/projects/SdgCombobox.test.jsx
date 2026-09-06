import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SdgCombobox from './SdgCombobox';
import { SDG_GOALS } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('SdgCombobox', () => {
  let container = null;
  let root = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container) {
      container.remove();
    }
    container = null;
    root = null;
  });

  it('renders trigger with placeholder when no value is provided', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SdgCombobox value="" placeholder="Select Target SDG..." />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Select Target SDG...');
  });

  it('renders selected SDG badge and name when value matches an SDG', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SdgCombobox value="SDG 4: Quality Education" />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('SDG 4');
    expect(trigger.textContent).toContain('Quality Education');
  });

  it('opens dropdown and renders all 17 UN SDGs when clicked', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SdgCombobox value="SDG 4: Quality Education" />);
    });

    const trigger = container.querySelector('button[role="combobox"]');

    act(() => {
      trigger.click();
    });

    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();

    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(SDG_GOALS.length);
    expect(options.length).toBe(17);

    // Verify SDGs that were previously missing are now present
    expect(listbox.textContent).toContain('SDG 1');
    expect(listbox.textContent).toContain('No Poverty');
    expect(listbox.textContent).toContain('SDG 6');
    expect(listbox.textContent).toContain('Clean Water and Sanitation');
    expect(listbox.textContent).toContain('SDG 13');
    expect(listbox.textContent).toContain('Climate Action');
    expect(listbox.textContent).toContain('SDG 17');
    expect(listbox.textContent).toContain('Partnerships for the Goals');
  });

  it('filters goals in real time when typing in the search input', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SdgCombobox value="" />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    act(() => {
      trigger.click();
    });

    const searchInput = container.querySelector('input[type="text"]');
    expect(searchInput).not.toBeNull();

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      setter.call(searchInput, 'climate');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('SDG 13');
    expect(options[0].textContent).toContain('Climate Action');
  });

  it('calls onChange and closes dropdown when an option is selected', () => {
    const handleChange = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<SdgCombobox value="" onChange={handleChange} />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    act(() => {
      trigger.click();
    });

    const options = container.querySelectorAll('[role="option"]');
    const sdg9Option = Array.from(options).find((opt) => opt.textContent.includes('SDG 9'));
    expect(sdg9Option).not.toBeNull();

    act(() => {
      sdg9Option.click();
    });

    expect(handleChange).toHaveBeenCalledWith(
      'SDG 9: Industry, Innovation and Infrastructure',
      expect.objectContaining({ id: 9 }),
    );

    // Dropdown should be closed
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
