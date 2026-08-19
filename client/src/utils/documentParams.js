/**
 * Utility functions for parsing and validating document routing parameters.
 */

/**
 * Checks if a string is a standard 24-character hexadecimal MongoDB ObjectId.
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isMongoObjectId(str) {
  if (typeof str !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(str);
}

/**
 * Parses an overloaded document parameter (which can be either a MongoDB ObjectId
 * or an academic documentType string such as 'chapter_1', 'proposal', etc.).
 *
 * @param {string} rawParam
 * @returns {{ isMongoId: boolean, raw: string, documentType: string, docId: string|null }}
 */
export function parseDocParam(rawParam) {
  if (!rawParam || typeof rawParam !== 'string') {
    return {
      isMongoId: false,
      raw: '',
      documentType: '',
      docId: null,
    };
  }

  const isMongo = isMongoObjectId(rawParam);

  return {
    isMongoId: isMongo,
    raw: rawParam,
    // If it's a Mongo ID, docId is the param and documentType is empty until fetched
    docId: isMongo ? rawParam : null,
    // If not a Mongo ID, treated as documentType (e.g., chapter_1, proposal)
    documentType: isMongo ? '' : rawParam,
  };
}
