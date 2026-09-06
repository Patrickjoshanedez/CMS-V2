# Similar Project Preview Modal & Enriched Similarity Screening Payload

## Problem
In the Capstone 1 Proposal Authoring Studio (`/project/create`), when candidate titles exceeded the institutional similarity threshold, the `TitleSimilarityChecker` displayed a static red warning listing only title strings and percentage badges. Proponents lacked visibility into why their pitch conflicted with existing projects, unable to inspect the archived entry's abstract, scope, or technology stack to differentiate their proposed research.

## Solution Architecture & Implementation
1. **Interactive Trigger Transformation**:
   - Replaced static list items in `TitleSimilarityChecker.jsx` with keyboard-accessible interactive trigger buttons styled with hover states, cursor indicators, and an inspection icon (`<Eye />`).
   - Standardized layout tokens (`bg-card`, `border-rose-200`, `text-foreground`, `group-hover:text-primary`) and high-visibility percentage pill badges.
2. **Institutional Preview Modal (`SimilarProjectModal.jsx`)**:
   - Architected `SimilarProjectModal` with backdrop blur, title match percentage, academic year tag, full abstract/project summary, two-column grid displaying target beneficiary/scope and tech stack tags, and an institutional Divergence Recommendation banner.
   - Built portal isolation support (`portal = true` default using `createPortal(..., document.body)`, toggleable to `false` for component tests).
   - Added keyboard accessibility: Escape key listener and outside-click dismiss.
3. **Backend Metadata Enrichment**:
   - Hardened `projectSchema` in `project.model.js` with explicit `targetBeneficiary` and `techStack` fields.
   - Enhanced `findSimilarProjects` in `titleSimilarity.js` to return `id`, `similarityScore`, `academicYear`, `abstract`, `targetBeneficiary`, and `techStack` while preserving `projectId` and `score` for 100% backward compatibility.
   - Updated `project.service.js` across `checkTitleSimilarity`, `createProject`, `updateTitle`, and `submitTitleProposal` to select full project metadata.
4. **Matched Archive Manuscripts Integration**:
   - Connected Tab 2 ("Similarity Clearance") matched manuscripts in `CreateProjectPage.jsx` to open `SimilarProjectModal` on row click or "Inspect" trigger.

## Runbook & Prevention Checklist
1. **Checklist for Similarity Endpoint Upgrades**:
   - Always verify that new fields added to `findSimilarProjects` maintain existing properties (`projectId`, `score`) so legacy callers and assertion tests do not break.
   - When retrieving candidate documents for similarity comparisons, explicitly select metadata fields (`abstract`, `academicYear`, `targetBeneficiary`, `techStack`, `titleProposalMetadata`, `capstoneType`) instead of restricting to `title keywords`.
2. **Lesson Learned / Prevention**:
   - Vitest client tests in this repository use standard React 18 `createRoot` and `act` from `react` and `react-dom/client`, rather than `@testing-library/react`. Adhere to repository conventions to prevent import resolution failures in Vite.
   - Keep string comparisons robust against typographic variants (e.g. standard hyphen `-` vs en-dash `–` in academic year strings).
3. **Evidence Verification**:
   - Unit tests: `npm test --workspace=server -- tests/unit/titleSimilarity.util.test.js` passed (4/4 tests).
   - Integration tests: `npm test --workspace=server -- tests/integration/title-similarity.test.js` passed (5/5 tests).
   - Client tests: `npm test --workspace=client -- src/components/projects/TitleSimilarityChecker.test.jsx` passed (4/4 tests).
   - Page tests: `npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx` passed (7/7 tests).
   - Governance suites: `check:endpoints` (0 unmatched), `validate:agentic` (60/60 checks), `validate:governance` passed, and `workspace_guardrail.py` verified pristine.
