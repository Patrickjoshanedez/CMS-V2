import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActionDoneMatrixTab from './ActionDoneMatrixTab';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockPatchADMRow = vi.fn();
const mockUpdateADMMetadata = vi.fn();
const mockCreateActionDoneMatrixItem = vi.fn();
const mockDeleteActionDoneMatrixItem = vi.fn();
const mockSeedInstitutionalADM = vi.fn();
const mockSignTieredADM = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/authService', () => ({
  projectService: {
    patchADMRow: (...args) => mockPatchADMRow(...args),
    updateADMMetadata: (...args) => mockUpdateADMMetadata(...args),
    createActionDoneMatrixItem: (...args) => mockCreateActionDoneMatrixItem(...args),
    deleteActionDoneMatrixItem: (...args) => mockDeleteActionDoneMatrixItem(...args),
    seedInstitutionalADM: (...args) => mockSeedInstitutionalADM(...args),
    signTieredADM: (...args) => mockSignTieredADM(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

const mockProject = {
  _id: 'proj-123',
  title: 'BukSU Capstone Management System V2',
  admReviewType: 'internal',
  admStatus: 'pending_developer_action',
  adviserId: {
    _id: 'adv-1',
    firstName: 'Glaiza Mae',
    lastName: 'Libe',
  },
  panelists: [
    {
      role: 'chair',
      userId: { _id: 'chair-1', firstName: 'Louie Jay', lastName: 'Labastida' },
    },
    {
      role: 'member',
      userId: { _id: 'member-1', firstName: 'Raul', middleName: 'D.', lastName: 'Lecaros' },
    },
    {
      role: 'member',
      userId: { _id: 'member-2', firstName: 'Joseph', lastName: 'Abella' },
    },
  ],
  teamId: {
    sectionId: {
      instructorId: {
        _id: 'ins-1',
        firstName: 'Dr. Sales G.',
        lastName: 'Aribe Jr.',
      },
    },
  },
  actionDoneMatrix: [
    {
      _id: 'row-1',
      panelName: 'Louie Jay Labastida',
      suggestion: 'Approved capstones should be transferred to archive Automatically',
      actionDone: 'We fixed the workflow and automatically programmed it to archive',
      pageNumbers: 'pp. 12-15',
      status: 'addressed',
      isLocked: false,
    },
  ],
  admSignatures: {
    adviser: { signed: false },
    instructor: { signed: false },
    panelists: [{ signed: false }, { signed: false }],
    chair: { signed: false },
  },
};

describe('ActionDoneMatrixTab Institutional Fidelity Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
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

  const renderComponent = async (props = {}) => {
    await act(async () => {
      root.render(
        <ActionDoneMatrixTab
          project={mockProject}
          isFaculty={true}
          isStudent={false}
          user={{ _id: 'chair-1', role: 'faculty', facultyRole: 'chair' }}
          {...props}
        />,
      );
    });
  };

  it('renders institutional BukSU header, title, and contact details', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Bukidnon State University');
    expect(container.textContent).toContain('Malaybalay City, Bukidnon 8700');
    expect(container.textContent).toContain('www.buksu.edu.ph');
    expect(container.textContent).toContain('ACTION DONE MATRIX');
    expect(container.textContent).toContain('Capstone Project Title:');
    expect(container.textContent).toContain('Note to the Researchers:');
  });

  it('renders review classification checkboxes and 4 required table columns', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Type of Review:');
    expect(container.textContent).toContain('Internal Review');
    expect(container.textContent).toContain('External Review');

    // 4 Column headers
    expect(container.textContent).toContain('Name of Panel');
    expect(container.textContent).toContain('Suggestion of the Panel(s)');
    expect(container.textContent).toContain('Action Taken');
    expect(container.textContent).toContain('Page Number/s');

    // Row content
    expect(container.textContent).toContain('Louie Jay Labastida');
    expect(container.textContent).toContain(
      'Approved capstones should be transferred to archive Automatically',
    );
    expect(container.textContent).toContain('pp. 12-15');
  });

  it('renders the dedicated 3-tiered signatories board', async () => {
    await renderComponent();

    // Tier 1
    expect(container.textContent).toContain('GLAIZA MAE LIBE');
    expect(container.textContent).toContain('Signature over Printed Name of Adviser');
    expect(container.textContent).toContain('DR. SALES G. ARIBE JR.');
    expect(container.textContent).toContain('Signature over Printed Name of Instructor');

    // Approved by delimiter
    expect(container.textContent).toContain('Approved by:');

    // Tier 2
    expect(container.textContent).toContain('RAUL D. LECAROS');
    expect(container.textContent).toContain('JOSEPH ABELLA');
    expect(container.textContent).toContain('Panel Member');

    // Tier 3
    expect(container.textContent).toContain('LOUIE JAY LABASTIDA');
    expect(container.textContent).toContain('REC / Chair');
  });

  it('renders institutional document code footer', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Document Code: RU- F-033');
    expect(container.textContent).toContain('Revision No. : 002');
    expect(container.textContent).toContain('Issue Date: May 15, 2018');
  });

  it('renders Secretary Compliance Verification Gate and locks signatures until endorsed', async () => {
    await renderComponent({
      user: { _id: 'chair-1', role: 'faculty', facultyRole: 'chair' },
    });

    expect(container.textContent).toContain('Secretary Compliance Verification Gate');
    expect(container.textContent).toContain('Endorsement Pending');
    expect(container.textContent).toContain('Awaiting Secretary Endorsement');
  });

  it('unlocks signatures when Secretary has endorsed the matrix', async () => {
    const endorsedProject = {
      ...mockProject,
      admSignatures: {
        ...mockProject.admSignatures,
        secretary: {
          endorsed: true,
          endorsedAt: new Date().toISOString(),
          signatoryName: 'Secretary Test',
        },
      },
    };

    await renderComponent({
      project: endorsedProject,
      user: { _id: 'chair-1', role: 'faculty', facultyRole: 'chair' },
    });

    expect(container.textContent).toContain('Endorsed & Unlocked');
    expect(container.textContent).toContain('Sign Digitally');
  });

  it('disables review type checkboxes and shows student-specific empty state for student users', async () => {
    const emptyProject = {
      ...mockProject,
      actionDoneMatrix: [],
    };

    await renderComponent({
      project: emptyProject,
      isFaculty: false,
      isStudent: true,
      user: { _id: 'std-1', role: 'student' },
    });

    // Checkboxes are disabled for students
    const internalCheckbox = container.querySelector('#review-internal');
    const externalCheckbox = container.querySelector('#review-external');
    expect(internalCheckbox).toBeTruthy();
    expect(externalCheckbox).toBeTruthy();
    expect(internalCheckbox.disabled).toBe(true);
    expect(externalCheckbox.disabled).toBe(true);

    // Empty state should be informative for students, not an action prompt
    expect(container.textContent).toContain(
      'No recommendations recorded yet by the defense committee or panel.',
    );
    expect(container.textContent).not.toContain(
      'Click "Add Row" or "Load Institutional Template" to begin.',
    );
  });

  it('resolves instructor name from teamId.leaderId.instructorId fallback when sectionId lacks instructor', async () => {
    const projectWithLeaderInstructor = {
      ...mockProject,
      teamId: {
        leaderId: {
          instructorId: {
            _id: 'ins-lead-1',
            firstName: 'Dr. Sales G.',
            lastName: 'Aribe Jr.',
          },
        },
      },
    };

    await renderComponent({
      project: projectWithLeaderInstructor,
    });

    expect(container.textContent).toContain('DR. SALES G. ARIBE JR.');
    expect(container.textContent).not.toContain('PENDING APPOINTMENT');
  });

  it('toggles between Action Done Matrix and Secretary Minutes tabs', async () => {
    await renderComponent();

    // Default tab is ADM
    expect(container.textContent).toContain('Action Done Matrix (ADM)');
    expect(container.textContent).toContain('Secretary Minutes (OVPAA-F-INS-032)');
    expect(container.textContent).toContain('ACTION DONE MATRIX');

    // Switch to Secretary Minutes tab
    const minutesTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Secretary Minutes (OVPAA-F-INS-032)'),
    );
    expect(minutesTabBtn).toBeTruthy();

    await act(async () => {
      minutesTabBtn.click();
    });

    // Should now render Secretary Minutes document sheet
    expect(container.textContent).toContain("Secretary's Minutes Document (OVPAA-F-INS-032)");
  });

  it('isolates signatures per milestone without bleeding across ADM v1, v2, v3', async () => {
    const multiMilestoneProject = {
      ...mockProject,
      admSignaturesByMilestone: {
        CAPSTONE_1: {
          adviser: { signed: true, signatoryName: 'Glaiza Mae Libe' },
          instructor: { signed: true, signatoryName: 'Dr. Sales G. Aribe Jr.' },
          chair: { signed: true, signatoryName: 'Louie Jay Labastida' },
          secretary: { endorsed: true, signatoryName: 'Secretary Test' },
        },
        CAPSTONE_2: {
          adviser: { signed: false },
          instructor: { signed: false },
          chair: { signed: false },
          secretary: { endorsed: false },
        },
      },
    };

    // Render scoped to CAPSTONE_2
    await renderComponent({
      project: multiMilestoneProject,
      initialMilestone: 'CAPSTONE_2',
    });

    // CAPSTONE_2 signatures should be pending despite CAPSTONE_1 being signed
    expect(container.textContent).toContain('Secretary Compliance Verification Gate');
    expect(container.textContent).toContain('Endorsement Pending');
    expect(container.textContent).toContain('Awaiting Secretary Endorsement');
    expect(container.textContent).not.toContain('Endorsed & Unlocked');
  });

  it('renders inline Add Row interface for faculty/instructor and ensures it is print-hidden', async () => {
    await renderComponent({
      isFaculty: true,
      user: { _id: 'ins-1', role: 'instructor' },
    });

    const addRowBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Add Row to ADM'),
    );
    expect(addRowBtn).toBeTruthy();

    // Check parent container has print:hidden
    const addRowContainer = addRowBtn.closest('.print\\:hidden');
    expect(addRowContainer).toBeTruthy();
  });

  it('does not render Load Institutional Template or real-time defense banner buttons', async () => {
    await renderComponent();

    expect(container.textContent).not.toContain('Load Institutional Template');
    expect(container.textContent).not.toContain('Live Defense Session & Minutes');
    expect(container.textContent).not.toContain('Real-Time Defense Synchronization');
  });
});
