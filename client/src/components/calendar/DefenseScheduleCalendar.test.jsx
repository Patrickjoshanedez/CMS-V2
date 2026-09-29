import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DefenseScheduleCalendar, {
  SAMPLE_EVENTS,
} from '@/components/calendar/DefenseScheduleCalendar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DefenseScheduleCalendar Component', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  const renderComponent = (props = {}) => {
    act(() => {
      root.render(<DefenseScheduleCalendar {...props} />);
    });

    return {
      container,
      unmount: () => {
        act(() => {
          root.unmount();
        });
        container.remove();
      },
    };
  };

  it('renders default Agenda view with empty state and zero ghost mock data leak', () => {
    const { container } = renderComponent();

    // Must show the clean empty state banner
    expect(container.textContent).toContain('No Scheduled Defense Hearings');
    expect(container.textContent).toContain('Oral defense hearings and submission deadlines');

    // CRITICAL: MUST NOT leak sample events (e.g. Team Alpha HealthAI)
    expect(container.textContent).not.toContain('Team Alpha (HealthAI)');
    expect(container.textContent).not.toContain('Team ByteCraft');
  });

  it('renders defense and deadline events in Agenda timeline when events prop is provided', () => {
    const mockEvents = [
      {
        id: 'test-evt-1',
        title: 'Title Defense — Team Apex',
        type: 'proposal',
        date: '2026-10-15',
        time: '10:00 AM - 11:30 AM',
        venue: 'COT AVR 1',
        panel: ['Dr. Adviser One', 'Prof. Panelist Two'],
        status: 'scheduled',
      },
      {
        id: 'test-evt-2',
        title: 'Chapter 1 Submission Deadline — Team Apex',
        type: 'deadline',
        date: '2026-10-20',
        time: '11:59 PM',
        venue: 'CMS Portal Submission',
        panel: [],
        status: 'scheduled',
      },
    ];

    const { container } = renderComponent({ events: mockEvents });

    expect(container.textContent).toContain('Title Defense — Team Apex');
    expect(container.textContent).toContain('Proposal Defense');
    expect(container.textContent).toContain('COT AVR 1');
    expect(container.textContent).toContain('Dr. Adviser One');

    expect(container.textContent).toContain('Chapter 1 Submission Deadline — Team Apex');
    expect(container.textContent).toContain('Submission Deadline');
  });

  it('switches between Agenda and Month view via the segmented toggle', () => {
    const { container } = renderComponent({ events: [] });

    // Initially in Agenda view
    expect(container.textContent).toContain('Agenda');
    expect(container.textContent).toContain('Month');
    expect(container.textContent).not.toContain('Sun');

    // Find and click the "Month" button
    const buttons = Array.from(container.querySelectorAll('button'));
    const monthToggle = buttons.find((btn) => btn.textContent.includes('Month'));
    expect(monthToggle).toBeTruthy();

    act(() => {
      monthToggle.click();
    });

    // Month grid headers should now be rendered
    expect(container.textContent).toContain('Sun');
    expect(container.textContent).toContain('Mon');
    expect(container.textContent).toContain('Wed');
    expect(container.textContent).toContain('Fri');

    // Month navigator buttons with aria-label should exist
    const prevMonthBtn = container.querySelector('button[aria-label="Previous Month"]');
    const nextMonthBtn = container.querySelector('button[aria-label="Next Month"]');
    expect(prevMonthBtn).toBeTruthy();
    expect(nextMonthBtn).toBeTruthy();
  });

  it('ensures month day cells are accessible interactive buttons with aria-labels', () => {
    const { container } = renderComponent({
      events: [],
      defaultView: 'month',
    });

    // Check that day cells are rendered as buttons with aria-label
    const dayButtons = Array.from(container.querySelectorAll('button[aria-label*="events"]'));
    expect(dayButtons.length).toBeGreaterThan(27);

    // Each button should have tabIndex and accessible label
    const firstDayBtn = dayButtons[0];
    expect(firstDayBtn.getAttribute('aria-label')).toMatch(/\w+ 1, \d{4}: 0 events/);
  });

  it('triggers onSelectEvent when an event card is clicked in agenda view', () => {
    const handleSelect = vi.fn();
    const mockEvents = [
      {
        id: 'test-evt-click',
        title: 'Oral Presentation — Team Cyber',
        type: 'final',
        date: '2026-11-05',
        time: '02:00 PM',
        venue: 'Room 304',
        panel: ['Dr. Chair'],
      },
    ];

    const { container } = renderComponent({
      events: mockEvents,
      onSelectEvent: handleSelect,
    });

    const eventCard = container.querySelector('.cursor-pointer');
    expect(eventCard).toBeTruthy();

    act(() => {
      eventCard.click();
    });

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockEvents[0]);
  });
});
