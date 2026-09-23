import { describe, expect, it } from 'vitest';
import { resolveActiveWorkflowTab } from './myProjectTabs';

describe('resolveActiveWorkflowTab', () => {
  it('keeps a requested tab when it is unlocked', () => {
    const result = resolveActiveWorkflowTab({
      requestedTab: 'capstone_2',
      unlockedTabs: ['proposal', 'capstone_1', 'capstone_2'],
      defaultTab: 'capstone_2',
    });

    expect(result.activeTab).toBe('capstone_2');
    expect(result.shouldNormalizeRequestedTab).toBe(false);
  });

  it('normalizes a locked requested tab to the nearest unlocked fallback', () => {
    const result = resolveActiveWorkflowTab({
      requestedTab: 'final',
      unlockedTabs: ['proposal', 'capstone_1'],
      defaultTab: 'capstone_1',
    });

    expect(result.activeTab).toBe('capstone_1');
    expect(result.shouldNormalizeRequestedTab).toBe(true);
  });

  it('normalizes an invalid requested tab', () => {
    const result = resolveActiveWorkflowTab({
      requestedTab: 'unknown_tab',
      unlockedTabs: ['proposal'],
      defaultTab: 'proposal',
    });

    expect(result.activeTab).toBe('proposal');
    expect(result.shouldNormalizeRequestedTab).toBe(true);
  });

  it('does not force normalization when no tab is requested', () => {
    const result = resolveActiveWorkflowTab({
      requestedTab: null,
      unlockedTabs: ['proposal', 'capstone_1'],
      defaultTab: 'proposal',
    });

    expect(result.activeTab).toBe('proposal');
    expect(result.shouldNormalizeRequestedTab).toBe(false);
  });

  it('resolves proposal tab and aliases', () => {
    const directResult = resolveActiveWorkflowTab({
      requestedTab: 'proposal',
      unlockedTabs: ['proposal', 'capstone_1'],
    });
    expect(directResult.activeTab).toBe('proposal');

    const aliasResult = resolveActiveWorkflowTab({
      requestedTab: 'draft',
      unlockedTabs: ['proposal', 'capstone_1'],
    });
    expect(aliasResult.activeTab).toBe('proposal');
  });

  it('resolves adm tab and aliases', () => {
    const directResult = resolveActiveWorkflowTab({
      requestedTab: 'adm',
      unlockedTabs: ['proposal', 'capstone_1', 'adm'],
    });
    expect(directResult.activeTab).toBe('adm');

    const aliasResult = resolveActiveWorkflowTab({
      requestedTab: 'matrix',
      unlockedTabs: ['proposal', 'capstone_1', 'adm'],
    });
    expect(aliasResult.activeTab).toBe('adm');
  });
});
