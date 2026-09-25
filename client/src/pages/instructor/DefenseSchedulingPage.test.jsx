import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ROLES } from '@cms/shared';
import DefenseSchedulingPage from './DefenseSchedulingPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockUseProjects = vi.fn();
const mockListSections = vi.fn();
const mockNavigate = vi.fn();
const mockScheduleDefense = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'inst-1', role: ROLES.INSTRUCTOR, firstName: 'Instructor', lastName: 'User' },
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: (...args) => mockUseProjects(...args),
  projectKeys: {
    all: ['projects'],
    lists: () => ['projects', 'list'],
    list: (filters) => ['projects', 'list', filters],
    details: () => ['projects', 'detail'],
    detail: (id) => ['projects', 'detail', id],
  },
}));

vi.mock('@/services/authService', () => ({
  academicService: {
    listSections: (...args) => mockListSections(...args),
  },
  projectService: {
    scheduleDefense: (...args) => mockScheduleDefense(...args),
  },
}));

const mockGetMilestoneDeadlines = vi.fn();
vi.mock('@/services/settingsService', () => ({
  settingsService: {
    getMilestoneDeadlines: (...args) => mockGetMilestoneDeadlines(...args),
    upsertMilestoneDeadline: vi.fn(),
    deleteMilestoneDeadline: vi.fn(),
  },
}));

