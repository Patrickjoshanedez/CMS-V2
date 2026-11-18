# Manuscript User Stories, Acceptance Cases & Empirical Pain Points Reference

## 1. Functional Requirements Mapping (`Tables 3.3–3.8`)

### Student Role (`Tables 3.3–3.4`: `FR-01`–`FR-17`, `NFR01`–`NFR08`)
- **`FR-01 / FR-02` (Onboarding & Profile):** Register `@student.buksu.edu.ph` or Google OAuth, verify 6-digit email OTP (5-min expiry, `NFR02`), reset password (10-min window), complete Section & Instructor profile (`DashboardPage` Step 1 banner -> `/profile`).
- **`FR-03 / FR-04` (Teams & Locking):** Create or join team (`1–4` members, `MAX_TEAM_MEMBERS = 4`), assign 5 canonical roles (`Project Lead & Systems Analyst`, `Frontend & UI/UX Developer`, `Backend & Database Developer`, `Full-Stack Developer`, `QA & Technical Documentor`), and lock roster on `/teams`.
- **`FR-05 / FR-06` (Dynamic Title Proposals):** Draft `1..10` candidate titles with discipline & SDG tags on `/project/create`, run Levenshtein/cosine title similarity screening, handle Title Change Request on `/project/approval`.
- **`FR-07 / FR-08 / FR-09` (Capstone 1 Submissions & Templates):** Access BukSU templates and unified `SophisticatedDocumentViewer`, upload Chapters 1–3 sequentially (`.docx`/`.pdf` `<= 25 MB` to MinIO S3, `NFR06`) or attach external Google Docs URL on `/project/submissions` & `/documents/manuscripts`, and supply late remarks + signed letter when overdue.
- **`FR-10..FR-13` (Capstone 2–3 Development & Defense):** Submit Interactive Gantt milestones, weekly check-ins, GitHub/prototype links, ADM v1–v3 responses (`actionsTaken`, `pageNumbers`), and view released defense grades.
- **`FR-14..FR-17` (Concurrency, Similarity, Logs & Alerts):** Prevent concurrent duplicate submissions (`HTTP 409`, `NFR03/04`), review plagiarism reports, track audit trail & submission versions, and receive real-time alerts (`/notifications`).

### Faculty Adviser Role (`Tables 3.5–3.6`: `FR-AD-01`–`FR-AD-07`, `NFR-AD-01`–`NFR-AD-07`)
- **`FR-AD-01 / FR-AD-02`:** Log in securely; view strictly assigned advisee teams (`NFR-AD-03`) on `/dashboard` (`Adviser View`) and `/adviser/team-review`.
- **`FR-AD-03`:** Review chapter manuscripts inside `SophisticatedDocumentViewer` (`SubmissionReviewPage.jsx`), compare Myers revision diffs (`?compareWithId=`), and add inline annotations.
- **`FR-AD-04`:** Inspect hybrid plagiarism reports (Winnowing + dense vector scores) and enforce reject threshold before approval (`TC-2.3`).
- **`FR-AD-05..07`:** Approve Gantt schedules, grant prototype/final defense endorsement, sign Tier 1 ADM, and log faculty actions in the audit trail (`NFR-AD-04`).

### Faculty Panelist / Chair & Secretary Roles (`Tables 3.5–3.6`: `FR-PA-01`–`FR-PA-07`, `TC-3.1`–`TC-4.3`)
- **`FR-PA-01..03`:** View only assigned defense projects (`/dashboard` `Panelist View`, `/projects/:id`) and plagiarism summaries without Adviser-only chapter lock authority (`NFR-PA-03`).
- **`FR-PA-04..07`:** Score structured rubrics (`100` pts), provide recommendations, submit 4-way verdicts (`Passed`, `Passed with Revisions`, `Re-Defense Required`, `Failed`), and remain locked after submission unless unlocked by Course Instructor (`TC-3.3`).
- **`TC-4.1..4.3` (Secretary):** Capture `OVPAA-F-INS-032` defense minutes (`/secretary-review`), execute `POST /api/defense-minutes/:projectId/:defenseType/publish-matrix` to populate ADM rows, and complete Secretary Endorsement before Tier 1–3 signatures unlock.

### Course Instructor Role (`Tables 3.7–3.8`: `FR-INS-01`–`FR-INS-07`, `NFR-INS-01`–`NFR-INS-09`)
- **`FR-INS-01..03`:** Manage users (`/users`) under `PRIMARY_ROLES` (`student`, `faculty`, `instructor`) with soft deactivation (`sessionVersion++`) and assign committees (`/committee-assignments`) strictly excluding `instructor` accounts and duplicate faculty slots (`TC-5.2`).
- **`FR-INS-04..07`:** Monitor all cohort projects (`/projects`), configure plagiarism thresholds (`/settings`), run CSP defense scheduling (`/scheduling-center`), export cohort reports (`/reports`), archive Phase 4 studies (`Archive`), and inspect full audit logs (`/admin/audit`).

---

## 2. Survey Quantitative Benchmarks & Verbatim Feedback (`Tables 4.3–4.4` & `Appendix C`, `n = 77`)

- **Composite Usability:** `4.53` (`SD = 0.30`, *Excellent*)
  - Lowest Usability item: **Item 2** (*"The system's dashboard makes it easy to locate the features relevant to my role"*) — **`4.27`** (`SD = 0.48`)
  - Second-lowest Usability item: **Item 10** (*"Accessing and retrieving archived capstone documents is convenient"*) — **`4.44`** (`SD = 0.66`)
- **Composite User Satisfaction:** `4.48` (`SD = 0.34`, *Excellent*)
  - Lowest Satisfaction item: **Item 2** (*"Its features address my needs when working with capstone projects"*) — **`4.30`** (`SD = 0.56`)
  - Second-lowest Satisfaction item: **Item 6** (*"I am satisfied with how capstone-related documents and information are organized"*) — **`4.44`** (`SD = 0.66`)
- **Verbatim Qualitative Comments (5 Records):**
  1. Student (`2026-10-21`): *"The UI content can be lessened so no information overload"*
  2. Student (`2026-10-21`): *"None, the system is could be useful for future capstone subject students."*
  3. Student (`2026-10-21`): *"There should be a directions in my capstone tab so handling the capstone documents during uploading or submissions is clear."*
  4. Faculty (`2026-11-16`): *"Improve the file management feature and make the system easier to navigate"*
  5. Faculty (`2026-11-16`): *"The panel suggestions was clearly met. Although, the system interface should be not too confusing especially for users that are not tech-savvy."*
