import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AcademicExcelGanttChart, {
  extractProjectMembers,
  extractProjectAdviser,
  extractProjectInstructor,
  COLOR_OPTIONS,
  addWorkingDays,
} from './AcademicExcelGanttChart';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('AcademicExcelGanttChart Component', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
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

    it('falls back to CANONICAL_MEMBERS when project has no team members', () => {
      const members = extractProjectMembers(null);
      expect(members).toContain('Añedez, Patrick Josh');
      expect(members).toContain('Bautista, Steven Joe');
      expect(members).toContain('Antipuesto, Throylan');
      expect(members).toContain('Canoy, Chijay');
      expect(members.length).toBe(4);
    });

    it('extracts adviser and instructor with proper institutional fallbacks', () => {
      expect(extractProjectAdviser(null)).toBe('Glaiza Mae A. Libe');
      expect(extractProjectInstructor(null)).toBe('Dr. Teles O. Aribe Jr.');

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

    it('renders correct team member in filter and header for Solo Leveling', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      // Filter should show All Members (1), not All Members (32)
      const select = container.querySelector('select[aria-label="Filter by task owner"]');
      expect(select).toBeTruthy();
      expect(select.textContent).toContain('All Members (1)');
      expect(select.textContent).toContain('Fushiguro, Megumi Josh');

      // Header should display Fushiguro, Megumi Josh
      expect(container.textContent).toContain('Fushiguro, Megumi Josh');
    });

    it('renders 8 color theme options in the paint palette', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      const colorBtns = container.querySelectorAll('button[title^="Fill Color:"]');
      expect(colorBtns.length).toBe(COLOR_OPTIONS.length);
      expect(colorBtns.length).toBe(8);
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

    it('allows deleting a row via the trash button', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      // Find delete buttons in ACT column
      const deleteButtons = container.querySelectorAll('button[title^="Delete row"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
      const initialCount = deleteButtons.length;

      await act(async () => {
        deleteButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      const afterDeleteButtons = container.querySelectorAll('button[title^="Delete row"]');
      expect(afterDeleteButtons.length).toBe(initialCount - 1);
    });

    it('allows toggling day fill boxes when cell is clicked', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
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

    it('calculates and renders overall accomplishment and editable as-of date', async () => {
      await act(async () => {
        root.render(<AcademicExcelGanttChart project={mockSoloProject} />);
      });

      expect(container.textContent).toContain('OVERALL ACCOMPLISHMENT');
      expect(container.textContent).toContain('100.00%');
      expect(container.textContent).toContain('as of');
      expect(container.textContent).toContain('19/03/2026');
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
