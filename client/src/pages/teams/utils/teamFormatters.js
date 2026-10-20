/**
 * teamFormatters.js — Shared presentation formatters for team members and committees.
 */

/**
 * Format a populated user's full name.
 * @param {Object} userObj
 * @returns {string}
 */
export function formatName(userObj) {
  if (!userObj) return 'Unknown';
  const parts = [userObj.firstName, userObj.middleName, userObj.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : userObj.email || 'Unknown';
}

/**
 * Format a committee member option with name and email for comboboxes.
 * @param {Object} userObj
 * @returns {string}
 */
export function formatCommitteeOption(userObj) {
  if (!userObj) return '';
  return `${formatName(userObj)} • ${userObj.email || 'No email provided'}`;
}

export default {
  formatName,
  formatCommitteeOption,
};
