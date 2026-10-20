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

const { mockProject, mockProjectListSummary, mockAuthState } = vi.hoisted(() => ({
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
    secretaryId: 'sec-user-1',
    projectStatus: 'active',
    admStatus: 'pending_secretary_endorsement',
    admSignatures: {
      secretary: { endorsed: false, signatoryName: '', notes: '' },
    },
    admSignaturesByMilestone: {
      CAPSTONE_2: {
        secretary: { endorsed: false, signatoryName: '', notes: '' },
        adviser: { signed: false },
        chair: { signed: false },
      },
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
  mockProjectListSummary: {
    _id: 'proj-sec-101',
    title: 'AI Smart Plant Disease Classifier with Winnowing Fingerprint',
    teamId: { _id: 'team-1', name: 'Team Flora' },
    capstonePhase: 3,
    admStatus: 'awaiting_minutes_upload',
    actionDoneMatrix: [],
    actionDoneMatrixCount: 0,
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
    data: { projects: [mockProjectListSummary], pagination: { page: 1, totalPages: 1 } },
    isLoading: false,
    refetch: vi.fn(),
  }),
  useProject: () => ({
    data: mockProject,
    isLoading: false,
    refetch: vi.fn(),
  }),
  usePrefetchProject: () => vi.fn(),
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
    scanSecretaryMinutes: vi.fn().mockResolvedValue({
      data: {
        title: 'AI Smart Plant Disease Classifier with Winnowing Fingerprint',
        proponents: ['Student Flora 1', 'Student Flora 2'],
        defenseType: 'prototype',
        defenseTypeLabel: 'Prototype Defense',
        round: '2nd',
        panelRemarks: [
          { panelName: 'Dr. Panel Chair', comments: ['Clarify dataset augmentation parameters'] },
        ],
      },
    }),
    saveSecretaryMinutes: vi.fn().mockResolvedValue({
      data: { message: 'Minutes saved successfully' },
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
    mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.endorsed = false;
    mockProject.actionDoneMatrix.forEach((row) => {
      row.status = 'addressed';
    });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderComponent = (initialUrl = '/secretary-review?projectId=proj-sec-101') => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={[initialUrl]}>
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

  it('renders Secretary Review Studio header, assigned team card, and Form OVPAA-F-INS-032 sheet by default', () => {
    const view = renderComponent();

    expect(view.container.querySelector('h1')?.textContent).toBe('Secretary Review');
    expect(view.container.textContent).toContain('Team Flora');
    expect(view.container.textContent).toContain("Secretary's Minutes Document (OVPAA-F-INS-032)");
    expect(view.container.textContent).toContain('Upload Secretary Minutes (OCR Scan)');
    expect(view.container.textContent).toContain('OVPAA-F-INS-032');
    expect(view.container.textContent).toContain('Bukidnon State University');

    const selectedTeamCard = Array.from(view.container.querySelectorAll('[class]')).find(
      (element) =>
        element.classList.contains('cursor-pointer') &&
        element.textContent.includes('Team Flora'),
    );
    expect(selectedTeamCard.textContent).toContain('Phase 3');
    expect(selectedTeamCard.textContent).toContain('Awaiting Secretary Endorsement');
    expect(selectedTeamCard.textContent).not.toContain('Needs Minutes');

    view.unmount();
  });

  it('distinguishes secretary endorsement from full committee approval in the team card', () => {
    const wasEndorsed =
      mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.endorsed;
    mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.endorsed = true;
    const view = renderComponent();

    const selectedTeamCard = Array.from(view.container.querySelectorAll('[class]')).find(
      (element) =>
        element.classList.contains('cursor-pointer') &&
        element.textContent.includes('Team Flora'),
    );
    expect(selectedTeamCard.textContent).toContain('Secretary Endorsed');
    expect(selectedTeamCard.textContent).not.toContain('Approved');

    view.unmount();
    mockProject.admSignaturesByMilestone.CAPSTONE_2.secretary.endorsed = wasEndorsed;
  });

  it('autofills project title and committee roster into Form OVPAA-F-INS-032 when clicking autofill', () => {
    const view = renderComponent();

    const autofillBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Autofill from Project'),
    );
    expect(autofillBtn).toBeDefined();

    act(() => {
      autofillBtn.click();
    });

    const titleInput = view.container.querySelector('[data-testid="minutes-title-input"]');
    expect(titleInput).toBeDefined();
    expect(titleInput.value).toBe('AI Smart Plant Disease Classifier with Winnowing Fingerprint');

    view.unmount();
  });

  it('switches to Action Done Matrix tab and renders remarks extracted from minutes', () => {
    const view = renderComponent();

    const admTabBtn = view.container.querySelector('[data-testid="adm-view-tab-adm"]');
    expect(admTabBtn).not.toBeNull();

    act(() => {
      admTabBtn.click();
    });

    expect(view.container.textContent).toContain('Upload Hearing Defense Minutes');
    expect(view.container.textContent).toContain('Action Done Matrix (ADM)');
    expect(view.container.textContent).toContain('Clarify dataset augmentation parameters');
    expect(view.container.textContent).toContain(
      'Added data transforms table and cited Albumentations',
    );
    expect(view.container.textContent).toContain('Provide latency benchmarks for mobile inference');
    expect(view.container.textContent).toContain('Included FP16 quantization benchmarks');

    view.unmount();
  });

  it('keeps secretary endorsement locked while addressed rows are pending verification', () => {
    const view = renderComponent('/secretary-review?projectId=proj-sec-101&tab=adm');

    expect(view.container.textContent).toContain(
      'Every panel recommendation must be verified before the Committee Secretary can endorse student revision fulfillments.',
    );

    const endorseButton = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Sign & Endorse Matrix'),
    );
    expect(endorseButton).toBeDefined();
    expect(endorseButton.disabled).toBe(true);

    act(() => {
      endorseButton.click();
    });

    expect(document.body.textContent).not.toContain('Grant Committee Secretary Endorsement');
    view.unmount();
  });

  it('opens the endorsement confirmation after every row is verified', () => {
    const originalStatuses = mockProject.actionDoneMatrix.map((row) => row.status);
    mockProject.actionDoneMatrix.forEach((row) => {
      row.status = 'verified';
    });
    const view = renderComponent('/secretary-review?projectId=proj-sec-101&tab=adm');

    expect(view.container.textContent).toContain(
      'All Panel Recommendations Verified — Ready for Secretary Endorsement',
    );
    const endorseButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Sign & Endorse Matrix'),
    );
    expect(endorseButton.disabled).toBe(false);

    act(() => {
      endorseButton.click();
    });

    expect(document.body.textContent).toContain('Grant Committee Secretary Endorsement');
    expect(document.body.textContent).toContain('Secretary Signatory Full Name');
    expect(document.body.textContent).toContain('Confirm & Sign Endorsement');

    view.unmount();
    mockProject.actionDoneMatrix.forEach((row, index) => {
      row.status = originalStatuses[index];
    });
  });

  it('keeps the minutes sheet read-only and hides secretary actions for faculty who are not the appointed secretary', () => {
    const original = mockProject.secretaryId;
    mockProject.secretaryId = 'someone-else';
    const view = renderComponent();

    expect(view.container.textContent).not.toContain('Upload Secretary Minutes (OCR Scan)');
    expect(
      view.container
        .querySelector('[data-testid="secretary-minutes-fieldset"]')
        .getAttribute('data-readonly'),
    ).toBe('true');

    view.unmount();
    mockProject.secretaryId = original;
  });
});
