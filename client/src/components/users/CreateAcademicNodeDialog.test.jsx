import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreateAcademicNodeDialog from './CreateAcademicNodeDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockCreateCourseMutate = vi.fn();
const mockCreateAcademicYearMutate = vi.fn();
const mockCreateSectionMutate = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/hooks/useAcademics', () => ({
  useCreateCourse: (options) => ({
    mutate: (payload) => {
      mockCreateCourseMutate(payload);
      options?.onSuccess?.();
    },
    isPending: false,
  }),
  useCreateAcademicYear: (options) => ({
    mutate: (payload) => {
      mockCreateAcademicYearMutate(payload);
      options?.onSuccess?.();
    },
    isPending: false,
  }),
  useCreateSection: (options) => ({
    mutate: (payload) => {
      mockCreateSectionMutate(payload);
      options?.onSuccess?.();
    },
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

describe('CreateAcademicNodeDialog Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView ??= vi.fn();
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.releasePointerCapture ??= vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const courses = [
    { _id: 'c-1', code: 'BSIT', name: 'BS Information Technology' },
    { _id: 'c-2', code: 'BSCS', name: 'BS Computer Science' },
  ];
  const years = ['2025–2026', '2024–2025'];

  it('renders modal dialog when isOpen is true', async () => {
    await act(async () => {
      root.render(
        <CreateAcademicNodeDialog
          isOpen={true}
          onClose={vi.fn()}
          courses={courses}
          years={years}
        />,
      );
    });

    expect(document.body.textContent).toContain('Create Academic Node');
    expect(document.body.textContent).toContain('Class Section');
    expect(document.body.textContent).toContain('Program');
    expect(document.body.textContent).toContain('School Year');
  });

  it('does not render when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <CreateAcademicNodeDialog
          isOpen={false}
          onClose={vi.fn()}
          courses={courses}
          years={years}
        />,
      );
    });

    expect(container.textContent).toBe('');
  });

  it('submits program creation when Program tab is selected', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <CreateAcademicNodeDialog
          isOpen={true}
          onClose={onClose}
          courses={courses}
          years={years}
        />,
      );
    });

    // Switch to Program tab
    const programTabBtn = Array.from(document.body.querySelectorAll('[role="tab"]')).find((b) =>
      b.textContent.includes('Program'),
    );
    await act(async () => {
      fireEvent.mouseDown(programTabBtn, { button: 0, ctrlKey: false });
    });

    const codeInput = document.body.querySelector('#node-course-code');
    const nameInput = document.body.querySelector('#node-course-name');

    const setInputValue = (input, val) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(input, val);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    await act(async () => {
      setInputValue(codeInput, 'BSIS');
      setInputValue(nameInput, 'BS Information Systems');
    });

    const form = document.body.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockCreateCourseMutate).toHaveBeenCalledWith({
      code: 'BSIS',
      name: 'BS Information Systems',
    });
    expect(toastSuccess).toHaveBeenCalledWith('Degree Program / Course created successfully.');
    expect(onClose).toHaveBeenCalled();
  });

  it('submits section creation with normalized cluster and code, showing canonical preview', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(
        <CreateAcademicNodeDialog
          isOpen={true}
          onClose={onClose}
          courses={courses}
          years={years}
        />,
      );
    });

    // Ensure Section tab is selected
    const sectionTabBtn = Array.from(document.body.querySelectorAll('[role="tab"]')).find((b) =>
      b.textContent.includes('Class Section'),
    );
    if (sectionTabBtn) {
      await act(async () => {
        fireEvent.mouseDown(sectionTabBtn, { button: 0, ctrlKey: false });
      });
    }

    const setInputValue = (input, val) => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(input, val);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const selectOption = async (label, optionText) => {
      const trigger = document.body.querySelector(`[aria-label="${label}"]`);
      await act(async () => fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' }));
      const option = Array.from(document.body.querySelectorAll('[role="option"]')).find((item) =>
        item.textContent.includes(optionText),
      );
      expect(option).toBeTruthy();
      await act(async () => option.click());
    };

    const nameInput = document.body.querySelector('#node-section-name');
    const codeInput = document.body.querySelector('#node-section-code');

    await act(async () => {
      setInputValue(nameInput, '4A');
      setInputValue(codeInput, 'T87');
    });
    await selectOption('Parent Program / Degree', 'BSIT');
    await selectOption('Academic Year', '2025–2026');

    // Verify canonical preview is rendered
    expect(document.body.textContent).toContain('Canonical Section Preview:');
    expect(document.body.textContent).toContain('BSIT-4A (T87)');

    const form = document.body.querySelector('form');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(mockCreateSectionMutate).toHaveBeenCalledWith({
      section: '4A',
      code: 'T87',
      courseId: 'c-1',
      academicYear: '2025–2026',
    });
    expect(toastSuccess).toHaveBeenCalledWith('Class Section created successfully.');
    expect(onClose).toHaveBeenCalled();
  });
});
