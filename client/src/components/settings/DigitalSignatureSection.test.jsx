import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import DigitalSignatureSection from './DigitalSignatureSection';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockFetchUser = vi.fn();
const mockUpdateMe = vi.fn();
let mockCurrentUser = null;

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockCurrentUser,
    fetchUser: mockFetchUser,
  }),
}));

vi.mock('@/services/authService', () => ({
  userService: {
    updateMe: (...args) => mockUpdateMe(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DigitalSignatureSection', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container?.remove();
    root = null;
    container = null;
  });

  it('renders signature creation pad when user has no configured digital signature', async () => {
    mockCurrentUser = {
      _id: 'user-1',
      firstName: 'Dr. Sales G.',
      lastName: 'Aribe Jr.',
      role: 'instructor',
      digitalSignature: null,
    };

    await act(async () => {
      root.render(<DigitalSignatureSection />);
    });

    expect(container.textContent).toContain('Institutional Digital Signature');
    expect(container.textContent).toContain('Create Your Digital Signature');
    expect(container.textContent).toContain('Draw Signature');
    expect(container.textContent).toContain('Type to Sign');
  });

  it('renders verified active signature preview when user has a configured digital signature', async () => {
    mockCurrentUser = {
      _id: 'user-1',
      firstName: 'Dr. Sales G.',
      lastName: 'Aribe Jr.',
      role: 'instructor',
      digitalSignature: 'data:image/png;base64,mockSignatureData',
    };

    await act(async () => {
      root.render(<DigitalSignatureSection />);
    });

    expect(container.textContent).toContain('Active Verified Signature');
    expect(container.textContent).toContain('DR. SALES G. ARIBE JR.');
    expect(container.textContent).toContain('Signature over Printed Name of Instructor');
    expect(container.textContent).toContain('Change Signature');
    expect(container.textContent).toContain('Remove');

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('data:image/png;base64,mockSignatureData');
  });

  it('does not remove a saved signature until removal is explicitly confirmed', async () => {
    mockCurrentUser = {
      _id: 'user-1',
      firstName: 'Dr. Sales G.',
      lastName: 'Aribe Jr.',
      role: 'instructor',
      digitalSignature: 'data:image/png;base64,mockSignatureData',
    };

    await act(async () => {
      root.render(<DigitalSignatureSection />);
    });

    const removeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Remove'),
    );
    act(() => removeButton.click());

    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'You will need to create and save a new signature before using it for Action Done Matrix endorsements or approval sheets.',
    );
    expect(mockUpdateMe).not.toHaveBeenCalled();

    const keepButton = Array.from(
      document.body.querySelectorAll('[role="alertdialog"] button'),
    ).find((button) => button.textContent.includes('Keep signature'));
    act(() => keepButton.click());

    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
    expect(mockUpdateMe).not.toHaveBeenCalled();
  });

  it('removes the saved signature only after confirmation', async () => {
    mockCurrentUser = {
      _id: 'user-1',
      firstName: 'Dr. Sales G.',
      lastName: 'Aribe Jr.',
      role: 'instructor',
      digitalSignature: 'data:image/png;base64,mockSignatureData',
    };
    mockUpdateMe.mockResolvedValueOnce({});
    mockFetchUser.mockResolvedValueOnce({});

    await act(async () => {
      root.render(<DigitalSignatureSection />);
    });

    const removeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Remove'),
    );
    act(() => removeButton.click());
    const confirmButton = Array.from(
      document.body.querySelectorAll('[role="alertdialog"] button'),
    ).find((button) => button.textContent.includes('Remove signature'));

    await act(async () => {
      confirmButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockUpdateMe).toHaveBeenCalledWith({ digitalSignature: null });
    expect(mockFetchUser).toHaveBeenCalledOnce();
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
