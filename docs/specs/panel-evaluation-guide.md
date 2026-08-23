# 🎓 BukSU Capstone Management System V2 (CMS-V2) — Panel Evaluation Guide

**Target Audience:** Capstone Evaluation Panel (Chair, Secretary, Members, Coordinator)  
**Academic Program:** Bachelor of Science in Information Technology  
**Version:** v2.1.0-Production-Ready  

---

## 1. Quick-Start System Launch

Ensure Docker Desktop is running, then execute either option:

### Option A: 1-Click Local Development Stack (Recommended)
```bash
# 1. Install dependencies
npm install

# 2. Start full system with hot-reloading
powershell -ExecutionPolicy Bypass -File scripts/start-local-dev.ps1
```
* **Frontend Web Client**: `http://localhost:43211` (or `http://localhost:5173`)
* **REST API Server**: `http://localhost:43210` (or `http://localhost:5000`)
* **Plagiarism ML Engine**: `http://localhost:8001`

---

### Option B: Docker Production Stack
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod.example up -d --build
```

---

## 2. Default Evaluator & Demo Accounts

| Role | Email | Password | Primary Interface / Features to Test |
| :--- | :--- | :--- | :--- |
| **REC Chair** | `chair@buksu.edu.ph` | `Password123!` | Defense verdicts, ADM digital signatures, auto-archive trigger. |
| **Panel Member 1** | `panelist1@buksu.edu.ph` | `Password123!` | Coordinate PDF comments, rubric scoring, right-roster sidebar. |
| **Panel Member 2** | `panelist2@buksu.edu.ph` | `Password123!` | Grade leakage checks, similarity vs. semantic plagiarism tabs. |
| **Coordinator / Client** | `coordinator@buksu.edu.ph` | `Password123!` | Visual defense calendar, custom rubric form builder, deadline scheduler. |
| **Faculty Adviser** | `adviser@buksu.edu.ph` | `Password123!` | Student GitHub repository tracking, consultation log approvals. |
| **Student Lead** | `student@buksu.edu.ph` | `Password123!` | Chapter upload buffer ("Add More" / "Done"), team lock banner, ADM review. |

---

## 3. ADM Feature Verification Walkthrough

Follow these quick verification steps to audit each item from the **Action Done Matrix**:

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                        STEP-BY-STEP ADM VERIFICATION MAP                               │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
      ┌──────────────────┬───────────────────┴───────────────────┬──────────────────┐
      ▼                  ▼                                       ▼                  ▼
[ 1. Roster Lock ]     [ 2. Plagiarism ]       [ 3. PDF Annotations ]  [ 4. ADM Sign-Off ]
  Emerald/Crimson        Winnowing vs.           Coordinate-mapped       Canvas signatures
  sticky banner          Semantic tabs           highlight overlays      auto-archive
```

### Step 1: Team Formation & Lock Status *(Raul Lecaros Compliance)*
1. Log in as `student@buksu.edu.ph`.
2. Navigate to **Team Workspace** (`/projects`).
3. Notice the **Sticky Top Banner** at the top of the viewport:
   * **Emerald Green**: Team open for up to 4 members.
   * **Crimson Red**: Team roster locked and frozen.

### Step 2: Plagiarism Detection & Dual-Tabs *(Joseph Abella & Louie Jay Labastida)*
1. Navigate to **Submissions & Plagiarism** (`/submissions`).
2. Upload a chapter manuscript using the dynamic buffer ("Add More" / "Done").
3. Inspect the Plagiarism Scorecard:
   * **Syntactic Similarity Tab**: Displays exact Winnowing $n$-gram overlaps.
   * **Semantic Plagiarism Tab**: Displays PyTorch dense vector matches ($0.35$ weight).
   * **Blended Score**: $(0.65 \times \text{Winnowing}) + (0.35 \times \text{Semantic})$.

### Step 3: Google-Docs-Style PDF Annotation *(Louie Jay Labastida)*
1. Log in as `panelist1@buksu.edu.ph`.
2. Open a submitted manuscript in the **Document Viewer** (`/documents`).
3. Select any text on the PDF canvas to leave an inline comment.
4. Highlight coordinates `{ x, y, width, height }` persist in real-time.

### Step 4: Defense Calendar & Schedule Locks *(Dr. Sales G. Aribe Jr.)*
1. Log in as `coordinator@buksu.edu.ph`.
2. Open **Calendar & Defense Slots** (`/dashboard`).
3. View interactive scheduled hearings, defense dates, and submission deadline locks.

### Step 5: Action Done Matrix & Digital Canvas Signatories *(Louie Jay Labastida)*
1. Navigate to **Revisions & ADM Portal** (`/projects/revisions`).
2. View the unified table mapping verbatim panel directives and student actions.
3. Draw base64 digital signatures on the signature canvas.
4. Upon Chair sign-off, the project transitions to **`ARCHIVED`**, locking metadata and enabling direct public manuscript streaming (`/archive`).
