export const WORKFLOW_TABS = [
  'proposal',
  'capstone_1',
  'capstone_2',
  'capstone_3',
  'adm',
  'consultation',
  'audit',
];

export function resolveActiveWorkflowTab({
  requestedTab,
  unlockedTabs,
  workflowTabs = WORKFLOW_TABS,
  defaultTab = 'proposal',
}) {
  let requested =
    typeof requestedTab === 'string' && requestedTab.trim().length > 0 ? requestedTab.trim() : null;

  // Backward compatibility aliases
  if (requested === 'capstone_4') {
    requested = 'capstone_3';
  } else if (requested === 'proposals' || requested === 'draft') {
    requested = 'proposal';
  } else if (requested === 'matrix' || requested === 'action_done_matrix') {
    requested = 'adm';
  }

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
