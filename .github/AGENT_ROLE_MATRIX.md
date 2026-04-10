# CMS-V2 Agent Role Matrix & Orchestration Guide

**Last Updated:** April 11, 2026  
**Purpose:** Definitive agent role assignment, invocation triggers, and capability matrix

---

## Agent Roles & Responsibilities

### 🧠 Strategic & Architectural Thinking

#### **Thinker pro** (THE BREAKTHROUGH AGENT)
- **Role**: Apex cognitive entity for impossible problems, breakthrough thinking, hypothesis-driven architecture
- **Invoke When**:
  - Scaling bottlenecks or performance crises
  - Race conditions, deadlock patterns, or complex synchronization
  - Data flow redesigns or architectural overhauls
  - Multi-step algorithmic problems requiring proof-of-concept
  - Standard implementation approaches have failed (after coder/test-automation attempt)
- **Primary Input**: Problem description, failed attempts, constraints
- **Output**: `<thinker_pro_strategy>` containing hypothesis_proof, architectural_blueprint, execution_directives
- **MCP Access**: Full (context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills to Load**: `discover-engineering`, `mermaid-diagrams`, refactor (if code cleanup), `Thinker pro` (if available)
- **Escalation**: None (apex agent)
- **Post-Strategy**: Hand off to `coder` (backend) or `product-design-handoff` (frontend) with strategy document

---

#### **context-manager** (THE STATE ORCHESTRATOR)
- **Role**: Hyper-efficient context persistence, token budget management, HLLM enforcement
- **Invoke When**:
  - Session bootstrap (Phase 1 preflight)
  - Context compression approaching token limits
  - Inter-agent handoff state persistence
  - HLLM lesson learning (post-failure)
  - Final completion (persist learned patterns)
- **Primary Input**: Current execution state, context layers, todo list
- **Output**: Persisted state, trimmed context, HLLM lessons
- **MCP Access**: Full (all MCPs for state validation and codebase intelligence)
- **Skills**: None (role is meta, not skill-dependent)
- **Escalation**: None (foundational agent)
- **Integration**: Called by orchestrator before major phase transitions

---

### 🔍 Research & Discovery

#### **researcher** (THE INTELLIGENCE UNIT)
- **Role**: Technical context gathering, documentation lookup, codebase exploration, code example discovery
- **Invoke When**:
  - Need framework/library documentation or API signatures
  - Codebase exploration for feature patterns or architectural precedent
  - External research (web sources, academic papers, benchmarks)
  - System design precedents or known solutions
  - Competitor/industry analysis
- **Primary Input**: Research query, topic, scope
- **Output**: `<research_summary>` with grounded facts, URLs, code snippets
- **MCP Access**: Full (context7, github-mcp-server, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills**: None (role is discovery-first)
- **When NOT to Use**: Don't use researcher if you have exact file paths already (use direct file reads)
- **Escalation**: None (primary researcher)

---

### 💻 Implementation (Domain-Specific)

#### **coder** (BACKEND SUPREME)
- **Role**: Backend/server implementation ONLY. Node.js, Python, PHP/Laravel APIs, databases, services.
- **Invoke When**:
  - Need to write/modify server logic, APIs, database queries
  - Backend business logic, validation, service layer
  - Database schema design, migrations
  - Infrastructure code (unless cloud-specific → defer to devops)
- **Do NOT Invoke For**: Frontend React/Vue code (defer to product-design-handoff)
- **Primary Input**: Backend feature specification, Thinker pro strategy (if complex)
- **Output**: `<implementation_report>` with files, logic, local test results
- **MCP Access**: Full (context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills to Load**: `senior-backend`, `mongoose-mongodb`, `python`, `refactor`, `senior-data-engineer`, `verification-loop`
- **Test Responsibility**: Write tests locally before handoff; ensure they pass
- **Escalation Path**: 
  - If 2 failed fix attempts → invoke `logic-debugger`
  - If blocked on environment/permissions → escalate to `orchestrator`

---

#### **product-design-handoff** (FRONTEND SUPREME)
- **Role**: SOLE frontend implementation agent. React, Vue, Tailwind, component design, accessibility, UX.
- **Invoke When**:
  - Need to code React/Vue/Svelte components
  - UI/UX implementation with Tailwind or design system
  - Form design, state management (zustand, tanstack-query)
  - Accessibility audits and fixes
  - Responsive breakpoint and layout logic
  - Design-to-code handoff, prototyping
- **Do NOT Invoke For**: Backend APIs, database logic (defer to coder)
- **Primary Input**: Product brief, design system docs, Figma, feature spec (if UI-focused)
- **Output**: `<design_handoff_report>` with implementation brief, prototype components, accessibility findings
- **MCP Access**: Full (context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills to Load** (MANDATORY): `shape`, `impeccable`, `audit`, `harden`, `optimize`, `clarify`, `normalize`, `extract`, `adapt`, `animate`, `polish`, `zustand`, `tanstack-query`, `frontend-patterns`, `frontend-specialist`
- **Test Responsibility**: Visual regression, accessibility, responsive tests
- **Escalation Path**:
  - If 2 failed fix attempts → invoke `logic-debugger`
  - If blocked → escalate to `orchestrator`

---

### 🧪 Validation & Hardening

#### **test-automation** (TEST AUTHORITY)
- **Role**: Test writing, execution, failure analysis, mutation scoring, fix loop enforcement
- **Invoke When**:
  - Need unit/integration/e2e tests written and executed
  - Test failures need fixing (mandatory fix loops: test → fix → retest up to 3 cycles)
  - Mutation score or code coverage analysis
  - Test flakiness diagnosis
- **Primary Input**: Code to test, failing test command, expected behavior
- **Output**: Test execution report, pass/fail metrics, mutation scores
- **MCP Access**: Full (context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills**: `verification-loop`, pytest/jest frameworks know-how
- **Mandatory Behavior**: Test → Fix → Retest loop. Do NOT stop at failure without attempting fix.
- **Escalation Path**: 
  - If unresolved after 3 fix attempts → invoke `logic-debugger` with full attempt history
  - Never escalate without evidence of at least 3 attempts

---

#### **logic-debugger** (ROOT-CAUSE MASTER)
- **Role**: Trace-driven root-cause analysis, behavioral isolation, HLLM integration, last-line debugging
- **Invoke When**:
  - Coder/test-automation hits a wall after 2+ failed fix attempts
  - Obscure execution errors, race conditions, state corruption bugs
  - "It works on my machine" cross-platform issues
  - Test flakiness with no clear fix
  - Performance bottlenecks requiring trace-driven profiling
- **Primary Input**: Full attempt history (commands, traces, fixes), `<implementation_report>`, failing test output
- **Output**: Root cause analysis, trace evidence, fixed code, retest results
- **MCP Access**: Full (context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills**: None (role is debugging-first; applies domain-specific knowledge dynamically)
- **HLLM Integration**: Creates lesson records for blacklisted patterns
- **Escalation Path**: 
  - If unable to isolate root cause → escalate full diagnostic to `orchestrator`
  - No further escalation beyond orchestrator

---

#### **100x Code Reviewer** (FINAL QA GATE)
- **Role**: Ruthless code quality audit. No mercy. Final approval gate before completion.
- **Invoke When** (MANDATORY):
  - ALL tests are green
  - Code is functionally complete
  - Ready for final quality check before "done"
  - NEVER before tests pass
- **Primary Input**: `<implementation_report>` from coder/product-design-handoff, codebase to review
- **Output**: `<review_verdict>APPROVED</review_verdict>` or `REJECTED` with detailed feedback
- **MCP Access**: Full (read, search, web, execute, context7, github, chromedevtools, playwright, microsoftdocs, serena, pylance, mermaid)
- **Skills to Load**: `senior-backend` (for backend), `frontend-patterns` + `frontend-specialist` (for frontend), `refactor`, `discover-engineering`
- **Checks**:
  - Security vulnerabilities, data leaks
  - N+1 queries, memory leaks, algorithmic complexity
  - Performance bottlenecks
  - Environment agnosticism (dev/staging/prod)
  - Cross-stack payload contracts
  - Code quality, type safety, naming
  - Maintainability, SOLID principles
- **REJECTED Path**: Return to `coder` or `product-design-handoff` with feedback. Retest. Re-review.
- **APPROVED Path**: Mark completion phase. Proceed to Phase 7.
- **Escalation**: None (final authority on code quality)

---

## Invocation Flow Diagram

```
┌─ Phase 0: Clarification (if ambiguous)
│  │ → vscode/askQuestions
│  └─ Resolve requirements
│
├─ Phase 1: Context & Planning
│  │ → context-manager (bootstrap)
│  │ → verify all agents resolve
│  │ → verify MCPs available
│  └─ Assess complexity
│
├─ Phase 1.5: Strategic Thinking (IF COMPLEX)
│  │ Is this a complex problem?
│  │ ├─ Yes → Thinker pro (breakthrough thinking)
│  │ │         receive: <thinker_pro_strategy>
│  │ └─ No → skip to Phase 2
│  │
│  └─ Pass strategy to Phase 4 implementation
│
├─ Phase 2: Research & Discovery
│  │ Need external context?
│  │ ├─ Yes → researcher (get docs, API refs, codebase patterns)
│  │ │         receive: <research_summary>
│  │ └─ No → skip to Phase 3
│  │
│  └─ Forward research_summary to next phase
│
├─ Phase 3: Design (IF FRONTEND)
│  │ Is this UI/UX work?
│  │ ├─ Yes → product-design-handoff (design-to-code)
│  │ │         receive: <design_handoff_report>
│  │ └─ No → skip to Phase 4
│  │
│  └─ Forward design_handoff_report to Phase 4
│
├─ Phase 4: Implementation
│  │ Is this frontend?
│  │ ├─ Yes → product-design-handoff (React/Vue components)
│  │ │         input: <design_handoff_report> + <thinker_pro_strategy>
│  │ │         output: <implementation_report>
│  │ └─ No → coder (backend logic)
│  │         input: <research_summary> + <thinker_pro_strategy>
│  │         output: <implementation_report>
│  │
│  └─ Forward <implementation_report> to Phase 5
│
├─ Phase 5: Testing & Fix Loop (MANDATORY)
│  │ → test-automation (write/run tests)
│  │
│  │ TESTS FAIL?
│  │ ├─ Yes (Cycle 1) → coder or product-design-handoff (fix attempt 1)
│  │ │              → rerun SAME command
│  │ │              │
│  │ │              ├─ PASS → Phase 6 ✓
│  │ │              └─ FAIL → Cycle 2
│  │ │
│  │ ├─ Cycle 2 FAIL → Logic-debugger? (if obscure)
│  │ │              OR coder/test (fix attempt 2)
│  │ │              → rerun SAME command
│  │ │              │
│  │ │              ├─ PASS → Phase 6 ✓
│  │ │              └─ FAIL → Cycle 3
│  │ │
│  │ ├─ Cycle 3 FAIL → logic-debugger (root-cause analysis)
│  │ │              → rerun SAME command
│  │ │              │
│  │ │              ├─ PASS → Phase 6 ✓
│  │ │              └─ FAIL → Escalate to orchestrator (blocker)
│  │ │
│  │ └─ No → Phase 6 ✓
│
├─ Phase 6: Code Quality Review (FINAL GATE)
│  │ TESTS MUST BE GREEN
│  │ → 100x Code Reviewer (ruthless audit)
│  │
│  │ VERDICT?
│  │ ├─ REJECTED → coder/product-design-handoff (address feedback)
│  │ │           → rerun tests
│  │ │           → re-review
│  │ └─ APPROVED → Phase 7 ✓
│
└─ Phase 7: Completion & Learning
   → context-manager (persist lessons)
   → user summary (evidence: files, tests, review approval)
   DONE ✓
```

---

## Quick Reference: "When to Invoke X"

| Scenario | Invoke | Why |
|----------|--------|-----|
| "I don't understand the problem" | Orchestrator asks `vscode/askQuestions` | Clarify first |
| "Need React component code" | `product-design-handoff` **ONLY** | Frontend expert |
| "Need backend API/DB logic" | `coder` **ONLY** | Backend expert |
| "This scaling problem is impossible" | `Thinker pro` | Breakthrough thinking |
| "Need library docs, API examples" | `researcher` | Intelligence gathering |
| "Tests are failing, fix them" | `test-automation` → `coder`/`product-design-handoff` → loop | Mandatory fix cycle |
| "Fix attempt 1 & 2 failed, still broken" | `logic-debugger` | Root-cause master |
| "Is this code production-ready?" | `100x Code Reviewer` | Final QA gate |
| "Tests pass, code is done, ship it?" | `100x Code Reviewer` FIRST, then approved → ship | Never skip review |

---

## MCP Access by Agent

| Agent | context7 | github | chromedevtools | playwright | microsoftdocs | serena | pylance | mermaid |
|-------|----------|--------|-----------------|------------|---------------|--------|---------|---------|
| Thinker pro | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| context-manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| researcher | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| coder | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| product-design-handoff | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| test-automation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| logic-debugger | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 100x Code Reviewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Key Principles

1. **Delegation is Non-Negotiable**: Orchestrator NEVER writes code. Always delegate.
2. **Domain-First**: Frontend = `product-design-handoff`. Backend = `coder`. Never mix.
3. **Early Thinking**: Complex problems route to `Thinker pro` BEFORE implementation attempts.
4. **Test-Driven**: No code passes review until tests are green.
5. **Fix Loop Mandatory**: `test → fix → retest` up to 3 cycles. Otherwise escalate.
6. **Structured Handoffs**: All inter-agent communication uses XML tags: `<research_summary>`, `<thinker_pro_strategy>`, `<design_handoff_report>`, `<implementation_report>`.
7. **No Superficial Reviews**: `100x Code Reviewer` is final authority. Not a rubber stamp.
8. **HLLM Enforcement**: Lessons learned from failures are persisted and used to prevent future mistakes.
9. **State Persistence**: `context-manager` bridges agent handoffs. No context loss.
10. **Public Exposure Gate**: Always verified before Docker/ngrok commands.

---

## Future Extensions

- **devops-iac-specialist** agent (if infrastructure work grows)
- **product-manager** agent (if planning/scoping becomes complex)
- **Automated skill discovery**: Agents auto-load relevant skills per task

---

**Generated by**: Orchestrator Enhancement Initiative  
**Status**: ACTIVE - All agents fully operationalized with MCP & skills
