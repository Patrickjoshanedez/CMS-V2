# Orchestrator Serena Integration Guide

## Overview

The orchestrator now integrates Serena's semantic code exploration and symbol management capabilities, enabling intelligent code-aware task routing, pattern discovery, and context enrichment.

## Key Modules

### 1. SerenaIntegrationManager
Provides low-level access to all Serena MCP tools:

```javascript
import { SerenaIntegrationManager } from './serena-integration.js';

const serena = new SerenaIntegrationManager();

// Get all symbols in a file
const symbols = await serena.getSymbolsOverview('src/components/App.tsx', depth: 2);

// Find a specific symbol
const symbol = await serena.findSymbol('MyComponent/__init__', 'src/components/App.tsx');

// Find all references to a symbol
const refs = await serena.findReferencingSymbols('myFunction', 'src/utils/helpers.ts');

// Safely rename a symbol across the codebase
const result = await serena.renameSymbol('OldName', 'src/file.ts', 'NewName');

// Search for patterns (regex or literal)
const matches = await serena.searchForPattern('useEffect.*dependency', {
  isRegex: true,
  contextBefore: 2,
  contextAfter: 2,
});
```

### 2. SerenaEnhancedDispatcher
Intent-based routing with Serena context enrichment:

```javascript
import SerenaEnhancedDispatcher from './serena-dispatcher.js';

const dispatcher = new SerenaEnhancedDispatcher();

// Route a symbol navigation task
const navTask = await dispatcher.route('find the UserService class', {
  symbolName: 'UserService',
  filePath: 'server/services/UserService.ts'
});
// Returns: { agent: 'coder', task: 'symbol-navigation', ... }

// Route a refactoring task (with safety validation)
const refactTask = await dispatcher.route('rename updateUser to modifyUser in UserService', {
  operation: 'rename',
  symbolName: 'updateUser',
  filePath: 'server/services/UserService.ts',
  newName: 'modifyUser'
});
// Automatically validates references before routing to coder

// Route a pattern search
const searchTask = await dispatcher.route('find all React hooks using useEffect', {
  pattern: 'useEffect\\s*\\([\\s\\S]*?\\)',
  useRegex: true,
  codeFilesOnly: true,
});

// Route code analysis
const analysisTask = await dispatcher.route('analyze the User model structure', {
  filePath: 'server/models/User.ts',
  depth: 2,
});
// Routes to Thinker pro with codebase structure context
```

### 3. SerenaAbilityDiscovery
Automatic ability discovery by scanning codebase:

```javascript
const abilityDiscovery = new SerenaAbilityDiscovery(serena);

// Discover all symbols (abilities) in a file
const abilities = await abilityDiscovery.discoverAbilities('src/hooks/useAuth.ts');

// Discover all hook implementations in project
const hooks = await abilityDiscovery.discoverHooks();

// Discover all error handlers
const errorHandlers = await abilityDiscovery.discoverErrorHandlers();
```

## Integration Patterns

### Pattern 1: Symbol-Aware Refactoring with Validation

```javascript
// Before refactoring, validate there are no unexpected references
const validation = await serena.validateSymbolReferences(
  'OldFunctionName',
  'src/core/index.ts'
);

if (validation.referenceCount === 0) {
  // Safe to delete
  await serena.safeDeleteSymbol('OldFunctionName', 'src/core/index.ts');
} else {
  // Report references to user before proceeding
  console.log('References:', validation.references);
}
```

### Pattern 2: Context-Enriched Code Analysis

```javascript
// Get comprehensive code structure for architecture analysis
const summary = await serena.generateCodebaseSummary([
  'server/services/AuthService.ts',
  'server/models/User.ts',
  'server/routes/auth.ts',
]);

// Pass to Thinker pro for strategic insights
const strategy = await thinkerPro.analyze(summary);
```

### Pattern 3: Pattern-Driven Bulk Refactoring

```javascript
// Find all instances of a code pattern
const matches = await serena.searchForPattern(
  'const\\s+(\\w+)\\s*=\\s*require\\(',
  { isRegex: true }
);

// For each match, orchestrate a refactoring
for (const match of matches.results) {
  const refactorTask = await dispatcher.route('convert to ESM import', {
    operation: 'replace-body',
    filePath: match.file,
    newBody: `import ${match.captured[1]} from ...`,
  });
  
  await orchestrator.delegateTo('coder', refactorTask);
}
```

### Pattern 4: Lesson-to-Memory Persistence

```javascript
import { persistLesson, createLessonRecord } from '../hllm.js';

// Create HLLM lesson from failed fix
const lesson = createLessonRecord({
  failed_command: 'npm test -- src/components/__tests__/Button.test.ts',
  attempted_fix: 'Added null check in onClick handler',
  root_cause: 'State update timing issue, not null safety',
  blacklisted_pattern: 'null.*check.*onClick',
  prevention_rule: 'For onClick timing issues, use useCallback + dependency array',
});

// Persist both as HLLM lesson AND as Serena memory for cross-session learning
await persistLesson(lesson);
await serena.persistLessonAsMemory(lesson);
```

