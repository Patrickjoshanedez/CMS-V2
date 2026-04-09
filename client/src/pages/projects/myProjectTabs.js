export const WORKFLOW_TABS = ['proposal', 'capstone_1', 'capstone_2', 'capstone_3', 'final'];

export function resolveActiveWorkflowTab({
  requestedTab,
  unlockedTabs,
  workflowTabs = WORKFLOW_TABS,
  defaultTab = 'proposal',
}) {
  const requested =
    typeof requestedTab === 'string' && requestedTab.trim().length > 0 ? requestedTab.trim() : null;

  const normalizedUnlockedTabs = Array.isArray(unlockedTabs) ? unlockedTabs : ['proposal'];
  const firstUnlockedTab =
    normalizedUnlockedTabs.find((tab) => workflowTabs.includes(tab)) ?? 'proposal';
  const fallbackTab = normalizedUnlockedTabs.includes(defaultTab) ? defaultTab : firstUnlockedTab;

  const isRequestedTabSelectable =
    requested !== null &&
    workflowTabs.includes(requested) &&
    normalizedUnlockedTabs.includes(requested);

  const activeTab = isRequestedTabSelectable ? requested : fallbackTab;

  return {
    activeTab,
    shouldNormalizeRequestedTab: requested !== null && requested !== activeTab,
  };
}
