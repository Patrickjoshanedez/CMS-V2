import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import CertificatePage from './CertificatePage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-router-dom', () => ({
  useParams: () => ({ projectId: 'proj-cert-123' }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, fileUrl, submission }) =>
    open ? (
      <div data-testid="sophisticated-document-viewer" data-url={fileUrl}>
        Certificate Viewer: {submission?.fileName}
      </div>
    ) : null,
}));

const mockUser = { _id: 'user-instructor-1', role: 'instructor' };

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

let mockCertData = { url: 'https://example.com/certificate.pdf' };
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/hooks/useProjects', () => ({
  useCertificateUrl: () => ({
    data: mockCertData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: null,
    refetch: vi.fn(),
  }),
  useUploadCertificate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('CertificatePage', () => {
  let container;
  let root;

  beforeEach(() => {
    mockCertData = { url: 'https://example.com/certificate.pdf' };
    mockIsLoading = false;
    mockIsError = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders certificate info and opens viewer modal when preview clicked', () => {
    act(() => {
      root.render(<CertificatePage />);
    });

    expect(container.textContent).toContain('Completion Certificate');
    expect(container.textContent).toContain('Uploaded');

    const previewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Preview'),
    );
    expect(previewBtn).toBeDefined();

    // Prior to clicking Preview, modal viewer is not open
    expect(container.querySelector('[data-testid="sophisticated-document-viewer"]')).toBeNull();

    // Click Preview
    act(() => {
      previewBtn.click();
    });

    const viewer = container.querySelector('[data-testid="sophisticated-document-viewer"]');
    expect(viewer).not.toBeNull();
    expect(viewer.getAttribute('data-url')).toBe('https://example.com/certificate.pdf');
  });

  it('renders upload controls for instructor', () => {
    act(() => {
      root.render(<CertificatePage />);
    });

    expect(container.textContent).toContain('Replace Certificate');
    expect(container.textContent).toContain('Accepted format: PDF only');
  });

  it('announces certificate loading with the shared status spinner', () => {
    mockIsLoading = true;

    act(() => {
      root.render(<CertificatePage />);
    });

    expect(container.querySelector('[role="status"]')?.textContent).toContain(
      'Loading certificate',
    );
  });

  it('shows the sealed QR verification state and removes replacement upload controls', () => {
    mockCertData = {
      url: 'https://example.com/certificate.pdf',
      verificationHash: 'a'.repeat(64),
      generatedAt: '2026-10-16T00:00:00.000Z',
    };

    act(() => {
      root.render(<CertificatePage />);
    });

    expect(container.textContent).toContain('QR verified');
    expect(container.textContent).toContain('sealed and includes a QR verification link');
    expect(container.textContent).toContain('public verification record');
    expect(container.textContent).not.toContain('Accepted format: PDF only');
    expect(container.textContent).not.toContain('Replace Certificate');
  });
});