## Dispatcher Routing Decision Tree

The enhanced dispatcher automatically routes based on intent keywords:

```
find / locate / navigate / where is
  ↓
Symbol Navigation → coder
  Uses: getSymbolsOverview, findSymbol

search / pattern / find all / grep / scan
  ↓
Pattern Search → coder
  Uses: searchForPattern

refactor / rename / extract / move / modify
  ↓
Code Refactor → coder
  Uses: validateSymbolReferences, renameSymbol, replaceSymbolBody, safeDeleteSymbol
  Includes: Safety validation before routing

analyze / understand / explain / review / audit
  ↓
Code Analysis → Thinker pro
  Uses: getSymbolsOverview (depth=2), findReferencingSymbols
  Context: Symbol structure + reference graph

learn / lesson / remember / save / memory
  ↓
Memory Integration → context-manager
  Uses: persistLessonAsMemory, writeMemory, renameMemory
```

## Adding Serena to Agents

### For Coder Agent
```javascript
import { SerenaIntegrationManager } from './orchestrator/serena-integration.js';

class CoderAgent {
  constructor() {
    this.serena = new SerenaIntegrationManager();
  }

  async implementFeature(intent, payload) {
    // Before implementing, understand the code structure
    if (payload.filePath) {
      const symbols = await this.serena.getSymbolsOverview(payload.filePath, 2);
      payload.codeContext = symbols;
    }
    
    // Find similar patterns for reference
    const patterns = await this.serena.searchForPattern(
      payload.searchPattern,
      { isRegex: true }
    );
    payload.similarCode = patterns;
    
    // Proceed with implementation, enriched with context
    return this.implement(intent, payload);
  }
}
```

### For Thinker Pro Agent
```javascript
async analyzeArchitecture(codebaseSummary) {
  // Thinker pro receives rich symbol structure from Serena
  const analysis = {
    architecture: this.analyzeSymbolDependencies(codebaseSummary),
    scalability: this.checkScalingPatterns(codebaseSummary),
    patterns: this.identifyDesignPatterns(codebaseSummary),
  };
  
  return analysis;
}
```

### For Test Automation Agent
```javascript
async discoverTestCases() {
  // Use Serena to find all test patterns
  const testPatterns = await serena.searchForPattern(
    '(describe|it)\\s*\\(["\']',
    { isRegex: true }
  );
  
  this.testCases = testPatterns.results;
}
```

## MCP Tool Mapping

All Serena tools are mapped to language-independent MCP calls:

| Operation | MCP Tool | Use Case |
|-----------|----------|----------|
| `getSymbolsOverview` | `mcp_oraios_serena_get_symbols_overview` | Understand file structure |
| `findSymbol` | `mcp_oraios_serena_find_symbol` | Locate specific code |
| `findReferencingSymbols` | `mcp_oraios_serena_find_referencing_symbols` | Impact analysis |
| `renameSymbol` | `mcp_oraios_serena_rename_symbol` | Safe refactoring |
| `replaceSymbolBody` | `mcp_oraios_serena_replace_symbol_body` | Update implementation |
| `searchForPattern` | `mcp_oraios_serena_search_for_pattern` | Pattern discovery |
| `safeDeleteSymbol` | `mcp_oraios_serena_safe_delete_symbol` | Safe removal |
| `writeMemory` | `mcp_oraios_serena_write_memory` | Persist learning |

## Performance Considerations

1. **Caching**: Symbol lookups and pattern searches are cached locally
2. **Parallel Batch Calls**: Discovery tasks support parallel MCP execution
3. **Lazy Loading**: Symbol bodies loaded only when needed (includeBody flag)
4. **Memory Limits**: Serena memory respects tier size limits (see memory-tiers.js)

## Error Handling

```javascript
try {
  const result = await serena.renameSymbol('OldName', 'src/file.ts', 'NewName');
  if (result.error) {
    // Handle MCP error response
    console.error('Rename failed:', result.error);
  }
} catch (err) {
  // Handle execution error
  console.error('MCP call failed:', err.message);
}
```

## Future Enhancements

- [ ] Symbol type inference and validation
- [ ] Automatic import optimization based on symbol dependencies
- [ ] Visual codebase graph generation for architecture reviews
- [ ] Cross-file symbol tracking and refactoring
- [ ] ML-based code quality suggestions based on pattern analysis

## References

- [Serena Instructions Manual](../mcp-instructions/serena.md)
- [Orchestrator Module Documentation](./README.md)
- [Ability Manager Guide](./ability-manager.md)
- [Hook Enforcer Documentation](./hook-enforcer.md)
