# Algorithm Design, Methodology, and Institutional Justification

**Project:** BukSU Capstone Management System V2 (CMS-V2) with Sidecar Plagiarism Detection  
**Target Standard:** ASDLC v2.0 & Institutional Academic Governance  

---

## 1. Plagiarism Detection Architecture: Algorithm & Mathematical Formulation

The CMS-V2 plagiarism engine incorporates a hybrid two-tier architecture combining deterministic sub-document n-gram fingerprinting (**Winnowing Algorithm**) and dense semantic vector similarity (**MiniLM Transformer Embeddings & Cosine Metric**).

```
   ┌─────────────────────────────────────────────────────────────────┐
   │                    Uploaded Manuscript PDF                      │
   └───────────────────────────────┬─────────────────────────────────┘
                                   │
                         [Text Sanitization]
                         [OCR / Unicode Norm]
                                   │
           ┌───────────────────────┴───────────────────────┐
           ▼                                               ▼
  ┌─────────────────────────┐                     ┌─────────────────────────┐
  │   Winnowing Engine      │                     │ Dense Semantic Vector   │
  │   (Lexical Matching)    │                     │  (MiniLM-L6 Embeddings) │
  └────────────┬────────────┘                     └────────────┬────────────┘
               │                                               │
      k-grams & Hashing                               Dense 384-d Vector
    Windowing Noise Gate                              Cosine Similarity
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │ Hybrid Similarity Calibration │
                       │    S_hybrid = w1*S_win + w2*S_cos   │
                       └───────────────┬───────────────┘
                                       ▼
                       ┌───────────────────────────────┐
                       │ Institutional Policy Check    │
                       │ (Threshold <= 25% Clearance)  │
                       └───────────────────────────────┘
```

### 1.1 The Winnowing Algorithm Formulation

The **Winnowing algorithm** (Schleimer, Wilkerson, & Aiken, 2003) is a local document fingerprinting algorithm designed to detect exact and near-exact copy-paste segments regardless of surrounding edits.

#### Mathematical Formulation:
1. **Normalized String Stream**:  
   Let document text $T$ be stripped of all irrelevant whitespace, punctuation, and case variance:
   $$T_{norm} = \text{sanitize}(T)$$

2. **$k$-Gram Extraction**:  
   Continuous character sequences of length $k$ are extracted:
   $$G_i = T_{norm}[i \dots i + k - 1] \quad \text{for } 0 \le i \le |T_{norm}| - k$$

3. **Rolling Hash Computation (Rabin-Karp)**:  
   Each $k$-gram $G_i$ is mapped to a numeric hash $h_i$ using a polynomial rolling hash with prime modulus $M$:
   $$h_i = \left( \sum_{j=0}^{k-1} c_{i+j} \cdot B^{k-1-j} \right) \bmod M$$

4. **Window Selection & Noise Suppression**:  
   Over sliding windows $W_j$ of size $w$:
   $$W_j = [h_j, h_{j+1}, \dots, h_{j+w-1}]$$
   The fingerprint selection rule selects the minimum hash value in each window:
   $$F_j = \min_{0 \le m < w} (W_j[m])$$
   *(In case of duplicate minimums, the rightmost occurrence is picked to maintain structural monotonicity).*

5. **Jaccard Similarity on Document Fingerprint Sets**:  
   Given fingerprint set $F(A)$ for manuscript $A$ and $F(B)$ for institutional repository study $B$:
   $$S_{\text{winnowing}}(A, B) = \frac{|F(A) \cap F(B)|}{|F(A) \cup F(B)|} \times 100\%$$

#### Algorithm Justification in Academic Research:
- **Resilience to Local Perturbation**: Unlike global hash comparisons (e.g., MD5, SHA-256), Winnowing guarantees that any matched substring of length at least $t = w + k - 1$ will be detected regardless of where it appears in the document.
- **Controlled Density & Memory Efficiency**: By tuning the window size $w$, the algorithm bounds the maximum number of fingerprints stored per manuscript ($|F| \le \frac{2}{w+1} \times |T|$), preventing memory saturation across thousands of institutional theses.
- **Robustness against Whitespace/Font Obfuscation**: Character-level normalization eliminates PDF layout artifacts and hyphenation differences common in academic formatting.

---

### 1.2 Dense Semantic Similarity (Sentence Transformers & Cosine Distance)

To identify paraphrasing, synonym substitution, and idea reproduction where lexical n-grams differ:

$$\mathbf{v}_A = \frac{\sum_{i=1}^N \mathbf{e}_{token, i}}{\|\sum_{i=1}^N \mathbf{e}_{token, i}\|_2}$$

Given query manuscript embedding $\mathbf{v}_A \in \mathbb{R}^{384}$ and archival repository vector $\mathbf{v}_B \in \mathbb{R}^{384}$:
$$S_{\text{semantic}}(A, B) = \frac{\mathbf{v}_A \cdot \mathbf{v}_B}{\|\mathbf{v}_A\| \|\mathbf{v}_B\|}$$

#### Hybrid Score Formulation:
$$S_{\text{hybrid}} = \alpha \cdot S_{\text{winnowing}} + (1 - \alpha) \cdot S_{\text{semantic}}$$
*(Where institutional calibration sets $\alpha = 0.65$ to prioritize verbatim citation and structural evidence while penalizing disguised paraphrasing).*

---

## 2. Institutional Requirement Justifications & Matrix Updates

