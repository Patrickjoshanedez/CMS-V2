/**
 * Serena Integration Module
 *
 * Bridges orchestrator capabilities with Serena's semantic code exploration,
 * symbol management, and intelligent pattern searching.
 *
 * Provides:
 * - Symbol-aware code navigation and lookup
 * - Intelligent pattern matching and code discovery
 * - Symbol refactoring and safe deletion
 * - Lesson storage and retrieval with code context
 * - Codebase structure analysis and visualization
 *
 * @module orchestrator/serena-integration
 * @version 1.0.0
 */

/**
 * Serena Integration Manager
 * Handles all interactions with Serena MCP server
 */
class SerenaIntegrationManager {
  constructor() {
    this.mcpToolPrefix = 'mcp_oraios_serena_';
    this.symbolCache = new Map();
    this.patternCache = new Map();
    this.codebaseStructure = null;
  }

  /**
   * Get overview of symbols in a specific file
   * @param {string} relativePath - Path relative to project root
   * @param {number} depth - Depth of symbol hierarchy to retrieve
   * @returns {Promise<Object>} Symbol overview with hierarchical structure
   */
  async getSymbolsOverview(relativePath, depth = 1) {
    const cacheKey = `symbols:${relativePath}:${depth}`;
    if (this.symbolCache.has(cacheKey)) {
      return this.symbolCache.get(cacheKey);
    }

    // This would be called by the agent using:
    // mcp_oraios_serena_get_symbols_overview tool with relative_path and depth
    return {
      tool: 'mcp_oraios_serena_get_symbols_overview',
      params: { relative_path: relativePath, depth: depth },
      cacheKey: cacheKey,
    };
  }

