# DISPATCH — survey_explorer_2

## Mission: Capstone Lifecycle & Role Workflow Integrity Scope Survey (R2)

- **Role**: Capstone Workflow Integrity Explorer (`teamwork_explorer`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_2\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Reference Skills**:
  - `c:\Users\patri\dev\CMS-V2\.agents\skills\capstone-lifecycle-orchestrator\SKILL.md`

## Instructions:
1. Read `c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md`, `AGENTS.md`, `GEMINI.md`, and the reference skill.
2. Trace the entire capstone lifecycle across all 5 canonical phases:
   - Phase 0: Registration, Team Scaffolding, Roster Locking, Committee Appointment.
   - Phase 1: Topic Proposals (1..10), Cosine Similarity Pre-scan, Hearing Rubrics, Instructor Approval.
   - Phase 2: Capstone 1 (Chapters 1-3), Plagiarism Clearance, Adviser Endorsement, Scheduled Defense, Secretary Minutes, ADM v1, Panel Evaluation, Instructor Grade Release.
   - Phase 3: Capstone 2 (Interactive Gantt Schedule, Weekly Progress, Late Justification Gating, GitHub/Media Evidence, Prototype Clearance, Progress Defense, ADM v2).
   - Phase 4: Capstone 3 (Chapters 4-5 Compilation, Deep Vector Plagiarism, Final Defense, Secretary Compliance Verification Gate, Multi-Tier ADM v3 Sign-off, Approval Sheet Generation, Archival Indexing, Certificate Issuance).
3. Verify role separation, permissions, and institutional rules:
   - Student, Instructor, and Faculty appointments (Adviser, Panelist, Secretary, Chair).
   - Course Instructor committee exclusion (Instructors cannot be Adviser, Secretary, or Panelists).
   - Committee composition (1 Adviser, 1 Secretary, 3 Panelists with Panelist 1 as Chair).
   - Secretary Defense Workflow & ADM Compliance Gate (`project.admSignatures.secretary.endorsed === true` before Tier 1-3 signatures unlock).
4. Inspect client pages/routes (`client/src/pages/`, `client/src/components/`, `client/src/hooks/`, `client/src/services/`) and backend services/routes (`server/routes/`, `server/services/`, `server/controllers/`, `server/models/`).
5. Identify any broken workflows, missing UI handlers, outdated business logic, unhandled API states, or bugs that could block real-world execution across any role.
6. Compile your findings into `.agents/teamwork/survey_explorer_2/survey_report.md` with:
   - Comprehensive inventory of all workflow steps across each role.
   - Exact gap analysis (what is working, what has bugs/gaps, what needs revision).
   - Concrete file paths, line ranges, and actionable fix recommendations.
7. Deliver a self-contained `handoff.md` and notify the parent orchestrator via `send_message`.


## 2026-11-13T17:27:59Z
You are survey_explorer_2. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_2\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md.
Conduct an exhaustive survey of the Capstone Lifecycle & Role Workflow Integrity across all phases (0 to 4) and all roles (Student, Instructor, and Faculty appointments: Adviser, Panelist, Secretary, Chair).
Write your comprehensive findings to c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_2\survey_report.md and your handoff to c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_2\handoff.md.
When finished, notify your parent orchestrator via send_message with the path to your handoff report.
