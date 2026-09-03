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
    expect(container.textContent).toContain('SECTION 3 — DEVELOPMENT & SYSTEM INTEGRATION');

    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('ARCH-05');
    expect(container.textContent).toContain('DEV-01');
  });

  it('filters task rows by owner select', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
    });

    const select = container.querySelector('select[aria-label="Filter by task owner"]');
    expect(select).toBeTruthy();

    await act(async () => {
      select.value = 'Throylan Antipuesto';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('PLAN-01');
    expect(container.textContent).toContain('PLAN-05');
    expect(container.textContent).not.toContain('DEV-01');
  });

  it('opens Add Task modal and allows appending a new task', async () => {
    await act(async () => {
      root.render(<InteractiveGanttChart />);
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
    const ownerInput = container.querySelector('input#task-owner');
    expect(titleInput).toBeTruthy();
    expect(ownerInput).toBeTruthy();

    await act(async () => {
      setInputValue(titleInput, 'Integrate Vector Embeddings');
      setInputValue(ownerInput, 'Patrick Josh Añedez');
    });

    const form = container.querySelector('form');
    expect(form).toBeTruthy();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Integrate Vector Embeddings');
  });
});
