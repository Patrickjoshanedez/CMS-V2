# Agent Runtime Configuration System

## Overview

The Agent Runtime Configuration System allows dynamic control of agent behavior without code changes. It provides:

- **Mode Profiles**: Execution, Explainability, Proactive modes with context-aware behaviors
- **Confidence Policies**: Decision thresholds with high/medium/low bands
- **Verification Triggers**: Automatic verification for high-risk operations
- **Plugin Registry**: Enable/disable capabilities per environment
- **Experimental Features**: Controlled rollout of new features with targeting
- **Environment-Specific Profiles**: Default, Staging, and Production configurations

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Agent Runtime                         │
├─────────────────────────────────────────────────────────┤
│  • Loads active profile on startup                       │
│  • Resolves configuration dynamically                    │
│  • Bridges requests to decision service                  │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌─────────────────────┐
│  Config Service  │  │ Decision Integration│
│                  │  │     Service         │
│ • getActiveProf()│  │                     │
│ • getSetting()   │  │ • shouldTrigger()   │
│ • getConfidence()│  │ • checkThreshold()  │
│ • switchProfile()│  │ • getStrategy()     │
│ • rollback()     │  │ • logDecision()     │
└──────────────────┘  └─────────────────────┘
        ▲                     ▲
        │                     │
┌───────┴─────────────────────┴──────────────┐
│                                             │
│  Profile Files (JSON):                      │
│  ├─ default.json                           │
│  ├─ staging.json                           │
│  └─ production.json                        │
│                                             │
│  API Routes:                                │
│  ├─ GET /api/agent-runtime                 │
│  ├─ GET /api/agent-runtime/debug/config    │
│  ├─ GET /api/agent-runtime/debug/validate  │
│  ├─ GET /api/agent-runtime/features/:name  │
│  ├─ POST /api/agent-runtime/switch         │
│  └─ POST /api/agent-runtime/rollback       │
│                                             │
└─────────────────────────────────────────────┘
```

## Profile Structure

Each profile (`default.json`, `staging.json`, `production.json`) contains:

### 1. Mode Profiles

Three execution modes with context-aware activation:

```json
{
  "modeProfiles": {
    "execution": {
      "useWhen": ["implementation", "bugfix", "migration", "task completion"],
      "behaviors": ["prioritize correctness", "apply verification", ...]
    },
    "explainability": {
      "useWhen": ["why", "how", "show steps", "explain decision"],
      "behaviors": ["provide reasoning", "explain trade-offs", ...]
    },
    "proactive": {
      "useWhen": ["task complete", "what next"],
      "behaviors": ["suggest next steps", "surface blockers", ...]
    }
  }
}
```

**When Used:**
- Mode is determined by request context and user intent
- Agent examines request keywords against `useWhen` array
- Activates matching mode and applies its `behaviors`
- If multiple modes match, highest priority wins (execution > explainability > proactive)

### 2. Confidence Policy

Three confidence bands that determine agent response strategy:

```json
{
  "confidencePolicy": {
    "high": { 
      "min": 0.90, "max": 1.0, 
      "policy": "answer_with_citations"
    },
    "medium": { 
      "min": 0.75, "max": 0.89, 
      "policy": "answer_with_uncertainty"
    },
    "low": { 
      "min": 0.0, "max": 0.74, 
      "policy": "refuse_and_request_clarification"
    }
  }
}
```

**Thresholds Differ by Environment:**
- **Default**: 0.9, 0.7, 0.0 (balanced)
- **Staging**: 0.85, 0.65, 0.0 (permissive, testing)
- **Production**: 0.90, 0.75, 0.0 (conservative)

### 3. Verification Configuration

Automatic verification triggers and process:

```json
{
  "verification": {
    "autoTrigger": [
      "factual high-impact claims",
      "numeric outputs",
      "external API-dependent code",
      "security implications",
      "performance-critical code"
    ],
    "steps": [
      "retrieve evidence",
      "generate response",
      "run evaluator",
      "apply policy",
      "return with citations"
    ],
    "evaluatorSettings": {
      "runAlways": true,
      "strictMode": true,
      "logLevel": "debug"
    }
  }
}
```

### 4. Trigger Policies

Context7 library integration and other specialized decision points:

```json
{
  "triggerPolicies": [
    {
      "name": "context7-library-touch",
      "when": ["new dependency", "new external import", ...],
      "action": ["resolve library id", "fetch docs", "validate", ...],
      "decisionMode": "WARN" or "BLOCK"
    }
  ]
}
```

### 5. Browser Verification

Automated testing and verification:

```json
{
  "browserVerification": {
    "enabled": true,
    "requiredScenarios": [
      "happy path",
      "rbac enforcement",
      "validation errors",
      "edge cases"
    ],
    "assertionLevel": "comprehensive"
  }
}
```

### 6. Plugin Registry

Enable/disable capabilities per environment:

```json
{
  "pluginRegistry": [
    {
      "id": "plagiarism-engine",
      "enabled": true,
      "triggers": ["plagiarism", "cap1", "cap4"],
      "version": "1.0.0"
    },
    {
      "id": "cms-capstone-expert",
      "enabled": true,
      "triggers": ["capstone", "workflow"],
      "version": "1.0.0"
    }
  ]
}
```

### 7. Experimental Features

Controlled rollout with targeting:

```json
{
  "experimentalFeatures": {
    "advancedDocumentSearch": {
      "enabled": true,
      "rolloutPercentage": 75,
      "allowedRoles": ["instructor", "admin"],
      "description": "Testing NLP-powered search"
    }
  }
}
```

### 8. Logging Configuration

Component-level logging control:

```json
{
  "logging": {
    "level": "debug" or "info" or "warn" or "error",
    "logDecisionSource": true,
    "components": {
      "agentRuntime": "debug",
      "decisionEngine": "debug",
      "browserVerification": "info"
    }
  }
}
```

## Service Methods

### `agentRuntimeConfig.service.js`

Core configuration service with 10+ methods:

```javascript
// Get active profile with source metadata
await configService.getActiveProfile()
// Returns: { profile, source: 'cache'|'active'|'fallback', metadata }

