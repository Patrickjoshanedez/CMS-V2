/**
 * Enhanced Dispatcher with Serena Integration
 *
 * Extends the base dispatcher with Serena-aware routing for:
 * - Symbol-aware code navigation
 * - Pattern-based code discovery
 * - Intelligent refactoring with reference validation
 * - Context enrichment from codebase structure
 *
 * @module orchestrator/serena-dispatcher
 * @version 1.0.0
 */

import {
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,
} from './serena-integration.js';

/**
 * Enhanced dispatcher with Serena capabilities
 */
class SerenaEnhancedDispatcher {
  constructor() {
    this.serena = new SerenaIntegrationManager();
    this.abilityDiscovery = new SerenaAbilityDiscovery(this.serena);
    this.router = new SerenaDispatcherRouter(this.serena);
    
    // Agent routing registry
    this.agentRegistry = new Map([
      ['symbol-navigation', this.routeSymbolNavigation.bind(this)],
      ['pattern-search', this.routePatternSearch.bind(this)],
      ['code-refactor', this.routeCodeRefactor.bind(this)],
      ['code-analysis', this.routeCodeAnalysis.bind(this)],
      ['memory-integration', this.routeLessonMemory.bind(this)],
    ]);
  }

  /**
   * Route a task based on intent and Serena context
   * @param {string} intent - User intent
   * @param {Object} payload - Task payload with optional file/symbol context
   * @returns {Promise<Object>} Routed task with Serena enrichment
   */
  async route(intent, payload) {
    const lowerIntent = intent.toLowerCase();
    
    // Detect intent type from keywords
    if (this._matchesIntent(lowerIntent, ['find', 'locate', 'navigate', 'where is'])) {
      return this.routeSymbolNavigation(intent, payload);
    }
    
    if (this._matchesIntent(lowerIntent, ['search', 'pattern', 'find all', 'grep', 'scan'])) {
      return this.routePatternSearch(intent, payload);
    }
    
    if (this._matchesIntent(lowerIntent, ['refactor', 'rename', 'extract', 'move', 'modify'])) {
      return this.routeCodeRefactor(intent, payload);
    }
    
    if (this._matchesIntent(lowerIntent, ['analyze', 'understand', 'explain', 'review', 'audit'])) {
      return this.routeCodeAnalysis(intent, payload);
    }
    
    if (this._matchesIntent(lowerIntent, ['learn', 'lesson', 'remember', 'save', 'memory'])) {
      return this.routeLessonMemory(intent, payload);
    }
    
    return { error: 'No matching intent detected', intent };
  }

  /**
   * Route symbol navigation requests to Serena
   * @private
   */
  async routeSymbolNavigation(intent, payload) {
    const context = {};
    
    // If file is specified, get symbol overview
    if (payload.filePath) {
      context.symbolsOverview = await this.serena.getSymbolsOverview(
        payload.filePath,
        payload.depth || 1
      );
    }
    
    // If symbol name is specified, find it
    if (payload.symbolName && payload.filePath) {
      context.symbolLocation = await this.serena.findSymbol(
        payload.symbolName,
        payload.filePath,
        payload.includeBody || false
      );
    }
    
    return {
      agent: 'coder',
      task: 'symbol-navigation',
      intent,
      payload,
      serenaContext: context,
      toolCalls: Object.values(context).map(c => ({ 
        tool: c.tool, 
        params: c.params 
      })),
    };
  }

  /**
   * Route pattern search requests
   * @private
   */
  async routePatternSearch(intent, payload) {
    const searchOptions = {
      isRegex: payload.useRegex !== false,
      relativePath: payload.relativePath,
      contextBefore: payload.contextBefore || 2,
      contextAfter: payload.contextAfter || 2,
      codeFilesOnly: payload.codeFilesOnly !== false,
      includeGlob: payload.includeGlob,
      excludeGlob: payload.excludeGlob,
    };
    
    const results = await this.serena.searchForPattern(payload.pattern, searchOptions);
    
    return {
      agent: 'coder',
      task: 'pattern-search',
      intent,
      payload,
      serenaContext: {
        patternSearch: results,
      },
      toolCalls: [{ 
        tool: results.tool, 
        params: results.params 
      }],
    };
  }

