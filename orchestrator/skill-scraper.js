/**
 * Skill Scraper
 * - Fetches skill/instruction templates from trusted sources
 * - Parses markdown skill files into executable hooks
 * - Validates and sanitizes scraped content
 *
 * @module orchestrator/skill-scraper
 */

import crypto from 'crypto';

// Trusted source whitelist - ONLY these domains are allowed
export const TRUSTED_SOURCES = [
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'registry.npmjs.org',
  'api.github.com',
  'learn.microsoft.com',
  'context7.io',
];

// Skill template schema definition
export const SKILL_SCHEMA = {
  name: 'string', // Unique skill identifier
  version: 'semver', // Semantic version
  description: 'string', // What the skill does
  triggers: ['string'], // Keywords/patterns that activate skill
  instructions: 'string', // Prompt instructions to inject
  hooks: {
    before: 'string', // Pre-execution hook
    after: 'string', // Post-execution hook
    onError: 'string', // Error handling hook
  },
  tools: ['string'], // Required MCP tools
  source: 'url', // Original source URL
  fetchedAt: 'ISO8601',
  checksum: 'sha256', // Integrity verification
};

// Dangerous patterns to sanitize from skill instructions
const DANGEROUS_PATTERNS = [
  /\$\([^)]+\)/g, // Shell command substitution
  // REMOVED: Template literal sanitization - markdown is never evaluated as code
  // Previous regex was too broad and broke legitimate markdown code blocks
  /;\s*rm\s+-rf/gi, // rm -rf commands
  /;\s*del\s+\/[fqs]/gi, // Windows delete commands
  /eval\s*\(/gi, // eval() calls
  /Function\s*\(/gi, // Function constructor
  /process\.exit/gi, // Process termination
  /require\s*\(\s*['"]child_process/gi, // Child process spawning
  /exec\s*\(\s*['"][^'"]*rm/gi, // Exec with rm
  /spawn\s*\(\s*['"](?:rm|del|format)/gi, // Spawn dangerous commands
  /__proto__/gi, // Prototype pollution
  /constructor\s*\[\s*['"]prototype/gi, // Prototype pollution variant
];

// Rate limiting state for GitHub API
const rateLimitState = {
  remaining: 60,
  resetTime: Date.now(),
  lastRequest: 0,
};

/**
 * Check if URL is from a trusted source
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is trusted
 */
export function isTrustedSource(url) {
  try {
    const parsed = new URL(url);

    // Must be HTTPS (security requirement)
    if (parsed.protocol !== 'https:') {
      return false;
    }

    return TRUSTED_SOURCES.some(
      (trusted) => parsed.hostname === trusted || parsed.hostname.endsWith(`.${trusted}`),
    );
  } catch {
    return false;
  }
}

/**
 * Calculate SHA256 checksum of content
 * @param {string} content - Content to hash
 * @returns {string} Hex-encoded SHA256 hash
 */
export function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Validate semver format
 * @param {string} version - Version string to validate
 * @returns {boolean} True if valid semver
 */
function isValidSemver(version) {
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return semverRegex.test(version);
}

/**
 * Sanitize content by removing dangerous patterns
 * @param {string} content - Content to sanitize
 * @returns {{sanitized: string, warnings: string[]}} Sanitized content and warnings
 */
export function sanitizeContent(content) {
  const warnings = [];
  let sanitized = content;

  for (const pattern of DANGEROUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      warnings.push(`Removed potentially dangerous pattern: ${matches[0].substring(0, 50)}...`);
      sanitized = sanitized.replace(pattern, '[SANITIZED]');
    }
  }

  return { sanitized, warnings };
}

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Markdown content with YAML frontmatter
 * @returns {{frontmatter: Object, body: string}} Parsed frontmatter and body
 */
export function parseYAMLFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for basic key-value pairs and arrays
  const frontmatter = {};
  const lines = yamlContent.split('\n');
  let currentKey = null;
  let inArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for array continuation
    if (trimmed.startsWith('- ') && currentKey && inArray) {
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(
        trimmed
          .substring(2)
          .trim()
          .replace(/^["']|["']$/g, ''),
      );
      continue;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      currentKey = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value === '') {
        // Likely an array follows
        inArray = true;
        frontmatter[currentKey] = [];
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        frontmatter[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map((v) => v.trim().replace(/^["']|["']$/g, ''));
        inArray = false;
      } else {
        // Simple value
        frontmatter[currentKey] = value.replace(/^["']|["']$/g, '');
        inArray = false;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Extract hook sections from markdown body
 * @param {string} body - Markdown body content
 * @returns {{before: string|null, after: string|null, onError: string|null}} Hook sections
 */
function extractHookSections(body) {
  const hooks = {
    before: null,
    after: null,
    onError: null,
  };

  // Match ## Before, ## After, ## OnError sections
  const sectionRegex =
    /##\s+(Before|After|OnError)\s*\r?\n([\s\S]*?)(?=##\s+(?:Before|After|OnError)|$)/gi;
  let match;

  while ((match = sectionRegex.exec(body)) !== null) {
    const sectionName = match[1].toLowerCase();
    const content = match[2].trim();

    if (sectionName === 'before') hooks.before = content;
    else if (sectionName === 'after') hooks.after = content;
    else if (sectionName === 'onerror') hooks.onError = content;
  }

  return hooks;
}

/**
 * Wait for rate limit if necessary
 * @returns {Promise<void>}
 */
async function waitForRateLimit() {
  const now = Date.now();

  // Reset rate limit counter if reset time has passed
  if (now > rateLimitState.resetTime) {
    rateLimitState.remaining = 60;
    rateLimitState.resetTime = now + 60 * 60 * 1000; // 1 hour
  }

  // If we're out of requests, wait until reset
  if (rateLimitState.remaining <= 0) {
    const waitTime = rateLimitState.resetTime - now;
    if (waitTime > 0) {
      console.warn(`Rate limited. Waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // Enforce minimum 100ms between requests
  const timeSinceLastRequest = now - rateLimitState.lastRequest;
  if (timeSinceLastRequest < 100) {
    await new Promise((resolve) => setTimeout(resolve, 100 - timeSinceLastRequest));
  }

  rateLimitState.lastRequest = Date.now();
  rateLimitState.remaining--;
}

/**
 * Fetch skill from trusted source
 * @param {string} url - URL to fetch skill from
 * @returns {Promise<Object|null>} Parsed skill or null if untrusted/failed
 */
export async function fetchSkill(url) {
  // 1. Validate URL against whitelist
  if (!isTrustedSource(url)) {
    console.error(`Untrusted source rejected: ${url}`);
    return null;
  }

  try {
    // 2. Wait for rate limit if hitting GitHub API
    if (url.includes('api.github.com') || url.includes('githubusercontent.com')) {
      await waitForRateLimit();
    }

    // 3. Fetch content with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CMS-V2-SkillScraper/1.0',
        Accept: 'text/plain, application/json, text/markdown',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Failed to fetch skill: ${response.status} ${response.statusText}`);
      return null;
    }

    // Update rate limit info from headers
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetTime = response.headers.get('x-ratelimit-reset');
    if (remaining) rateLimitState.remaining = parseInt(remaining, 10);
    if (resetTime) rateLimitState.resetTime = parseInt(resetTime, 10) * 1000;

    const content = await response.text();

    // 4. Parse based on content type
    let skill;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json') || url.endsWith('.json')) {
      skill = JSON.parse(content);
      skill.source = url;
    } else {
      // Assume markdown
      skill = parseSkillMarkdown(content, url);
    }

    // 5. Calculate checksum
    skill.checksum = calculateChecksum(content);
    skill.fetchedAt = new Date().toISOString();

    // 6. Validate skill
    const validation = validateSkill(skill);
    if (!validation.valid) {
      console.error(`Invalid skill: ${validation.errors.join(', ')}`);
      return null;
    }

    return skill;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Fetch timeout for: ${url}`);
    } else {
      console.error(`Error fetching skill: ${error.message}`);
    }
    return null;
  }
}

/**
 * Parse markdown skill file into structured skill
 * Supports formats:
 * - GitHub agent .md files (like .github/agents/*.agent.md)
 * - Cursor rules files
 * - Claude SYSTEM_PROMPT format
 *
 * @param {string} content - Raw markdown content
 * @param {string} source - Source URL
 * @returns {Object} Structured skill object
 */
export function parseSkillMarkdown(content, source) {
  // Parse YAML frontmatter
  const { frontmatter, body } = parseYAMLFrontmatter(content);

  // Extract hook sections from body
  const hooks = extractHookSections(body);

  // Get instructions (body without hook sections)
  let instructions = body
    .replace(
      /##\s+(?:Before|After|OnError)\s*\r?\n[\s\S]*?(?=##\s+(?:Before|After|OnError)|$)/gi,
      '',
    )
    .trim();

  // Sanitize instructions
  const { sanitized, warnings } = sanitizeContent(instructions);
  instructions = sanitized;

  if (warnings.length > 0) {
    console.warn(`Sanitization warnings for ${source}:`, warnings);
  }

  // Build skill object
  const skill = {
    name: frontmatter.name || extractNameFromUrl(source),
    version: frontmatter.version || '1.0.0',
    description: frontmatter.description || extractDescriptionFromContent(body),
    triggers: Array.isArray(frontmatter.triggers)
      ? frontmatter.triggers
      : frontmatter.triggers
        ? [frontmatter.triggers]
        : [],
    instructions,
    hooks: {
      before: hooks.before ? sanitizeContent(hooks.before).sanitized : null,
      after: hooks.after ? sanitizeContent(hooks.after).sanitized : null,
      onError: hooks.onError ? sanitizeContent(hooks.onError).sanitized : null,
    },
    tools: Array.isArray(frontmatter.tools)
      ? frontmatter.tools
      : frontmatter.tools
        ? [frontmatter.tools]
        : [],
    source,
    fetchedAt: new Date().toISOString(),
    checksum: null, // Will be set by fetchSkill
  };

  // Handle Cursor rules format (no frontmatter, just instructions)
  if (Object.keys(frontmatter).length === 0 && source.includes('.cursorrules')) {
    skill.name = 'cursor-rules';
    skill.description = 'Cursor rules configuration';
    skill.triggers = ['code', 'edit', 'write'];
  }

  return skill;
}

/**
 * Extract skill name from URL
 * @param {string} url - Source URL
 * @returns {string} Extracted name
 */
function extractNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const filename = pathParts[pathParts.length - 1];

    // Remove extension and .agent suffix
    return filename
      .replace(/\.(md|json|txt)$/i, '')
      .replace(/\.agent$/i, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-');
  } catch {
    return 'unknown-skill';
  }
}

/**
 * Extract description from markdown content (first paragraph)
 * @param {string} content - Markdown content
 * @returns {string} Extracted description
 */
function extractDescriptionFromContent(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headers and empty lines
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
      return trimmed.substring(0, 200);
    }
  }
  return 'No description available';
}

/**
 * Search for skills on GitHub
 * @param {string} query - Search query
 * @returns {Promise<Array<{name: string, url: string, description: string}>>} List of skill results
 */
export async function searchGitHubSkills(query) {
  const results = [];

  // Build GitHub search queries
  const searches = [
    { q: `${query} filename:*.agent.md`, desc: 'Agent markdown files' },
    { q: `${query} filename:.cursorrules`, desc: 'Cursor rules files' },
    { q: `topic:ai-agent-skills ${query}`, desc: 'Repos with agent skills topic' },
  ];

  for (const search of searches) {
    try {
      await waitForRateLimit();

      const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(search.q)}&per_page=10`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CMS-V2-SkillScraper/1.0',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        console.warn(`GitHub search failed for "${search.q}": ${response.status}`);
        continue;
      }

      // Update rate limit state
      const remaining = response.headers.get('x-ratelimit-remaining');
      const resetTime = response.headers.get('x-ratelimit-reset');
      if (remaining) rateLimitState.remaining = parseInt(remaining, 10);
      if (resetTime) rateLimitState.resetTime = parseInt(resetTime, 10) * 1000;

      const data = await response.json();

      for (const item of data.items || []) {
        // Convert to raw URL
        const rawUrl = item.html_url
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');

        results.push({
          name: item.name,
          url: rawUrl,
          description: `${item.repository.full_name}: ${item.path}`,
          repository: item.repository.full_name,
          path: item.path,
        });
      }
    } catch (error) {
      console.error(`Error searching GitHub: ${error.message}`);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Validate skill object against schema
 * @param {Object} skill - Skill to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateSkill(skill) {
  const errors = [];

  // Required string fields
  if (!skill.name || typeof skill.name !== 'string') {
    errors.push('Missing or invalid name');
  }

  if (!skill.version || !isValidSemver(skill.version)) {
    // Auto-fix version if possible
    if (!skill.version) {
      skill.version = '1.0.0';
    } else {
      errors.push(`Invalid semver version: ${skill.version}`);
    }
  }

  if (typeof skill.description !== 'string') {
    skill.description = '';
  }

  // Triggers must be array
  if (!Array.isArray(skill.triggers)) {
    if (skill.triggers) {
      skill.triggers = [String(skill.triggers)];
    } else {
      skill.triggers = [];
    }
  }

  // Instructions should be string
  if (skill.instructions && typeof skill.instructions !== 'string') {
    errors.push('Instructions must be a string');
  }

  // Hooks should be object with string values
  if (skill.hooks) {
    if (typeof skill.hooks !== 'object') {
      errors.push('Hooks must be an object');
    } else {
      for (const [key, value] of Object.entries(skill.hooks)) {
        if (value !== null && typeof value !== 'string') {
          errors.push(`Hook ${key} must be a string or null`);
        }
      }
    }
  } else {
    skill.hooks = { before: null, after: null, onError: null };
  }

  // Tools must be array of strings
  if (!Array.isArray(skill.tools)) {
    skill.tools = skill.tools ? [String(skill.tools)] : [];
  }

  // Source should be valid URL
  if (skill.source && !isTrustedSource(skill.source)) {
    errors.push(`Source URL is not from trusted domain: ${skill.source}`);
  }

  // Additional security checks on instructions
  if (skill.instructions) {
    const dangerousCheck = DANGEROUS_PATTERNS.some((p) => p.test(skill.instructions));
    if (dangerousCheck) {
      errors.push('Instructions contain potentially dangerous patterns');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get current rate limit status
 * @returns {{remaining: number, resetTime: Date}} Rate limit status
 */
export function getRateLimitStatus() {
  return {
    remaining: rateLimitState.remaining,
    resetTime: new Date(rateLimitState.resetTime),
  };
}

// Default export for convenience
export default {
  fetchSkill,
  parseSkillMarkdown,
  searchGitHubSkills,
  validateSkill,
  sanitizeContent,
  isTrustedSource,
  calculateChecksum,
  parseYAMLFrontmatter,
  getRateLimitStatus,
  TRUSTED_SOURCES,
  SKILL_SCHEMA,
};
