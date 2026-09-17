import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  beforeEach(() => {
    localStorage.clear();
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
  });

  it('renders separate Add Section and Add Task buttons and creates a new milestone section', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart defaultView="compact" />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const addSectionBtn = buttons.find((b) => b.textContent.includes('Add Section'));
    const addTaskBtn = buttons.find((b) => b.textContent.includes('Add Task'));
    expect(addSectionBtn).toBeTruthy();
    expect(addTaskBtn).toBeTruthy();

    // Click Add Section
    await act(async () => {
      addSectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Create Milestone Section');
    const sectionInput = container.querySelector('input#new-section-input');
    expect(sectionInput).toBeTruthy();

    await act(async () => {
      setInputValue(sectionInput, 'SECTION 1 — PROJECT PLANNING & RESEARCH');
    });

    // Find the Create Section button inside the dialog
    const modalButtons = Array.from(container.querySelectorAll('[role="dialog"] button'));
    const createBtn = modalButtons.find((b) => b.textContent.includes('Create Section'));
    expect(createBtn).toBeTruthy();

    await act(async () => {
      createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Section should now be rendered in the table
    expect(container.textContent).toContain('SECTION 1 — PROJECT PLANNING & RESEARCH');
  });

  it('opens Add Task modal, appends a new task, and synchronizes task across compact and excel views', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart defaultView="compact" />);
    });

    // 1. Add a section first
    const addSectionBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Add Section'),
    );
    await act(async () => {
      addSectionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const sectionInput = container.querySelector('input#new-section-input');
    await act(async () => {
      setInputValue(sectionInput, 'SECTION 1 — PROJECT PLANNING & RESEARCH');
    });
    const createBtn = Array.from(container.querySelectorAll('[role="dialog"] button')).find((b) =>
      b.textContent.includes('Create Section'),
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

    expect(container.textContent).toContain('Add Sprint Task');

    const idInput = container.querySelector('input#task-id');
    const titleInput = container.querySelector('input#task-title');
    const ownerInput =
      container.querySelector('select#task-owner') || container.querySelector('input#task-owner');
    expect(titleInput).toBeTruthy();
    expect(ownerInput).toBeTruthy();

    await act(async () => {
      if (idInput) setInputValue(idInput, 'PLAN-01');
      setInputValue(titleInput, 'Scope alignment & deliverables kickoff');
      if (ownerInput.tagName.toLowerCase() === 'select') {
        ownerInput.value = ownerInput.options[0]?.value || 'Lead';
        ownerInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        setInputValue(ownerInput, 'Añedez, Patrick Josh');
      }
    });

    const form = container.querySelector('form');
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