  /**
   * Route code refactoring requests with safety validation
   * @private
   */
  async routeCodeRefactor(intent, payload) {
    const context = {};
    
    // Validate references before refactoring
    if (payload.symbolName && payload.filePath) {
      const validation = await this.serena.validateSymbolReferences(
        payload.symbolName,
        payload.filePath
      );
      context.validation = validation;
      
      // Check if safe to refactor
      context.isSafeToRefactor = !validation.hasExternalReferences;
    }
    
    // Prepare refactoring operation
    let refactoringTool = null;
    if (payload.operation === 'rename') {
      refactoringTool = {
        tool: 'mcp_oraios_serena_rename_symbol',
        params: {
          name_path: payload.symbolName,
          relative_path: payload.filePath,
          new_name: payload.newName,
        },
      };
    } else if (payload.operation === 'replace-body') {
      refactoringTool = {
        tool: 'mcp_oraios_serena_replace_symbol_body',
        params: {
          name_path: payload.symbolName,
          relative_path: payload.filePath,
          new_body: payload.newBody,
        },
      };
    } else if (payload.operation === 'delete') {
      refactoringTool = {
        tool: 'mcp_oraios_serena_safe_delete_symbol',
        params: {
          name_path_pattern: payload.symbolName,
          relative_path: payload.filePath,
        },
      };
    }
    
    return {
      agent: 'coder',
      task: 'code-refactor',
      intent,
      payload,
      serenaContext: context,
      refactoring: payload,
      toolCalls: refactoringTool ? [refactoringTool] : [],
      requiresValidation: true,
    };
  }

  /**
   * Route code analysis requests
   * @private
   */
  async routeCodeAnalysis(intent, payload) {
    const context = {};
    
    // Get symbol overview for analysis
    if (payload.filePath) {
      context.symbolStructure = await this.serena.getSymbolsOverview(
        payload.filePath,
        payload.depth || 2
      );
    }
    
    // Find all references for impact analysis
    if (payload.symbolName && payload.filePath) {
      context.references = await this.serena.findReferencingSymbols(
        payload.symbolName,
        payload.filePath
      );
    }
    
    return {
      agent: 'Thinker pro',
      task: 'code-analysis',
      intent,
      payload,
      serenaContext: context,
      analysisType: payload.analysisType || 'general',
    };
  }

  /**
   * Route lesson/memory persistence
   * @private
   */
  async routeLessonMemory(intent, payload) {
    const context = {};
    
    // Persist HLLM lesson as Serena memory
    if (payload.lessonRecord) {
      context.memoryPersistence = await this.serena.persistLessonAsMemory(
        payload.lessonRecord
      );
    }
    
    // Write custom memory
    if (payload.memoryName && payload.content) {
      context.memoryWrite = await this.serena.writeMemory(
        payload.memoryName,
        payload.content
      );
    }
    
    return {
      agent: 'context-manager',
      task: 'memory-integration',
      intent,
      payload,
      serenaContext: context,
      toolCalls: Object.values(context)
        .filter(c => c && c.tool)
        .map(c => ({ tool: c.tool, params: c.params })),
    };
  }

  /**
   * Discover abilities in a given file
   * Useful for dynamic skill/ability registration
   */
  async discoverAbilities(filePath) {
    return this.abilityDiscovery.discoverAbilities(filePath);
  }

  /**
   * Discover hooks in the project
   */
  async discoverHooks() {
    return this.abilityDiscovery.discoverHooks();
  }

  /**
   * Discover error handlers
   */
  async discoverErrorHandlers() {
    return this.abilityDiscovery.discoverErrorHandlers();
  }

  /**
   * Helper to match intent keywords
   * @private
   */
  _matchesIntent(lowerIntent, keywords) {
    return keywords.some(keyword => lowerIntent.includes(keyword));
  }

  /**
   * Get dispatcher stats
   */
  getStats() {
    return {
      agentRoutes: Array.from(this.agentRegistry.keys()),
      serenaCapabilities: [
        'symbol-navigation',
        'pattern-search',
        'code-refactor',
        'code-analysis',
        'memory-integration',
      ],
    };
  }
}

export default SerenaEnhancedDispatcher;
export { SerenaEnhancedDispatcher };
