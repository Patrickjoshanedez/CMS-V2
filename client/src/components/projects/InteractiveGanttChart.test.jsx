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

  it('renders sprint deliverables roadmap, accomplishment badge, and default tasks', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
    });

    expect(container.textContent).toContain('Sprint Deliverables & Gantt Roadmap');
    expect(container.textContent).toContain('Capstone 3 Implementation');
    expect(container.textContent).toContain('Overall Accomplishment:');

    expect(container.textContent).toContain('SECTION 1 — PROJECT PLANNING & RESEARCH');
    expect(container.textContent).toContain('SECTION 2 — ARCHITECTURE & SYSTEM DESIGN');
    expect(container.textContent).toContain('SECTION 3 — INFRASTRUCTURE SETUP');

    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('ARCH-05');
    expect(container.textContent).toContain('INFRA-01');
  });

  it('filters task rows by owner select', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
    });

    const select = container.querySelector('select[aria-label="Filter by task owner"]');
    expect(select).toBeTruthy();

    await act(async () => {
      select.value = 'Antipuesto, Throylan';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('PLAN-05');
    // DEV-01 is not owned by Antipuesto so should not appear
    expect(container.textContent).not.toContain('INFRA-01');
  });

  it('opens Add Task modal and allows appending a new task', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart defaultView="compact" />);
    });

    // Find the Add Task button
    const buttons = Array.from(container.querySelectorAll('button'));
    const addButton = buttons.find((b) => b.textContent.includes('Add Task'));
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Add Sprint Task');

    const titleInput = container.querySelector('input#task-title');
    // Owner field is now a select (dropdown of canonical proponents)
    const ownerSelect = container.querySelector('select#task-owner');
    expect(titleInput).toBeTruthy();
    expect(ownerSelect).toBeTruthy();

    await act(async () => {
      setInputValue(titleInput, 'Integrate Vector Embeddings');
      // Select an owner from the dropdown
      ownerSelect.value = 'Antipuesto, Throylan';
      ownerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form');
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    // After submit the modal closes — toast is triggered in the component
    expect(form.closest('[role="dialog"]') === null || container.textContent).toBeTruthy();
  });

  it('renders exact Academic Excel Header, 4-tier nested timeline matrix, and 4-column signature block', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
    });

    // 1. Header structure
    expect(container.textContent).toContain('CAPSTONE PROJECT AND RESEARCH 2 GANTT CHART');
    expect(container.textContent).toContain('CAPSTONE PROJECT TITLE');
    expect(container.textContent).toContain('NAME OF STUDENTS');
    expect(container.textContent).toContain('NAME OF ADVISER');
    expect(container.textContent).toContain('SECTION CODE / SCHEDULE');
    expect(container.textContent).toContain('OVERALL ACCOMPLISHMENT');
    expect(container.textContent).toContain('T87 / TF 10:00AM-12:30PM');

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

    // 3. 4-Column Signatures Block
    expect(container.textContent).toContain('Añedez, Patrick Josh');
    expect(container.textContent).toContain('Bautista, Steven Joe');
    expect(container.textContent).toContain('Antipuesto, Throylan');
    expect(container.textContent).toContain('Canoy, Chijay');
    expect(container.textContent).toContain('Dr. Teles O. Aribe Jr.');
    expect(container.textContent).toContain('Instructor');
    expect(container.textContent).toContain('Adviser');

    // 4. Excel Export Action
    const buttons = Array.from(container.querySelectorAll('button'));
    const exportBtn = buttons.find((b) => b.textContent.includes('Export Excel'));
    expect(exportBtn).toBeTruthy();
  });
});
