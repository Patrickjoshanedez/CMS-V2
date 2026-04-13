# Orchestrator Serena Integration - Implementation Guide

## Overview

The orchestrator now has first-class integration with Serena for intelligent code exploration, symbol management, and pattern-based code discovery. This enables:

- **Smart code routing** - Intent-based dispatcher with code context enrichment
- **Safe refactoring** - Symbol-aware refactoring with automatic reference validation
- **Ability discovery** - Auto-discover and register project capabilities from codebase
- **Pattern-driven tasks** - Find and bulk-execute similar code patterns
- **Learning integration** - Bridge HLLM lessons with persistent Serena memories

## New Modules

### 1. `serena-integration.js`
**Core integration layer with 12 Serena MCP tools**

Contains:
- `SerenaIntegrationManager` - Direct MCP tool access with caching
- `SerenaAbilityDiscovery` - Pattern-based ability/hook/handler discovery
- `SerenaDispatcherRouter` - Code-task routing with Serena enrichment

```javascript
const serena = new SerenaIntegrationManager();
const symbols = await serena.getSymbolsOverview('src/App.tsx', 2);
const refs = await serena.findReferencingSymbols('MyFunction', 'src/utils.ts');
```

### 2. `serena-dispatcher.js`
**Intent-based dispatcher with Serena context**

Routes tasks to specialized agents based on intent:
- Symbol navigation → `coder`
- Pattern search → `coder`
- Code refactoring → `coder` (with validation)
- Code analysis → `Thinker pro` (with structure context)
- Memory integration → `context-manager`

```javascript
const dispatcher = new SerenaEnhancedDispatcher();
const task = await dispatcher.route('find the UserService class', {
  symbolName: 'UserService',
  filePath: 'server/services/UserService.ts'
});
```

### 3. `ability-manager-serena-enhancement.js`
**Dynamic ability discovery and registration**

Features:
- Auto-discover functions, classes, hooks from directories
- Pattern-based hook discovery
- Error handler discovery and mapping
- Dependency analysis and impact assessment

```javascript
const abilityMgr = new SerenaEnhancedAbilityManager();
const discovered = await abilityMgr.discoverAbilitiesFromDirectory(
  'server/services',
  { includeReferences: true }
);
```

### 4. `serena-examples.js`
**8 practical usage examples**

Examples include:
- Extend existing classes with code context
- Safe symbol renaming with validation
- Architecture discovery for code review
- Bulk refactoring patterns
- Lesson persistence as memories
- Custom hook discovery
- Code quality analysis
- Feature integration planning

## Quick Start

### Step 1: Import and Initialize

```javascript
import {
  SerenaIntegrationManager,
  SerenaAbilityDiscovery,
  SerenaDispatcherRouter,
} from './orchestrator/serena-integration.js';

import SerenaEnhancedDispatcher from './orchestrator/serena-dispatcher.js';
import SerenaEnhancedAbilityManager from './orchestrator/ability-manager-serena-enhancement.js';

const serena = new SerenaIntegrationManager();
const dispatcher = new SerenaEnhancedDispatcher();
const abilityMgr = new SerenaEnhancedAbilityManager();
```

### Step 2: Use Serena in Workflows

```javascript
// Before refactoring, validate references
const validation = await serena.validateSymbolReferences('oldName', 'src/file.ts');
if (validation.isSafeToRefactor) {
  const result = await serena.renameSymbol('oldName', 'src/file.ts', 'newName');
}

// Understand code before implementation
const symbols = await serena.getSymbolsOverview('src/components/Form.tsx', 2);
const implTask = await dispatcher.route('extend Form component', {
  filePath: 'src/components/Form.tsx',
  context: symbols,
});

// Find similar patterns for consistency
const matches = await serena.searchForPattern(
  'useEffect.*\\[.*dependency',
  { isRegex: true }
);
```

### Step 3: Route Tasks with Serena Context

```javascript
// Route automatically detects intent and enriches with Serena context
const task1 = await dispatcher.route('find all useAuth hooks', {
  pattern: 'function\\s+(useAuth\\w*)',
  useRegex: true,
});

const task2 = await dispatcher.route('rename GetUser to FetchUser', {
  operation: 'rename',
  symbolName: 'GetUser',
  filePath: 'server/utils/user.ts',
  newName: 'FetchUser',
});

// Both tasks are routed with validation and context
await orchestrator.delegateTo(task1.agent, task1);
await orchestrator.delegateTo(task2.agent, task2);
```

