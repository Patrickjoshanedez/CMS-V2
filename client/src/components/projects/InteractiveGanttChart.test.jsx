import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { projectService } from '@/services/authService';
import InteractiveGanttChart from './InteractiveGanttChart';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(input, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  ).set;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('InteractiveGanttChart Component', () => {
  let container;
  let root;
  const editableProject = {
    _id: 'interactive-gantt-test-project',
    teamId: { leaderId: { _id: 'interactive-gantt-test-student' } },
  };

  const renderAsAssignedStudent = async (defaultView) => {
    useAuthStore.setState({
      user: { _id: 'interactive-gantt-test-student', role: 'student' },
    });
    await act(async () => {
      root.render(<InteractiveGanttChart project={editableProject} defaultView={defaultView} />);
    });
  };

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

  it('renders sprint deliverables roadmap, accomplishment badge, and empty state with Pending accomplishment', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
    });

    expect(container.textContent).toContain('Sprint Deliverables & Gantt Roadmap');
    expect(container.textContent).toContain('Capstone 3 Implementation');
    expect(container.textContent).toContain('Overall Accomplishment:');
    expect(container.textContent).toContain('Pending');

    // No template data should appear
    expect(container.textContent).not.toContain('PLAN-01');
    expect(container.textContent).not.toContain('ARCH-05');
    expect(container.textContent).not.toContain('INFRA-01');
    expect(container.textContent).toContain('No Gantt Roadmap Data');
    expect(container.querySelector('[aria-label="Filter by task owner"]')).toBeTruthy();
  });

  it('keeps archived schedules read-only and does not autosave when opened', async () => {
    const updateGanttPlan = vi
      .spyOn(projectService, 'updateGanttPlan')
      .mockResolvedValue({ data: { data: { project: {} } } });
    useAuthStore.setState({
      user: { _id: 'interactive-gantt-test-student', role: 'student' },
    });
    const archivedProject = {
      ...editableProject,
      isArchived: true,
      projectStatus: 'archived',
      ganttPlan: {
        updatedAt: '2026-10-17T00:00:00.000Z',
        tasks: [{ id: 'task-1', section: 'Planning', title: 'Plan work', progress: 0 }],
        sections: ['Planning'],
      },
    };

    await act(async () => {
      root.render(<InteractiveGanttChart project={archivedProject} defaultView="excel" />);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });

    expect(container.textContent).toContain(
      'View-only schedule — editing is limited to assigned team members and the assigned Adviser',
    );
    expect(container.textContent).not.toContain('Click any cell to edit');
    expect(updateGanttPlan).not.toHaveBeenCalled();
  });

  it('renders separate Add Section and Add Task buttons and creates a new milestone section', async () => {
    await renderAsAssignedStudent('compact');

    const buttons = Array.from(container.querySelectorAll('button'));
    const addSectionBtn = buttons.find((b) => b.textContent.includes('Add Section'));
    const addTaskBtn = buttons.find((b) => b.textContent.includes('Add Task'));
    expect(addSectionBtn).toBeTruthy();
    expect(addTaskBtn).toBeTruthy();

    // Click Add Section
    await act(async () => {
      addSectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Create Milestone Section');
    const sectionInput = document.body.querySelector('input#new-section-input');
    expect(sectionInput).toBeTruthy();

    await act(async () => {
      setInputValue(sectionInput, 'SECTION 1 — PROJECT PLANNING & RESEARCH');
    });

    // Find the Create Section button inside the dialog
    const modalButtons = Array.from(document.body.querySelectorAll('[role="dialog"] button'));
    const createBtn = modalButtons.find((b) => b.textContent.includes('Create Section'));
    expect(createBtn).toBeTruthy();

    await act(async () => {
      createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Section should now be rendered in the table
    expect(container.textContent).toContain('SECTION 1 — PROJECT PLANNING & RESEARCH');
  });

  it('dismisses the milestone dialog with Escape', async () => {
    await renderAsAssignedStudent('compact');
    const addSectionBtn = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Add Section'),
    );

    await act(async () => {
      addSectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens Add Task modal, appends a new task, and synchronizes task across compact and excel views', async () => {
    await renderAsAssignedStudent('compact');

    // 1. Add a section first
    const addSectionBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Add Section'),
    );
    await act(async () => {
      addSectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const sectionInput = document.body.querySelector('input#new-section-input');
    await act(async () => {
      setInputValue(sectionInput, 'SECTION 1 — PROJECT PLANNING & RESEARCH');
    });
    const createBtn = Array.from(document.body.querySelectorAll('[role="dialog"] button')).find(
      (button) => button.textContent.includes('Create Section'),
    );
    await act(async () => {
      createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // 2. Click Add Task
    const addTaskBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Add Task'),
    );
    await act(async () => {
      addTaskBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Add Sprint Task');

    const idInput = document.body.querySelector('input#task-id');
    const titleInput = document.body.querySelector('input#task-title');
    const ownerInput = document.body.querySelector('#task-owner');
    expect(titleInput).toBeTruthy();
    expect(ownerInput).toBeTruthy();

    await act(async () => {
      if (idInput) setInputValue(idInput, 'PLAN-01');
      setInputValue(titleInput, 'Scope alignment & deliverables kickoff');
      if (ownerInput.tagName.toLowerCase() === 'select') {
        ownerInput.value = ownerInput.options[0]?.value || 'Lead';
        ownerInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (ownerInput.tagName.toLowerCase() === 'input') {
        setInputValue(ownerInput, 'Añedez, Patrick Josh');
      }
    });

    const form = document.body.querySelector('[role="dialog"] form');
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // Verify task is rendered in Compact View
    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('Scope alignment & deliverables kickoff');

    // 3. Switch to Academic Excel View and verify synchronization
    const excelViewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Academic Excel View'),
    );
    expect(excelViewBtn).toBeTruthy();

    await act(async () => {
      excelViewBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Task PLAN-01 must exist in Academic Excel View as well!
    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('Scope alignment & deliverables kickoff');
  });

  it('renders exact Academic Excel Header with Pending defaults when project is unassigned', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart defaultView="excel" />);
    });

    // 1. Header structure
    expect(container.textContent).toContain('CAPSTONE PROJECT AND RESEARCH 2 GANTT CHART');
    expect(container.textContent).toContain('CAPSTONE PROJECT TITLE');
    expect(container.textContent).toContain('NAME OF STUDENTS');
    expect(container.textContent).toContain('NAME OF ADVISER');
    expect(container.textContent).toContain('SECTION CODE / SCHEDULE');
    expect(container.textContent).toContain('OVERALL ACCOMPLISHMENT');

    // Default unassigned fields must be Pending
    expect(container.textContent).toContain('Pending');

    // 2. 4-Tier Timeline Matrix
    expect(container.textContent).toContain('PHASE ONE');
    expect(container.textContent).toContain('PHASE TWO');
    expect(container.textContent).toContain('PHASE THREE');
    expect(container.textContent).toContain('PHASE FOUR');
    expect(container.textContent).toContain('WEEK 1');
    expect(container.textContent).toContain('WEEK 12');
    expect(container.textContent).toContain('Planning');
    expect(container.textContent).toContain('Data collection');
    expect(container.textContent).toContain('Documentation & defense prep');

    // 3. Signatures Block with Pending
    expect(container.textContent).toContain('Adviser');
    expect(container.textContent).toContain('Instructor');

    // 4. Excel Export Action
    const buttons = Array.from(container.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => b.textContent.includes('Export Excel'));
    expect(exportBtn).toBeTruthy();
  });
});