// Get setting via dot notation
await configService.getSetting('modeProfiles.execution', defaultValue)
// Returns: Any type - the resolved setting value

// Check if feature is enabled
await configService.isFeatureEnabled(featureName)
// Returns: boolean

// Get full feature configuration
await configService.getFeatureConfig(featureName)
// Returns: { enabled, allowedRoles, rolloutPercentage, ... }

// Get confidence threshold for decision type
await configService.getConfidenceThreshold(decisionType, defaultValue =0.7)
// Returns: number (0.0-1.0)

// Get logging level
await configService.getLogLevel()
// Returns: 'debug' | 'info' | 'warn' | 'error'

// Check if decision source logging enabled
await configService.isDecisionSourceLoggingEnabled()
// Returns: boolean

// Validate active profile structure
await configService.validateActiveProfile()
// Returns: { valid: boolean, errors: string[] }

// Get effective config with overrides merged
await configService.getEffectiveConfig(overrides)
// Returns: merged configuration object

// Activate a different profile
await configService.activateProfile(profileId)
// Returns: { previousProfile, newProfile }

// Rollback to previous profile
await configService.rollbackProfile(reason)
// Returns: { rolledBack: boolean, newActive: string }

// Get hardcoded fallback defaults
configService.getHardcodedDefaults()
// Returns: emergency fallback profile
```

## Decision Integration Service

Bridges runtime config to actual agent decisions:

```javascript
// Check if library auto-trigger condition met
await decisionService.shouldTriggerLibraryAuto(options)

// Check confidence threshold
await decisionService.checkConfidenceThreshold(options)

// Get skill selection strategy
await decisionService.getSkillSelectionStrategy(skillName)

// Determine if full dynamic config should be used
await decisionService.shouldUseFullDynamicConfig()

// Log decision source if enabled
await decisionService.logDecisionSource(context)
```

## API Routes

### `agent-runtime.routes.js`

Six REST endpoints for config management:

```
GET /api/agent-runtime
  ├─ Returns: Active profile with source metadata
  ├─ Auth: Requires JWT
  └─ Use: Dashboard, health checks

