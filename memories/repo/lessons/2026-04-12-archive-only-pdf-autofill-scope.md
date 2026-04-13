# Lesson: Archive-Only PDF Autofill Scope

## Incident
A PDF metadata autofill UI block was added to the student Create Project page instead of being limited to the instructor archive upload flow.

## Root Cause
Feature scope drift during implementation: requirement targeted archive upload, but implementation was also added to create-project similarity UX.

## Prevention Rule
- Keep PDF title/abstract autofill strictly in archive upload flows unless requirement explicitly includes student project creation.
- Enforce a pre-tool gate that denies additions of archive-only PDF autofill tokens in client/src/pages/projects/CreateProjectPage.jsx.
- Validate requirement-to-file mapping before UI edits when request includes role-bound language (e.g., "instructor side").

## Enforcement
Implemented in .github/hooks/scripts/static_gatekeeper.py with archive scope policy checks for mutation patches.
