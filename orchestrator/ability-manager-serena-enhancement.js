/**
 * Serena-Enhanced Ability Manager Integration
 *
 * This module shows how to enhance the ability manager with Serena's
 * capabilities for dynamic ability discovery, registration, and caching.
 *
 * @module orchestrator/ability-manager-serena-enhancement
 * @version 1.0.0
 */

import {
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
} from './serena-integration.js';

/**
 * Enhanced Ability Manager with Serena Integration
 *
 * Extends basic ability management with:
 * - Automatic symbol-based ability discovery
 * - Cross-file dependency resolution
 * - Pattern-based hook registration
 * - Smart ability caching and validation
 */
class SerenaEnhancedAbilityManager {
  constructor() {
    this.serena = new SerenaIntegrationManager();
    this.abilityDiscovery = new SerenaAbilityDiscovery(this.serena);
    
    // Cache for discovered abilities
    this.abilityCache = new Map();
    this.hookRegistry = new Map();
    this.errorHandlers = new Map();
  }

  /**
   * Discover and register all abilities from a directory
   * Scans for exported functions, classes, and hooks
   *
   * @param {string} dirPath - Directory path to scan
   * @param {Object} options - Discovery options
   * @returns {Promise<Object>} Discovered abilities with metadata
   */
  async discoverAbilitiesFromDirectory(dirPath, options = {}) {
    const abilities = {
      functions: [],
      classes: [],
      hooks: [],
      utilities: [],
      discovered: 0,
      errors: [],
    };

    try {
      // Find all files in directory
      const indexFiles = [
        `${dirPath}/index.ts`,
        `${dirPath}/index.js`,
        `${dirPath}/main.ts`,
        `${dirPath}/main.js`,
      ];

      for (const indexFile of indexFiles) {
        try {
          const symbols = await this.serena.getSymbolsOverview(indexFile, 1);
          if (symbols.symbols) {
            for (const symbol of symbols.symbols) {
              const ability = {
                name: symbol.name,
                type: symbol.type, // function, class, interface, etc.
                file: indexFile,
                exported: symbol.exported !== false,
                metadata: symbol.metadata || {},
              };

              // Categorize by type
              if (symbol.type === 'function' || symbol.type === 'method') {
                if (symbol.name.startsWith('use')) {
                  abilities.hooks.push(ability);
                } else {
                  abilities.functions.push(ability);
                }
              } else if (symbol.type === 'class') {
                abilities.classes.push(ability);
              } else {
                abilities.utilities.push(ability);
              }

              // Cache the ability
              this.abilityCache.set(
                `${dirPath}::${symbol.name}`,
                ability
              );

              abilities.discovered++;
            }
          }
        } catch (err) {
          // Silently skip missing files
        }
      }

      // Post-process to enhance abilities with references
      if (options.includeReferences) {
        for (const ability of [
          ...abilities.functions,
          ...abilities.classes,
          ...abilities.hooks,
        ]) {
          try {
            const refs = await this.serena.findReferencingSymbols(
              ability.name,
              ability.file
            );
            ability.referenceCount = refs.count || 0;
            ability.isInternal =
              refs.internalReferences >
              refs.externalReferences;
          } catch (err) {
            // Silently handle
          }
        }
      }

      return abilities;
    } catch (err) {
      abilities.errors.push(err.message);
      return abilities;
    }
  }

