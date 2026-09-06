---
name: verification-loop
version: 1.2.0
schema-version: 1
description: Verification-first loop for test, lint, runtime, and evidence checks before declaring completion.
---

# Verification Loop

Use this skill for tasks where correctness must be proven, not assumed.

## Focus Areas
- Fast-Path Targeted Testing (1–5s feedback) during active code iteration
- Test and lint gates for each meaningful change
- Runtime validation of critical paths
- Evidence mapping between claims and outputs
- Comprehensive quality gates before final task completion

## Fast-Path Targeted Testing Pattern
```bash
# Target only the relevant test file:
npm test --workspace=client -- <test-file-path>
# Or targeted server test:
npm test --workspace=server -- <test-file-path>
```

## Usage Triggers
- "verify"
- "prove it works"
- "run tests"
- "targeted test"
- "speed up tests"
- "quality gate"
- "pre-final audit"