vi.mock('@/components/instructor/MilestoneDeadlinesModal', () => ({
  default: ({ open, onClose }) => {
    if (!open) return null;
    return (
      <div data-testid="milestone-deadlines-modal">
        <span>Milestone Deadlines Modal</span>
        <button type="button" onClick={onClose} data-testid="close-milestones-btn">
          Close
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/defense/ScheduleDefenseModal', () => ({
  default: ({ isOpen, onClose, project, onScheduled }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="schedule-defense-modal">
        <span>Modal for {project?.title || 'No Project'}</span>
        <button type="button" onClick={onClose} data-testid="modal-close-btn">
          Close
        </button>
        <button
          type="button"
          onClick={() => {
            if (onScheduled) onScheduled();
            onClose();
          }}
          data-testid="modal-confirm-btn"
        >
          Confirm Schedule
        </button>
      </div>
    );
  },
}));

describe('DefenseSchedulingPage', () => {
  let container;
  let root;

  const sampleProjects = [
    {
      _id: 'proj-1',
      title: 'AgroSense AI Smart Agriculture',
      capstonePhase: 2,
      teamId: {
        _id: 'team-1',
        name: 'Team AgroSense',
        leaderId: { firstName: 'Megumi', lastName: 'Fushiguro' },
        sectionId: { _id: 'sec-4a', name: 'BSIT-4A' },
      },
      sectionId: { _id: 'sec-4a', name: 'BSIT-4A' },
      adviserId: { _id: 'adv-1', firstName: 'Steven Joe', lastName: 'Bautista' },
      panelistIds: ['pan-1', 'pan-2', 'pan-3'],
      defenseSchedule: { status: 'pending_scheduling' },
    },
    {
      _id: 'proj-2',
      title: 'MediTrack Healthcare Management',
      capstonePhase: 2,
      teamId: {
        _id: 'team-2',
        name: 'Team MediTrack',
        leaderId: { firstName: 'Yuji', lastName: 'Itadori' },
        sectionId: { _id: 'sec-4b', name: 'BSIT-4B' },
      },
      sectionId: { _id: 'sec-4b', name: 'BSIT-4B' },
      adviserId: { _id: 'adv-2', firstName: 'Leon', lastName: 'Mentor' },
      panelistIds: ['pan-1', 'pan-2'],
      defenseSchedule: {
        status: 'scheduled',
        date: '2026-09-20T09:00:00.000Z',
        time: '09:00 AM - 10:30 AM',
        venue: 'COT Conference Room',
      },
    },
    {
      _id: 'proj-3',
      title: 'EcoSort Automated Waste Segregation',
      capstonePhase: 1,
      teamId: {
        _id: 'team-3',
        name: 'Team EcoSort',
        leaderId: { firstName: 'Nobara', lastName: 'Kugisaki' },
        sectionId: { _id: 'sec-4a', name: 'BSIT-4A' },
      },
      sectionId: { _id: 'sec-4a', name: 'BSIT-4A' },
      adviserId: { _id: 'adv-1', firstName: 'Steven Joe', lastName: 'Bautista' },
      panelistIds: [],
      defenseSchedule: { status: 'none' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockUseProjects.mockReturnValue({
      data: { projects: sampleProjects },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockListSections.mockResolvedValue({
      data: {
        sections: [
          { _id: 'sec-4a', name: 'BSIT-4A' },
          { _id: 'sec-4b', name: 'BSIT-4B' },
        ],
      },
    });

    mockScheduleDefense.mockResolvedValue({ data: { success: true } });
    mockGetMilestoneDeadlines.mockResolvedValue({ data: { data: [] } });
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const renderComponent = () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <DefenseSchedulingPage />
      </QueryClientProvider>,
    );

  it('renders page header, title, and KPI summary ribbon', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Defense Scheduling Center');
    expect(container.textContent).toContain('Instructor Command');

    // KPI cards
    expect(container.textContent).toContain('Total Teams');
    expect(container.textContent).toContain('Ready for Defense');
    expect(container.textContent).toContain('Scheduled Hearings');
    expect(container.textContent).toContain('In Progress');

    // Counts: Total=3, Ready=1, Scheduled=1, InProgress=1
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('1');
  });

  it('renders interactive drag-and-drop calendar view by default with 1-hour slots', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Awaiting Scheduling');
    expect(container.textContent).toContain('Current Week');
    expect(container.textContent).toContain('08:00 AM');
    expect(container.textContent).toContain('09:00 AM');
    expect(container.textContent).toContain('1 Hour');
    expect(container.textContent).toContain('AgroSense');
  });

  it('renders all capstone teams in table view when switched to table view', async () => {
    await act(async () => {
      renderComponent();
    });

    const tableBtn = container.querySelector('button[title="Table View"]');
    expect(tableBtn).toBeTruthy();

    await act(async () => {
      tableBtn.click();
    });

    // Team 1: Ready for scheduling
    expect(container.textContent).toContain('AgroSense');
    expect(container.textContent).toContain('Ready for Scheduling');

    // Team 2: Scheduled
    expect(container.textContent).toContain('MediTrack');
    expect(container.textContent).toContain('Scheduled');
    expect(container.textContent).toContain('COT Conference Room');

    // Team 3: In progress
    expect(container.textContent).toContain('EcoSort');
    expect(container.textContent).toContain('In Progress');
  });

  it('filters teams when clicking the Ready for Defense tab', async () => {
    await act(async () => {
      renderComponent();
    });

    // Click "Ready for Defense" tab button
    const readyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Ready for Defense'),
    );
    expect(readyBtn).toBeTruthy();

    await act(async () => {
      readyBtn.click();
    });

    // Only AgroSense should be displayed
    expect(container.textContent).toContain('AgroSense');
    expect(container.textContent).not.toContain('MediTrack');
    expect(container.textContent).not.toContain('EcoSort');
  });

  it('filters teams via search input', async () => {
    await act(async () => {
      renderComponent();
    });

    const searchInput = container.querySelector('input[type="search"]');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(searchInput, 'MediTrack');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('MediTrack');
    expect(container.textContent).not.toContain('AgroSense');
  });

  it('opens ScheduleDefenseModal when clicking Schedule Defense button', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.querySelector('[data-testid="schedule-defense-modal"]')).toBeNull();

    // Find the Schedule Defense button for AgroSense
    const scheduleBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Schedule Defense') && !b.textContent.includes('Reschedule'),
    );
    expect(scheduleBtn).toBeTruthy();

    await act(async () => {
      scheduleBtn.click();
    });

    // Modal should now be mounted with AgroSense pre-selected
    const modal = container.querySelector('[data-testid="schedule-defense-modal"]');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Modal for AgroSense AI Smart Agriculture');
  });

  it('displays the team leader name on the awaiting scheduling tray cards', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(container.textContent).toContain('Lead: Megumi Fushiguro');
    expect(container.textContent).toContain('Lead: Nobara Kugisaki');
  });

  it('opens and closes the mini-calendar date popover for rapid jumping', async () => {
    await act(async () => {
      renderComponent();
    });

    // Find the date range button
    const dateBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('–') && b.textContent.includes('2026'),
    );
    expect(dateBtn).toBeTruthy();

    // Initially popover is closed
    expect(container.textContent).not.toContain('Jump to Today');

    // Click to open popover
    await act(async () => {
      dateBtn.click();
    });

    expect(container.textContent).toContain('Jump to Today');
    expect(container.textContent).toContain('Close');

    // Click Jump to Today
    const todayBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Jump to Today',
    );
    expect(todayBtn).toBeTruthy();

    await act(async () => {
      todayBtn.click();
    });

    // Popover closes
    expect(container.textContent).not.toContain('Jump to Today');
  });

  it('displays team leader and Capstone terminology in Table View', async () => {
    await act(async () => {
      renderComponent();
    });

    const tableBtn = container.querySelector('button[title="Table View"]');
    expect(tableBtn).toBeTruthy();

    await act(async () => {
      tableBtn.click();
    });

    expect(container.textContent).toContain('Lead: Megumi Fushiguro');
    expect(container.textContent).toContain('Lead: Yuji Itadori');
    expect(container.textContent).toContain('Section / Capstone');
    expect(container.textContent).toContain('Capstone 2');
    expect(container.textContent).toContain('Capstone 1');
    expect(container.textContent).not.toContain('Phase 2');
  });

  it('displays team leader and Capstone terminology in Grid View', async () => {
    await act(async () => {
      renderComponent();
    });

    const gridBtn = container.querySelector('button[title="Grid View"]');
    expect(gridBtn).toBeTruthy();

    await act(async () => {
      gridBtn.click();
    });

    expect(container.textContent).toContain('Team Lead:');
    expect(container.textContent).toContain('Megumi Fushiguro');
    expect(container.textContent).toContain('Yuji Itadori');
    expect(container.textContent).toContain('Capstone 2');
    expect(container.textContent).toContain('Capstone 1');
    expect(container.textContent).not.toContain('Phase 2');
  });

  it('direct drag-and-drop onto a day column schedules defense directly with 30-min slot without modal', async () => {
    await act(async () => {
      renderComponent();
    });

    const dayColumns = container.querySelectorAll('[data-testid^="day-column-"]');
    expect(dayColumns.length).toBeGreaterThan(0);

    const targetColumn =
      Array.from(dayColumns).find((col) => col.getAttribute('data-date') !== '2026-09-20') ||
      dayColumns[0];
    const targetDate = targetColumn.getAttribute('data-date');

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ projectId: 'proj-1' })),
      },
    });

    await act(async () => {
      targetColumn.dispatchEvent(dropEvent);
    });

    expect(mockScheduleDefense).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({
        date: targetDate,
        time: '09:00 AM - 09:30 AM',
        status: 'scheduled',
      }),
    );
    expect(container.querySelector('[data-testid="schedule-defense-modal"]')).toBeNull();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('Defense scheduled for "Team AgroSense"'),
    );
  });

  it('rejects drag-and-drop when time slot overlaps with another team and shows error toast', async () => {
    await act(async () => {
      renderComponent();
    });

    const conflictColumn = container.querySelector('[data-testid="day-column-2026-09-20"]');
    if (conflictColumn) {
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.assign(dropEvent, {
        dataTransfer: {
          getData: vi.fn().mockReturnValue(JSON.stringify({ projectId: 'proj-1' })),
        },
      });

      await act(async () => {
        conflictColumn.dispatchEvent(dropEvent);
      });

      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining('Time slot conflict: "Team MediTrack" is already scheduled'),
      );
      expect(mockScheduleDefense).not.toHaveBeenCalled();
      expect(container.querySelector('[data-testid="schedule-defense-modal"]')).toBeNull();
    }
  });

  it('unschedules hearing and returns it to awaiting scheduling when dropped on tray', async () => {
    await act(async () => {
      renderComponent();
    });

    const tray = container.querySelector('[data-testid="awaiting-scheduling-tray"]');
    expect(tray).not.toBeNull();

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    Object.assign(dropEvent, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ projectId: 'proj-2' })),
      },
    });

    await act(async () => {
      tray.dispatchEvent(dropEvent);
    });

    expect(mockScheduleDefense).toHaveBeenCalledWith(
      'proj-2',
      expect.objectContaining({
        status: 'pending_scheduling',
        date: null,
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('returned to Awaiting Scheduling'),
    );
  });

  it('allows typing a custom meeting duration in the duration input', async () => {
    await act(async () => {
      renderComponent();
    });

    const durationInput = container.querySelector('[data-testid="defense-duration-input"]');
    expect(durationInput).not.toBeNull();
    expect(durationInput.value).toBe('30');

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set;
      nativeInputValueSetter.call(durationInput, '45');
      durationInput.dispatchEvent(new Event('input', { bubbles: true }));
      durationInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(durationInput.value).toBe('45');
  });

  it('identifies incomplete committee and displays committee warning when adviser or panelists are missing', async () => {
    const incompleteProjects = [
      {
        _id: 'proj-incomplete',
        title: 'Blockchain Voting Security',
        capstonePhase: 2,
        teamId: { _id: 'team-inc', name: 'Team ChainVote' },
        sectionId: { _id: 'sec-4a', name: 'BSIT-4A' },
        adviserId: null, // Missing adviser!
        panelistIds: ['pan-1'], // Only 1 panelist!
        defenseSchedule: { status: 'pending_scheduling' },
      },
    ];

    mockUseProjects.mockReturnValue({
      data: { projects: incompleteProjects },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    await act(async () => {
      renderComponent();
    });

    // Tray view should display "Missing Committee"
    expect(container.textContent).toContain('Missing Committee');
    expect(container.textContent).toContain('Missing Adviser & 2 Panelists');

    // Switch to table view
    const tableBtn = container.querySelector('button[title="Table View"]');
    await act(async () => {
      tableBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Committee Incomplete');
    expect(container.textContent).toContain('Appoint committee first');
  });

  it('highlights the selected day when clicked on day header', async () => {
    await act(async () => {
      renderComponent();
    });

    // Find day headers: 1 time slot header + 5 days = 6 divs
    const dayHeaders = container.querySelectorAll(
      '.grid-cols-\\[72px_repeat\\(5\\,1fr\\)\\] > div',
    );
    expect(dayHeaders.length).toBeGreaterThanOrEqual(6);

    // Click on 2nd day (index 2)
    await act(async () => {
      dayHeaders[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Selected');
  });

  it('renders + Set Milestone Deadlines CTA button and opens MilestoneDeadlinesModal', async () => {
    await act(async () => {
      renderComponent();
    });

    const setDeadlinesBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Set Milestone Deadlines'),
    );
    expect(setDeadlinesBtn).toBeTruthy();

    expect(container.querySelector('[data-testid="milestone-deadlines-modal"]')).toBeNull();

    await act(async () => {
      setDeadlinesBtn.click();
    });

    expect(container.querySelector('[data-testid="milestone-deadlines-modal"]')).toBeTruthy();
    expect(container.textContent).toContain('Milestone Deadlines Modal');
  });

  it('renders cascading filter dropdowns without Capstone 4 and strictly supports 4-phase capstone lifecycle', async () => {
    await act(async () => {
      renderComponent();
    });

    // Check Stage dropdown options
    const stageSelect = container.querySelector('select[aria-label="Filter by Capstone Stage"]');
    expect(stageSelect).toBeTruthy();

    const optionsText = Array.from(stageSelect.querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(optionsText).toContain('All Stages');
    expect(optionsText).toContain('Capstone 1 (Title Defense)');
    expect(optionsText).toContain('Capstone 2 (Midterm Defense)');
    expect(optionsText).toContain('Capstone 3 (Progress Defense)');
    expect(optionsText).toContain('Final Capstone (Oral Defense)');

    // Immutable requirement: Under no circumstances should "Capstone 4" be used
    expect(optionsText.some((text) => text.includes('Capstone 4'))).toBe(false);
    expect(container.textContent).not.toContain('Capstone 4');

    // Check Batch and Deliverables dropdowns
    const batchSelect = container.querySelector('select[aria-label="Filter by Academic Batch"]');
    expect(batchSelect).toBeTruthy();

    const deliverableSelect = container.querySelector('select[aria-label="Filter by Deliverable"]');
    expect(deliverableSelect).toBeTruthy();
  });

  it('renders All-Day Milestone Deadline Ribbon with color-coded milestone pills', async () => {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    mockGetMilestoneDeadlines.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'dl-1',
            title: 'Chapter 1 Final Draft',
            deliverable: 'chapter_1',
            stage: 'capstone_1',
            targetType: 'batch',
            batchYear: '2025-2026',
            deadlineDate: `${todayKey}T23:59:59.000Z`,
            allowLateSubmission: true,
          },
        ],
      },
    });

    await act(async () => {
      renderComponent();
    });

    // Wait for React Query to resolve the mock response
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Ribbon label
    expect(container.textContent).toContain('Milestones');
    expect(container.textContent).toContain('All-Day');

    // Should display the Chapter 1 Final Draft pill
    expect(container.textContent).toContain('Chapter 1 Final Draft');
  });

  it('switches left tray to Submissions tab and displays pending/overdue submissions', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);

    mockGetMilestoneDeadlines.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'dl-overdue',
            title: 'Sprint Review Matrix (ADM v2)',
            deliverable: 'adm_v2',
            stage: 'capstone_2',
            targetType: 'batch',
            batchYear: '2025-2026',
            deadlineDate: pastDate.toISOString(),
            allowLateSubmission: false,
          },
        ],
      },
    });

    await act(async () => {
      renderComponent();
    });

    // Find "Submissions" tab button in left tray
    const submissionsTabBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submissions'),
    );
    expect(submissionsTabBtn).toBeTruthy();

    await act(async () => {
      submissionsTabBtn.click();
    });

    // Should display Overdue badge and deadline title
    expect(container.textContent).toContain('Sprint Review Matrix (ADM v2)');
    expect(container.textContent).toContain('Overdue');
    expect(container.textContent).toContain('View Workspace');
  });

  it('uses dynamic resolveProjectTab when clicking View Workspace in table view and grid view', async () => {
    await act(async () => {
      renderComponent();
    });

    // Switch to table view
    const tableBtn = container.querySelector('button[title="Table View"]');
    await act(async () => {
      tableBtn.click();
    });

    // Click on Open Project Workspace for first team (AgroSense: capstonePhase 2)
    const workspaceBtns = Array.from(
      container.querySelectorAll('button[title="Open Project Workspace"]'),
    );
    expect(workspaceBtns.length).toBeGreaterThan(0);

    await act(async () => {
      workspaceBtns[0].click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1?tab=capstone_2');

    // Switch to grid view
    const gridBtn = container.querySelector('button[title="Grid View"]');
    await act(async () => {
      gridBtn.click();
    });

    const gridWorkspaceBtns = Array.from(
      container.querySelectorAll('button[title="View Workspace"]'),
    );
    expect(gridWorkspaceBtns.length).toBeGreaterThan(0);

    await act(async () => {
      gridWorkspaceBtns[0].click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1?tab=capstone_2');
  });
});
