import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';
import { ROLES } from '@cms/shared';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockProjectWithSignatures = {
  _id: 'proj-sig-202',
  title: 'BukSU AI Intelligent Crop Health Monitoring System',
  capstonePhase: 2,
  phase: 2,
  admStatus: 'approved',
  adviserId: {
    _id: 'adv-001',
    firstName: 'Maria',
    lastName: 'Santos',
    fullName: 'Maria Santos',
  },
  sectionId: {
    instructorId: {
      _id: 'inst-001',
      firstName: 'Alan',
      lastName: 'Turing',
      fullName: 'Alan Turing',
    },
  },
  panelists: [
    {
      userId: {
        _id: 'chair-001',
        firstName: 'Grace',
        lastName: 'Hopper',
        fullName: 'Grace Hopper',
      },
      role: 'chair',
    },
    {
      userId: {
        _id: 'pan1-001',
        firstName: 'Ada',
        lastName: 'Lovelace',
        fullName: 'Ada Lovelace',
      },
      role: 'member',
    },
    {
      userId: {
        _id: 'pan2-001',
        firstName: 'Claude',
        lastName: 'Shannon',
        fullName: 'Claude Shannon',
      },
      role: 'member',
    },
    {
      userId: {
        _id: 'sec-001',
        firstName: 'Katherine',
        lastName: 'Johnson',
        fullName: 'Katherine Johnson',
      },
      role: 'secretary',
    },
  ],
  actionDoneMatrix: [
    {
      _id: 'row-sig-1',
      panelName: 'Grace Hopper',
      suggestion: 'Incorporate edge TPU hardware benchmarks for inference latency.',
      expectedAction: 'Add Jetson Nano benchmark table in Chapter 4.',
      actionDone: 'Completed benchmarks across 300 test cycles and tabulated in Table 4.3.',
      pageNumbers: '45-48',
      status: 'verified',
      milestone: 'CAPSTONE_2',
    },
  ],
  admSignatures: {
    secretary: {
      endorsed: true,
      signatoryName: 'Katherine Johnson',
      signatureDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      endorsedAt: '2026-09-30T10:00:00.000Z',
      notes: 'All panel suggestions comprehensively implemented and verified.',
    },
    adviser: {
      signed: true,
      signatoryName: 'Maria Santos',
      signatureDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signedAt: '2026-09-30T10:15:00.000Z',
    },
    instructor: {
      signed: true,
      signatoryName: 'Alan Turing',
      signatureDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signedAt: '2026-09-30T10:20:00.000Z',
    },
    chair: {
      signed: true,
      signatoryName: 'Grace Hopper',
      signatureDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signedAt: '2026-09-30T10:25:00.000Z',
    },
    panelists: [
      {
        userId: 'pan1-001',
        signatoryName: 'Ada Lovelace',
        signatureDataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signedAt: '2026-09-30T10:30:00.000Z',
      },
      {
        userId: 'pan2-001',
        signatoryName: 'Claude Shannon',
        signatureDataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        signedAt: '2026-09-30T10:35:00.000Z',
      },
    ],
  },
  unisonADM: {
    v1: {
      milestone: 'CAPSTONE_1',
      milestoneLabel: 'Capstone 1 (Title Defense / Proposal)',
      defaultTitle: 'ADM v1',
      rows: [],
      signatures: {
        secretary: { endorsed: true, signatoryName: 'Katherine Johnson' },
      },
    },
    v2: {
      milestone: 'CAPSTONE_2',
      milestoneLabel: 'Capstone 2 (Midterm Defense / Chapters 1–3)',
      defaultTitle: 'ADM v2',
      rows: [
        {
          _id: 'row-sig-1',
          panelName: 'Grace Hopper',
          suggestion: 'Incorporate edge TPU hardware benchmarks for inference latency.',
          actionDone: 'Completed benchmarks across 300 test cycles and tabulated in Table 4.3.',
          status: 'verified',
        },
      ],
      signatures: {
        adviser: { signed: true, signatoryName: 'Maria Santos' },
      },
    },
    v3: {
      milestone: 'CAPSTONE_3',
      milestoneLabel: 'Capstone 3 (Progress & Final Defense / Chapters 4–5)',
      defaultTitle: 'ADM v3',
      rows: [],
      signatures: {},
    },
    activeMilestone: 'CAPSTONE_2',
    activeVersion: 'v2',
  },
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    _id: 'student-001',
    role: ROLES.STUDENT,
    fullName: 'Juan Dela Cruz',
  }),
}));

