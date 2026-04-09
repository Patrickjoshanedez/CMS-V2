/**
 * Ability Manager
 * - Manages skill lifecycle (install, update, remove)
 * - Handles instruction injection into agents
 * - Provides skill discovery and search
 *
 * @module orchestrator/ability-manager
 */

import {
  fetchSkill,
  validateSkill,
  searchGitHubSkills,
  calculateChecksum,
  isTrustedSource,
  TRUSTED_SOURCES,
} from './skill-scraper.js';

import { registerHook, unregisterSkillHooks, HOOK_TYPES } from './hook-enforcer.js';

import { persistFact, retrieveFromTier, TIERS } from './memory-tiers.js';
import fs from 'fs/promises';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, 'ability-registry.json');
const LOCK_FILE = path.join(__dirname, 'ability-registry.lock');
const LOCK_TIMEOUT = 5000; // 5 seconds max wait for lock

// In-memory cache of registry
let registryCache = null;
let registryLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Acquire lock for registry writes to prevent race conditions.
 * CONCURRENCY: Implements atomic file locking to prevent TOCTOU race conditions.
 *
 * @returns {Promise<boolean>} True if lock acquired
 */
async function acquireLock() {
  const startTime = Date.now();
  const lockData = JSON.stringify({ pid: process.pid, timestamp: Date.now() });

  while (Date.now() - startTime < LOCK_TIMEOUT) {
    try {
      // SECURITY: Use 'wx' flag for atomic exclusive create - prevents TOCTOU race
      await fs.writeFile(LOCK_FILE, lockData, { flag: 'wx' });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lock exists, check if stale (older than 30 seconds)
        try {
          const existingLock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
          if (Date.now() - existingLock.timestamp > 30000) {
            // Stale lock, remove it
            try {
              unlinkSync(LOCK_FILE);
            } catch {
              // Another process removed it, that's fine
            }
          }
        } catch {
          // Lock file corrupted or being written, retry
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        throw error;
      }
    }
  }

  return false; // Timeout
}

/**
 * Release lock after registry write.
 */
function releaseLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      unlinkSync(LOCK_FILE);
    }
  } catch (error) {
    console.warn(`[AbilityManager] Failed to release lock: ${error.message}`);
  }
}

/**
 * Load the ability registry from disk
 * @param {boolean} [forceReload=false] - Force reload from disk
 * @returns {Promise<Object>} Registry object
 */
async function loadRegistry(forceReload = false) {
  const now = Date.now();

  // Return cached if still valid
  if (!forceReload && registryCache && now - registryLoadTime < CACHE_TTL) {
    return registryCache;
  }

  try {
    const content = await fs.readFile(REGISTRY_PATH, 'utf-8');
    registryCache = JSON.parse(content);
    registryLoadTime = now;
    return registryCache;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Create default registry
      const defaultRegistry = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        skills: [],
        trustedSources: TRUSTED_SOURCES.map((domain) => ({
          name: domain,
          pattern: `^https://${domain.replace('.', '\\.')}/`,
          autoFetch: false,
        })),
        hooks: {
          builtin: ['tokenBudgetCheck', 'hllmBlacklistCheck', 'selfAuditCheck'],
          custom: [],
        },
        instructions: {
          global: [],
          perAgent: {},
        },
        metadata: {
          schemaVersion: '1.0.0',
          createdAt: new Date().toISOString(),
          totalSkillsInstalled: 0,
          totalHooksActive: 0,
        },
      };

      await saveRegistry(defaultRegistry);
      registryCache = defaultRegistry;
      registryLoadTime = now;
      return registryCache;
    }
    throw error;
  }
}

/**
 * Save the registry to disk with atomic write protection.
 * CONCURRENCY: Uses file locking to prevent concurrent write conflicts.
 *
 * @param {Object} registry - Registry to save
 * @returns {Promise<void>}
 */
async function saveRegistry(registry) {
  registry.lastUpdated = new Date().toISOString();

  // Acquire lock before writing
  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    throw new Error('Failed to acquire registry lock within timeout');
  }

  try {
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');

    registryCache = registry;
    registryLoadTime = Date.now();
  } finally {
    releaseLock();
  }
}

