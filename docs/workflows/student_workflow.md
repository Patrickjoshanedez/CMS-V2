# Student Workflow Documentation

## User Profile Goal
The Student role is designed to guide a single user (and their collaborative team) through the complete lifecycle of a capstone project. The core functionality revolves around forming teams, proposing project titles, uploading sequential chapter drafts, receiving embedded review feedback from mentors, and finalized uploading to the central archive.

---

## Pages & Navigation

### 1. Dashboard (`/dashboard`)
*   **Content**: High-level statistical overview and alerts.
*   **Functionality**: Checks if a student is missing mandatory metadata (e.g., instructor or section). Displays quick summary cards for Teams, Submissions, and general alerts.
*   **Goal**: Provide an immediate health check of the user's account and capstone standing on login.
*   **Design**: Relies on a generic layout shell (`DashboardLayout`) using simple Shadcn cards that branch specifically to `StudentDashboard` logic via role-based switch routing.

### 2. Team Management (`/teams`)
*   **Content**: Team creation tools, roster views, and join capabilities.
*   **Functionality**: Allows headless users to create a collective `teamId` and invite others, or join an existing instructor-approved section team. 
*   **Goal**: Establish the core group identity before a single capstone idea can be formalized.

### 3. My Project & Project Hub (`/project` & `/projects/:id`)
*   **Content**: The central view of their Capstone metrics (Title status, Phase progression, adviser assignment list, and active deadlines).
*   **Functionality**:
    *   **Title Proposals**: Submit formal title requests and justifications.
    *   **Deadlines & Phases**: View urgent upcoming submission blockers color-coded by urgency.
    *   **Phase Features**: In Capstone Phase 4, includes sections for final manuscript uploading and public journal repository viewing (`FinalDocumentsList`).
    *   **Prototype Gallery**: Users can embed demo links or file previews of their developed systems.
*   **Goal**: Consolidate every actionable metric into one central "Project" module so students aren't lost searching for where to manage their overarching goal.
*   **Design**: A rich, card-based interface leveraging conditional rendering. Elements like the `FinalPaperUpload` only mount if the project status has hit Capstone Phase 4. It leverages `useAuthStore` checking to permit file modifications organically.

### 4. Submission Pipeline (`/projects/:id/submissions/upload` & `/submissions/:id/review`)
*   **Content**: Dedicated file uploaders and interactive document review tools.
*   **Functionality**: Students upload PDF drafts mapped to specific Chapters. The system processes a Plagiarism report and converts the document to a collaborative Google Doc (or internal fallback). Students can view inline Adviser annotations and resolve them.
*   **Goal**: Standardize the repetitive friction of drafting, feedback, and revision into a single tracked thread per chapter.
*   **Design**: Built atop interactive preview iframes (`DocumentPreview.jsx`) alongside a conversational `ReviewWorkspace` panel. Submission states are mapped chronologically so students easily realize if their file is "Pending Upload", "Under Review", or "Accepted".

### 5. Research Archive (`/archive`)
*   **Content**: A semantic search listing of historic, finished capstone projects.
*   **Functionality**: Browse past titles, read public publishable journals.
*   **Goal**: Enable students to discover prior art and evaluate constraints or inspiration for their own proposals before drafting.
*   **Design**: Grid layout filtering historic data via search debouncing, sorting by tags, and tracking distinct academic years.