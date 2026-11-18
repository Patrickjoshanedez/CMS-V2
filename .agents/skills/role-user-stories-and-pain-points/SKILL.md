---
name: role-user-stories-and-pain-points
description: >
  Manuscript-grounded multi-role user stories, empirical survey pain points, usability remediation rules,
  and real-person browser navigation playbooks for BukSU Capstone Management System V2 (CMS-V2).
  Use this skill whenever designing, auditing, testing, or walking through Student, Faculty (Adviser,
  Panelist/Chair, Committee Secretary), or Course Instructor workflows, resolving dashboard feature
  discovery, clarifying "My Capstone" upload directions, improving file management navigation, or
  verifying UI consistency against the capstone manuscript (Chapters 3–5 & Appendix C). Triggers on:
  "user story", "pain points", "role workflow", "survey feedback", "navigation consistency",
  "real person navigation", "student directions", "faculty guide", "role quick actions".
---

# CMS-V2 Multi-Role User Stories & Empirical Pain-Point Playbook

This skill keeps the live React + Express application aligned with the BukSU CMS-V2 capstone manuscript (`Section 3.3.1 Tables 3.3–3.8`, `Section 3.6 Table 3.16`, `Section 4.1.5 Tables 4.1–4.4`, `Section 5.3.4`, and `Appendix C`). Whenever modifying UI or auditing workflows across roles, consult the user stories, survey pain points, and browser walkthrough steps below.

For full requirement-to-route traceability across all 24 test cases (`TC-1.1`–`TC-5.4`), load [manuscript-user-stories-and-pain-points.md](references/manuscript-user-stories-and-pain-points.md).

---

## 1. Role-to-User-Story Summary (`PRIMARY_ROLES` + Committee Appointments)

| Account Role | Institutional Capacity | Core User Stories (`Tables 3.3–3.8` & `3.16`) | Primary UI Routes |
| :--- | :--- | :--- | :--- |
| **`student`** | Proponent / Team Lead / Member | Register & verify 6-digit OTP (`FR-01`); form 1–4 member team & lock roster (`FR-03..04`); screen 1–10 titles (`FR-05..06`); upload sequential Chapters 1–3 & compile proposal with late-justification gating (`FR-07..09`); track Capstone 2 Gantt/prototype (`FR-10..11`); address ADM revisions & view plagiarism reports (`FR-12..17`) | `/dashboard`, `/teams`, `/project`, `/project/create`, `/project/approval`, `/project/submissions`, `/project/submissions/upload`, `/project/proposal`, `/documents/manuscripts`, `/plagiarism-checker` |
| **`faculty`** (`adviser`) | Assigned Capstone Adviser | Log in securely (`FR-AD-01`); monitor advisee queue (`FR-AD-02`); inspect submissions in `SophisticatedDocumentViewer` with Myers diffs & inline annotations (`FR-AD-03`); verify <25% plagiarism clearance before locking (`FR-AD-04`, `TC-2.3`); approve Gantt plans, check-ins, prototype clearance, & Tier 1 ADM sign-off (`TC-2.4..2.5`, `FR-AD-05..07`) | `/dashboard` (`Adviser View`), `/adviser/team-review`, `/projects`, `/project/submissions/:id/review`, `/documents/manuscripts` |
| **`faculty`** (`panelist` / Chair) | Defense Panelist or Lead/Chair | Inspect assigned defense packets & composite similarity breakdowns (`FR-PA-01..03`, `TC-3.1`); score active 100-pt rubrics & submit 4-way verdicts (`FR-PA-04..06`, `TC-3.2`); respect post-submit lock (`FR-PA-07`, `TC-3.3`); apply Tier 2 ADM digital signatures only after Secretary endorsement (`TC-3.4`) | `/dashboard` (`Panelist View`), `/projects`, `/projects/:id` |
| **`faculty`** (`secretary`) | Defense Committee Secretary | Record OVPAA-F-INS-032 attendance & critique minutes (`TC-4.1`); publish revision directives to ADM (`TC-4.2`); verify Phase 4 student ADM compliance and execute mandatory Secretary Endorsement to unlock Tier 1–3 signatures (`TC-4.3`) | `/dashboard` (`Secretary View`), `/secretary-review`, `/projects/:id` |
| **`instructor`** | Course Instructor / Coordinator | Manage users under `student`/`instructor`/`faculty` (`FR-INS-01..02`, `TC-5.1`); appoint 1 Adviser + 1 Secretary + 3 Panelists while excluding instructors & duplicates (`FR-INS-03`, `TC-5.2`); configure plagiarism thresholds, schedule defenses via CSP, & release consolidated grades (`FR-INS-04..05`, `TC-5.3`); export reports & trigger archival/OCR indexing (`FR-INS-06..07`, `TC-5.4`) | `/dashboard`, `/projects`, `/committee-assignments`, `/scheduling-center`, `/users`, `/reports`, `/archive/upload/capstone`, `/admin/audit`, `/admin/evaluation-templates` |

---

## 2. Empirical Pain Points & Mandatory UI Remediations (`Tables 4.3–4.4` & `Appendix C`)

The 77-respondent survey (`71` Students, `5` Faculty, `1` Instructor; Usability `4.53`, SD `0.30`; User Satisfaction `4.48`, SD `0.34`) surfaced 4 concrete pain points alongside verbatim comments and lowest-scoring items:

