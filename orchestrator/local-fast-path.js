import { callLocalSwarm } from './local-ai-provider.js';

const FAST_PATH_HINTS = [
  'simple',
  'small',
  'minor',
  'single file',
  'one file',
  'one function',
  'fix typo',
  'format',
  'lint',
  'jest',
  'unit test',
  'smoke test',
  'test automation',
  'review only',
  'low complexity',
];

const BLOCKING_HINTS = [
  'architecture',
  'architect',
  'security',
  'migration',
  'database',
  'distributed',
  'performance bottleneck',
  'race condition',
  'production incident',
  'public exposure',
  'secret',
  'auth',
  'authentication',
  'authorization',
];

const LOW_COMPLEXITY_THRESHOLD = 3;

function normalizeText(value) {
  return String(value ?? '').toLowerCase();
}

/**
 * Determine whether a ticket is clearly low complexity.
 *
 * @param {string} ticketDescription
 * @returns {boolean}
 */
export function isClearlyLowComplexity(ticketDescription) {
  const normalized = normalizeText(ticketDescription);
  if (!normalized.trim()) {
    return false;
  }

  let score = 0;

  for (const hint of FAST_PATH_HINTS) {
    if (normalized.includes(hint)) {
      score += 1;
    }
  }

  for (const blocker of BLOCKING_HINTS) {
    if (normalized.includes(blocker)) {
      return false;
    }
  }

  if (normalized.length < 180) {
    score += 1;
  }

  if (normalized.split(/\s+/).length <= 30) {
    score += 1;
  }

  return score >= LOW_COMPLEXITY_THRESHOLD;
}

/**
 * Determine whether the local fast-path is allowed for a request.
 *
 * @param {string} ticketDescription
 * @param {{ enableLocalFastPath?: boolean, forceLocalFastPath?: boolean }} [options]
 * @returns {boolean}
 */
export function shouldUseLocalFastPath(ticketDescription, options = {}) {
  if (options.forceLocalFastPath) {
    return true;
  }

  if (!options.enableLocalFastPath) {
    return false;
  }

  return isClearlyLowComplexity(ticketDescription);
}

/**
 * Run the local low-complexity fast-path through the verified local provider.
 *
 * @param {string} ticketDescription
 * @param {{ enableLocalFastPath?: boolean, forceLocalFastPath?: boolean }} [options]
 * @returns {Promise<{ usedLocalFastPath: boolean, output: string, reason: string }>}
 */
export async function runLocalFastPath(ticketDescription, options = {}) {
  const useLocalFastPath = shouldUseLocalFastPath(ticketDescription, options);

  if (!useLocalFastPath) {
    return {
      usedLocalFastPath: false,
      output: '',
      reason: 'Local fast-path disabled or task not clearly low complexity.',
    };
  }

  const architectPrompt =
    'You are the System Architect for a low-complexity task. Output a concise JSON technical spec only.';
  const coderPrompt =
    'You are the Coder for a low-complexity task. Output only the implementation or code snippet requested.';
  const reviewerPrompt =
    "You are the 100x Code Reviewer for a low-complexity task. If the result is acceptable, output exactly 'PASS'. Otherwise, list precise fixes.";

  const spec = await callLocalSwarm(architectPrompt, ticketDescription);
  const code = await callLocalSwarm(coderPrompt, `SPEC:\n${spec}`);
  const verdict = await callLocalSwarm(reviewerPrompt, `SPEC:\n${spec}\n\nCODE:\n${code}`);

  return {
    usedLocalFastPath: true,
    output: code,
    reason: verdict,
  };
}
