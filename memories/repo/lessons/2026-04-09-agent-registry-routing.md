# Lesson: New Agent Registry Must Update Three Places Together

Date: 2026-04-09

- When introducing a new sub-agent, update the orchestrator roster, the structured handoff contract, and the validator required-agent list in the same change set.
- If a new agent emits a custom structured report, the orchestrator must explicitly parse that report and define a whitelist-safe fallback for any routing field.
- Verification should include a reviewer pass that checks both discoverability and deterministic routing, not just the presence of the new agent file.