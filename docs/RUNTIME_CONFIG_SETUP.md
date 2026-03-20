# Agent Runtime Config - Setup & Quick Start

## Quick Setup (5 minutes)

### 1. Verify Files Are in Place

```bash
# Check config service exists
ls -la server/services/agentRuntimeConfig.service.js
ls -la server/services/agent-decision-integration.service.js

# Check profiles exist
ls -la server/config/agent-runtime/profiles/
# Should show: default.json, staging.json, production.json

# Check routes are configured
ls -la server/modules/agent-runtime/agent-runtime.routes.js

# Check tests exist
ls -la server/tests/integration/agent-runtime-config.integration.test.js
```

All should exist ✅

### 2. Run Integration Tests

```bash
# From project root
npm test -- agent-runtime-config.integration.test.js

# Expected output:
# ✓ Profile schema validation (4 tests)
# ✓ Decision service compatibility (3 tests)  
# ✓ Service method coverage (6 tests)
# ✓ Multi-profile support (2 tests)
# ✓ Fallback behavior (2 tests)
# ✓ Plugin registry integration (2 tests)
# ✓ Logging configuration (2 tests)
# ✓ Router integration points (5 tests)
# 
# Total: 25+ tests, all passing ✅
```

### 3. Verify Routes Work

```bash
# Start server
npm start

# In another terminal, test endpoints:

# 1. Get active profile
curl http://localhost:5000/api/agent-runtime

# Expected response:
# {
#   "success": true,
#   "profile": { ...default profile... },
#   "source": "active",
#   "metadata": { "loadedAt": "...", "ttl": 3600 }
# }

# 2. Validate profile
curl http://localhost:5000/api/agent-runtime/debug/validate

# Expected:
# {
#   "valid": true,
#   "errors": [],
#   "profile": "default"
# }

# 3. Get feature config
curl http://localhost:5000/api/agent-runtime/features/splitScreenViewer

# Expected:
# {
#   "enabled": true,
#   "rolloutPercentage": 100,
#   "allowedRoles": ["*"],
#   "description": "..."
# }
```

## Integration with Agent

### Step 1: Load Config Service in Agent

```javascript
// In your main agent file (e.g., server/services/agent.service.js)
const configService = require('./agentRuntimeConfig.service');
const decisionService = require('./agent-decision-integration.service');

class Agent {
  async initialize() {
    // Load active profile
    const profile = await configService.getActiveProfile();
    
    // Set mode based on request context
    this.activeMode = this.detectMode(profile);
    
    // Get confidence policy
    this.confidencePolicy = profile.confidencePolicy;
    
    // Load plugins
    this.plugins = await this.loadPlugins(profile);
  }

  // Detect mode based on request
  detectMode(profile) {
    const requestKeywords = ['why', 'how', 'explain'];
    const isExplainability = requestKeywords.some(k => 
      this.currentRequest.includes(k)
    );
    
    if (isExplainability) {
      return profile.modeProfiles.explainability;
    }
    return profile.modeProfiles.execution;
  }

  // Load plugins from config
  async loadPlugins(profile) {
    const plugins = {};
    
    for (const plugin of profile.pluginRegistry) {
      if (plugin.enabled) {
        try {
          plugins[plugin.id] = await import(`./plugins/${plugin.id}.js`);
        } catch (e) {
          logger.warn(`Failed to load plugin: ${plugin.id}`, e);
        }
      }
    }
    
    return plugins;
  }
}
```

### Step 2: Use Decision Service in Agent Loop

