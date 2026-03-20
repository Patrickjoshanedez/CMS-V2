# Agent Runtime Configuration

This directory manages dynamic runtime configuration for the agent execution layer.

## Structure

```
agent-runtime/
├── profiles/          # Profile JSON files (one per profile)
│   ├── default.json      # Default/fallback profile
│   ├── staging.json      # Staging profile
│   └── production.json    # Production profile
├── state.json         # Current active profile (managed by service)
└── README.md          # This file
```

## Profile Schema

Each profile is a JSON file with this structure:

```json
{
  "id": "default",
  "version": "1.0.0",
  "status": "active",
  "expiresAt": "2026-12-31T23:59:59Z",
  "checksum": "abc123...",
  "settings": {
    "features": {
      "course_creation": {
        "enabled": true,
        "allowedRoles": ["instructor"],
        "rolloutPercentage": 100
      },
      "advanced_quizzes": {
        "enabled": false,
        "allowedRoles": [],
        "rolloutPercentage": 0
      },
      "dynamic_runtime_config": {
        "enabled": true
      },
      "skill_selection_v2": {
        "enabled": false,
        "allowedRoles": ["instructor"],
        "rolloutPercentage": 25
      },
      "full_dynamic_runtime_config": {
        "enabled": false
      }
    },
    "policies": {
      "library_auto_trigger": {
        "id": "lib-trigger-v1",
        "enabledLibraries": [
          "react",
          "mongoose",
          "express",
          "react-query",
          "zustand"
        ]
      }
    },
    "thresholds": {
      "confidence": {
        "library_trigger": 0.7,
        "skill_selection": 0.65,
        "default": 0.7
      }
    },
    "logging": {
      "level": "info",
      "logDecisionSource": true
    }
  }
}
```

## Usage

### From Code (Service Layer)

```javascript
import agentRuntimeConfigService from '../services/agentRuntimeConfig.service.js';
import agentDecisionIntegrationService from '../services/agent-decision-integration.service.js';

// Get active profile
const { profile, source } = await agentRuntimeConfigService.getActiveProfile();

// Check if feature is enabled
const enabled = await agentRuntimeConfigService.isFeatureEnabled('course_creation');

// Get setting with fallback
const threshold = await agentRuntimeConfigService.getConfidenceThreshold('library_trigger');

// Use decision integration for guarded decisions
const shouldTrigger = await agentDecisionIntegrationService.shouldTriggerLibraryAuto({
  libraryName: 'react',
  useRuntimeConfig: true,
});

// Log decision source
await agentDecisionIntegrationService.logDecisionSource({
  decisionType: 'library_trigger',
  source: 'dynamic',
  value: true,
  reason: 'Found in enabled libraries list',
});
```

### Via API Routes

```bash
# Get active profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/agent-runtime

# Check if feature is enabled
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/agent-runtime/features/course_creation

# Get debug config
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/agent-runtime/debug/config

# Validate active profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/agent-runtime/debug/validate

# Switch to different profile
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileId":"staging"}' \
  http://localhost:5000/api/agent-runtime/switch

# Rollback to previous profile
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"broken_feature"}' \
  http://localhost:5000/api/agent-runtime/rollback
```

## Integration Points

### Pilot Decision Point: Library Auto-Trigger

**Location**: `services/agent-decision-integration.service.js`—`shouldTriggerLibraryAuto()`

**What it does**:
- Queries runtime config for `policies.library_auto_trigger.enabledLibraries`
- Falls back to static defaults if config unavailable
- Logs decision source (static vs dynamic)

**How to use it**:
```javascript
const { enabled, source } = await agentDecisionIntegrationService.shouldTriggerLibraryAuto({
  libraryName: 'react',
  useRuntimeConfig: true,
});

if (enabled) {
  // Trigger Context7 library documentation lookup
}
```

**Guarded rollout**:
- Feature flag: `full_dynamic_runtime_config` (default: disabled)
- Environment: `USE_RUNTIME_CONFIG=true/false`
- If either is false, uses static defaults automatically

### Additional Decision Points (Ready to Implement)

1. **Confidence Threshold** (`checkConfidenceThreshold`)
   - Location: `services/agent-decision-integration.service.js`
   - Setting: `thresholds.confidence.{decisionType}`

2. **Skill Selection Strategy** (`getSkillSelectionStrategy`)
   - Location: `services/agent-decision-integration.service.js`
   - Feature: `skill_selection_v2`
   - Rollout: percentage-based with role restrictions

3. **Logging Level**
   - Setting: `logging.level` (debug, info, warn, error)
   - Use: `await agentRuntimeConfigService.getLogLevel()`

## Fallback Guarantees

The service implements a three-tier fallback hierarchy:

1. **Active Profile** (from `state.json`)
   - Cached in memory (5-minute TTL)
   - Validated on every load
   - If invalid → falls back to tier 2

2. **Last Known Good** (from previous successful load)
   - Kept in memory for the lifetime of the service
   - If current profile is corrupt → use this
   - Logged as fallback event

3. **Hardcoded Safe Defaults**
   - Bare minimum config to keep agent running
   - All features conservative (disabled by default)
   - Logged as critical fallback

## Monitoring & Validation

### Health Checks

```javascript
// Validate active profile
const { site, errors, hasExpired } = await agentDecisionIntegrationService
  .debug_validate();

// Dump effective configuration
const config = await agentRuntimeConfigService.getEffectiveConfig();
```

### Logging

All decisions logged with:
- Decision type
- Source (static/dynamic/fallback)
- Reasoning
- Timestamp

Review logs in:
```
server/logs/agent-runtime.log
```

## Rollout Strategy

### Phase 1: Passive (Current)
- Config layer fully built
- API routes functional
- Integration service ready
- Feature flags all disabled
- Zero production impact

### Phase 2: Pilot (Next)
- Enable `dynamic_runtime_config` for small user group
- CLI tool for admins to test config changes
- Monitor logs for anomalies
- Document decision points

### Phase 3: Gradual Rollout
- Enable `full_dynamic_runtime_config` with percentage-based rollout
- Use feature flags for soft rollout per decision type
- Monitor performance and behavior
- Plan rollback procedure

### Phase 4: Full Adoption
- All decisions use runtime config by default
- Static defaults become fallback only
- Configuration owned by infrastructure team
- Central dashboard for config management

## Testing

See test files:
- `tests/unit/agent-runtime-config.service.test.js` — Service layer tests
- `tests/integration/agent-runtime.test.js` — API integration tests

Run tests:
```bash
npm run test -- tests/unit/agent-runtime-config.service.test.js
npm run test -- tests/integration/agent-runtime.test.js
```

## Troubleshooting

### "No active profile found"
- Check that `state.json` exists and is valid
- Verify `default.json` exists in `profiles/`
- Check file permissions

### "Profile checksum mismatch"
- Profile file may be corrupted
- Rollback to previous profile: `POST /api/agent-runtime/rollback`
- Replace profile file with backup

### "Feature flag not found"
- Check profile schema matches expected structure
- Verify feature name in code matches config key
- Default to safe (disabled) if not found

## Security Notes

- Configuration files stored on disk (encrypted at rest recommended)
- State file contains active profile ID only (no secrets)
- API access requires `instructor+` role
- All changes logged with user context
- Rollback preserves audit trail
