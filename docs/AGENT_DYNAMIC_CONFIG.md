# Agent Dynamic Configuration Architecture

## Goal

Move static workflow, skill, trigger, and policy definitions out of the agent instruction file into runtime-managed configuration.

## External Configuration Model

### Option A: CMS Database Tables (recommended)

- `agent_config_profiles`
  - `id`
  - `name`
  - `version`
  - `status` (`draft|active|deprecated`)
  - `payload_json`
  - `checksum`
  - `created_by`
  - `created_at`
  - `activated_at`

- `agent_config_audit`
  - `id`
  - `profile_id`
  - `action` (`create|activate|rollback|deprecate`)
  - `reason`
  - `actor`
  - `created_at`

### Option B: Versioned Config Files

- `server/config/agent-runtime/schema.json`
- `server/config/agent-runtime/profiles/default.json`
- Additional profiles can be added as separate JSON files.

## Runtime Loading and Cache

1. Resolve active profile source:
   - database active profile first
   - fallback to file profile
   - fallback to last known-good cache
2. Validate against schema before applying.
3. Build in-memory cache with TTL.
4. Apply by atomic swap only.
5. On validation/load failure:
   - keep previous active profile
   - emit warning and audit record

## Hot Reload Strategy

Support one or more:

- scheduled refresh (e.g., every 60s)
- admin-triggered reload API
- message-bus invalidation event

Safety requirements:

- schema validation first
- atomic swap
- no interruption of in-flight tasks

## Versioning and Rollback

Each profile must include:

- `id`
- `version` (semver)
- `status`
- `activatedAt`
- `checksum`

Rollback process:

1. Select previous active profile version.
2. Mark as active and write audit entry with reason.
3. Invalidate cache.
4. Reload active profile.

## Execution Engine Changes

The engine becomes configuration-driven:

- resolve mode profile from config (`execution|explainability|proactive`)
- evaluate triggers from config instead of hardcoded conditions
- enforce confidence/refusal policy from config
- run verification pipeline from config steps
- use plugin registry from config for activation decisions
- use browser verification scenario list from config

No hardcoded workflow text should control runtime behavior.

## Example Migration (from static instruction file)

### Before

- hardcoded mode workflows in instruction file
- hardcoded plugin bundles and browser matrices
- hardcoded confidence thresholds

### After

- instruction file keeps immutable guardrails and contracts only
- detailed operational behavior is read from runtime profile JSON/DB
- updates to workflows/policies happen via CMS config publish/activate

## Minimal API Surface (optional)

- `GET /api/agent/config/active`
- `POST /api/agent/config/reload`
- `POST /api/agent/config/activate/:profileId`
- `POST /api/agent/config/rollback/:profileId`

## Notes

- Keep schema strict to prevent invalid runtime behavior.
- Keep audit logs mandatory for activate/rollback actions.
- Keep last known-good cache for resilience.