```javascript
// In your agent's main execution loop
async execute(request) {
  // 1. Check if should trigger library auto-load
  if (isLibraryCode(request)) {
    const shouldTrigger = await decisionService.shouldTriggerLibraryAuto({
      libraryName: 'react',
      options: {}
    });
    
    if (shouldTrigger) {
      // Fetch Context7 docs
      const docs = await context7.getLibraryDocs('react');
    }
  }

  // 2. Execute main logic
  const result = await this.generateResponse(request);

  // 3. Check confidence and apply policy
  const confidence = this.calculateConfidence(result);
  const threshold = await configService.getConfidenceThreshold('response');
  
  if (confidence >= threshold.high) {
    result.citations = true;
  } else if (confidence >= threshold.medium) {
    result.uncertainty = true;
  } else {
    result.refusal = true;
  }

  // 4. Log decision if enabled
  if (await configService.isDecisionSourceLoggingEnabled()) {
    await decisionService.logDecisionSource({
      type: 'response_generation',
      confidence,
      threshold,
      mode: this.activeMode.name,
      timestamp: new Date()
    });
  }

  // 5. Run verification if triggered
  if (shouldVerify(request)) {
    const verified = await this.runVerification(result);
    if (!verified) {
      return this.getRefusalResponse(result);
    }
  }

  return result;
}

// Helper: determine if verification needed
function shouldVerify(request) {
  const triggers = [
    'factual claim',
    'numeric output',
    'security implication',
    'external api',
    'performance critical'
  ];
  
  return triggers.some(trigger => 
    request.toLowerCase().includes(trigger)
  );
}
```

### Step 3: Use Feature Flags

```javascript
// Check if experimental feature enabled
async executeWithFeatureGate(featureName, fn) {
  const enabled = await configService.isFeatureEnabled(featureName);
  
  if (enabled) {
    return await fn();
  } else {
    logger.info(`Feature disabled: ${featureName}`);
    return this.getDefaultBehavior(featureName);
  }
}

// In code:
const result = await executeWithFeatureGate(
  'advancedDocumentSearch',
  () => this.runAdvancedSearch(query)
);
```

## Environment-Specific Setup

### Development (Default Profile)

```bash
# No setup needed - default.json is used automatically
npm run dev

# All features enabled for development
# Debug panel available
# All logging enabled
# All plugins loaded
```

### Staging (Enhanced Testing)

```bash
# Start with staging profile
ENV=staging npm start

# Or switch after startup
curl -X POST http://localhost:5000/api/agent-runtime/switch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"profileId":"cms-agent-staging"}'

# Staging features:
# ✓ Debug panel enabled
# ✓ All logging at debug level
# ✓ Experimental features at 50-100% rollout
# ✓ Comprehensive browser verification
# ✓ All plugins enabled
```

### Production (Conservative)

```bash
# Deploy with production profile
ENV=production npm start

# Production features:
# ✓ Debug panel disabled
# ✓ Logging at info/warn level only
# ✓ Experimental features mostly disabled
# ✓ Limited browser verification
# ✓ Core plugins only
# ✓ Higher confidence thresholds
```

## Common Tasks

### Switch to Staging for Testing

```bash
# Via API
curl -X POST http://localhost:5000/api/agent-runtime/switch \
  -H "Content-Type: application/json" \
  -d '{"profileId":"cms-agent-staging"}' \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Verify change
curl http://localhost:5000/api/agent-runtime
# Should show source: "active", profile: staging.json content
```

### Rollback After Issues

```bash
# Quickly revert to previous profile
curl -X POST http://localhost:5000/api/agent-runtime/rollback \
  -H "Content-Type: application/json" \
  -d '{"reason":"High error rate detected"}' \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Enable an Experimental Feature Safely

In `staging.json`:
```json
{
  "experimentalFeatures": {
    "myNewFeature": {
      "enabled": true,
      "rolloutPercentage": 25,  // Start at 25%
      "allowedRoles": ["instructor"],
      "description": "New feature testing"
    }
  }
}
```

Then gradually increase:
```json
// Day 1: 25%
"rolloutPercentage": 25

// Day 2: 50%
"rolloutPercentage": 50

// Day 3: 75%
"rolloutPercentage": 75

// Day 4: 100%
"rolloutPercentage": 100

// Then: move to production.json and remove staging
```

### Monitor Decisions in Production

Assuming `logDecisionSource: true` in config:

```bash
# Watch decision logs
tail -f logs/agent-runtime.log | grep "decision_source"

