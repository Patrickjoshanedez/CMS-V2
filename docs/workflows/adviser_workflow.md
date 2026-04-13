# Adviser Workflow Documentation

## User Profile Goal
The Adviser acts as the primary mentor and reviewer for assigned student capstone teams. Their focus is purely on guiding a subset of teams through rigorous review cycles, approving milestone deliverables, providing constant manuscript feedback, and ensuring students are structurally ready before facing the Panelists. 

---

## Pages & Navigation

### 1. Adviser Dashboard (`/dashboard`)
*   **Content**: A dual-tab interface containing `Workload` and `Analytics`.
*   **Functionality**:
    *   **Workload Tab**: Evaluates students awaiting review, highlights overdue submissions, and flags proximity to hard deadlines (`AdviserWorkloadCard`, `AdviserTeamInteractionPanel`).
    *   **Analytics Tab**: Visualizes the adviser’s operational KPIs: review velocity, chapter approval rate, and average return-time for manuscript feedback.
*   **Goal**: Ensure the Adviser isn't a bottleneck, keeping them highly aware of whose submissions are rotting in their inbox to preserve student momentum.
*   **Design**: Employs tabs to cleanly separate current actionable work (Workload) from historical performance retrospectives (Analytics).

### 2. My Teams (`/teams`)
*   **Content**: A scoped view of `TeamsPage` filtering only for the student cohorts specifically mapped to the `adviserId`.
*   **Functionality**: Review roster information, contact students without navigating away, and see standard progress details directly tied to the mentor workflow.
*   **Goal**: Serve as a directory specific to the Adviser without forcing them to manually parse the entire school’s roster.

### 3. Team Review Hub (`/adviser/team-review`)
*   **Content**: Dedicated workspace orchestrating the feedback loop.
*   **Functionality**: It lists all chapter submissions mapped directly to the adviser's supervision queue.
*   **Goal**: Act as a rapid-fire triage inbox, where advisers can efficiently check out pending Chapter drafts without needing to dig into granular project hierarchies.

### 4. Capstone Portfolio `/projects`
*   **Content**: A detailed list of assigned Capstone proposals and status trackers.
*   **Functionality**:
    *   Acts exactly as the master `/projects` page for Instructors but dynamically filtered.
    *   Allows navigating down into individual `/projects/:id` views where the Adviser engages with the Google Docs embedded editor (`DocumentEditorPage` running in `/edit` mode).
    *   They can approve project phases and manage `DeadlinesCard` modifications.
*   **Goal**: Grant deep operational power strictly limited to the Adviser’s own jurisdiction.

### 5. Document Revision Workspace (`/projects/:projectId/documents/:docId`)
*   **Content**: An embedded interactive Google Docs UI alongside an annotation sidebar.
*   **Functionality**: Advisers interact directly with student uploads, dropping margin notes, suggesting text revisions, and eventually marking chapter versions as `Accepted` or `Requires Revision`. Proposal approval is not an adviser action.
*   **Goal**: Prevent "email ping-pong" of `.docx` files by centralising collaboration securely within the application.
*   **Design**: Leverages an iframe iframe-friendly split pane configuration granting the Adviser full `canEdit=true` boolean status contextually.

### 6. Shared Utilities (`/notifications` & `/archive`)
*   **Content**: Cross-platform alerts and historical data.
*   **Functionality & Goal**: Standardized tools enabling the Adviser to be alerted of newly dropped chapters or refer back to historical formats for standardisation.