  /**
   * Find a specific symbol by name pattern
   * @param {string} namePathPattern - Symbol name path pattern (e.g., "ClassName/methodName")
   * @param {string} relativePath - File path containing the symbol
   * @param {boolean} includeBody - Whether to include symbol body content
   * @returns {Promise<Object>} Symbol details with location and content
   */
  async findSymbol(namePathPattern, relativePath, includeBody = false) {
    const cacheKey = `symbol:${namePathPattern}:${relativePath}`;
    if (this.symbolCache.has(cacheKey) && !includeBody) {
      return this.symbolCache.get(cacheKey);
    }

    return {
      tool: 'mcp_oraios_serena_find_symbol',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
        include_body: includeBody,
      },
      cacheKey: cacheKey,
    };
  }

  /**
   * Find all symbols that reference a given symbol
   * @param {string} namePathPattern - Symbol to find references for
   * @param {string} relativePath - File containing the symbol
   * @returns {Promise<Object>} List of referencing symbols with snippets
   */
  async findReferencingSymbols(namePathPattern, relativePath) {
    return {
      tool: 'mcp_oraios_serena_find_referencing_symbols',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
      },
    };
  }

  /**
   * Rename a symbol across the entire codebase
   * @param {string} namePathPattern - Symbol to rename
   * @param {string} relativePath - File containing the symbol
   * @param {string} newName - New name for the symbol
   * @returns {Promise<Object>} Refactoring result
   */
  async renameSymbol(namePathPattern, relativePath, newName) {
    return {
      tool: 'mcp_oraios_serena_rename_symbol',
      params: {
        name_path: namePathPattern,
        relative_path: relativePath,
        new_name: newName,
      },
      mutating: true,
    };
  }

  /**
   * Replace the body of a symbol
   * @param {string} namePathPattern - Symbol to modify
   * @param {string} relativePath - File containing the symbol
   * @param {string} newBody - New body content
   * @returns {Promise<Object>} Replacement result
   */
  async replaceSymbolBody(namePathPattern, relativePath, newBody) {
    return {
      tool: 'mcp_oraios_serena_replace_symbol_body',
      params: {
        name_path: namePathPattern,
        relative_path: relativePath,
        new_body: newBody,
      },
      mutating: true,
    };
  }

  /**
   * Search for patterns in the codebase
   * @param {string} pattern - Regex or string pattern to search for
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Pattern search results
   */
  async searchForPattern(pattern, options = {}) {
    const cacheKey = `pattern:${pattern}:${JSON.stringify(options)}`;
    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey);
    }

    return {
      tool: 'mcp_oraios_serena_search_for_pattern',
      params: {
        substring_pattern: pattern,
        is_regexp: options.isRegex || false,
        relative_path: options.relativePath || '',
        context_lines_before: options.contextBefore || 0,
        context_lines_after: options.contextAfter || 0,
        restrict_search_to_code_files: options.codeFilesOnly !== false,
        paths_include_glob: options.includeGlob || '',
        paths_exclude_glob: options.excludeGlob || '',
      },
      cacheKey: cacheKey,
    };
  }

  /**
   * Get current project configuration
   * @returns {Promise<Object>} Project configuration and activation state
   */
  async getProjectConfig() {
    return {
      tool: 'mcp_oraios_serena_get_current_config',
    };
  }

  /**
   * Safely delete a symbol if no references exist
   * @param {string} namePathPattern - Symbol to delete
   * @param {string} relativePath - File containing the symbol
   * @returns {Promise<Object>} Deletion result or list of references
   */
  async safeDeleteSymbol(namePathPattern, relativePath) {
    return {
      tool: 'mcp_oraios_serena_safe_delete_symbol',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
      },
      mutating: true,
    };
  }

  /**
   * Insert code after a symbol
   * @param {string} namePathPattern - Symbol after which to insert
   * @param {string} relativePath - File containing the symbol
   * @param {string} code - Code to insert
   * @returns {Promise<Object>} Insertion result
   */
  async insertAfterSymbol(namePathPattern, relativePath, code) {
    return {
      tool: 'mcp_oraios_serena_insert_after_symbol',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
        new_code: code,
      },
      mutating: true,
    };
  }

  /**
   * Insert code before a symbol
   * @param {string} namePathPattern - Symbol before which to insert
   * @param {string} relativePath - File containing the symbol
   * @param {string} code - Code to insert
   * @returns {Promise<Object>} Insertion result
   */
  async insertBeforeSymbol(namePathPattern, relativePath, code) {
    return {
      tool: 'mcp_oraios_serena_insert_before_symbol',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
        new_code: code,
      },
      mutating: true,
    };
  }

  /**
   * Replace content using regex or literal matching
   * @param {string} relativePath - File to edit
   * @param {string} pattern - Pattern to search for
   * @param {string} replacement - Replacement text
   * @param {Object} options - Replacement options
   * @returns {Promise<Object>} Replacement result
   */
  async replaceContent(relativePath, pattern, replacement, options = {}) {
    return {
      tool: 'mcp_oraios_serena_replace_content',
      params: {
        relative_path: relativePath,
        needle: pattern,
        repl: replacement,
        mode: options.regex ? 'regex' : 'literal',
        allow_multiple_occurrences: options.allowMultiple || false,
      },
      mutating: true,
    };
  }

  /**
   * Write lesson/memory to Serena's memory system
   * @param {string} memoryName - Name for the memory (supports "/" for topics)
   * @param {string} content - Memory content
   * @returns {Promise<Object>} Write result
   */
  async writeMemory(memoryName, content) {
    return {
      tool: 'mcp_oraios_serena_write_memory',
      params: {
        memory_name: memoryName,
        content: content,
      },
      mutating: true,
    };
  }

  /**
   * Rename a memory
   * @param {string} oldName - Current memory name
   * @param {string} newName - New memory name
   * @returns {Promise<Object>} Rename result
   */
  async renameMemory(oldName, newName) {
    return {
      tool: 'mcp_oraios_serena_rename_memory',
      params: {
        old_name: oldName,
        new_name: newName,
      },
      mutating: true,
    };
  }

  /**
   * Delete a memory
   * @param {string} memoryName - Memory to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteMemory(memoryName) {
    return {
      tool: 'mcp_oraios_serena_delete_memory',
      params: {
        memory_name: memoryName,
      },
      mutating: true,
    };
  }

  /**
   * Bridge orchestrator lessons with Serena memory
   * Persists HLLM lessons as Serena memories for persistent learning
   * @param {Object} lessonRecord - HLLM lesson record
   * @returns {Promise<Object>} Memory persistence result
   */
  async persistLessonAsMemory(lessonRecord) {
    const memoryName = `lessons/hllm/${lessonRecord.id}`;
    const content = `
# HLLM Lesson: ${lessonRecord.id}

**Failed Command:** \`${lessonRecord.failed_command}\`

**Root Cause:** ${lessonRecord.root_cause}

**Prevention Rule:** ${lessonRecord.prevention_rule}

**Blacklisted Pattern:** \`${lessonRecord.blacklisted_pattern}\`

---
Captured: ${new Date().toISOString()}
    `.trim();

    return await this.writeMemory(memoryName, content);
  }

  /**
   * Generate codebase summary for strategic planning
   * Gets symbol overview of key files for architectural understanding
   * @param {string[]} keyFiles - Important files to analyze
   * @returns {Promise<Object>} Codebase structure summary
   */
  async generateCodebaseSummary(keyFiles) {
    const summaries = [];
    
    for (const file of keyFiles) {
      summaries.push({
        file,
        symbolsTool: 'mcp_oraios_serena_get_symbols_overview',
        params: { relative_path: file, depth: 2 },
      });
    }

    return {
      type: 'parallel_tool_batch',
      tools: summaries,
      description: 'Get symbol overview of key architecture files',
    };
  }

  /**
   * Validate symbol references before refactoring
   * Ensures that a symbol is safe to refactor
   * @param {string} namePathPattern - Symbol to validate
   * @param {string} relativePath - File containing the symbol
   * @returns {Promise<Object>} Validation result with reference info
   */
  async validateSymbolReferences(namePathPattern, relativePath) {
    return {
      tool: 'mcp_oraios_serena_find_referencing_symbols',
      params: {
        name_path_pattern: namePathPattern,
        relative_path: relativePath,
      },
      description: 'Validate symbol has no external references before modification',
    };
  }
}