vi.mock('@/services/socket.service', () => ({
  getSocket: () => null,
  connectSocket: () => null,
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    signTieredADM: vi.fn().mockResolvedValue({ success: true }),
    endorseADM: vi.fn().mockResolvedValue({ success: true }),
    updateActionDoneMatrixItem: vi.fn().mockResolvedValue({ success: true }),
    createActionDoneMatrixItem: vi.fn().mockResolvedValue({ success: true }),
    deleteActionDoneMatrixItem: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe('ActionDoneMatrixTab - Signature Rendering & Unison Visibility Suite', () => {
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  const renderADM = (props = {}) => {
    const root = createRoot(container);
    act(() => {
      root.render(<ActionDoneMatrixTab project={mockProjectWithSignatures} {...props} />);
    });
    return {
      root,
      container,
      unmount: () => {
        act(() => root.unmount());
        container.remove();
      },
    };
  };

  it('renders all stakeholder signatures (Adviser, Instructor, Panelist 1, Panelist 2, Chair)', () => {
    const view = renderADM();

    // Verify written text in the row is visible
    expect(view.container.textContent).toContain('Incorporate edge TPU hardware benchmarks');
    expect(view.container.textContent).toContain('Completed benchmarks across 300 test cycles');

    // Verify Adviser signature
    expect(view.container.textContent).toContain('MARIA SANTOS');

    // Verify Course Instructor signature
    expect(view.container.textContent).toContain('ALAN TURING');

    // Verify Panel Chair signature
    expect(view.container.textContent).toContain('GRACE HOPPER');

    // Verify Panel Member 1 and 2 signatures
    expect(view.container.textContent).toContain('ADA LOVELACE');
    expect(view.container.textContent).toContain('CLAUDE SHANNON');

    // Verify signature images are rendered in img elements
    const signatureImages = view.container.querySelectorAll('img[alt*="Signature"]');
    expect(signatureImages.length).toBeGreaterThanOrEqual(5);

    // Verify all 5 signatories show signed indicators
    expect(view.container.textContent).toContain('Digitally signed on 2026-09-30');

    view.unmount();
  });

  it('renders Secretary signature inside the Compliance Verification Gate banner', () => {
    const view = renderADM();

    expect(view.container.textContent).toContain('Secretary Compliance Verification Gate');
    expect(view.container.textContent).toContain('Endorsed & Unlocked');
    expect(view.container.textContent).toContain('Katherine Johnson');

    const secImg = view.container.querySelector('img[alt="Secretary Signature"]');
    expect(secImg).toBeDefined();
    expect(secImg?.src).toContain('data:image/png;base64');

    view.unmount();
  });

  it('allows students to view signatures and recommendations in read-only mode without mutative controls', () => {
    const studentUser = {
      _id: 'student-001',
      role: ROLES.STUDENT,
      fullName: 'Juan Dela Cruz',
    };

    const view = renderADM({ user: studentUser, isStudent: true });

    // Text written on the ADM is completely visible to student
    expect(view.container.textContent).toContain('Incorporate edge TPU hardware benchmarks');
    expect(view.container.textContent).toContain('Table 4.3');

    // Signatures are completely visible to student
    expect(view.container.textContent).toContain('MARIA SANTOS');
    expect(view.container.textContent).toContain('GRACE HOPPER');

    // Mutative digital sign buttons must NOT be available to students
    const signButtons = Array.from(view.container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Sign Digitally'),
    );
    expect(signButtons.length).toBe(0);

    view.unmount();
  });

  it('allows faculty, instructors, and secretary to view the exact same signatures and text', () => {
    const facultyUser = {
      _id: 'pan1-001',
      role: ROLES.FACULTY,
      fullName: 'Ada Lovelace',
    };

    const view = renderADM({ user: facultyUser, isFaculty: true });

    expect(view.container.textContent).toContain('Incorporate edge TPU hardware benchmarks');
    expect(view.container.textContent).toContain('ADA LOVELACE');
    expect(view.container.textContent).toContain('GRACE HOPPER');
    expect(view.container.textContent).toContain('Katherine Johnson');

    view.unmount();
  });
});
