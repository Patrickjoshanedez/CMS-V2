# CMS-V2 Authoritative Document Index & Order of Precedence
**Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Governance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  
**Status:** Authoritative Repository Authority Index  

---

## 1. The Strict Order of Authority (Ground Truth)

When evidence or documentation conflicts across the workspace, agents and developers must strictly adhere to the following **Order of Authority**:

```
[Level 1: Highest Authority]
Approved Institutional Requirements & Role Boundaries
  (BukSU IT Department capstone guidelines, 4-phase sequence, role consolidation, instructor committee exclusion)
       │
       ▼
[Level 2: Contract Authority]
Approved API Contracts & Intended User Behavior
  (shared schemas, route contracts verified by endpoint parity, role permissions)
       │
       ▼
[Level 3: Implementation Authority]
Implementation Verified Against Those Requirements
  (Express controllers/services, React components passing zero-error gates)
       │
       ▼
[Level 4: Test Authority]
Tests That Enforce Verified Behavior
  (Deterministically passing integration suites, unit suites, and Playwright visual loops)
       │
       ▼
[Level 5: Supporting Guidance]
Supporting Documentation
  (ARCHITECTURE.md, README.md, technical specifications, runbooks)
       │
       ▼
[Level 6: Lowest Authority]
Historical Session Records & Archived Summaries
  (.agents/ptss/ sessions, archived plans, delivery manifests)
```

> [!IMPORTANT]
> **No Blind Trust:** Do not automatically treat running code, passing mocks, or historical session records as correct. When a conflict between code and institutional requirements arises, the institutional requirement governs. Unresolved requirement conflicts must be explicitly documented rather than fabricated.

---

## 2. Authoritative Document Registry

