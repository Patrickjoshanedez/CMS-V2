import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarScheduler from './CalendarScheduler';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('CalendarScheduler', () => {
  let container;
  let root;

  const render = async (props = {}) => {
    await act(async () => root.render(<CalendarScheduler {...props} />));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows the selected day agenda and distinguishes deadlines from defenses', async () => {
    const now = new Date();
    const todayAtNine = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:00:00`;
    await render({
      deadlines: [{ _id: 'deadline-1', title: 'Chapter review', dueDate: todayAtNine }],
      defenseSchedules: [{ _id: 'defense-1', title: 'Proposal defense', scheduledAt: todayAtNine }],
    });

    expect(container.textContent).toContain('Agenda:');
    expect(container.textContent).toContain('Chapter review');
    expect(container.textContent).toContain('Proposal defense');
    expect(container.querySelectorAll('.bg-warning').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.bg-success').length).toBeGreaterThan(0);
  });

  it('moves the displayed month when a navigation button is activated', async () => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const expectedTitle = previousMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await render();

    await act(async () => container.querySelector('[aria-label="Previous Month"]').click());

    expect(container.querySelector('h3')?.textContent).toBe(expectedTitle);
  });

  it('reports an empty agenda for a day without scheduled events', async () => {
    await render();

    expect(container.textContent).toContain('No deadlines or defense events scheduled for this day.');
    expect(container.textContent).toContain('0 Events');
  });

  it('emits the chosen local date through the existing callback', async () => {
    const onSelectDate = vi.fn();
    const now = new Date();
    const expectedDate = new Date(now.getFullYear(), now.getMonth(), 1);
    await render({ onSelectDate });
    const firstDayButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent.trim() === '1',
    );

    await act(async () => firstDayButton.click());

    expect(onSelectDate).toHaveBeenCalledWith(expectedDate);
  });
});
