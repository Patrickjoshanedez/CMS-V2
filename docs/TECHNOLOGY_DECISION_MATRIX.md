# Technology Decision Matrix

## Purpose
This one-page matrix records technologies currently used in CMS-V2, items intentionally deferred, and practices intentionally rejected, with the decision rationale and source references.

## Used (Adopted)

| Category | Technology / Pattern | Status | Reason | Source |
| --- | --- | --- | --- | --- |
| Frontend framework | React 18 + Vite | Adopted | Fast SPA development, modular UI architecture in monorepo | docs/ARCHITECTURE.md, docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Styling system | Tailwind CSS + shadcn/ui conventions | Adopted | Consistent design system and composable UI primitives | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Client state | Zustand | Adopted | Lightweight client-side session and UI state handling | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Server state | React Query | Adopted | Caching, refetch, async state coherence | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Backend runtime | Node.js + Express | Adopted | Mature API ecosystem and middleware pipeline | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Data layer | Mongoose + MongoDB | Adopted | Document model fit for project/submission workflows | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Validation | Zod schemas in module validation layer | Adopted | Strong request validation and predictable API contracts | docs/ARCHITECTURE.md |
| Realtime | Socket.IO | Adopted | User-scoped notifications and event updates | docs/ARCHITECTURE.md |
| Background jobs | BullMQ + Redis | Adopted | Async plagiarism/email processing and queue dedupe | docs/ARCHITECTURE.md, docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Object storage | AWS S3 | Adopted | Durable file storage for submission assets | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Repo architecture | Monorepo split: client/server/shared | Adopted | Shared schemas/constants and reduced duplication | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md, docs/ARCHITECTURE.md |
| Agent runtime strategy | Mode-based dynamic runtime profiles | Adopted/Migrating | Move from hardcoded behavior to profile-driven control | docs/AGENT_DYNAMIC_CONFIG.md, docs/RUNTIME_CONFIG_COMPLETE_INVENTORY.md |

## Deferred (Planned Later)

| Capability | Deferred To | Reason | Source |
| --- | --- | --- | --- |
| Capstone 2/3 implementation workflow | Phase 3 | Sequence dependency; stabilize Capstone 1 first | docs/archive/PHASE_2_STRATEGY.md |
| Capstone 4 defense and archiving | Phase 4 | End-of-lifecycle scope | docs/archive/PHASE_2_STRATEGY.md |
| Prototype showcase features (media/links) | Phase 3 | Not required for earlier workflow baseline | docs/archive/PHASE_2_STRATEGY.md |
| Dual version upload (Academic + Journal) | Phase 4 | Final submission feature set | docs/archive/PHASE_2_STRATEGY.md |
| Archive search/reporting features | Phase 4 | Requires mature archive data | docs/archive/PHASE_2_STRATEGY.md |
| Split-screen document comparison UI | Phase 3 | Complexity postponed; adviser workflow sufficient in Phase 2 | docs/archive/PHASE_2_STRATEGY.md |
| Defense grading and certificate generation | Phase 3/4 | Depends on later-stage capstone milestones | docs/archive/PHASE_2_STRATEGY.md |
| Google Docs API integration | Phase 3 | Deliberate complexity management | docs/archive/PHASE_2_STRATEGY.md |

## Rejected / Intentionally Avoided

| Item | Decision | Reason | Source |
| --- | --- | --- | --- |
| Inline styles for normal UI work | Rejected | Enforce consistent styling with Tailwind system | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Raw CSS files for normal UI work | Rejected | Prevent style drift; allow only narrow override exceptions | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Duplicating cross-domain schemas/constants | Rejected | shared module is mandatory for reusable contracts | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Vague variable/function names (e.g., data, temp) | Rejected | Maintain clarity and reviewability under anti-slop quality bar | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Leaking sensitive internals in API responses | Rejected | Security and privacy safeguards | docs/MASTER_ARCHITECTURE_AND_QUALITY_RULES.md |
| Hardcoded runtime workflow text as control plane | Rejected (migration target) | Runtime behavior should come from config/profile system | docs/AGENT_DYNAMIC_CONFIG.md |

## Governance Notes
- Decision owner: Architecture maintainers for CMS-V2 monorepo.
- Update trigger: Any stack change, migration decision, or phase-scope change.
- Suggested review cadence: once per sprint and before major release tags.