GET /api/agent-runtime/debug/config
  ├─ Returns: Effective config (merged with overrides)
  ├─ Auth: Admin only
  ├─ Query: ?overrides={"key":"value"}
  └─ Use: Dynamic config inspection

GET /api/agent-runtime/debug/validate
  ├─ Returns: { valid, errors, profile }
  ├─ Auth: Admin only
  └─ Use: Config integrity checks

GET /api/agent-runtime/features/:featureName
  ├─ Returns: { enabled, allowedRoles, rolloutPercentage, ... }
  ├─ Auth: Requires JWT
  └─ Use: Feature availability checks

POST /api/agent-runtime/switch
  ├─ Body: { profileId: string }
  ├─ Returns: { previousProfile, newProfile, timestamp }
  ├─ Auth: Admin only
  └─ Use: Switch to staging or production profiles

POST /api/agent-runtime/rollback
  ├─ Body: { reason?: string }
  ├─ Returns: { success, previousActive, newActive, reason }
  ├─ Auth: Admin only
  └─ Use: Emergency recovery to previous profile
```

## Environment Profiles Comparison

| Aspect | Default | Staging | Production |
|--------|---------|---------|------------|
| **High Confidence Threshold** | 0.90 | 0.85 | 0.90 |
| **Medium Confidence Threshold** | 0.70 | 0.65 | 0.75 |
| **Verification Always On** | Yes | Yes | Yes |
| **Verification Strict Mode** | Yes | Yes | Yes |
| **Browser Verification** | Yes | Yes (comprehensive) | Yes (critical only) |
| **Debug Panel** | Yes | Yes | No |
| **Screenshot Capture** | Yes | Yes | No |
| **Decision Source Logging** | Yes | Yes | No |
| **Plugin Registry** | All enabled | Most enabled | Core only |
| **Experimental Features** | Stable ones | Many enabled | Disabled |
| **Log Level** | info | debug | info |

## Deployment Flow

### Local Development

```bash
# Default profile is used automatically
npm run dev

# Switch to staging for testing
curl -X POST http://localhost:5000/api/agent-runtime/switch \
  -H "Authorization: Bearer TOKEN" \
  -d '{"profileId":"cms-agent-staging"}'
```

### Staging Environment

```bash
# Deployment starts with staging profile
ENV=staging npm start

# Monitor via debug endpoints
curl http://localhost:5000/api/agent-runtime/debug/config

# Test experimental features
# Switch back on issues
curl -X POST http://localhost:5000/api/agent-runtime/rollback
```

### Production Environment

```bash
# Production uses production.json
ENV=production npm start

# Only critical logging
# Experimental features disabled
# Conservative confidence thresholds
# Core plugins only

# Monitor with limited access
curl -H "Admin-Auth: TOKEN" \
  http://api.example.com/api/agent-runtime/debug/validate
```

## Integration Points

### With Agent Runtime

Agent queries config at startup and on demand:

```javascript
// At startup
const profile = await configService.getActiveProfile();
this.modeProfile = profile.modeProfiles.execution;
this.confidence = profile.confidencePolicy;

// On decision
if (isLibraryCode()) {
  const shouldTrigger = await decisionService.shouldTriggerLibraryAuto();
  if (shouldTrigger) {
    // Fetch Context7 docs
  }
}
```

### With Skills

Skills declare required plugins:

```javascript
// In skill loader
if (await configService.isFeatureEnabled('skill_selection_v2')) {
  await loadSkill('context7-agent-ops');
}
```

### With Browser Verification

Browser tests determined by config:

```javascript
const profile = await configService.getActiveProfile();
if (profile.browserVerification.enabled) {
  const scenarios = profile.browserVerification.requiredScenarios;
  scenarios.forEach(async (scenario) => {
    await runBrowserTest(scenario);
  });
}
```

## Schema Validation

All profiles must conform to schema with:

- Required fields: `id`, `version`, `status`, `modeProfiles`, `confidencePolicy`
- Optional fields: `experimentalFeatures`, `logging`, `pluginRegistry`
- All confidence bands must sum to [0.0, 1.0] range
- All percentages 0-100
- All log levels valid enum values

Validation run on load and provides detailed error messages.

## Fallback Hierarchy

If active profile loading fails, service uses fallback chain:

1. **Cache**: Return most recent successful profile (if fresh)
2. **Disk**: Reload from profile file (with validation retry)
3. **Last Known Good**: Use previously validated profile
4. **Hardcoded Defaults**: Emergency fallback with all features enabled

Each fallback includes source metadata so consumers know reliability level.

## Examples

### Dynamic Feature Rollout

```javascript
// In staging.json
{
  "experimentalFeatures": {
    "advancedSearch": {
      "enabled": true,
      "rolloutPercentage": 50,
      "allowedRoles": ["instructor"]
    }
  }
}

