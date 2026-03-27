# Instructor Workflow Documentation

## User Profile Goal
The Instructor serves as the top-level academic administrator and coordinator within the system. Their primary responsibilities are overseeing entire courses, managing capstone sections, balancing adviser workloads, enforcing academic deadlines, tracking cross-team deliverables, and auditing system activity.

---

## Pages & Navigation

### 1. Instructor Command Center (`/dashboard`)
*   **Content**: High-level statistical KPIs (`totalProjects`, `pendingSubmissions`, `completionRatePercent`), alongside visual heatmaps and optimization engines. 
*   **Functionality**:
    *   **KPI Cards**: Aggregates broad metrics on system health.
    *   **Workload Heatmap**: Visualizes the distribution of student teams among available advisers.
    *   **Optimization Engine**: An automated prompt system that detects workload imbalance across faculty and generates suggested actions to reassign capstone groups to prevent adviser burnout.
*   **Goal**: Provide a quick glance at bottleneck metrics across the entire capstone pipeline and facilitate proactive faculty management.
*   **Design**: A specialized UI mapping exclusively rendered for `ROLES.INSTRUCTOR`. It uses premium gradient headers and dense interactive analytic modules (`WorkloadHeatmap`, `OptimizationEngine`) unlike the default role cards.

### 2. User Directory & Onboarding (`/users`)
*   **Content**: A deeply nested hierarchy viewer structured as: *Academic Year -> Course -> Section -> Team -> Students*.
*   **Functionality**: 
    *   Adding individual students or faculty.
    *   Filtering through cohorts systematically without losing spatial awareness of where users belong.
    *   Approving or modifying user roles.
*   **Goal**: Simplify the cognitive load of managing potentially thousands of enrolled users across multiple cross-year cohorts.
*   **Design**: Spatial, breadcrumb-based navigation (drill-down folders).

### 3. Teams Roster (`/teams`)
*   **Content**: Global viewer for all active Capstone groups.
*   **Functionality**: Allows the Instructor to track which teams exist, what section they map to, and crucially—who their assigned Adviser is.
*   **Goal**: Maintain oversight into group formations before capstone titles are ever proposed.

### 4. Global Projects Hub (`/projects`)
*   **Content**: A master repository of all active Capstone proposals and ongoing pipelines.
*   **Functionality**:
    *   View all teams' statuses (e.g., Phase 1 vs Phase 4).
    *   Approve title modification requests.
    *   Access internal file submissions if intervening is necessary.
*   **Goal**: Allow the instructor to drill down into any individual team's metrics and ensure they are meeting phase completion targets. 

### 5. Analytics & Bulk Operations (`/reports`)
*   **Content**: Generation interfaces for performance exports and `/reports/bulk-upload` for onboarding.
*   **Functionality**: Likely generates CSV/PDF aggregations of class performance and handles massive data imports mapping users to sections.
*   **Goal**: Shift manual data entry into fast spreadsheet evaluations, avoiding tedious clicks when opening a new semester.

### 6. Activity Log (`/admin/audit-log`)
*   **Content**: Immutable tracking ledger.
*   **Functionality**: Records all sensitive administrative and destructive actions across the pipeline. Append-only by design.
*   **Goal**: Ensure data integrity and historical rollback capability for strict academic administration compliance.

### 7. Core Shared Utilities (`/notifications` & `/archive`)
*   **Content**: Pagination-enabled notification ledger and Capstone archival semantic search.
*   **Functionality**: Read cross-system alerts and explore previous years' finalized submissions.
*   **Goal**: Keep the instructor integrated into the real-time flow of the application.