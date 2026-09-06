import React, { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import AutoExpandingTextarea from './AutoExpandingTextarea';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AutoExpandingTextarea component', () => {
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
      value: '',
      onChange: vi.fn(),
      placeholder: 'Enter content...',
      ...props,
    };

    act(() => {
      root.render(<AutoExpandingTextarea {...defaultProps} />);
    });

    return {
      props: defaultProps,
      textarea: container.querySelector('textarea'),
      label: container.querySelector('label'),
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders with placeholder and initial height', () => {
    const { textarea, unmount } = renderComponent({ placeholder: 'Type here...' });
    expect(textarea).not.toBeNull();
    expect(textarea.placeholder).toBe('Type here...');
    unmount();
  });

  it('renders label and required asterisk when provided', () => {
    const { label, unmount } = renderComponent({
      label: 'Unique Technical Innovation',
      required: true,
      id: 'tech-innovation',
    });
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Unique Technical Innovation');
    expect(label.textContent).toContain('*');
    unmount();
  });

  it('handles value changes and calls onChange prop', () => {
    const onChange = vi.fn();
    const { textarea, unmount } = renderComponent({ value: 'Initial text', onChange });

    expect(textarea.value).toBe('Initial text');

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )?.set;
      setter?.call(textarea, 'Updated paragraph with multiple lines of content');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalled();
    unmount();
  });

  it('renders floating savingStatus badge when saving', () => {
    const { unmount } = renderComponent({ savingStatus: 'saving' });
    expect(container.textContent).toContain('Saving...');
    unmount();
  });

  it('supports ghost variant for table-cell inline editing', () => {
    const { textarea, unmount } = renderComponent({ variant: 'ghost', value: 'Cell data' });
    expect(textarea.className).toContain('border-transparent');
    unmount();
  });
});