### A. Canonical Institutional & Governance Documents (Active Authority)
| Document | Path | Scope & Authority |
| :--- | :--- | :--- |
| **Cognitive Boundary & Runtime Contract** | [`AGENTS.md`](file:///c:/Users/patri/dev/CMS-V2/AGENTS.md) | Universal operating sandbox, Two-Pile architecture, 4-Phase workflow ground truth, ASDLC rules. |
| **Cognitive Contract for Gemini / Antigravity** | [`GEMINI.md`](file:///c:/Users/patri/dev/CMS-V2/GEMINI.md) | Supreme cognitive protocols, 8-stage lifecycle, 7-point quality battery. |
| **System Architecture Specification** | [`docs/ARCHITECTURE.md`](file:///c:/Users/patri/dev/CMS-V2/docs/ARCHITECTURE.md) | Technical stack, monolithic API, plagiarism hybrid engine, PaddleOCR-VL pipeline, S3/MinIO storage. |
| **System Overview & Quickstart** | [`README.md`](file:///c:/Users/patri/dev/CMS-V2/README.md) | Developer onboarding, architecture diagrams, verified test commands. |
| **Durable Evidence Inventory** | [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) | Comprehensive status, requirement tracing, and audit evidence for tests and docs. |
| **Plagiarism Benchmark Specification** | [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md) | Benchmark datasets, scoring models, and distinction from unit test mock controls. |
| **Test Quarantine Register** | [`docs/TEST_QUARANTINE.md`](file:///c:/Users/patri/dev/CMS-V2/docs/TEST_QUARANTINE.md) | Ledger of quarantined tests with owners, failure reasons, and expiry dates. |
| **Workspace Evidence Maintenance Skill** | [`.agents/skills/workspace-evidence-maintenance/SKILL.md`](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/workspace-evidence-maintenance/SKILL.md) | Systematic workspace organization, evidence maintenance, document authority tracking, and retirement policy. |
| **Document Classification Manifest** | [`docs/classification-manifest.json`](file:///c:/Users/patri/dev/CMS-V2/docs/classification-manifest.json) | Machine-readable classification registry of current, needs-review, superseded, and generated artifacts. |

### B. Core Operational Specifications
| Document | Path | Status | Authoritative Scope |
| :--- | :--- | :--- | :--- |
| **Action Done Matrix Spec** | [`docs/specs/action-done-matrix.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/action-done-matrix.md) | Verified | ADM multi-tier digital sign-off and Secretary gate. |
| **IHSA Specification** | [`docs/specs/ihsa-specification.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/ihsa-specification.md) | Verified | Interconnected Harness Scaling Architecture & hooks runtime. |
| **Multi-Chapter Storage Spec** | [`docs/specs/multi-chapter-streaming-and-storage-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/specs/multi-chapter-streaming-and-storage-spec.md) | Verified | Authenticated manuscript streaming and MinIO signed URLs. |

### C. Historical & Superseded Documents (Read-Only / Reference Only)
The following documents are historical or superseded. Readers seeking authoritative guidance must consult the replacement document listed:

| Historical Document | Historical Date | Status | Authoritative Replacement |
| :--- | :--- | :--- | :--- |
| `FILES_INDEX.md` | Early 2026 | **Superseded** | [`docs/AUTHORITATIVE_INDEX.md`](file:///c:/Users/patri/dev/CMS-V2/docs/AUTHORITATIVE_INDEX.md) & [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) |
| `docs/delivery/DELIVERY_MANIFEST.md` | 2026-03-26 | **Historical** | [`docs/EVIDENCE_INVENTORY.md`](file:///c:/Users/patri/dev/CMS-V2/docs/EVIDENCE_INVENTORY.md) |
| `docs/archive/plagiarism_benchmark_report.md` | 2026-04-14 | **Historical** | [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md) |
| `docs/archive/` (all files) | Various | **Historical** | Current specifications under `docs/` and `docs/specs/` |

### D. Active Testing Instructions & Verification Gates
Responsive layout findings and coverage limits: [Responsive layout audit](RESPONSIVE_LAYOUT_AUDIT.md). This is a scoped working-tree assessment, not system-wide sign-off.

Authoritative instructions for executing deterministic test suites and quality gates:
1. **Targeted Fast-Path Unit Tests (1–5s):**
   - Server: `npm test --workspace=server -- <target-test-file>`
   - Client: `npm test --workspace=client -- <target-test-file>`
2. **Comprehensive Integration Workflow Gate (~20s):**
   - Full 13-stage lifecycle: `npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js`
3. **Workspace Evidence & Authority Suite (<2s):**
   - Run: `npm run check:evidence`
4. **Endpoint Route Parity (<2s):**
   - Run: `npm run check:endpoints`
5. **Agentic System & Governance Verification (<5s):**
   - Run: `npm run validate:agentic` and `npm run validate:governance`
6. **Playwright Visual Feedback Loop:**
   - Run targeted audit in `scratch/` across 4 viewports (desktop light/dark, mobile light/dark).

### E. Benchmark Procedures & Calibration
Authoritative procedures for empirical model evaluation (see [`docs/benchmarks/plagiarism-benchmark-spec.md`](file:///c:/Users/patri/dev/CMS-V2/docs/benchmarks/plagiarism-benchmark-spec.md)):
1. **Model Accuracy vs. Mock Controls:** Unit tests with mocked responses prove software control-flow only. Model detection accuracy must be evaluated using versioned benchmark datasets against the live Python service (`plagiarism_engine:8000`).
2. **Versioned Benchmark Datasets:**
   - `ISO-BUKSU-V1`: Synthetic 50-pair manuscript corpus evaluating verbatim, paraphrased, and cross-chapter similarity.
   - `PAN-SPANS-V1`: Synthetic boundary-detection corpus evaluating character-offset precision and recall.
3. **Hyperparameter Invariants:** Hybrid score weights ($w_{lex}=0.65, w_{sem}=0.35$) and minimum similarity threshold ($\theta_{min}=0.78$) are immutable during benchmark runs.

---

## 3. Discrepancy Reconciliation Principles

1. **Intended Architecture vs. Deployed Behavior**:
   - Neural vector scanning (`BAAI/bge-m3`) is the primary intended model. When running locally without GPU or Python container, the system falls back to in-process Winnowing with degraded flags (`ocrStatus: 'degraded'`).
   - Mocked neural tests (e.g., `plagiarism.coverage.test.js`) prove control flow, but do not prove model accuracy.
2. **Capstones & Phase Progression**:
   - The platform strictly enforces 4 institutional phases: Phase 1 (Proposal), Phase 2 (Midterm / Chapters 1–3), Phase 3 (Development / Progress Defense), and Phase 4 (Final Defense & Archival).
   - In legacy code paths mapping to 3 semesters (`capstone_1`, `capstone_2`, `capstone_3`), Phase 3/Final stage represents the final defense and archival stage.
