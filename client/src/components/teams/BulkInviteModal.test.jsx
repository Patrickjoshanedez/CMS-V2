import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import BulkInviteModal from './BulkInviteModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockMutate = vi.fn();
const mockOnOpenChange = vi.fn();

vi.mock('@/hooks/useTeams', () => ({
  useInviteCandidates: (teamId, query) => ({
    data: [
      {
        _id: 'cand-1',
        fullName: 'Leon Kennedy',
        email: 'leon@buksu.edu.ph',
        warnings: [],
      },
      {
        _id: 'cand-2',
        fullName: 'Claire Redfield',
        email: 'claire@buksu.edu.ph',
        warnings: [],
      },
      {
        _id: 'cand-3',
        fullName: 'Blocked Student',
        email: 'blocked@buksu.edu.ph',
        warnings: [{ blocksInvite: true, message: 'Already in another team' }],
      },
    ],
    isFetching: false,
  }),
  useBulkInviteMembers: (options) => ({
    mutate: (payload) => {
      mockMutate(payload);
      options?.onSuccess?.({
        data: {
          summary: { total: payload.emails.length, succeeded: payload.emails.length, failed: 0 },
          results: payload.emails.map((email) => ({
            email,
            success: true,
            invite: { inviteCode: 'ABC123', expiresAt: new Date().toISOString() },
            invitedUser: { fullName: email.split('@')[0], email },
          })),
        },
      });
    },
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('BulkInviteModal', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document.body.innerHTML = '';
  });

  it('renders modal with capacity indicators and candidate list', async () => {
    await act(async () => {
      root.render(
        <BulkInviteModal
          open={true}
          onOpenChange={mockOnOpenChange}
          teamId="team-123"
          teamName="Team Alpha"
          currentMembersCount={1}
          pendingInvites={[]}
        />,
      );
    });

    expect(document.body.textContent).toContain('Bulk Invite Teammates');
    expect(document.body.textContent).toContain('Team Alpha');
    expect(document.body.textContent).toContain('Team Slots: 1 of 4 Filled');
    expect(document.body.textContent).toContain('3 Slots Available');
    expect(document.body.textContent).toContain('Leon Kennedy');
    expect(document.body.textContent).toContain('Claire Redfield');
    expect(document.body.textContent).toContain('Already in another team');
  });

  it('stages candidates on click and sends bulk invites', async () => {
    await act(async () => {
      root.render(
        <BulkInviteModal
          open={true}
          onOpenChange={mockOnOpenChange}
          teamId="team-123"
          teamName="Team Alpha"
          currentMembersCount={1}
          pendingInvites={[]}
        />,
      );
    });

    // Find and click the Add button for Leon
    const buttons = Array.from(document.querySelectorAll('button'));
    const addButtons = buttons.filter((b) => b.textContent.includes('Add'));
    expect(addButtons.length).toBeGreaterThan(0);

    await act(async () => {
      addButtons[0].click();
    });

    expect(document.body.textContent).toContain('Staged for Invitation (1 of 3)');
    expect(document.body.textContent).toContain('Send 1 Invitation');

    // Click Send Invitations
    const sendBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Send 1 Invitation'),
    );
    expect(sendBtn).toBeTruthy();

    await act(async () => {
      sendBtn.click();
    });

    expect(mockMutate).toHaveBeenCalledWith({
      teamId: 'team-123',
      emails: ['leon@buksu.edu.ph'],
    });

    // Verify results screen
    expect(document.body.textContent).toContain('Invitation Batch Dispatched');
    expect(document.body.textContent).toContain('ABC123');
  });

  it('allows batch email pasting', async () => {
    await act(async () => {
      root.render(
        <BulkInviteModal
          open={true}
          onOpenChange={mockOnOpenChange}
          teamId="team-123"
          teamName="Team Alpha"
          currentMembersCount={1}
          pendingInvites={[]}
        />,
      );
    });

    // Switch to paste tab
    const pasteTabBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Paste Multiple Emails'),
    );
    expect(pasteTabBtn).toBeTruthy();

    await act(async () => {
      pasteTabBtn.click();
    });

    const textarea = document.querySelector('textarea');
    expect(textarea).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      ).set;
      nativeSetter.call(textarea, 'user1@buksu.edu.ph, user2@buksu.edu.ph');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const addStagingBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Add to Staging'),
    );
    expect(addStagingBtn).toBeTruthy();

    await act(async () => {
      addStagingBtn.click();
    });

    expect(document.body.textContent).toContain('user1@buksu.edu.ph');
    expect(document.body.textContent).toContain('user2@buksu.edu.ph');
    expect(document.body.textContent).toContain('Send 2 Invitations');
  });
});