  /**
   * Discover and register all hooks (listeners, event handlers, etc.)
   * Uses pattern matching to find hook-like patterns across codebase
   *
   * @returns {Promise<Object>} Discovered hooks with implementations
   */
  async discoverAndRegisterHooks() {
    try {
      const hooksSearch = await this.abilityDiscovery.discoverHooks();

      // Parse hook patterns
      const hooks = {
        eventEmitters: [],
        listeners: [],
        subscribers: [],
        handlers: [],
        discovered: 0,
      };

      if (hooksSearch.results) {
        for (const result of hooksSearch.results) {
          const hook = {
            pattern: result.pattern,
            file: result.file,
            context: result.context,
            weight: this._calculateHookWeight(result),
          };

          // Categorize by pattern
          if (result.pattern.includes('emit')) {
            hooks.eventEmitters.push(hook);
          } else if (result.pattern.includes('on')) {
            hooks.listeners.push(hook);
          } else if (result.pattern.includes('subscribe')) {
            hooks.subscribers.push(hook);
          } else {
            hooks.handlers.push(hook);
          }

          // Register in hook registry
          const hookId = `${result.file}::${result.pattern}`;
          this.hookRegistry.set(hookId, hook);

          hooks.discovered++;
        }
      }

      // Sort by weight (more significant first)
      const sortByWeight = (arr) => arr.sort((a, b) => b.weight - a.weight);
      hooks.eventEmitters = sortByWeight(hooks.eventEmitters);
      hooks.listeners = sortByWeight(hooks.listeners);
      hooks.subscribers = sortByWeight(hooks.subscribers);
      hooks.handlers = sortByWeight(hooks.handlers);

      return hooks;
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Discover all error handling patterns and implementations
   * Useful for understanding error flow and adding new handlers
   *
   * @returns {Promise<Object>} Error handlers and patterns
   */
  async discoverErrorHandlers() {
    try {
      const handlersSearch = await this.abilityDiscovery.discoverErrorHandlers();

      const handlers = {
        tryBlocks: [],
        catchBlocks: [],
        errorBoundaries: [],
        customHandlers: [],
        discovered: 0,
      };

      if (handlersSearch.results) {
        for (const result of handlersSearch.results) {
          const handler = {
            pattern: result.pattern,
            file: result.file,
            context: result.context,
          };

          // Categorize
          if (result.pattern.includes('try')) {
            handlers.tryBlocks.push(handler);
          } else if (result.pattern.includes('catch')) {
            handlers.catchBlocks.push(handler);
          } else if (result.pattern.includes('ErrorBoundary')) {
            handlers.errorBoundaries.push(handler);
          } else {
            handlers.customHandlers.push(handler);
          }

          // Register
          const handlerId = `${result.file}::${result.pattern}`;
          this.errorHandlers.set(handlerId, handler);

          handlers.discovered++;
        }
      }

      return handlers;
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Validate an ability exists and is properly exported
   *
   * @param {string} abilityName - Name of ability to validate
   * @param {string} filePath - File containing the ability
   * @returns {Promise<boolean>} True if valid and exported
   */
  async validateAbility(abilityName, filePath) {
    try {
      const symbol = await this.serena.findSymbol(abilityName, filePath, false);
      return symbol && !symbol.error && symbol.exported !== false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get ability dependencies
   * Returns all symbols/files that a given ability depends on
   *
   * @param {string} abilityName - Ability to analyze
   * @param {string} filePath - File containing the ability
   * @returns {Promise<Object>} Dependency graph
   */
  async getAbilityDependencies(abilityName, filePath) {
    try {
      // Find the symbol
      const symbol = await this.serena.findSymbol(
        abilityName,
        filePath,
        true // Include body for dependency analysis
      );

      if (!symbol || symbol.error) {
        return { error: 'Ability not found' };
      }

      // Analyze body for imports/requires
      const dependencies = {
        internal: [], // Dependencies within project
        external: [], // Dependencies from node_modules
        symbols: [], // Other project symbols used
      };

      // Pattern matching for imports
      const importPattern = /import\s+(?:{[^}]*}|.*?)\s+from\s+['"](.+?)['"]/g;
      const requirePattern = /require\s*\(\s*['"](.+?)['"]\s*\)/g;

      let match;
      while ((match = importPattern.exec(symbol.body))) {
        const dep = match[1];
        if (dep.startsWith('.')) {
          dependencies.internal.push(dep);
        } else {
          dependencies.external.push(dep);
        }
      }

      // Reset regex
      requirePattern.lastIndex = 0;
      while ((match = requirePattern.exec(symbol.body))) {
        const dep = match[1];
        if (dep.startsWith('.')) {
          dependencies.internal.push(dep);
        } else {
          dependencies.external.push(dep);
        }
      }

      return {
        ability: abilityName,
        file: filePath,
        dependencies,
        complexity: this._estimateComplexity(symbol.body),
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Find all abilities that depend on a given ability
   * Reverse dependency lookup
   *
   * @param {string} abilityName - Ability to find dependents of
   * @param {string} filePath - File containing the ability
   * @returns {Promise<Object>} Dependents and usage patterns
   */
  async findAbilityDependents(abilityName, filePath) {
    try {
      const references = await this.serena.findReferencingSymbols(
        abilityName,
        filePath
      );

      if (references.error || !references.references) {
        return { dependents: [], count: 0 };
      }

      const dependents = references.references.map((ref) => ({
        symbol: ref.symbol,
        file: ref.file,
        usage: ref.context,
        type: ref.type, // function call, type reference, etc.
      }));

      return {
        ability: abilityName,
        dependents,
        count: dependents.length,
        impact: this._calculateImpact(dependents),
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Get statistics about discovered abilities
   *
   * @returns {Object} Ability statistics
   */
  getStats() {
    const cacheSize = this.abilityCache.size;
    const hooksSize = this.hookRegistry.size;
    const handlersSize = this.errorHandlers.size;

    return {
      totalAbilitiesCached: cacheSize,
      totalHooksRegistered: hooksSize,
      totalErrorHandlers: handlersSize,
      cacheSizeKB: (cacheSize * 0.5).toFixed(2), // Rough estimate
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Clear all caches and rediscover
   *
   * @returns {Promise<Object>} Fresh discovery results
   */
  async refreshAllAbilities() {
    this.abilityCache.clear();
    this.hookRegistry.clear();
    this.errorHandlers.clear();

    return {
      abilitiesCleared: this.abilityCache.size,
      hooksCleared: this.hookRegistry.size,
      handlersCleared: this.errorHandlers.size,
      readyForRediscovery: true,
    };
  }

  // Helper methods

  /**
   * Calculate weight/importance of a hook
   * Based on pattern match count and specificity
   * @private
   */
  _calculateHookWeight(result) {
    let weight = 0;
    if (result.context && result.context.length > 0) weight += 10;
    if (result.pattern.length > 20) weight += 5; // More specific pattern
    if (result.pattern.includes('async')) weight += 5; // Async hooks
    return weight;
  }

  /**
   * Estimate code complexity
   * @private
   */
  _estimateComplexity(code) {
    if (!code) return 0;
    const cyclomatic = (code.match(/if|else|for|while|switch|catch/g) || [])
      .length;
    const nesting = (code.match(/\{/g) || []).length;
    return {
      cyclomatic,
      nesting,
      estimate: cyclomatic + nesting / 2,
    };
  }

  /**
   * Calculate impact of ability removal
   * @private
   */
  _calculateImpact(dependents) {
    if (dependents.length === 0) return 'low';
    if (dependents.length <= 3) return 'medium';
    if (dependents.length <= 10) return 'high';
    return 'critical';
  }
}

/**
 * Integration helper: Load discovered abilities into agent capabilities
 *
 * @param {Object} agent - Agent to enhance
 * @param {SerenaEnhancedAbilityManager} abilityManager - Ability manager
 * @returns {Promise<void>}
 */
export async function integrateAbilitiesIntoAgent(agent, abilityManager) {
  const abilities = abilityManager.abilityCache;

  // Register each cached ability as a capability
  for (const [id, ability] of abilities.entries()) {
    agent.registerCapability(ability.name, {
      description: `Ability: ${ability.name}`,
      type: ability.type,
      file: ability.file,
      cachePath: id,
    });
  }

  console.log(
    `Integrated ${abilities.size} abilities into ${agent.name} agent`
  );
}

export { SerenaEnhancedAbilityManager };
export default SerenaEnhancedAbilityManager;