## Integration Points

### With Ability Manager

```javascript
// Discover all abilities in a directory
const abilities = await abilityMgr.discoverAbilitiesFromDirectory('server/services');

// Validate before refactoring
const isValid = await abilityMgr.validateAbility('UserService', 'server/services/UserService.ts');

// Understand impact before removal
const impact = await abilityMgr.findAbilityDependents('OldFunction', 'src/utils.ts');
```

### With HLLM (Historic Lesson Learning)

```javascript
import { createLessonRecord } from './hllm.js';

const lesson = createLessonRecord({
  failed_command: 'npm test',
  attempted_fix: 'Added null check',
  root_cause: 'Race condition',
  blacklisted_pattern: 'null.*check.*race',
  prevention_rule: 'Use useEffect cleanup',
});

// Persist both as lesson and as Serena memory
await persistLesson(lesson);
await serena.persistLessonAsMemory(lesson);
```

### With Hook Enforcer

```javascript
// Discover hooks and register them
const hooksFound = await abilityMgr.discoverAndRegisterHooks();
for (const hook of hooksFound.eventEmitters) {
  hookEnforcer.registerHook(hook.pattern, hook.file);
}
```

## Dispatcher Decision Tree

```
User Intent
    ↓
Intent Detection
    ├─ find/locate/navigate → Symbol Navigation → coder
    ├─ search/pattern/grep → Pattern Search → coder
    ├─ refactor/rename/extract → Code Refactor → coder + validation
    ├─ analyze/understand/review → Code Analysis → Thinker pro
    └─ learn/remember/save → Memory Integration → context-manager
    ↓
Serena Context Enrichment
    ├─ Get symbol structure
    ├─ Find references
    ├─ Validate safety
    └─ Discover patterns
    ↓
Route to Agent with Context
```

## MCP Tool Mapping

| Serena Tool | MCP Call | Purpose |
|-------------|----------|---------|
| getSymbolsOverview | mcp_oraios_serena_get_symbols_overview | Understand file structure |
| findSymbol | mcp_oraios_serena_find_symbol | Locate code |
| findReferencingSymbols | mcp_oraios_serena_find_referencing_symbols | Validate impact |
| renameSymbol | mcp_oraios_serena_rename_symbol | Safe refactoring |
| replaceSymbolBody | mcp_oraios_serena_replace_symbol_body | Update code |
| searchForPattern | mcp_oraios_serena_search_for_pattern | Pattern discovery |
| safeDeleteSymbol | mcp_oraios_serena_safe_delete_symbol | Safe removal |
| writeMemory | mcp_oraios_serena_write_memory | Persist learning |
| insertAfterSymbol | mcp_oraios_serena_insert_after_symbol | Add code |
| insertBeforeSymbol | mcp_oraios_serena_insert_before_symbol | Add code |
| replaceContent | mcp_oraios_serena_replace_content | File-level edits |
| validateReferences | mcp_oraios_serena_find_referencing_symbols | Validation |

## Agent Integration Examples

### Coder Agent
```javascript
class CoderAgent {
  async implement(intent, payload) {
    // Understand context before coding
    if (payload.filePath) {
      const symbols = await this.serena.getSymbolsOverview(payload.filePath, 2);
      payload.codeContext = symbols;
    }
    
    // Find patterns for consistency
    if (payload.pattern) {
      const patterns = await this.serena.searchForPattern(payload.pattern);
      payload.references = patterns;
    }
    
    return this.generateCode(intent, payload);
  }
}
```

### Thinker Pro Agent
```javascript
class ThinkerProAgent {
  async analyze(intent, payload) {
    // Receive rich codebase structure from Serena
    const symbols = payload.serenaContext?.symbolStructure;
    const refs = payload.serenaContext?.references;
    
    // Perform strategic analysis with code understanding
    const strategy = this.analyzeSymbolDependencies(symbols, refs);
    return { strategy, recommendations: [...] };
  }
}
```