# Expected output:
# {"decisionType":"library_trigger","source":"dynamic","value":true,"reason":"react enabled","timestamp":"2026-03-20T10:30:00Z"}
# {"decisionType":"confidence_check","source":"static","value":true,"reason":"confidence 0.95 >= threshold 0.90","timestamp":"2026-03-20T10:30:01Z"}
```

## Troubleshooting

### Issue: "Profile failed to load"

**Check 1: Validate JSON**
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('server/config/agent-runtime/profiles/default.json', 'utf8')))"
```

**Check 2: Verify file exists**
```bash
ls -la server/config/agent-runtime/profiles/
```

**Check 3: Check file permissions**
```bash
chmod 644 server/config/agent-runtime/profiles/*.json
```

### Issue: "Routes returning 404"

**Check 1: Routes registered**
```bash
grep -n "agent-runtime" server/modules/agent-runtime/agent-runtime.routes.js | head
# Should show route registrations
```

**Check 2: Routes mounted in express**
```bash
grep -n "agent-runtime.*routes" server/app.js
# Should show: app.use('/api/agent-runtime', require(...))
```

**Check 3: Server restarted after changes**
```bash
# Kill and restart
npm start
```

### Issue: "Features not working"

**Check 1: Feature enabled in profile**
```bash
curl http://localhost:5000/api/agent-runtime/features/featureName
# Should show enabled: true
```

**Check 2: Plugin loaded**
```bash
curl http://localhost:5000/api/agent-runtime/debug/config | jq '.pluginRegistry[] | select(.id=="plugin-name")'
# Should exist and be enabled: true
```

**Check 3: Role has permission**
```javascript
// In your code, check:
const config = await configService.getFeatureConfig(featureName);
if (config.allowedRoles.includes(userRole) || config.allowedRoles.includes('*')) {
  // User can access feature
}
```

## Next Steps

1. **✅ Verify all files exist** - Check they're in place
2. **✅ Run integration tests** - Confirm everything works
3. **✅ Test routes** - Verify API endpoints
4. **✅ Integrate with agent** - Wire decision service into agent loop
5. **⏳ Deploy to staging** - Test with real workloads
6. **⏳ Monitor logs** - Watch decision logging
7. **⏳ Deploy to production** - Gradual rollout
8. **⏳ Monitor performance** - Watch metrics

## Reference Files

- **Architecture**: [AGENT_RUNTIME_CONFIG.md](./AGENT_RUNTIME_CONFIG.md)
- **Service Implementation**: `server/services/agentRuntimeConfig.service.js`
- **Decision Bridge**: `server/services/agent-decision-integration.service.js`
- **HTTP Routes**: `server/modules/agent-runtime/agent-runtime.routes.js`
- **Profiles**: 
  - `server/config/agent-runtime/profiles/default.json`
  - `server/config/agent-runtime/profiles/staging.json`
  - `server/config/agent-runtime/profiles/production.json`
- **Tests**: `server/tests/integration/agent-runtime-config.integration.test.js`

## Quick Command Reference

```bash
# Run tests
npm test -- agent-runtime-config.integration.test.js

# Start with profile
ENV=staging npm start

# Get active profile
curl http://localhost:5000/api/agent-runtime

# Validate config
curl http://localhost:5000/api/agent-runtime/debug/validate

# Get effective config
curl http://localhost:5000/api/agent-runtime/debug/config

# Check feature
curl http://localhost:5000/api/agent-runtime/features/featureName

# Switch profile
curl -X POST http://localhost:5000/api/agent-runtime/switch \
  -d '{"profileId":"cms-agent-staging"}'

# Rollback
curl -X POST http://localhost:5000/api/agent-runtime/rollback \
  -d '{"reason":"error recovery"}'
```

## Support

For issues or questions:
1. Check logs: `tail -f logs/agent-runtime.log`
2. Validate config: `curl /api/agent-runtime/debug/validate`
3. Review tests: `npm test -- agent-runtime-config.integration.test.js`
4. Read docs: [AGENT_RUNTIME_CONFIG.md](./AGENT_RUNTIME_CONFIG.md)