// In code
if (await configService.isFeatureEnabled('advancedSearch')) {
  // Show advanced search only to instructors
}

// Then gradually increase rolloutPercentage:
// 50% → 75% → 100% → move to production profile
```

### Confidence-Based Responses

```javascript
const confidence = calculateConfidence(response);
const threshold = await configService.getConfidenceThreshold('library_trigger');

if (confidence >= threshold.high) {
  response.citations = true;
} else if (confidence >= threshold.medium) {
  response.uncertaintyMarked = true;
} else {
  response.refusal = true;
  response.requestClarification = true;
}
```

### Emergency Profile Switch

```javascript
// In error handler
if (hasCriticalError()) {
  await configService.activateProfile('production');
  logger.error('Switched to production profile due to errors');
}

// Later, when fixed
await configService.rollback('Restored after error fix');
```

## Monitoring & Observability

### Health Check

```bash
curl http://localhost:5000/api/agent-runtime/debug/validate
```

Returns validation status and any active errors.

### Config Inspection

```bash
curl http://localhost:5000/api/agent-runtime/debug/config?overrides={"logging":{"level":"debug"}}
```

Show merged effective configuration.

### Decision Logging

When `logDecisionSource: true`, every decision logged with:

```json
{
  "decisionType": "library_trigger",
  "source": "dynamic",
  "value": true,
  "reason": "react is in enabledLibraries",
  "timestamp": "2026-03-20T10:30:00Z"
}
```

##Integration Tests

Run integration tests to verify profiles work correctly:

```bash
npm run test:integration -- agent-runtime-config.integration.test.js
```

Tests verify:
- Profile schema validation
- Service method coverage
- Decision service compatibility
- Router integration points
- Plugin registry functionality
- Fallback behavior

## Production Checklist

Before deploying configuration changes:

- [ ] Validate profile JSON schema
- [ ] Test confidence thresholds match intent
- [ ] Verify enabled plugins are available
- [ ] Check experimental features rollout percentages
- [ ] Confirm logging levels appropriate for environment
- [ ] Test profile switching and rollback
- [ ] Run integration test suite
- [ ] Document any breaking changes
- [ ] Plan gradual rollout (if needed)
- [ ] Monitor logs after deployment

## Troubleshooting

### Profile not loading

Check logs for validation errors:
```bash
tail -f logs/agent-runtime.log | grep "validation\|error"
```

Manually validate JSON:
```bash
curl -X GET http://localhost:5000/api/agent-runtime/debug/validate
```

### Feature not working despite being enabled

Verify feature is in active profile:
```bash
curl http://localhost:5000/api/agent-runtime/debug/config | jq '.experimentalFeatures'
```

Check plugin is enabled:
```bash
curl http://localhost:5000/api/agent-runtime/debug/config | jq '.pluginRegistry[] | select(.id=="plugin-name")'
```

### Performance issues from logging

Reduce log level:
```javascript
// In production.json
{
  "logging": {
    "level": "warn"  // Only warnings and errors
  }
}
```

Then reload:
```bash
curl -X POST http://localhost:5000/api/agent-runtime/switch -d '{"profileId":"production"}'
```

## References

- [Agent Architecture](./ARCHITECTURE.md)
- [Decision Integration Service](../services/agent-decision-integration.service.js)
- [Routes Implementation](../modules/agent-runtime/agent-runtime.routes.js)
- [Config Service Implementation](../services/agentRuntimeConfig.service.js)