/**
 * Install a skill from URL
 * @param {string} url - URL to fetch skill from
 * @param {Object} [options] - Installation options
 * @param {boolean} [options.force=false] - Force reinstall if already exists
 * @param {boolean} [options.registerHooks=true] - Whether to register skill hooks
 * @returns {Promise<{success: boolean, skill?: Object, error?: string}>}
 */
export async function installSkill(url, options = {}) {
  const { force = false, registerHooks = true } = options;

  console.log(`[AbilityManager] Installing skill from: ${url}`);

  // Validate URL
  if (!isTrustedSource(url)) {
    return {
      success: false,
      error: `URL is not from a trusted source. Allowed: ${TRUSTED_SOURCES.join(', ')}`,
    };
  }

  try {
    // Fetch and parse skill
    const skill = await fetchSkill(url);

    if (!skill) {
      return {
        success: false,
        error: 'Failed to fetch or parse skill from URL',
      };
    }

    // Validate skill
    const validation = validateSkill(skill);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid skill: ${validation.errors.join(', ')}`,
      };
    }

    // Load registry
    const registry = await loadRegistry();

    // Check if already installed
    const existingIndex = registry.skills.findIndex((s) => s.name === skill.name);

    if (existingIndex >= 0 && !force) {
      const existing = registry.skills[existingIndex];

      // Check if it's the same version
      if (existing.checksum === skill.checksum) {
        return {
          success: true,
          skill: existing,
          message: 'Skill already installed with same content',
        };
      }

      return {
        success: false,
        error: `Skill "${skill.name}" already installed. Use force=true to update.`,
        existingVersion: existing.version,
        newVersion: skill.version,
      };
    }

    // Unregister existing hooks if updating
    if (existingIndex >= 0) {
      unregisterSkillHooks(skill.name);
    }

    // Register hooks from skill
    const registeredHooks = [];

    if (registerHooks) {
      if (skill.hooks.before) {
        const hookId = registerHook(HOOK_TYPES.BEFORE_AGENT, skill.name, skill.hooks.before, 100);
        registeredHooks.push(hookId);
      }

      if (skill.hooks.after) {
        const hookId = registerHook(HOOK_TYPES.AFTER_AGENT, skill.name, skill.hooks.after, 100);
        registeredHooks.push(hookId);
      }

      if (skill.hooks.onError) {
        const hookId = registerHook(HOOK_TYPES.ON_ERROR, skill.name, skill.hooks.onError, 100);
        registeredHooks.push(hookId);
      }
    }

    // Add metadata
    skill.installedAt = new Date().toISOString();
    skill.registeredHooks = registeredHooks;

    // SECURITY: Sanitize skill object to prevent prototype pollution
    // Use allowlist approach when persisting
    const safeFact = {
      name: skill.name,
      version: skill.version,
      description: skill.description,
      source: skill.source,
      fetchedAt: skill.fetchedAt,
      installedAt: skill.installedAt,
      triggers: skill.triggers,
      tools: skill.tools,
    };

    // Update registry - SECURITY: Use sanitized version to prevent prototype pollution
    if (existingIndex >= 0) {
      registry.skills[existingIndex] = safeFact;
    } else {
      registry.skills.push(safeFact);
    }

    registry.metadata.totalSkillsInstalled = registry.skills.length;
    registry.metadata.lastSkillUpdate = new Date().toISOString();

    // Add to custom hooks list
    if (registeredHooks.length > 0) {
      registry.hooks.custom = registry.hooks.custom || [];
      registry.hooks.custom.push(...registeredHooks);
      registry.hooks.custom = [...new Set(registry.hooks.custom)]; // Dedupe
    }

    await saveRegistry(registry);

    // Persist to long-term memory (using sanitized fact)
    await persistFact(`skill:${skill.name}`, safeFact, { tier: TIERS.LONG_TERM });

    console.log(`[AbilityManager] Successfully installed skill: ${skill.name} v${skill.version}`);

    return {
      success: true,
      skill,
      registeredHooks: registeredHooks.length,
    };
  } catch (error) {
    console.error(`[AbilityManager] Install error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Uninstall a skill
 * @param {string} skillName - Name of skill to uninstall
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function uninstallSkill(skillName) {
  console.log(`[AbilityManager] Uninstalling skill: ${skillName}`);

  try {
    const registry = await loadRegistry();

    const skillIndex = registry.skills.findIndex((s) => s.name === skillName);

    if (skillIndex < 0) {
      return {
        success: false,
        error: `Skill "${skillName}" is not installed`,
      };
    }

    const skill = registry.skills[skillIndex];

    // Unregister hooks
    const removedHooks = unregisterSkillHooks(skillName);

    // Remove from registry
    registry.skills.splice(skillIndex, 1);

    // Remove hook IDs from custom hooks
    if (skill.registeredHooks && registry.hooks.custom) {
      registry.hooks.custom = registry.hooks.custom.filter(
        (id) => !skill.registeredHooks.includes(id),
      );
    }

    registry.metadata.totalSkillsInstalled = registry.skills.length;

    await saveRegistry(registry);

    console.log(`[AbilityManager] Uninstalled skill: ${skillName} (removed ${removedHooks} hooks)`);

    return {
      success: true,
      removedHooks,
    };
  } catch (error) {
    console.error(`[AbilityManager] Uninstall error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update all installed skills from their sources
 * @param {Object} [options] - Update options
 * @param {boolean} [options.force=false] - Force update even if checksum matches
 * @param {boolean} [options.parallel=false] - Fetch skills in parallel
 * @returns {Promise<{updated: string[], failed: string[], unchanged: string[]}>}
 */
export async function updateSkills(options = {}) {
  const { force = false, parallel = false } = options;

  console.log(`[AbilityManager] Updating all skills...`);

  const registry = await loadRegistry();
  const results = {
    updated: [],
    failed: [],
    unchanged: [],
  };

  const updateOne = async (skill) => {
    try {
      const result = await installSkill(skill.source, { force, registerHooks: true });

      if (result.success) {
        if (result.message?.includes('same content')) {
          results.unchanged.push(skill.name);
        } else {
          results.updated.push(skill.name);
        }
      } else {
        results.failed.push({ name: skill.name, error: result.error });
      }
    } catch (error) {
      results.failed.push({ name: skill.name, error: error.message });
    }
  };

  if (parallel) {
    await Promise.all(registry.skills.map(updateOne));
  } else {
    for (const skill of registry.skills) {
      await updateOne(skill);
    }
  }

  console.log(
    `[AbilityManager] Update complete: ${results.updated.length} updated, ${results.unchanged.length} unchanged, ${results.failed.length} failed`,
  );

  return results;
}

/**
 * Get instructions to inject for a specific agent
 * Combines global instructions + agent-specific + skill triggers
 * @param {string} agentName - Name of the agent
 * @param {Object} [context] - Context for trigger matching
 * @returns {Promise<{instructions: string[], triggers: Array<{skill: string, trigger: string}>}>}
 */
export async function getAgentInstructions(agentName, context = {}) {
  const registry = await loadRegistry();
  const instructions = [];
  const matchedTriggers = [];

  // Add global instructions
  for (const instr of registry.instructions.global || []) {
    if (instr.enabled !== false) {
      instructions.push({
        source: 'global',
        id: instr.id,
        content: instr.content,
        priority: instr.priority || 100,
      });
    }
  }

  // Add agent-specific instructions
  const agentInstructions = registry.instructions.perAgent?.[agentName] || [];
  for (const instr of agentInstructions) {
    if (instr.enabled !== false) {
      instructions.push({
        source: `agent:${agentName}`,
        id: instr.id,
        content: instr.content,
        priority: instr.priority || 100,
      });
    }
  }

  // Check skill triggers against context
  const contextStr = JSON.stringify(context).toLowerCase();
  const taskStr = (context.task || context.prompt || '').toLowerCase();

  for (const skill of registry.skills) {
    for (const trigger of skill.triggers || []) {
      const triggerLower = trigger.toLowerCase();

      // Check if trigger matches context or task
      if (contextStr.includes(triggerLower) || taskStr.includes(triggerLower)) {
        instructions.push({
          source: `skill:${skill.name}`,
          id: `${skill.name}-trigger`,
          content: skill.instructions,
          priority: 150, // Skills come after explicit instructions
        });

        matchedTriggers.push({
          skill: skill.name,
          trigger,
          matched: true,
        });

        break; // Only add skill instructions once
      }
    }
  }

  // Sort by priority
  instructions.sort((a, b) => a.priority - b.priority);

  return {
    instructions: instructions.map((i) => i.content),
    triggers: matchedTriggers,
    metadata: {
      totalInstructions: instructions.length,
      sources: [...new Set(instructions.map((i) => i.source))],
    },
  };
}

/**
 * Discover new skills from GitHub
 * @param {string} [topic='ai-agent-skills'] - Topic to search for
 * @returns {Promise<Array<{name: string, url: string, description: string, trusted: boolean}>>}
 */
export async function discoverSkills(topic = 'ai-agent-skills') {
  console.log(`[AbilityManager] Discovering skills for topic: ${topic}`);

  try {
    const results = await searchGitHubSkills(topic);

    // Enrich with trust status and installation status
    const registry = await loadRegistry();
    const installedNames = new Set(registry.skills.map((s) => s.name));

    const enrichedResults = results.map((result) => ({
      ...result,
      trusted: isTrustedSource(result.url),
      installed: installedNames.has(result.name?.replace(/\.(md|json)$/i, '')),
    }));

    // Sort: trusted first, then by name
    enrichedResults.sort((a, b) => {
      if (a.trusted !== b.trusted) return b.trusted - a.trusted;
      return a.name.localeCompare(b.name);
    });

    console.log(
      `[AbilityManager] Discovered ${enrichedResults.length} skills (${enrichedResults.filter((r) => r.trusted).length} from trusted sources)`,
    );

    return enrichedResults;
  } catch (error) {
    console.error(`[AbilityManager] Discovery error: ${error.message}`);
    return [];
  }
}

/**
 * List installed skills
 * @param {Object} [options] - List options
 * @param {boolean} [options.includeInstructions=false] - Include full instructions
 * @returns {Promise<Array<Object>>}
 */
export async function listSkills(options = {}) {
  const { includeInstructions = false } = options;

  const registry = await loadRegistry();

  return registry.skills.map((skill) => {
    const base = {
      name: skill.name,
      version: skill.version,
      description: skill.description,
      triggers: skill.triggers,
      tools: skill.tools,
      source: skill.source,
      installedAt: skill.installedAt,
      fetchedAt: skill.fetchedAt,
      hasHooks: {
        before: !!skill.hooks?.before,
        after: !!skill.hooks?.after,
        onError: !!skill.hooks?.onError,
      },
    };

    if (includeInstructions) {
      base.instructions = skill.instructions;
      base.hooks = skill.hooks;
    }

    return base;
  });
}

/**
 * Export a skill to shareable format
 * @param {string} skillName - Name of skill to export
 * @returns {Promise<{success: boolean, content?: string, error?: string}>}
 */
export async function exportSkill(skillName) {
  const registry = await loadRegistry();

  const skill = registry.skills.find((s) => s.name === skillName);

  if (!skill) {
    return {
      success: false,
      error: `Skill "${skillName}" not found`,
    };
  }

  // Generate markdown format
  const markdown = `---
name: ${skill.name}
version: ${skill.version}
description: ${skill.description}
triggers:
${skill.triggers.map((t) => `  - ${t}`).join('\n')}
tools:
${skill.tools.map((t) => `  - ${t}`).join('\n')}
---

${skill.instructions}

${skill.hooks?.before ? `## Before\n\n${skill.hooks.before}\n\n` : ''}${skill.hooks?.after ? `## After\n\n${skill.hooks.after}\n\n` : ''}${skill.hooks?.onError ? `## OnError\n\n${skill.hooks.onError}\n\n` : ''}
<!-- 
Exported from CMS-V2 Ability Manager
Source: ${skill.source}
Checksum: ${skill.checksum}
Exported: ${new Date().toISOString()}
-->
`.trim();

  return {
    success: true,
    content: markdown,
    filename: `${skillName}.agent.md`,
  };
}

/**
 * Add a global instruction
 * @param {string} id - Unique instruction ID
 * @param {string} content - Instruction content
 * @param {number} [priority=100] - Instruction priority
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addGlobalInstruction(id, content, priority = 100) {
  const registry = await loadRegistry();

  // Check for duplicate ID
  if (registry.instructions.global.some((i) => i.id === id)) {
    return {
      success: false,
      error: `Instruction with ID "${id}" already exists`,
    };
  }

  registry.instructions.global.push({
    id,
    content,
    priority,
    enabled: true,
    addedAt: new Date().toISOString(),
  });

  await saveRegistry(registry);

  return { success: true };
}

/**
 * Add an agent-specific instruction
 * @param {string} agentName - Name of agent
 * @param {string} id - Unique instruction ID
 * @param {string} content - Instruction content
 * @param {number} [priority=100] - Instruction priority
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function addAgentInstruction(agentName, id, content, priority = 100) {
  const registry = await loadRegistry();

  registry.instructions.perAgent[agentName] = registry.instructions.perAgent[agentName] || [];

  // Check for duplicate ID
  if (registry.instructions.perAgent[agentName].some((i) => i.id === id)) {
    return {
      success: false,
      error: `Instruction with ID "${id}" already exists for agent "${agentName}"`,
    };
  }

  registry.instructions.perAgent[agentName].push({
    id,
    content,
    priority,
    enabled: true,
    addedAt: new Date().toISOString(),
  });

  await saveRegistry(registry);

  return { success: true };
}

/**
 * Remove an instruction by ID
 * @param {string} id - Instruction ID
 * @param {string} [agentName] - Agent name (for agent-specific instructions)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function removeInstruction(id, agentName = null) {
  const registry = await loadRegistry();

  if (agentName) {
    const instructions = registry.instructions.perAgent[agentName];
    if (!instructions) {
      return { success: false, error: `No instructions for agent "${agentName}"` };
    }

    const index = instructions.findIndex((i) => i.id === id);
    if (index < 0) {
      return { success: false, error: `Instruction "${id}" not found` };
    }

    instructions.splice(index, 1);
  } else {
    const index = registry.instructions.global.findIndex((i) => i.id === id);
    if (index < 0) {
      return { success: false, error: `Global instruction "${id}" not found` };
    }

    registry.instructions.global.splice(index, 1);
  }

  await saveRegistry(registry);

  return { success: true };
}

/**
 * Get registry statistics
 * @returns {Promise<Object>}
 */
export async function getRegistryStats() {
  const registry = await loadRegistry();

  return {
    version: registry.version,
    lastUpdated: registry.lastUpdated,
    skills: {
      total: registry.skills.length,
      names: registry.skills.map((s) => s.name),
      byTriggerCount: registry.skills.reduce((acc, s) => {
        acc[s.name] = s.triggers?.length || 0;
        return acc;
      }, {}),
    },
    hooks: {
      builtin: registry.hooks.builtin?.length || 0,
      custom: registry.hooks.custom?.length || 0,
      disabled: registry.hooks.disabled?.length || 0,
    },
    instructions: {
      global: registry.instructions.global?.length || 0,
      perAgent: Object.keys(registry.instructions.perAgent || {}).reduce((acc, agent) => {
        acc[agent] = registry.instructions.perAgent[agent]?.length || 0;
        return acc;
      }, {}),
    },
    trustedSources: registry.trustedSources?.length || 0,
    metadata: registry.metadata,
  };
}

// Default export
export default {
  installSkill,
  uninstallSkill,
  updateSkills,
  getAgentInstructions,
  discoverSkills,
  listSkills,
  exportSkill,
  addGlobalInstruction,
  addAgentInstruction,
  removeInstruction,
  getRegistryStats,
  loadRegistry,
  saveRegistry,
};
