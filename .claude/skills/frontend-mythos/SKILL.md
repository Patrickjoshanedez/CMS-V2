---
name: frontend-mythos
description: Autonomous frontend engineering engine featuring Playwright-powered visual inspection, automated DOM readiness waiting, and design system benchmarking. Triggers whenever designing, implementing, or visually refactoring UI components, landing pages, or complex web applications.
---

# Frontend Mythos: Apex Autonomous Engineering Engine

## Overview & The 4-Layer Architecture
The **Frontend Mythos** skill represents the highest tier of agentic frontend engineering. It moves beyond superficial UI generation to engineer accessible, secure, and visually pristine frontend systems through **Claude Code native dispatching, goal-based loops, adversarial stress testing, and prompt-caching optimization**.

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: CLAUDE.md Dispatcher (Universal Repository Routing)│
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: SKILL.md Frontmatter (< 1,024 chars in System Prompt)│
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Core Directives & /goal Loop Orchestration (Here) │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: On-Demand Deep References (@references/*.md)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Native Goal-Based Loops (`/goal`) & Dispatching

Instead of manually prompting through repetitive conversational turns, hand off the visual verification cycle to Claude Code's native `/goal` primitive with strict turn limits:

```bash
/goal "Build the enterprise analytics dashboard. Run the visual-verify script and resolve all visual defects against the aesthetic benchmarks." stop after 5 tries
```

### Exit Conditions
The agent treats a zero-error, zero-warning Playwright report (`report.json` with status `"passed"`) as the absolute completion gate. If defects remain after 5 tries, the agent halts, documents remaining layout issues, and requests developer review.

---

## 2. Event-Driven Post-Save Hooks

The skill pairs with `.claude/hooks/post-save.sh`. When any `.tsx`, `.jsx`, `.vue`, or `.css` file is saved, the environment automatically executes:

```bash
npx tsx .claude/skills/frontend-mythos/scripts/visual-verify.ts http://localhost:3000 .claude/artifacts/visual-feedback
```

This shifts the visual verification burden from the AI's memory to the local filesystem infrastructure.

---

## 3. Adversarial Stress-Testing Suite

Before marking any component complete, the runner (`scripts/visual-verify.ts`) subjects the layout to three adversarial tests:
1. **The "German Noun" Test**: Injects 40-character unbroken strings (`Rindfleischetikettierungsueberwachungsaufgabengesetz`) into text elements to verify that `truncate`, `min-w-0`, and `shrink-0` prevent layout blowout.
2. **The "Zero-Data" Test**: Verifies empty lists and tables render an informative empty-state without collapsing parent container heights.
3. **The "Network Latency" Test**: Simulates Fast 3G throttling to verify loading skeletons maintain matching layout bounds without Cumulative Layout Shift (CLS).

---

## 4. Sub-Agent Delegation & Context Isolation

For views involving heavy state management, API routes, or multi-step forms:
1. **Root Agent**: Handles data-fetching logic, schemas, and API contracts.
2. **Sub-Agent**: Dispatched specifically for UI/CSS execution:
   > *"Spawn a subagent constrained by frontend-mythos to implement this component, execute the Playwright loop until green, and bring back only the final verified code."*
3. **Context Compaction**: After a successful visual loop in the main thread, execute `/compact` to strip intermediate reasoning and failed captures from history.

---

## 5. Prefix Caching Health & Token Compression

Unoptimized loops exhaust context through quadratic token scaling. Adhere to these cache preservation rules:

### Cache Boundary Protection
* **Static Reference Files**: Reference documents in `references/` are 100% static. Never inject timestamps or dynamic variables into them.
* **Bottom-Appended Reports**: When passing Playwright results to the agent, append `report.json` at the very bottom of the context window to preserve the cached prefix.
* **Don't Re-paste Prompts**: To adjust design rules, update the relevant `references/*.md` file and instruct the agent to re-read it. File reads hit the prompt cache; conversational re-explanations do not.

### The "RTK" Principle (Reduced Token Kernel)
The runner filters raw Playwright logs through a deduplication filter:
* Duplicate React warnings (e.g. 50 missing key warnings) are collapsed into a single entry with a count and origin line.
* Optional local compression: queries `http://localhost:8000/compress` (LLMLingua-2) to shrink DOM snippets by up to 75% while preserving structural tokens (`<`, `>`, `class`, `role`).

---

## 6. On-Demand Reference Specifications (Level 3)

Load reference specifications explicitly only when needed for the active task:
* [`@references/aesthetic-benchmarks.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/aesthetic-benchmarks.md): Linear 8pt grid, Stripe tabular numbers & subtle badges, Vercel negative space.
* [`@references/common-layout-pitfalls.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/common-layout-pitfalls.md): Hydration mismatches, mobile flex squishing, FOIT, and radius warping.
* [`@references/token-compression.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/token-compression.md): Minified Playwright JSON schema & LLMLingua-2 DOM tuning.
* [`@references/design-tokens.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/design-tokens.md): Spatial scales, 4-tier color layers, WCAG 2.2 contrast, nested radius math ($R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$).
* [`@references/state-machine.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/state-machine.md): Discriminated unions, enterprise form reducer, optimistic rollback mutations.
* [`@references/a11y-wcag.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/a11y-wcag.md): Focus traps (`useFocusTrap`), roving tabindex, 44x44px touch geometry.
* [`@references/security-xss.md`](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/skills/frontend-mythos/references/security-xss.md): DOMPurify sanitization, rel="noopener noreferrer", protocol allowlisting.

---

## Anti-Slop Visual Blacklist
* ❌ Neon purple/violet radial glows or ambient background orbs.
* ❌ Overused frosted-glass cards with excessive `backdrop-blur-xl`.
* ❌ Floating detached pill containers without visual anchoring.
* ❌ Generic low-contrast gray text failing WCAG 2.2 AA contrast.
* ❌ Arbitrary rounded corners that violate nested radius geometry.

---

## Red Flags - STOP and Start Over
1. Declaring a UI task complete without running `visual-verify.ts` and inspecting the resulting screenshots.
2. Storing async state as independent booleans (`isLoading`, `isError`).
3. Hardcoded hex colors (`#6366f1`, `#0f172a`) in functional component markup.
4. Interactive `<div>` or `<span>` without native button/link semantics.
5. Modal dialog that does not trap focus or lacks `Escape` key dismissal.
