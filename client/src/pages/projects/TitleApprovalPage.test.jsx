import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TitleApprovalPage from './TitleApprovalPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockGenerateProposalDeck = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

let mockProjectData = null;
let mockTeamData = null;

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'student-1', firstName: 'John', lastName: 'Doe', role: 'student' },
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: mockProjectData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTeams', () => ({
  useMyTeam: () => ({
    data: mockTeamData,
    isLoading: false,
  }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    generateProposalDeck: (...args) => mockGenerateProposalDeck(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

describe('TitleApprovalPage', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockProjectData = {
      _id: 'project-123',
      title: 'Smart Campus Emergency Dispatch System',
      titleStatus: 'submitted',
      academicYear: '2024-2025',
      titleProposals: [
        'Smart Campus Emergency Dispatch System',
        'AI Curriculum Analytics Platform',
      ],
      titleProposalMetadata: [
        {
          title: 'Smart Campus Emergency Dispatch System',
          description:
            'problemStatement: Current manual dispatch creates delays.\n\nproposedSolution: Automated IoT dispatch framework.\n\nuniqueContribution: Campus mesh network integration.\n\ntargetUsers: Campus clinic and security.\n\nexpectedImpact: 60% faster emergency response.',
          capstoneType: ['Software Engineering & Web Applications'],
          sdgTags: ['SDG 9: Industry, Innovation & Infrastructure'],
        },
        {
          title: 'AI Curriculum Analytics Platform',
          description: 'Problem Statement: Curriculum audits are slow.',
          capstoneType: ['Artificial Intelligence & Machine Learning'],
          sdgTags: ['SDG 4: Quality Education'],
        },
      ],
      titleProposalComments: [
        {
          proposalIndex: 0,
          comments: [
            {
              name: 'Dr. Santos',
              text: 'Ensure campus mesh radios comply with NTC guidelines.',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
      adviserId: { firstName: 'Maria', lastName: 'Clara', email: 'mclara@buksu.edu.ph' },
      panelistIds: [
        { firstName: 'Jose', lastName: 'Rizal', email: 'jrizal@buksu.edu.ph' },
        { firstName: 'Andres', lastName: 'Bonifacio', email: 'abonifacio@buksu.edu.ph' },
      ],
    };

    mockTeamData = {
      _id: 'team-1',
      name: 'Team Alpha',
      members: [{ user: { firstName: 'John', lastName: 'Doe' } }],
    };
  });

  it('renders title proposals and committee status stepper', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain('Capstone Title Proposals & Committee Approval');
    expect(container.textContent).toContain('Appointed Defense Committee & Institutional Roster');
    expect(container.textContent).toContain('Candidate Capstone Titles Proposed by Team (2)');
    expect(container.textContent).toContain('Smart Campus Emergency Dispatch System');
    expect(container.textContent).toContain('AI Curriculum Analytics Platform');
    expect(container.textContent).toContain('Under Committee Review');

    // Assert Defense Committee Roster is positioned ABOVE Candidate Proposals
    const committeeIdx = container.textContent.indexOf(
      'Appointed Defense Committee & Institutional Roster',
    );
    const candidateIdx = container.textContent.indexOf(
      'Candidate Capstone Titles Proposed by Team',
    );
    expect(committeeIdx).toBeGreaterThan(-1);
    expect(candidateIdx).toBeGreaterThan(-1);
    expect(committeeIdx).toBeLessThan(candidateIdx);
  });

  it('reveals proposal blueprint details and committee comments for Proposal 1', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain('Problem Statement & Literature Gap');
    expect(container.textContent).toContain('Current manual dispatch creates delays.');
    expect(container.textContent).toContain('Automated IoT dispatch framework.');
    expect(container.textContent).toContain(
      'Ensure campus mesh radios comply with NTC guidelines.',
    );
    expect(container.textContent).toContain('Dr. Santos');
  });

  it('toggles proposal expansion on button click', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    // Proposal 1 starts expanded. Find the toggle buttons.
    const buttons = Array.from(container.querySelectorAll('button'));
    const hideBtn = buttons.find((b) => b.textContent.includes('Hide Details'));
    expect(hideBtn).toBeTruthy();

    await act(async () => {
      hideBtn.click();
    });

    // After collapse, "Reveal Details" should appear
    expect(container.textContent).toContain('Reveal Details');
  });

  it('displays approved clearance banner when titleStatus is approved', async () => {
    mockProjectData.titleStatus = 'approved';

    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain(
      'Congratulations! Title Proposal Officially Endorsed & Approved',
    );
    expect(container.textContent).toContain('Proceed to Capstone 2 Workspace');

    const proceedBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Proceed to Capstone 2 Workspace'),
    );
    expect(proceedBtn).toBeTruthy();

    await act(async () => {
      proceedBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project?tab=capstone_2');
  });

  it('opens and closes Proposal Defense Rehearsal fullscreen presentation modal', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    const fullscreenBtn = container.querySelector('button[title="Fullscreen Preview"]');
    expect(fullscreenBtn).toBeTruthy();

    await act(async () => {
      fullscreenBtn.click();
    });

    expect(container.textContent).toContain('Proposal Defense Rehearsal');
    expect(container.textContent).toContain('Smart Campus Emergency Dispatch System');

    const closeBtn = container.querySelector('button[title="Close Rehearsal (Esc)"]');
    expect(closeBtn).toBeTruthy();

    await act(async () => {
      closeBtn.click();
    });

    expect(container.querySelector('[data-testid="fullscreen-rehearsal-modal"]')).toBeNull();
  });

  it('navigates to capstone overview when Back to My Capstone is clicked', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    const backBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Back to My Capstone'),
    );
    expect(backBtn).toBeTruthy();

    await act(async () => {
      backBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project?view=overview');
  });

  it('renders connected Title Defense & Approval Pipeline with progress percentage and milestones', async () => {
    await act(async () => {
      root.render(<TitleApprovalPage />);
    });

    expect(container.textContent).toContain('Title Defense & Approval Pipeline');
    expect(container.textContent).toContain('75% Completed');
    expect(container.textContent).toContain('Stage 3: Committee Defense (Deliberation)');
    expect(container.textContent).toContain('1. Proposals Submitted');
    expect(container.textContent).toContain('2. Similarity Pre-Scan');
    expect(container.textContent).toContain('3. Committee Defense');
    expect(container.textContent).toContain('4. Title Approval');
    expect(container.textContent).toContain('In Progress');
    expect(container.textContent).toContain('Pending');
  });

  describe('Defense Hearing Countdown & Scheduling Enhancements', () => {
    it('renders Step 3 as Scheduled with live countdown badge when defenseSchedule is active', async () => {
      const scheduledDate = new Date(Date.now() + 3 * 86400 * 1000 + 4 * 3600 * 1000);
      const dateStr = scheduledDate.toISOString().split('T')[0];

      mockProjectData.defenseSchedule = {
        date: dateStr,
        time: '08:00 AM - 08:30 AM',
        venue: 'COT Conference Room',
        status: 'scheduled',
        round: '1st',
        clientName: 'BukSU Clinic & Health Services',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      // Pipeline Step 3 should display "Scheduled" badge
      expect(container.textContent).toContain('Scheduled');
      // Description should contain date, time, and venue
      expect(container.textContent).toContain('COT Conference Room');
      expect(container.textContent).toContain('08:00 AM - 08:30 AM');

      // Countdown badge inside Step 3 card
      const stepCountdown = container.querySelector('[data-testid="step-defense-countdown"]');
      expect(stepCountdown).toBeTruthy();
      expect(stepCountdown.textContent).toContain('⏳');
    });

    it('renders prominent Scheduled Defense Hearing Banner with details and 4 countdown units', async () => {
      const scheduledDate = new Date(Date.now() + 2 * 86400 * 1000 + 5 * 3600 * 1000);
      const dateStr = scheduledDate.toISOString().split('T')[0];

      mockProjectData.defenseSchedule = {
        date: dateStr,
        time: '09:00 AM - 09:30 AM',
        venue: 'COT AVR 1',
        status: 'scheduled',
        round: '1st',
        clientName: 'BukSU Disaster Risk Reduction Center',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      // Header and badge
      const banner = container.querySelector('[data-testid="scheduled-defense-banner"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Defense Hearing Scheduled');
      expect(banner.textContent).toContain('1st Round (Standard Defense)');

      // Details
      expect(banner.textContent).toContain('09:00 AM - 09:30 AM');
      expect(banner.textContent).toContain('COT AVR 1');
      expect(banner.textContent).toContain('Target Client/Partner');
      expect(banner.textContent).toContain('BukSU Disaster Risk Reduction Center');
      expect(banner.textContent).toContain('Committee members:');
      expect(banner.textContent).toContain('Maria Clara');
      expect(banner.textContent).toContain('Jose Rizal');

      // 4 Countdown Units
      expect(container.querySelector('[data-testid="defense-countdown-days"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="defense-countdown-hours"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="defense-countdown-minutes"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="defense-countdown-seconds"]')).toBeTruthy();
      expect(banner.textContent).toContain('Days');
      expect(banner.textContent).toContain('Hours');
      expect(banner.textContent).toContain('Minutes');
      expect(banner.textContent).toContain('Seconds');
    });

    it('renders hearing session active today and in progress when defense is currently ongoing', async () => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      const currentH = today.getHours();
      const startH12 = currentH === 0 ? 12 : currentH > 12 ? currentH - 12 : currentH;
      const startAmPm = currentH >= 12 ? 'PM' : 'AM';
      const timeStr = `${String(startH12).padStart(2, '0')}:00 ${startAmPm} - ${String(startH12).padStart(2, '0')}:59 ${startAmPm}`;

      mockProjectData.defenseSchedule = {
        date: dateStr,
        time: timeStr,
        venue: 'COT Conference Room',
        status: 'scheduled',
        round: '1st',
        clientName: 'BukSU Admin Office',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      const banner = container.querySelector('[data-testid="scheduled-defense-banner"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Hearing Session Active Today');

      const stepCountdown = container.querySelector('[data-testid="step-defense-countdown"]');
      expect(stepCountdown).toBeTruthy();
      expect(stepCountdown.textContent).toContain('Hearing in Progress');
    });

    it('renders hearing concluded indicator when defense schedule is in the past', async () => {
      const pastDate = new Date(Date.now() - 2 * 86400 * 1000);
      const dateStr = pastDate.toISOString().split('T')[0];

      mockProjectData.defenseSchedule = {
        date: dateStr,
        time: '08:00 AM - 08:30 AM',
        venue: 'COT Conference Room',
        status: 'scheduled',
        round: '1st',
        clientName: 'BukSU Clinic',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      const banner = container.querySelector('[data-testid="scheduled-defense-banner"]');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain(
        'Hearing concluded, awaiting rubric evaluation / committee clearance',
      );

      const stepCountdown = container.querySelector('[data-testid="step-defense-countdown"]');
      expect(stepCountdown).toBeTruthy();
      expect(stepCountdown.textContent).toContain('Hearing Concluded');
    });

    it('does not render scheduled banner when defenseSchedule status is unscheduled or cancelled', async () => {
      mockProjectData.defenseSchedule = {
        date: '2026-10-15',
        status: 'unscheduled',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      expect(container.querySelector('[data-testid="scheduled-defense-banner"]')).toBeNull();
      expect(container.querySelector('[data-testid="step-defense-countdown"]')).toBeNull();
    });

    it('ticks countdown seconds every 1000ms via interval', async () => {
      vi.useFakeTimers();
      const baseNow = new Date('2026-10-10T08:00:00.000');
      vi.setSystemTime(baseNow);

      mockProjectData.defenseSchedule = {
        date: '2026-10-15',
        time: '08:00 AM - 08:30 AM',
        status: 'scheduled',
      };

      await act(async () => {
        root.render(<TitleApprovalPage />);
      });

      const secEl = container.querySelector('[data-testid="defense-countdown-seconds"]');
      expect(secEl).toBeTruthy();
      const initialSeconds = secEl.textContent;

      // Advance by 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      const updatedSeconds = container.querySelector(
        '[data-testid="defense-countdown-seconds"]',
      ).textContent;
      expect(updatedSeconds).not.toEqual(initialSeconds);

      vi.useRealTimers();
    });
  });
});
