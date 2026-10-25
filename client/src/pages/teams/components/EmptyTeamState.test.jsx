import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROLES } from '@cms/shared';
import EmptyTeamState from './EmptyTeamState';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted = [];

function render(component) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(component));
  mounted.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

afterEach(() => {
  mounted.splice(0).forEach((cleanup) => cleanup());
});

describe('EmptyTeamState', () => {
  it('shows student actions and invokes their supplied callbacks', () => {
    const onCreateClick = vi.fn();
    const onAcceptClick = vi.fn();
    const container = render(
      <EmptyTeamState
        role={ROLES.STUDENT}
        onCreateClick={onCreateClick}
        onAcceptClick={onAcceptClick}
      />,
    );

    expect(container.textContent).toContain('6-character invite code');
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.map((button) => button.textContent.trim())).toEqual([
      'Create a Team',
      'I Have an Invite Code',
    ]);

    act(() => buttons[0].click());
    act(() => buttons[1].click());

    expect(onCreateClick).toHaveBeenCalledOnce();
    expect(onAcceptClick).toHaveBeenCalledOnce();
  });

  it('keeps instructor empty state informational without student actions', () => {
    const container = render(<EmptyTeamState role={ROLES.INSTRUCTOR} />);

    expect(container.textContent).toContain('No teams found');
    expect(container.textContent).toContain('Teams will appear here once students form groups.');
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
