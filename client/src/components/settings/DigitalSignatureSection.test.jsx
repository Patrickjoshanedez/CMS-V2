import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
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
});
