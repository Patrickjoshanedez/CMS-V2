/**
 * United Nations Sustainable Development Goals (SDGs)
 * https://sdgs.un.org/goals
 */
export const SDG_GOALS = [
  { id: 1, name: 'No Poverty', short: 'SDG 1' },
  { id: 2, name: 'Zero Hunger', short: 'SDG 2' },
  { id: 3, name: 'Good Health and Well-being', short: 'SDG 3' },
  { id: 4, name: 'Quality Education', short: 'SDG 4' },
  { id: 5, name: 'Gender Equality', short: 'SDG 5' },
  { id: 6, name: 'Clean Water and Sanitation', short: 'SDG 6' },
  { id: 7, name: 'Affordable and Clean Energy', short: 'SDG 7' },
  { id: 8, name: 'Decent Work and Economic Growth', short: 'SDG 8' },
  { id: 9, name: 'Industry, Innovation and Infrastructure', short: 'SDG 9' },
  { id: 10, name: 'Reduced Inequalities', short: 'SDG 10' },
  { id: 11, name: 'Sustainable Cities and Communities', short: 'SDG 11' },
  { id: 12, name: 'Responsible Consumption and Production', short: 'SDG 12' },
  { id: 13, name: 'Climate Action', short: 'SDG 13' },
  { id: 14, name: 'Life Below Water', short: 'SDG 14' },
  { id: 15, name: 'Life on Land', short: 'SDG 15' },
  { id: 16, name: 'Peace, Justice and Strong Institutions', short: 'SDG 16' },
  { id: 17, name: 'Partnerships for the Goals', short: 'SDG 17' },
];

/**
 * SDG suggestions for TagInput component
 * Format: "SDG X: Name" for easy selection and display
 */
export const SDG_TAG_SUGGESTIONS = SDG_GOALS.map((goal) => `SDG ${goal.id}: ${goal.name}`);

/**
 * Get SDG details by ID
 * @param {number} id - SDG goal ID (1-17)
 * @returns {Object|undefined} SDG goal object
 */
export const getSDGById = (id) => SDG_GOALS.find((goal) => goal.id === id);

/**
 * Parse SDG tag string to get ID
 * @param {string} tag - Tag string like "SDG 1: No Poverty"
 * @returns {number|null} SDG ID or null if not found
 */
export const parseSDGTag = (tag) => {
  const match = tag.match(/^SDG\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
};
