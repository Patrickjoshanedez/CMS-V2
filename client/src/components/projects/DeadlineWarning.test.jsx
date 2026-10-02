import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import DeadlineWarning from './DeadlineWarning';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('DeadlineWarning Component', () => {
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

  it('renders nothing when deadlines is null or empty', () => {
    act(() => {
      root.render(<DeadlineWarning deadlines={null} />);
    });
    expect(container.textContent).toBe('');

    act(() => {
      root.render(<DeadlineWarning deadlines={{}} />);
    });
    expect(container.textContent).toBe('');
  });

  it('renders active deadline with urgency in full mode', () => {
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      root.render(
        <DeadlineWarning
          deadlines={{
            chapter1: futureDate,
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Deadlines');
    expect(container.textContent).toContain('Chapter 1');
    expect(container.textContent).toContain('days left');
  });

  it('renders "Deadline removed" badge when a deadline is marked removed', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      root.render(
        <DeadlineWarning
          deadlines={{
            defense: pastDate,
            removed: ['defense'],
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Defense');
    expect(container.textContent).toContain('Deadline removed');
    // Crucial: Must NOT contain overdue warning or late justification notice
    expect(container.textContent).not.toContain('Overdue by');
    expect(container.textContent).not.toContain('Late submission justification is required');
  });

  it('renders "Deadline moved to [Date]" when a deadline is rescheduled', () => {
    const newFutureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const formattedDate = newFutureDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    act(() => {
      root.render(
        <DeadlineWarning
          deadlines={{
            defense: newFutureDate.toISOString(),
            moved: {
              defense: {
                oldDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                newDate: newFutureDate.toISOString(),
              },
            },
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Defense');
    expect(container.textContent).toContain(`Deadline moved to ${formattedDate}`);
    expect(container.textContent).toContain('Milestone schedule adjusted');
    expect(container.textContent).not.toContain('Late submission justification is required');
  });

  it('in compact mode: renders neutral update banner when deadline is removed instead of red overdue alert', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      root.render(
        <DeadlineWarning
          deadlines={{
            defense: pastDate,
            removed: ['defense'],
          }}
          compact
        />,
      );
    });

    expect(container.textContent).toContain('Milestone & Deadline Updates');
    expect(container.textContent).toContain('Defense');
    expect(container.textContent).toContain('Deadline removed');
    expect(container.textContent).not.toContain('Overdue Deadlines');
    expect(container.textContent).not.toContain('Overdue by');
    expect(container.textContent).not.toContain('Institutional Gate');
  });

  it('in compact mode: renders overdue alert when an active deadline is genuinely overdue', () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    act(() => {
      root.render(
        <DeadlineWarning
          deadlines={{
            chapter2: pastDate,
          }}
          compact
        />,
      );
    });

    expect(container.textContent).toContain('Overdue Deadlines');
    expect(container.textContent).toContain('Chapter 2');
    expect(container.textContent).toContain('Overdue by');
    expect(container.textContent).toContain(
      'Institutional Gate: Late submission justification is required',
    );
  });
});