/**
 * Ability Discovery Enhancement using Serena
 * Enhances skill discovery by analyzing codebase patterns
 */
class SerenaAbilityDiscovery {
  constructor(serenaManager) {
    this.serena = serenaManager;
  }

  /**
   * Discover all exported functions/classes in a file
   * for dynamic ability registration
   * @param {string} filePath - File to analyze
   * @returns {Promise<Object[]>} Array of exportable abilities
   */
  async discoverAbilities(filePath) {
    return this.serena.getSymbolsOverview(filePath, 1);
  }

  /**
   * Find all hook implementations in project
   * @returns {Promise<Object>} Hook registry with implementations
   */
  async discoverHooks() {
    return this.serena.searchForPattern(
      '\\bhook\\b|\\bhandler\\b|\\blistener\\b',
      {
        isRegex: true,
        codeFilesOnly: true,
        contextAfter: 2,
      }
    );
  }

  /**
   * Scan for error handling patterns
   * @returns {Promise<Object>} Error handling patterns found
   */
  async discoverErrorHandlers() {
    return this.serena.searchForPattern(
      '(catch|error|exception|try)\\s*[({]',
      {
        isRegex: true,
        codeFilesOnly: true,
      }
    );
  }
}

/**
 * Dispatcher Integration with Serena
 * Adds Serena-aware routing for code-related tasks
 */
class SerenaDispatcherRouter {
  constructor(serenaManager) {
    this.serena = serenaManager;
  }

  /**
   * Route task based on code context from Serena
   * @param {string} intent - User intent
   * @param {Object} payload - Task payload
   * @returns {Promise<Object>} Routed task with enriched context
   */
  async routeCodeTask(intent, payload) {
    const keywords = intent.toLowerCase().match(/\b(refactor|find|search|rename|analyze|pattern)\b/gi) || [];
    
    if (keywords.length === 0) {
      return { error: 'No code-related intent detected' };
    }

    // Enrich payload with Serena context
    if (payload.filePath) {
      const symbols = await this.serena.getSymbolsOverview(payload.filePath);
      payload.codeContext = { symbols };
    }

    return {
      intent,
      payload,
      router: 'serena-dispatcher',
      requiresSerena: true,
    };
  }

  /**
   * Find similar code patterns for refactoring
   * @param {string} pattern - Code pattern to find
   * @returns {Promise<Object>} Locations of similar patterns
   */
  async findSimilarPatterns(pattern) {
    return this.serena.searchForPattern(pattern, {
      isRegex: true,
      contextBefore: 3,
      contextAfter: 3,
    });
  }
}

export {
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,
};
