import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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

    expect(container.textContent).toContain('Create Academic Node');
    expect(container.textContent).toContain('Class Section');
    expect(container.textContent).toContain('Program');
    expect(container.textContent).toContain('School Year');
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
    const programTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Program'),
    );
    await act(async () => {
      programTabBtn.click();
    });

    const codeInput = container.querySelector('#node-course-code');
    const nameInput = container.querySelector('#node-course-name');

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

    const form = container.querySelector('form');
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
});
