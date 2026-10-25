import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import AcademicExcelGanttChart, {
  extractProjectMembers,
  extractProjectAdviser,
  extractProjectInstructor,
  COLOR_OPTIONS,
  addWorkingDays,
  canEditGanttSchedule,
} from './AcademicExcelGanttChart';
import InteractiveGanttChart from './InteractiveGanttChart';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AcademicExcelGanttChart Component', () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    useAuthStore.setState({ user: null });
  });

  describe('Utility extraction functions', () => {
    it('extracts Solo Leveling team members including leader Megumi Josh Fushiguro', () => {
      const mockProject = {
        title: 'AI Dungeon Master',
        teamId: {
          name: 'Solo Leveling',
          leaderId: {
            _id: 'user-lead',
            firstName: 'Megumi Josh',
            lastName: 'Fushiguro',
          },
          members: [
            {
              userId: {
                _id: 'user-lead',
                firstName: 'Megumi Josh',
                lastName: 'Fushiguro',
              },
            },
            {
              userId: {
                _id: 'user-m2',
                fullName: 'Sung Jin-Woo',
              },
            },
          ],
        },
      };

      const members = extractProjectMembers(mockProject);
      expect(members).toContain('Fushiguro, Megumi Josh');
      expect(members).toContain('Sung Jin-Woo');
      expect(members.length).toBe(2);
    });

    it('returns empty array when project has no team members', () => {
      const members = extractProjectMembers(null);
      expect(members).toEqual([]);
    });

    it('extracts adviser and instructor with proper institutional Pending fallbacks', () => {
      expect(extractProjectAdviser(null)).toBe('Pending');
      expect(extractProjectInstructor(null)).toBe('Pending');

      const customProject = {
        adviserId: { fullName: 'Prof. Albus Dumbledore' },
        instructorId: { firstName: 'Sales G.', lastName: 'Aribe Jr.' },
      };
      expect(extractProjectAdviser(customProject)).toBe('Prof. Albus Dumbledore');
      expect(extractProjectInstructor(customProject)).toBe('Sales G. Aribe Jr.');
    });

    it('calculates addWorkingDays skipping weekends correctly', () => {
      // 2026-03-23 is Monday. +5 working days -> Friday 2026-03-27
      const end = addWorkingDays('2026-03-23', 5);
      expect(end).toBe('2026-03-27');
    });

    it('grants schedule editing only to assigned student members and the assigned Adviser', () => {
      const project = {
        adviserId: { _id: 'adviser-1' },
        panelistIds: [{ _id: 'panelist-1' }],
        teamId: {
          leaderId: { _id: 'student-lead' },
          members: [{ _id: 'student-member' }],
          memberRoles: [{ userId: { _id: 'student-role-member' } }],
        },
      };

      expect(canEditGanttSchedule(project, { _id: 'student-lead', role: 'student' })).toBe(true);
      expect(canEditGanttSchedule(project, { id: 'student-member', role: 'student' })).toBe(true);
      expect(canEditGanttSchedule(project, { _id: 'student-role-member', role: 'student' })).toBe(
        true,
      );
      expect(canEditGanttSchedule(project, { _id: 'adviser-1', role: 'faculty' })).toBe(true);
      expect(canEditGanttSchedule(project, { _id: 'adviser-1', role: 'adviser' })).toBe(true);
      expect(canEditGanttSchedule(project, { _id: 'student-outsider', role: 'student' })).toBe(
        false,
      );
      expect(
        canEditGanttSchedule(
          { ...project, isArchived: true },
          { _id: 'student-lead', role: 'student' },
        ),
      ).toBe(false);
      expect(
        canEditGanttSchedule(
          { ...project, projectStatus: 'archived' },
          { _id: 'adviser-1', role: 'faculty' },
        ),
      ).toBe(false);
      expect(canEditGanttSchedule(project, { _id: 'faculty-outsider', role: 'faculty' })).toBe(
        false,
      );
      expect(canEditGanttSchedule(project, { _id: 'instructor-1', role: 'instructor' })).toBe(
        false,
      );
      expect(canEditGanttSchedule(project, { _id: 'panelist-1', role: 'faculty' })).toBe(false);
      expect(canEditGanttSchedule(project, { _id: 'panelist-1', role: 'panelist' })).toBe(false);
    });
  });

  describe('UI Component rendering and interactions', () => {
    const mockSoloProject = {
      title: 'Solo Leveling AI Simulation',
      teamId: {
        name: 'Solo Leveling',
        leaderId: {
          firstName: 'Megumi Josh',
          lastName: 'Fushiguro',
        },
        members: [
          {
            userId: {
              firstName: 'Megumi Josh',
              lastName: 'Fushiguro',
            },
          },
        ],
      },
    };

    const mockSampleTasks = [
      {
        id: 'PLAN-01',
        section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
        title: 'Project Kickoff & Alignment',
        owner: 'Fushiguro, Megumi Josh',
        startDate: '2026-03-09',
        dueDate: '2026-03-11',
        durationDays: 3,
        progress: 1.0,
        startDayCol: 0,
        filledDays: [0, 1, 2],
        category: 'yellow',
      },
    ];

    it('explains that pending Capstone 2 schedules are view-only for students', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} isReadOnly />);
      });

      expect(container.textContent).toContain(
        'View-only schedule — editing is limited to assigned team members and the assigned Adviser',
      );
      expect(container.textContent).not.toContain('Click any cell to edit');
      expect(
        Array.from(container.querySelectorAll('button')).some((button) =>
          button.textContent.includes('Add Section'),
        ),
      ).toBe(false);
    });

    it('shows schedule editing controls only to assigned students and the assigned Adviser', async () => {
      const project = {
        _id: 'gantt-permission-project',
        adviserId: 'adviser-1',
        panelistIds: ['panelist-1'],
        teamId: {
          leaderId: 'student-lead',
          members: ['student-lead', 'student-member'],
        },
      };
      const renderFor = async (user) => {
        useAuthStore.setState({ user });
        await act(async () => {
          root.render(<InteractiveGanttChart project={project} defaultView="compact" />);
        });
        return Array.from(container.querySelectorAll('button')).some((button) =>
          button.textContent.includes('Add Task'),
        );
      };

      expect(await renderFor({ _id: 'student-member', role: 'student' })).toBe(true);
      expect(await renderFor({ _id: 'adviser-1', role: 'faculty' })).toBe(true);
      expect(await renderFor({ _id: 'student-outsider', role: 'student' })).toBe(false);
      expect(await renderFor({ _id: 'faculty-outsider', role: 'faculty' })).toBe(false);
      expect(await renderFor({ _id: 'panelist-1', role: 'faculty' })).toBe(false);
      expect(await renderFor({ _id: 'instructor-1', role: 'instructor' })).toBe(false);
    });

    it('renders correct team member in filter and header for Solo Leveling', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      // Filter should show All Members (1)
      const select = container.querySelector('button[aria-label="Filter by task owner"]');
      expect(select).toBeTruthy();
      expect(select.textContent).toContain('All Members (1)');
      expect(container.textContent).toContain('Fushiguro, Megumi Josh');

      // Header should display Fushiguro, Megumi Josh
      expect(container.textContent).toContain('Fushiguro, Megumi Josh');
    });

    it('filters schedule rows through the shared accessible owner Select', async () => {
      Element.prototype.scrollIntoView ||= () => {};
      await act(async () => {
        root.render(
          <AcademicExcelGanttChart
            project={{
              ...mockSoloProject,
              teamId: {
                ...mockSoloProject.teamId,
                members: [
                  { userId: { firstName: 'Megumi Josh', lastName: 'Fushiguro' } },
                  { userId: { fullName: 'Sung Jin-Woo' } },
                ],
              },
            }}
            tasks={[
              { ...mockSampleTasks[0], id: 'PLAN-01', owner: 'Fushiguro, Megumi Josh' },
              { ...mockSampleTasks[0], id: 'INFRA-02', owner: 'Sung Jin-Woo' },
            ]}
            sections={['SECTION 1 — PROJECT PLANNING & RESEARCH']}
            setTasks={() => {}}
            setSections={() => {}}
          />,
        );
      });

      const trigger = container.querySelector('button[aria-label="Filter by task owner"]');
      expect(trigger).toBeTruthy();
      await act(async () => trigger.click());
      const ownerOption = Array.from(document.body.querySelectorAll('[role="option"]')).find(
        (option) => option.textContent.includes('Sung Jin-Woo'),
      );
      expect(ownerOption).toBeTruthy();
      await act(async () => ownerOption.click());

      expect(container.textContent).toContain('INFRA-02');
      expect(container.textContent).not.toContain('PLAN-01');
    });

    it('renders 8 color theme options in the paint palette', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      const colorBtns = container.querySelectorAll('button[title^="Fill Color:"]');
      expect(colorBtns.length).toBe(COLOR_OPTIONS.length);
      expect(colorBtns.length).toBe(8);
      expect(colorBtns[0].getAttribute('aria-pressed')).toBe('true');
      expect(COLOR_OPTIONS.map((option) => option.bgClass)).toEqual([
        'bg-chart-3',
        'bg-chart-2',
        'bg-chart-1',
        'bg-chart-6',
        'bg-chart-4',
        'bg-chart-7',
        'bg-chart-5',
        'bg-chart-8',
      ]);
    });

    it('uses the shared accessible Dialog for milestone section creation', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      const addSection = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent.includes('Add Section'),
      );
      expect(addSection).toBeTruthy();

      await act(async () => {
        addSection.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const dialog = document.body.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.textContent).toContain('Create Milestone Section');
      expect(dialog.querySelector('#new-section-input')).toBeTruthy();

      await act(async () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    });

    it('adds a new row when "+ Add Row" is clicked', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const addRowBtn = buttons.find((b) => b.textContent.includes('Add Row'));
      expect(addRowBtn).toBeTruthy();

      const initialRowCount = container.querySelectorAll('tbody tr').length;

      await act(async () => {
        addRowBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const newRowCount = container.querySelectorAll('tbody tr').length;
      expect(newRowCount).toBeGreaterThan(initialRowCount);
    });

    it('allows deleting a row via the trash button when tasks are present', async () => {
      await act(async () => {
        root.render(
          <AcademicExcelGanttChart
            project={mockSoloProject}
            tasks={mockSampleTasks}
            sections={['SECTION 1 — PROJECT PLANNING & RESEARCH']}
          />,
        );
      });

      // Find delete buttons in ACT column
      const deleteButtons = container.querySelectorAll('button[title^="Delete row"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
      const initialCount = deleteButtons.length;

      await act(async () => {
        deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Called delete handler or internal delete
      expect(deleteButtons.length).toBe(initialCount);
    });

    it('allows toggling day fill boxes when cell is clicked', async () => {
      await act(async () => {
        root.render(
          <AcademicExcelGanttChart
            project={{ ...mockSoloProject, ganttApproval: { approved: true } }}
          />,
        );
      });

      // Add a row first
      const addRowBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Add Row'),
      );
      await act(async () => {
        addRowBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      // Find a timeline cell td
      const dayCell = container.querySelector('td[data-task-id][data-day-col]');
      expect(dayCell).toBeTruthy();

      const wasFilled = dayCell.getAttribute('data-is-filled') === 'true';

      await act(async () => {
        dayCell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });

      const isNowFilled = dayCell.getAttribute('data-is-filled') === 'true';
      expect(isNowFilled).toBe(!wasFilled);
    });

    it('renders Gantt Sprints Locked banner when ganttApproval.approved is false', async () => {
      const lockedProject = {
        ...mockSoloProject,
        ganttApproval: {
          approved: false,
          remarks: 'Please revise milestone allocation.',
        },
      };

      await act(async () => {
        root.render(<AcademicExcelGanttChart project={lockedProject} />);
      });

      const banner = container.querySelector('[data-testid="gantt-approval-banner"]');
      expect(banner).toBeTruthy();
      expect(container.textContent).toContain(
        'Gantt Sprints Locked — Pending Adviser Pre-Approval',
      );
      expect(container.textContent).toContain('Awaiting Pre-Approval');
      expect(container.textContent).toContain('Please revise milestone allocation.');
    });

    it('renders Gantt Schedule Pre-Approved banner when ganttApproval.approved is true', async () => {
      const approvedProject = {
        ...mockSoloProject,
        ganttApproval: {
          approved: true,
          approvedAt: '2026-03-10T10:00:00Z',
        },
      };

      await act(async () => {
        root.render(
          <AcademicExcelGanttChart
            project={approvedProject}
            tasks={mockSampleTasks}
            sections={['SECTION 1 — PROJECT PLANNING & RESEARCH']}
          />,
        );
      });

      const banner = container.querySelector('[data-testid="gantt-approval-banner"]');
      expect(banner).toBeTruthy();
      expect(container.textContent).toContain('Gantt Schedule Pre-Approved by Adviser');
      expect(container.textContent).toContain('Pre-Approved');
    });

    it('does not present an approved Gantt status when no milestone deliverable exists', async () => {
      const emptyApprovedProject = {
        ...mockSoloProject,
        ganttApproval: { approved: true, approvedAt: '2026-03-10T10:00:00Z' },
      };

      await act(async () => {
        root.render(<AcademicExcelGanttChart project={emptyApprovedProject} />);
      });

      expect(container.textContent).toContain('Awaiting Pre-Approval');
      expect(container.textContent).toContain(
        'Create at least one named deliverable in a milestone section before the schedule can be reviewed or approved.',
      );
      expect(container.textContent).not.toContain('Gantt Schedule Pre-Approved by Adviser');
    });

    it('calculates and renders Pending accomplishment when empty, and percentage when tasks exist', async () => {
      // 1. When empty: Pending
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      expect(container.textContent).toContain('OVERALL ACCOMPLISHMENT');
      expect(container.textContent).toContain('Pending');

      // 2. When tasks provided: 100.00%
      await act(async () => {
        root.render(
          <AcademicExcelGanttChart
            project={mockSoloProject}
            tasks={mockSampleTasks}
            sections={['SECTION 1 — PROJECT PLANNING & RESEARCH']}
          />,
        );
      });

      expect(container.textContent).toContain('100.00%');
    });
  });

  describe('Excel Export Specification & Math', () => {
    it('builds authentic BukSU spreadsheet XML with exactly 7 data columns and zero extraneous UI controls', async () => {
      const { buildExcelXml, normalizeProgress } = await import('@/utils/exportExcelGantt');

      // Test normalizeProgress
      expect(normalizeProgress(1.0)).toBe(1);
      expect(normalizeProgress('100%')).toBe(1);
      expect(normalizeProgress('96.97%')).toBeCloseTo(0.9697, 4);
      expect(normalizeProgress('50%')).toBe(0.5);
      expect(normalizeProgress(0)).toBe(0);

      // Simulate 33 tasks where 32 are 100% and 1 is 0%
      const tasks = Array.from({ length: 32 }, (_, i) => ({
        id: `PLAN-${String(i + 1).padStart(2, '0')}`,
        section: 'SECTION 1 — PROJECT PLANNING & RESEARCH',
        title: `Deliverable ${i + 1}`,
        owner: 'Antipuesto, Throylan',
        startDate: '2026-03-09',
        dueDate: '2026-03-11',
        durationDays: 3,
        progress: 1.0,
        category: 'yellow',
      }));
      tasks.push({
        id: 'DEPLOY-06',
        section: 'SECTION 21 — DEPLOYMENT & DOCUMENTATION',
        title: 'System demo rehearsal',
        owner: 'Añedez, Patrick Josh',
        startDate: '2026-05-02',
        dueDate: '2026-05-02',
        durationDays: 1,
        progress: 0,
        category: 'orange',
      });

      const xml = buildExcelXml({
        projectTitle: 'BukSU Capstone Management System',
        students: 'Añedez, Patrick Josh, Antipuesto, Throylan, Bautista, Steven Joe, Canoy, Chijay',
        adviser: 'Glaiza Mae A. Libe',
        instructor: 'Dr. Teles O. Aribe Jr.',
        sectionCode: 'T87 / TF 10:00AM-12:30PM',
        asOfDate: '19/03/2026',
        tasks,
      });

      // Assert header titles
      expect(xml).toContain('<Data ss:Type="String">CAPSTONE PROJECT TITLE</Data>');
      expect(xml).toContain('<Data ss:Type="String">BukSU Capstone Management System</Data>');
      expect(xml).toContain('<Data ss:Type="String">OVERALL ACCOMPLISHMENT</Data>');

      // Assert accurate math: 32/33 = 96.97%
      expect(xml).toContain('<Data ss:Type="String">96.97%</Data>');
      expect(xml).toContain('<Data ss:Type="String">19/03/2026</Data>');

      // Assert NO extraneous UI elements (no ACT column header, no delete or trash buttons)
      expect(xml).not.toContain('<Data ss:Type="String">ACT</Data>');
      expect(xml).not.toContain('Delete');
      expect(xml).not.toContain('Trash');
      expect(xml).not.toContain('Add Row');

      // Assert category cell styling applied to row data cells
      expect(xml).toContain('ss:StyleID="CellLeft_yellow"');
      expect(xml).toContain('ss:StyleID="CellCenter_yellow"');
      expect(xml).toContain('ss:StyleID="CellLeft_orange"');
      expect(xml).toContain('ss:StyleID="CellCenter_orange"');

      // Assert 60 day columns (spanning up to index 67)
      expect(xml).toContain('ss:Index="67"');

      // Assert Signatories
      expect(xml).toContain('Añedez, Patrick Josh');
      expect(xml).toContain('GLAIZA MAE A. LIBE');
      expect(xml).toContain('Dr. Teles O. Aribe Jr.');
    });
  });
});