| Pain Point | Empirical Evidence | Required UI / UX Remediation |
| :--- | :--- | :--- |
| **1. Missing "My Capstone" Upload Directions** | Student verbatim comment: *"There should be a directions in my capstone tab so handling the capstone documents during uploading or submissions is clear."* | Render an explicit **Capstone 1 Upload & Submission Directions** banner inside `/project` (`capstone_1` tab) explaining sequential Ch. 1–3 rules (`.docx/.pdf`, `<=25 MB`, `<25%` similarity) with 1-click navigation to `/project/submissions` and `/project/submissions/upload`. When expanded, show inline sequential rules and `Upload Ch. N` buttons inside `Capstone1CollapsibleSections`. |
| **2. Dashboard Feature Discovery & UI Density** | Lowest Usability item (`Item 2`: *"...dashboard makes it easy to locate the features relevant to my role"*, Mean `4.27`, SD `0.48`) + Student comment: *"The UI content can be lessened so no information overload."* | Surface a concise **Role Quick-Actions Bar** near the top of `StudentDashboard`, `FacultyDashboard`, and `InstructorDashboard` so each role reaches its primary workflows in one click without scanning dense metric/history sections. |
| **3. File Management & Document Navigation** | Faculty comment: *"Improve the file management feature and make the system easier to navigate."* + Usability `Item 10` (`4.44`, SD `0.66`) & Satisfaction `Item 6` (`4.44`, SD `0.66`). | Provide a **Phase Quick-Jump & Upload Guide Bar** inside `/project/submissions` linking Phases 2–4 and Cloud Sync, and add a **File Organization & Quick Navigation Bar** in `/documents/manuscripts` (`TemplateManagementPage`) so users never feel stranded on an empty Project ID box. |
| **4. Plain-Language Faculty Role Guidance** | Faculty comment: *"The panel suggestions was clearly met. Although, the system interface should be not too confusing especially for users that are not tech-savvy."* + Satisfaction `Item 2` (`4.30`, SD `0.56`). | Display a plain-English **Faculty Role Guide & Quick-Jump Bar** below the header in `FacultyDashboard` explaining what to do in `Adviser View`, `Panelist View`, and `Secretary View` and linking cleanly to each queue without technical jargon. |

---

## 3. Real-Person Browser Walkthrough Protocol

When verifying UI consistency as a real user on the running stack (`http://localhost:43211`), walk through each role in sequence:

1. **Test Accounts** (from `server/seeders/seed-canonical-role-accounts.js`, password `Password123!`):
   - **Student Lead (Team Alpha, Approved Title):** `student@student.buksu.edu.ph`
   - **Faculty Adviser:** `adviser@student.buksu.edu.ph` (or `faculty@student.buksu.edu.ph` / `panelchair@student.buksu.edu.ph` / `secretary@student.buksu.edu.ph` if checking committee hats)
   - **Course Instructor:** `instructor@student.buksu.edu.ph`
2. **Real-Person Navigation Steps:**
   - **Student Flow:** Log in -> inspect `Role Quick-Actions Bar` on `/dashboard` -> click `My Capstone & Directions` -> read upload steps in `/project?tab=capstone_1` -> expand `Chapters 1–3 & Compiled Manuscript` -> open `/project/submissions` -> verify `Phase Quick-Jump & Upload Guide Bar` -> jump to `/documents/manuscripts`.
   - **Faculty Flow:** Log in -> inspect `Faculty Role Guide & Quick-Jump Bar` on `/dashboard` -> toggle `Adviser View`, `Panelist View`, `Secretary View` to confirm dynamic guidance text -> click `Open Adviser Queue` (`/adviser/team-review`) and `Browse Assigned Projects` (`/projects`).
   - **Instructor Flow:** Log in -> inspect `Instructor Role Quick-Actions Bar` on `/dashboard` -> click `Assign Committees` (`/committee-assignments`) and `Projects` (`/projects`) -> inspect committee mutual exclusion rules.
3. **Browser Audit Invariants & Implementation Prevention Rules:**
   - Wait for `domcontentloaded` (never `networkidle` due to live notifications polling and Socket.IO).
   - Check both **desktop (`1440x900`)** and **mobile (`390x844`)** viewports in **light** and **dark** modes (`scrollWidth <= clientWidth`, single `<h1>`, zero Vite overlays or console errors).
   - **No `shrink-0` on Multi-Button Flex Children:** Inside `DashboardLayout` (`~874px` content width), never pair `sm:flex-row`/`lg:flex-row` with `shrink-0` on multi-button shortcut strips; stack text full-width above a wrapping `flex flex-wrap items-center gap-2` row (`flex flex-col gap-3`).
   - **API Shape & Field Resilience in `useProjectSubmissions`:** Always unwrap `Array.isArray(raw) ? raw : raw?.submissions || []` and resolve chapter index via `Number(s.chapter ?? s.chapterNumber)` so live paginated objects and mocked test arrays both render accurately.
   - **Latest-Version Queue Deduplication & Committee Switch Parity:** Deduplicate historical submission versions per `(projectId, type, chapter)` before counting active `pending`/`under_review`/`revisions_required` queues, and ensure read-only Adviser/Panelist dashboard routes permit `ROLES.FACULTY`, `ROLES.ADVISER`, and `ROLES.PANELIST`.
