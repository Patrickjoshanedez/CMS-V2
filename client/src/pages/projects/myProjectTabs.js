export const WORKFLOW_TABS = [
  'capstone_1',
  'capstone_2',
  'capstone_3',
  'capstone_4',
  'consultation',
  'audit',
];

export function resolveActiveWorkflowTab({
  requestedTab,
  unlockedTabs,
  workflowTabs = WORKFLOW_TABS,
  defaultTab = 'capstone_1',
}) {
  const requested =
    typeof requestedTab === 'string' && requestedTab.trim().length > 0 ? requestedTab.trim() : null;

  const normalizedUnlockedTabs = Array.isArray(unlockedTabs) ? unlockedTabs : ['capstone_1'];
  const firstUnlockedTab =
    normalizedUnlockedTabs.find((tab) => workflowTabs.includes(tab)) ?? 'capstone_1';
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