### Test Automation Agent
```javascript
class TestAutomationAgent {
  async discoverTests() {
    // Use Serena to find all test patterns
    const testMatches = await this.serena.searchForPattern(
      '(describe|it|test)\\s*\\(["\']',
      { isRegex: true }
    );
    
    this.testCases = testMatches.results.map(m => ({
      name: m.captured[0],
      file: m.file,
      context: m.context,
    }));
  }
}
```

## Performance Characteristics

| Operation | Cached? | Time | Notes |
|-----------|---------|------|-------|
| getSymbolsOverview | Yes | ~50ms | First call slower |
| findSymbol | Yes | ~30ms | Body loading adds 10-20ms |
| searchForPattern | Yes | ~100-500ms | Depends on pattern complexity |
| findReferencingSymbols | Yes | ~50ms | 1st ref lookup slower |
| renameSymbol | No | ~200-500ms | Mutating operation |

**Caching Strategy:**
- Symbol lookups cached by `file:depth`
- Pattern searches cached by `pattern:options`
- Reference validations NOT cached (always fresh)

## Future Enhancements

- [ ] Automatic import optimization based on symbol dependencies
- [ ] Visual codebase graph generation
- [ ] Cross-file symbol tracking for refactoring
- [ ] ML-based code smell detection using patterns
- [ ] Parallel discovery for large codebases
- [ ] Symbol type inference and validation
- [ ] Performance profiling based on symbol complexity

## Files Modified/Created

```
orchestrator/
├── index.js (enhanced with Serena exports)
├── serena-integration.js (NEW - core integration)
├── serena-dispatcher.js (NEW - intent routing)
├── serena-examples.js (NEW - practical examples)
├── ability-manager-serena-enhancement.js (NEW - dynamic discovery)
├── SERENA_INTEGRATION_GUIDE.md (NEW - detailed guide)
└── README-SERENA-ENHANCEMENT.md (NEW - this file)
```

## Usage in Orchestrator Workflow

```
User Request
    ↓
Orchestrator.route(intent, payload)
    ↓
SerenaEnhancedDispatcher.route()
    ├─ Detect intent type
    ├─ Enrich with Serena context
    │  ├─ Symbol overview
    │  ├─ Reference validation
    │  ├─ Pattern matching
    │  └─ Impact analysis
    ├─ Prepare routed task
    └─ Return to agent
    ↓
Agent (coder, Thinker pro, etc.)
    ├─ Receive task + Serena context
    ├─ Use context for decision-making
    └─ Generate solution
    ↓
Result
```

## Testing the Integration

```bash
# Run examples
node orchestrator/serena-examples.js

# Test symbol navigation
import { SerenaIntegrationManager } from './orchestrator/serena-integration.js';
const serena = new SerenaIntegrationManager();
const symbols = await serena.getSymbolsOverview('server/services/UserService.ts');
console.log(symbols);

# Test dispatcher routing
import SerenaEnhancedDispatcher from './orchestrator/serena-dispatcher.js';
const dispatcher = new SerenaEnhancedDispatcher();
const task = await dispatcher.route('find the PaymentService', {
  symbolName: 'PaymentService',
  filePath: 'server/services/PaymentService.ts'
});
console.log(task);
```

## Troubleshooting

### Issue: Serena MCP not found
**Solution:** Verify `.vscode/mcp.json` has `oraios/serena` configured and MCP server is running

### Issue: Slow symbol lookups
**Solution:** MCP calls are cached after first lookup. Subsequent calls should be instant.

### Issue: Pattern not matching
**Solution:** Ensure regex flag is set correctly and pattern uses JavaScript regex syntax

### Issue: Validation failing on safe refactoring
**Solution:** Check if symbol has external references. Use `findReferencingSymbols` first.

## Documentation

- [SERENA_INTEGRATION_GUIDE.md](./SERENA_INTEGRATION_GUIDE.md) - Detailed API guide
- [serena-examples.js](./serena-examples.js) - 8 practical examples
- [Serena MCP Docs](../mcp-instructions/serena.md) - MCP tool reference

## Support

For issues or enhancements:
1. Check the examples in `serena-examples.js`
2. Review integration guide for your use case
3. Verify MCP configuration in `.vscode/mcp.json`
4. Check HLLM lessons in `context/lessons/` for similar problems
