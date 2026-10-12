import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import TeamRosterCard from './TeamRosterCard';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const renderComponent = (ui) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(ui);
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

describe('TeamRosterCard Component', () => {
  const mockMember = {
    _id: 'm-1',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan@buksu.edu.ph',
  };

  it('renders member name, initials, and email', () => {
    const view = renderComponent(<TeamRosterCard member={mockMember} />);
    expect(view.container.textContent).toContain('Juan Dela Cruz');
    expect(view.container.textContent).toContain('juan@buksu.edu.ph');
    expect(view.container.textContent).toContain('JD');
    view.unmount();
  });

  it('renders leader crown badge when isLeader is true', () => {
    const view = renderComponent(<TeamRosterCard member={mockMember} isLeader={true} />);
    expect(view.container.textContent).toContain('Leader');
    view.unmount();
  });

  it('renders role badge when role is assigned', () => {
    const view = renderComponent(
      <TeamRosterCard member={mockMember} role="Frontend & UI/UX Developer" />,
    );
    expect(view.container.textContent).toContain('Frontend & UI/UX Developer');
    view.unmount();
  });

  it('renders "No role assigned" when role is empty', () => {
    const view = renderComponent(<TeamRosterCard member={mockMember} role="" />);
    expect(view.container.textContent).toContain('No role assigned');
    view.unmount();
  });

  it('renders role select and triggers onAssignRole when canAssignRole is true', () => {
    const onAssignRole = vi.fn();
    const view = renderComponent(
      <TeamRosterCard
        member={mockMember}
        canAssignRole={true}
        role="Frontend & UI/UX Developer"
        onAssignRole={onAssignRole}
      />,
    );

    const select = view.container.querySelector('select');
    expect(select).toBeTruthy();

    act(() => {
      select.value = 'Full-Stack Developer';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onAssignRole).toHaveBeenCalledWith('Full-Stack Developer', 'm-1');
    view.unmount();
  });
});
