# Panelist Workflow Documentation

## User Profile Goal
The Panelist oversees Capstone groups from an external, critical lens rather than an ongoing mentorship capacity. Their workflow revolves around selecting defense topics, evaluating proposals/manuscripts, validating architectural soundness, and casting final defense verdicts (Pass, Re-Defense, Fail). They operate entirely on "milestone" deliveries rather than daily chapter reviews.

---

## Pages & Navigation

### 1. Panelist Dashboard (`/dashboard`)
*   **Content**: A simplified, divided dashboard rendering two core sections: `Assigned Topics` and `Available Topics` (`PanelistTopicCard`).
*   **Functionality**:
    *   **Available Topics**: Renders a pool of active Capstone groups (`projectStatus: ACTIVE`) that have not yet reached their 3-panelist maximum limit. Panelists can actively "Accept/Claim" these to add to their evaluation roster.
    *   **Assigned Topics**: Tracks Capstones the Panelist is already slated to judge.
*   **Goal**: Create a self-service market where Panelists can browse and pick Capstone proposals that align with their specific domain expertise rather than suffering blind assignments.
*   **Design**: Highly card-based (`PanelistTopicCard`), distinguishing states sharply via Badges (`Available` via blue tones vs `Assigned` via green tone metrics) tracking the `panelistCount/3` ratio.

### 2. Projects Roster (`/projects`)
*   **Content**: A listing of only the Capstones the panelist is currently tracking for defense evaluation.
*   **Functionality**: 
    *   Clicking into `/projects/:id` allows the panelist to inspect the team's abstract, read the `ProjectInfoPanel`, and view current overarching statuses.
    *   During active defense phases, Panelists can view the manuscript inside `/projects/:projectId/documents/:docId`. Crucially, Panelists are fed a read-only parameter, forcing `<DocumentEditorPage>` into an `/preview` mode (`canEdit = false`).
*   **Goal**: Ensure Panelists have all necessary contextual history natively inside the system, without giving them disruptive editing capacities over the Adviser's domain.

### 3. Review / Rubric Interfacing (Conditional `/submissions/:submissionId/review`)
*   **Content**: A formal evaluation layout.
*   **Functionality**: Panelists can review and approve proposal submissions from `/submissions/:submissionId/review` (when assigned to the project), and fill out programmatic rubric forms mapping to Capstone Title Proposal or Final Defense evaluations.
*   **Goal**: Enforce standardized final grading structures and ensure at least 2 of 3 panelists consent before a title modification or phase requirement passes unconditionally.
*   **Design**: Relies on read-only previews augmented by high-level grading card interfaces that summarize their verdicts upward to the Instructor.

### 4. General Global Systems (`/notifications` & `/archive`)
*   **Content**: App-generic alerting and semantic archival queries.
*   **Functionality & Goal**: Keeps the Panelist informed of when their assigned topics have successfully transitioned into "Defense Ready" phases natively without external emails.