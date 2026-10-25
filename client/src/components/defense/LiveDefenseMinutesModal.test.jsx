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
        canWriteMinutes
        canFinalizeVerdict
        canAggregateScores
        canPublishMatrix
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => expect(getMinutes).toHaveBeenCalledWith('synthetic-project', 'midterm'));
    await waitFor(() => {
      expect(screen.queryByText('Synchronizing official defense records...')).toBeNull();
    });
    expect(
      screen.getByRole('dialog', { name: "Secretary's Minutes Studio — OVPAA-F-INS-032" }),
    ).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Consensus & Publish ADM' }));
    });
    expect(screen.getByRole('tab', { name: 'Consensus & Publish ADM' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const verdictRadios = screen.getAllByRole('radio');
    expect(verdictRadios).toHaveLength(3);
    const minorRevision = screen.getByRole('radio', { name: 'Approved with Minor Revision' });
    expect(minorRevision).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Approved with Major Revision' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Rejected (Redefense Required)' })).not.toBeChecked();

    await act(async () => {
      fireEvent.click(minorRevision);
    });
    expect(minorRevision).toBeChecked();
  });

  it('delegates Escape dismissal to the shared Dialog and notifies its owner', async () => {
    const onClose = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <LiveDefenseMinutesModal
        isOpen
        projectId="synthetic-project"
        defenseType="midterm"
        onClose={onClose}
        onOpenChange={onOpenChange}
      />,
    );

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps committee actions unavailable when the caller grants no capabilities', async () => {
    render(
      <LiveDefenseMinutesModal
        isOpen
        projectId="synthetic-project"
        defenseType="midterm"
        canWriteMinutes={false}
        canFinalizeVerdict={false}
        canAggregateScores={false}
        canPublishMatrix={false}
      />,
    );

    await waitFor(() => expect(getMinutes).toHaveBeenCalledWith('synthetic-project', 'midterm'));
    expect(screen.queryByRole('tab', { name: /Quick-Log Remark/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Score Consolidator' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Consensus & Publish ADM' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Publish to ADM' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save Minutes Draft' })).toBeDisabled();
  });

  it('allows a chair to write minutes and finalize/aggregate while keeping matrix publishing locked', async () => {
    render(
      <LiveDefenseMinutesModal
        isOpen
        projectId="synthetic-project"
        defenseType="midterm"
        canWriteMinutes
        canFinalizeVerdict
        canAggregateScores
        canPublishMatrix={false}
      />,
    );

    await waitFor(() => expect(getMinutes).toHaveBeenCalledWith('synthetic-project', 'midterm'));
    expect(screen.getByRole('tab', { name: /Quick-Log Remark/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Score Consolidator' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Consensus & Publish ADM' }));
    expect(screen.getByRole('button', { name: /Publish to Action Done Matrix/ })).toBeDisabled();
  });

  it('allows a panelist to log minutes without exposing verdict, aggregation, or matrix controls', async () => {
    render(
      <LiveDefenseMinutesModal
        isOpen
        projectId="synthetic-project"
        defenseType="midterm"
        canWriteMinutes
        canFinalizeVerdict={false}
        canAggregateScores={false}
        canPublishMatrix={false}
      />,
    );

    await waitFor(() => expect(getMinutes).toHaveBeenCalledWith('synthetic-project', 'midterm'));
    expect(screen.getByRole('tab', { name: /Quick-Log Remark/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Score Consolidator' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Consensus & Publish ADM' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Publish to ADM' })).toBeDisabled();
  });
});