### 2.1 Group Capacity: 4-Member Maximum per Capstone Team (FR4 Justification)
- **Previous Specification**: Maximum of 3 members.
- **Updated Specification**: Maximum of **4 members per capstone team** ($2 \le N \le 4$).
- **Justification**:
  1. **Software Engineering Role Distribution**: Under modern Capstone II development and deployment requirements, each group requires dedicated specialization:
     - *Role 1: Project Manager & Systems Analyst* (SRS, Gantt tracking, institutional alignment).
     - *Role 2: Lead Backend & Database Architect* (Express API, MongoDB schema, security).
     - *Role 3: Lead Frontend & UI/UX Specialist* (React client, responsive design, access compliance).
     - *Role 4: Quality Assurance, DevOps & Documentation Specialist* (Testing, automated CI/CD, manuscript).
  2. **Institutional Alignment**: Conforms with Bukidnon State University College of Technologies Capstone Guidelines allowing up to 4 proponents for complex multi-tier information systems.
- **Interface Safeguards**: Top-positioned status banner with dynamic color indication (Red for locked team roster, Green for open registration).

---

### 2.2 Terminology Realignment: "IT Field of Discipline" (FR5)
- **Revision**: Replaced all occurrences of `"Capstone Type"` with `"IT Field of Discipline"`.
- **Justification**: "Capstone Type" was ambiguously confused with project phases (e.g., Capstone 1 vs 2). "IT Field of Discipline" accurately reflects domain categorization (Web Applications, Machine Learning, IoT, Cloud Computing, Mobile Systems) and matches academic reporting requirements.

---

### 2.3 Dynamic Institutional Templates Configuration (FR7)
- **Revision**: Eliminated static hardcoded Google Doc URLs in favor of database-driven, instructor-configurable template URIs via `useSettingsStore` (`proposal_template`, `adm_form`, `evaluation_rubric`).
- **Justification**: Eliminates codebase redeployment when departmental document templates are revised across academic semesters.

---

### 2.4 Adviser Interface Roster & GitHub Repository Visibility (FR11 & FRAD2)
- **Revision**: 
  - **FRAD2**: Embedded proponent team roster with full names and roles directly on the Adviser right sidebar.
  - **FR11**: Provided direct GitHub repository monitoring links on the Adviser project management view.
- **Justification**: Advisers must monitor ongoing source code commits and individual contribution equity without requiring student intervention or navigating away from the project overview.

---

### 2.5 De-scoping of FRAD3 and FRAD4 from Adviser Functional Scope
- **Revision**: Formally removed `FRAD3` and `FRAD4` (attaching proposal minutes by adviser).
- **Justification**: The institutional defense protocol assigns deliberation minutes and action matrix item creation to the **Panel Secretary account**, not the Adviser. The Adviser acts as an advocate and mentor; transferring minutes recording to the Secretary maintains academic checks and balances.

---

### 2.6 Data Retention & Soft Archive Policy (FRINS2)
- **Revision**: Replaced deletion/trash functions with soft archiving across all administrative and instructor views.
- **Justification**: Academic accreditation bodies require permanent audit retention of all capstone research artifacts, rubrics, and defense transcripts for minimum 5-year compliance cycles. No student or faculty data is hard-deleted from production databases.

---

### 2.7 Official Evaluation & Plagiarism Reports (FRINS6)
- **Revision**: Added dedicated synthesis cards and printable modal exports for **Defense Evaluation Reports** and **Plagiarism Integrity Reports**.
- **Justification**: Provides instructors and department chairs with verifiable, print-ready evidence packages required for student clearance and graduation certification.

---

## 3. Compliance Summary

| Requirement Code | Description | Status | Implementation Reference |
| :--- | :--- | :--- | :--- |
| **FR1 – FR3** | Team Creation, Member Invites, Proposal Drafts | Complete | `TeamsPage.jsx`, `CreateProjectPage.jsx` |
| **FR4** | 4-Member Group Cap & Lock Banner | Complete | `team.model.js`, `TeamsPage.jsx` |
| **FR5** | "IT Field of Discipline" Terminology | Complete | `CreateProjectPage.jsx` |
| **FR6** | Title Status Workflow & Voting | Complete | `ProjectDetailPage.jsx` |
| **FR7** | Dynamic Google Doc & Template Configuration | Complete | `useSettingsStore.js`, `TeamsPage.jsx` |
| **FR8 – FR10** | Chapter Upload, Review & Manuscript Progress | Complete | `ChapterReviewPanel.jsx`, `SubmissionDetailPage.jsx` |
| **FR11** | GitHub Repo Link on Adviser Interface | Complete | `ProjectSidebarInfo.jsx`, `ProjectDetailPage.jsx` |
| **FR12 – FR17** | Plagiarism Scanning, OCR Autofill, Notifications | Complete | `plagiarism_engine`, `NotificationsPage.jsx` |
| **FRAD1, FRAD5–7** | Adviser Approval, Endorsement, Review Routing | Complete | `ProjectDetailPage.jsx` |
| **FRAD2** | Team Member Display on Right Sidebar | Complete | `FacultyWidget`, `ProjectSidebarInfo.jsx` |
| **FRAD3 – FRAD4** | Adviser Minutes Attachment | De-scoped | Transferred to Panel Secretary workflow |
| **FRPA01 – FRPA07** | Panel Evaluation, Rubric Scoring, Recommendations | Complete | `EvaluationPanel.jsx`, `ActionDoneMatrixTab.jsx` |
| **FRINS1 – FRINS7** | Instructor Overview, Soft Archiving (FRINS2), Evaluation & Plagiarism Reports (FRINS6) | Complete | `ProjectsPage.jsx`, `AcademicReportsWidget` |
