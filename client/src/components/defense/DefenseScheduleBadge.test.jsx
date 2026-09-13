import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DefenseScheduleBadge, {
  resolveDefenseScheduleState,
  formatDefenseDate,
} from './DefenseScheduleBadge';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DefenseScheduleBadge', () => {
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

  it('formats defense dates correctly', () => {
    expect(formatDefenseDate('2026-09-18T09:00:00.000Z')).toBe('Sep 18, 2026');
    expect(formatDefenseDate(null)).toBeNull();
    expect(formatDefenseDate('invalid')).toBeNull();
  });

  it('renders orange badge when pending scheduling', () => {
    const schedule = {
      status: 'pending_scheduling',
      date: '2026-09-18T09:00:00.000Z',
    };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Pending: Sep 18, 2026');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-amber-600');
  });

  it('renders orange badge with "Pending Schedule" when no date set', () => {
    const schedule = { status: 'pending_scheduling' };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Pending Schedule');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-amber-600');
  });

  it('renders green badge with date when scheduled', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const schedule = {
      status: 'scheduled',
      date: futureDate.toISOString(),
      time: '09:00 AM',
    };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Scheduled:');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-emerald-600');
  });

  it('renders red badge with date when scheduled date has passed (overdue)', () => {
    const schedule = {
      status: 'scheduled',
      date: '2020-04-10T09:00:00.000Z',
    };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Overdue: Apr 10, 2020');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-rose-600');
  });

  it('renders red badge when status is redefense', () => {
    const schedule = {
      status: 'redefense',
      date: '2026-09-25T09:00:00.000Z',
    };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Redefense: Sep 25, 2026');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-rose-600');
  });

  it('renders red badge when verdict is rejected (redefense required)', () => {
    const schedule = {
      status: 'completed',
      verdict: 'rejected',
      date: '2026-09-20T09:00:00.000Z',
    };
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={schedule} />);
    });
    expect(container.textContent).toContain('Redefense: Sep 20, 2026');
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-rose-600');
  });

  it('returns null when schedule is empty or status is none', () => {
    act(() => {
      root.render(<DefenseScheduleBadge defenseSchedule={{ status: 'none' }} />);
    });
    expect(container.innerHTML).toBe('');
  });
});
