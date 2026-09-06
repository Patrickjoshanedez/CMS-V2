import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DisciplineCombobox from './DisciplineCombobox';
import { IT_DISCIPLINES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DisciplineCombobox', () => {
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
      root.render(<DisciplineCombobox value="" placeholder="Select IT Field of Discipline..." />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Select IT Field of Discipline...');
  });

  it('renders selected discipline domain badge and name when value matches', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<DisciplineCombobox value="Artificial Intelligence & Machine Learning" />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    expect(trigger).not.toBeNull();
    expect(trigger.textContent).toContain('Intelligent Systems');
    expect(trigger.textContent).toContain('Artificial Intelligence & Machine Learning');
  });

  it('opens dropdown and renders all IT disciplines when clicked', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<DisciplineCombobox value="Software Engineering & Web Applications" />);
    });

    const trigger = container.querySelector('button[role="combobox"]');

    act(() => {
      trigger.click();
    });

    const listbox = container.querySelector('[role="listbox"]');
    expect(listbox).not.toBeNull();

    const options = listbox.querySelectorAll('[role="option"]');
    expect(options.length).toBe(IT_DISCIPLINES.length);
    expect(options.length).toBeGreaterThanOrEqual(18);

    // Verify key disciplines are present and categorized
    expect(listbox.textContent).toContain('Software Engineering & Web Applications');
    expect(listbox.textContent).toContain('Cloud Computing & Distributed Systems');
    expect(listbox.textContent).toContain('Networking & Cybersecurity');
    expect(listbox.textContent).toContain('Data Science & Analytics');
  });

  it('filters disciplines in real time when typing in the search input', () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<DisciplineCombobox value="" />);
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
      setter.call(searchInput, 'cyber');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThanOrEqual(1);
    const text = container.querySelector('[role="listbox"]').textContent;
    expect(text).toContain('Cybersecurity');
  });

  it('calls onChange and closes dropdown when an option is selected', () => {
    const handleChange = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<DisciplineCombobox value="" onChange={handleChange} />);
    });

    const trigger = container.querySelector('button[role="combobox"]');
    act(() => {
      trigger.click();
    });

    const options = container.querySelectorAll('[role="option"]');
    const cloudOption = Array.from(options).find((opt) =>
      opt.textContent.includes('Cloud Computing & Distributed Systems'),
    );
    expect(cloudOption).not.toBeNull();

    act(() => {
      cloudOption.click();
    });

    expect(handleChange).toHaveBeenCalledWith(
      'Cloud Computing & Distributed Systems',
      expect.objectContaining({ id: 'cloud_dist' }),
    );

    // Dropdown should be closed
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });
});
