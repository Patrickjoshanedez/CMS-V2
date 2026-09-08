/**
 * pitchDeckParser.js
 *
 * Centralized schema, formatting, and parser for Capstone candidate title proposal pitch decks.
 * Harmonizes proposal persistence between Proposal Studio, Title Approval Studio,
 * Committee Proposal Hearing Views, and My Capstone Proposal Tab.
 */

export const PITCH_DECK_FIELDS = [
  {
    key: 'problemStatement',
    label: 'Problem Statement',
    tag: 'Literature Gap & Context',
    placeholder: 'Describe the high prevalence of the issue, existing gaps, and current costs...',
  },
  {
    key: 'proposedSolution',
    label: 'Proposed Solution',
    tag: 'Technical Framework',
    placeholder: 'Explain how your system solves the problem, core features...',
  },
  {
    key: 'uniqueContribution',
    label: 'Unique Contribution / Innovation',
    tag: 'Novelty & IP',
    placeholder:
      'What makes this different from existing tools? Campus DB-linked, cost-effective...',
  },
  {
    key: 'targetUsers',
    label: 'Target Users / Beneficiaries',
    tag: 'Stakeholders',
    placeholder: 'Primary and secondary users...',
  },
  {
    key: 'expectedImpact',
    label: 'Expected Impact / Value',
    tag: 'Impact & ROI',
    placeholder: 'Efficiency, transparency, academic integrity...',
  },
];

/**
 * Generates an empty pitch deck object.
 */
export function emptyPitchDeck() {
  return {
    problemStatement: '',
    proposedSolution: '',
    uniqueContribution: '',
    targetUsers: '',
    expectedImpact: '',
  };
}

/**
 * Formats structured pitch deck data into a standardized canonical description string.
 * @param {Object} deckData
 * @returns {string}
 */
export function formatPitchDeckDescription(deckData = {}) {
  const safeDeck = { ...emptyPitchDeck(), ...(deckData || {}) };
  return PITCH_DECK_FIELDS.map((field) => {
    const value = String(safeDeck[field.key] || '').trim();
    return `${field.label}:\n${value}`;
  }).join('\n\n');
}

/**
 * Robust regex parser extracting pitch deck sections from description text.
 * Tolerates both camelCase (`problemStatement:`) and formatted labels (`Problem Statement:`).
 * @param {string} description
 * @returns {Object}
 */
export function parsePitchDeckFromDescription(description = '') {
  const result = emptyPitchDeck();
  const text = String(description || '').trim();
  if (!text) return result;

  const patterns = [
    {
      key: 'problemStatement',
      regex:
        /(?:problemStatement|problem\s*statement(?:\s*&\s*literature\s*gap)?)\s*:\s*([\s\S]*?)(?=(?:proposedSolution|proposed\s*solution|uniqueContribution|unique\s*technical|unique\s*contribution|targetUsers|target\s*users|expectedImpact|expected\s*value|expected\s*impact|$))/i,
    },
    {
      key: 'proposedSolution',
      regex:
        /(?:proposedSolution|proposed\s*solution(?:\s*&\s*technical\s*framework)?)\s*:\s*([\s\S]*?)(?=(?:uniqueContribution|unique\s*technical|unique\s*contribution|targetUsers|target\s*users|expectedImpact|expected\s*value|expected\s*impact|$))/i,
    },
    {
      key: 'uniqueContribution',
      regex:
        /(?:uniqueContribution|unique\s*(?:technical\s*)?(?:contribution|innovation)(?:\s*[/&]\s*(?:contribution|innovation))?|unique\s*contribution|unique\s*innovation)\s*:\s*([\s\S]*?)(?=(?:targetUsers|target\s*users|expectedImpact|expected\s*value|expected\s*impact|$))/i,
    },
    {
      key: 'targetUsers',
      regex:
        /(?:targetUsers|target\s*users(?:\s*[/&]\s*beneficiaries)?)\s*:\s*([\s\S]*?)(?=(?:expectedImpact|expected\s*value|expected\s*impact|$))/i,
    },
    {
      key: 'expectedImpact',
      regex:
        /(?:expectedImpact|expected\s*(?:impact|value)(?:\s*[/&]\s*(?:impact|value|roi))?)\s*:\s*([\s\S]*?)$/i,
    },
  ];

  let matchedAny = false;
  patterns.forEach(({ key, regex }) => {
    const match = text.match(regex);
    if (match?.[1]) {
      result[key] = match[1].trim();
      matchedAny = true;
    }
  });

  // Fallback: If no structured sections matched, populate problemStatement with raw text
  if (!matchedAny && text.length > 0) {
    result.problemStatement = text;
  }

  return result;
}
