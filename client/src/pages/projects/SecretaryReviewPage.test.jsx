import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SecretaryReviewPage from '@/pages/projects/SecretaryReviewPage';
import { ROLES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ROUTER_FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const { mockProject, mockAuthState } = vi.hoisted(() => ({
  mockProject: {
    _id: 'proj-sec-101',
    title: 'AI Smart Plant Disease Classifier with Winnowing Fingerprint',
    teamId: { _id: 'team-1', name: 'Team Flora' },
    adviserId: {
      _id: 'adv-1',
      firstName: 'Glaiza Mae',
      lastName: 'Libe',
      fullName: 'Glaiza Mae A. Libe',
    },
    capstonePhase: 2,
    projectStatus: 'active',
    admStatus: 'pending_secretary_endorsement',
    admSignatures: {
      secretary: { endorsed: false, signatoryName: '', notes: '' },
    },
    actionDoneMatrix: [
      {
        _id: 'row-1',
        panelName: 'Dr. Panel Chair',
        suggestion: 'Clarify dataset augmentation parameters in Chapter 3',
        expectedAction: 'Add table of data transforms in Section 3.2',
        actionDone: 'Added data transforms table and cited Albumentations library on page 45.',
        pageNumbers: '45',
        status: 'addressed',
      },
      {
        _id: 'row-2',
        panelName: 'Engr. Evaluator',
        suggestion: 'Provide latency benchmarks for mobile inference',
        expectedAction: 'Include inference speed across low-end Android devices',
        actionDone: 'Included FP16 quantization benchmarks on page 52.',
        pageNumbers: '52',
        status: 'addressed',
      },
    ],
  },
  mockAuthState: {
    user: {
      _id: 'sec-user-1',
      firstName: 'Secretary',
      lastName: 'Faculty',
      fullName: 'Secretary Faculty',
      email: 'sec@buksu.edu.ph',
      role: 'faculty',
      digitalSignature: 'data:image/png;base64,mockSig123',
    },
    isAuthenticated: true,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    if (typeof selector === 'function') return selector(mockAuthState);
    return mockAuthState;
  },
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    data: { projects: [mockProject], pagination: { page: 1, totalPages: 1 } },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useMyProject: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    getProject: vi.fn().mockResolvedValue({
      data: { project: mockProject },
    }),
    uploadSecretaryMinutes: vi.fn().mockResolvedValue({
      data: { message: 'Minutes parsed successfully' },
    }),
    createActionDoneMatrixItem: vi.fn().mockResolvedValue({}),
    updateActionDoneMatrixItem: vi.fn().mockResolvedValue({}),
    deleteActionDoneMatrixItem: vi.fn().mockResolvedValue({}),
    endorseADM: vi.fn().mockResolvedValue({
      data: { message: 'Action Done Matrix endorsed successfully' },
    }),
  },
  userService: {
    updateMe: vi.fn().mockResolvedValue({}),
  },
}));

describe('SecretaryReviewPage Studio', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter
            future={ROUTER_FUTURE_FLAGS}
            initialEntries={['/secretary-review?projectId=proj-sec-101']}
          >
            <SecretaryReviewPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    return {
      container,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders Secretary Review Studio header and assigned team card', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain('Committee Secretary Review Studio');
    expect(view.container.textContent).toContain('Team Flora');
    expect(view.container.textContent).toContain('Upload Hearing Defense Minutes');

    view.unmount();
  });

  it('renders Action Done Matrix remarks extracted from minutes', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain('Action Done Matrix (ADM)');
    expect(view.container.textContent).toContain('Clarify dataset augmentation parameters');
    expect(view.container.textContent).toContain(
      'Added data transforms table and cited Albumentations',
    );
    expect(view.container.textContent).toContain('Provide latency benchmarks for mobile inference');
    expect(view.container.textContent).toContain('Included FP16 quantization benchmarks');

    view.unmount();
  });

  it('displays ready to endorse gate banner and opens endorsement modal', () => {
    const view = renderComponent();

    expect(view.container.textContent).toContain(
      'All Remarks Addressed — Ready for Secretary Endorsement',
    );

    const endorseButton = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Sign & Endorse Matrix'),
    );
    expect(endorseButton).toBeDefined();

    act(() => {
      endorseButton.click();
    });

    expect(view.container.textContent).toContain('Grant Committee Secretary Endorsement');
    expect(view.container.textContent).toContain('Secretary Signatory Full Name');
    expect(view.container.textContent).toContain('Confirm & Sign Endorsement');

    view.unmount();
  });
});
