import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMinutes } = vi.hoisted(() => ({ getMinutes: vi.fn() }));

vi.mock('@/services/defenseMinutesService', () => ({
  defenseMinutesService: { getMinutes },
}));

vi.mock('@/services/socket', () => ({ getSocket: () => null }));

import LiveDefenseMinutesModal from './LiveDefenseMinutesModal';

describe('LiveDefenseMinutesModal', () => {
  beforeEach(() => {
    getMinutes.mockReset().mockResolvedValue({
      data: { data: { defenseMinutes: { entries: [], consensusVerdict: null }, liveScores: null } },
    });
  });

  it('does not preselect a panel verdict when no defense decision is recorded', async () => {
    render(
      <LiveDefenseMinutesModal
        isOpen
        projectId="synthetic-project"
        defenseType="midterm"
        projectTitle="Synthetic workflow test"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(getMinutes).toHaveBeenCalledWith('synthetic-project', 'midterm'));
    await waitFor(() => {
      expect(screen.queryByText('Synchronizing official defense records...')).toBeNull();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Consensus & Publish ADM' }));
    });

    const verdictRadios = document.querySelectorAll('input[type="radio"]');
    expect(verdictRadios).toHaveLength(3);
    const minorRevision = screen.getByRole('radio', { name: 'Approved with Minor Revision' });
    expect(minorRevision).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Approved with Major Revision' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Rejected (Redefense Required)' })).not.toBeChecked();
  });
});
