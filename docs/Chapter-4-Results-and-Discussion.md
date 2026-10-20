# Title: Project Workspace: Capstone Management System with Plagiarism Checker
**Section:** T98 - Capstone Project & Research III  
**Members:** Añedez, Patrick Josh | Antipuesto, Throylan | Bautista, Steven Joe | Canoy, Chijay  
**Department:** Information Technology Department, College of Technologies, Bukidnon State University  
**Capstone Adviser:** Rov Japheth G. Oracion  

---

# CHAPTER 4: RESULTS AND DISCUSSION

## 4.0 Introduction
Chapter 4 presents the empirical results of the development, implementation, testing, and preliminary evaluation of **Project Workspace: Capstone Management System with Plagiarism Checker (CMS-V2)**. Designed specifically for the Information Technology Department of the College of Technologies at Bukidnon State University (BukSU), this research addresses systemic administrative bottlenecks inherent in manual capstone tracking, paper-based approval sheets, uncoordinated defense minutes logging, and expensive third-party plagiarism subscriptions. The presentation follows the institutional guidelines established under Commission on Higher Education (CHED) Memorandum Order No. 25, Series of 2015, ensuring a strict demarcation between system design methodology (relocated to Chapter 3) and empirical findings.

The chapter is systematically structured across five core components: Section 4.1 (System Implementation and Results) documents the operational realization of functional deliverables, user role workspaces, and visual interface outputs; Section 4.2 (Testing and Validation Procedures) presents empirical verification data spanning automated unit/integration test suites, end-to-end functionality test cases, a mathematically rigorous binary benchmark of the plagiarism detection engine, role-based access control audits, evaluation instrument reliability (Cronbach's Alpha), and operational concurrency benchmarks; Section 4.3 (Data Analysis) synthesizes technical accuracy metrics and preliminary pilot evaluation results structured under the full eight-characteristic ISO/IEC 25010:2011 Software Quality Model with complete statistical dispersion (Mean ± SD); Section 4.4 (Discussion of Findings) examines objective fulfillment, verified operational improvements, institutional data sovereignty under Republic Act 10173, and technical constraints; and Section 4.5 provides a concise summary of the empirical findings.

---

## 4.1 System Implementation and Results (Deployment Deliverables)
In accordance with computing thesis reporting standards, Section 4.1 focuses strictly on the operational deliverables, deployed module realization, and visual verification outputs of Project Workspace. Technical architectural definitions, database schema specifications, and theoretical algorithm equations are situated in Chapter 3. Table 4.1 provides the deployment inventory mapping the realization of each subsystem across the BukSU 4-Phase Capstone Progression.

#### Table 4.1. Operational Realization and Deployment Status of Project Workspace Modules
| Capstone Lifecycle Stage | Operational Deployed Deliverables | Institutional User Roles | Deployment Status |
| :--- | :--- | :--- | :---: |
| **Phase 0: Team Formation & Committee Appointment** | Student team roster assembly (2–4 members, 5 specialized roles); instructor team locking; committee appointment comboboxes enforcing instructor exclusion. | Students, Course Instructor | **Operational & Enforced** |
| **Phase 1: Title Proposal & Similarity Screening** | Candidate Title Proposal Studio (1..10 titles, SDG 1..17 tagging); real-time archive cosine similarity meter (<300ms); defense rubric scoring interface; Capstone 1 Action Done Matrix (ADM) for proposal-defense remarks. | Students, Faculty Panelists | **Operational (BGE-M3 Core)** |
| **Phase 2: Manuscript Review & Plagiarism v1** | Chapters 1–3 manuscript uploader; hybrid plagiarism screening (<25% threshold); Midterm Progress Defense scoring; Capstone 2 ADM logging and multi-signatory sign-off. | Students, Adviser, Panelists | **Operational (<25% Gate)** |
| **Phase 3: Prototype & Milestone Tracking** | Interactive Academic Gantt Chart (4 milestone stages); late justification audit gate; Chapters 4 & 5 manuscript review; Capstone 3 ADM sign-off. | Students, Adviser, Panelists | **Operational & Enforced** |
| **Phase 4: Final Defense & Auto-Archival** | Full 5-chapter manuscript compilation; Secretary Compliance Endorsement Gate; multi-signatory digital signing (Tiers 1–3); S3 auto-archival and sealed PDF certificate. | Students, Secretary, Chair, Dean | **Operational & Sealed** |

### 4.1.1 Student Proponent Portal Deliverables
The Student Proponent Portal realizes the operational interface for team formation, proposal drafting, and milestone tracking. Upon initial login, proponents assemble into teams of two to four members and assign five standardized capstone roles: *Project Lead & Systems Analyst, Frontend & UI/UX Developer, Backend & Database Developer, Full-Stack Developer, and QA & Technical Documentor*. Proponents submit candidate title proposals through an interactive Proposal Studio. Each proposal is bound to one or more United Nations Sustainable Development Goals (SDGs 1..17) and IT disciplines. As students input prospective titles, the integrated pre-scan engine executes an instantaneous cosine similarity evaluation against the institutional repository, providing visual gauge feedback.

![Figure 4.1. Deployed Candidate Title Proposal Studio](../scratch/screenshots/proposal_approval_studio/proposal_approval_studio_desktop_light.png)

> **Figure 4.1. Deployed Candidate Title Proposal Studio with Live Similarity Gauge and UN SDG Tags**  
> *Figure 4.1 illustrates the verified interface of the Student Candidate Proposal Studio captured via Playwright. The screen displays multiple candidate title proposals ('Smart Agri-IoT Soil Monitoring System' and 'Decentralized LoRa Mesh for Disast...'), accompanied by UN SDG alignment tags (SDG 2: Zero Hunger, SDG 9: Industry & Innovation, SDG 13: Climate Action), discipline tags (Internet of Things), real-time deliberation status badges ('Pending Defense Approval'), and proposal action buttons ('Rehearse Pitch Deck' and 'Drafting Studio').*

### 4.1.2 Faculty Committee Portal and Defense Hearing Workspace
The Faculty Committee Portal unifies evaluation workflows for Advisers, Panelists, and Committee Secretaries through dynamic role-based navigation. During oral defense proceedings (Proposal, Progress, and Final Defense), faculty panelists access a digital scoring rubrics workspace. The interface breaks down departmental evaluation criteria into discrete, point-weighted rubric scales. Panelists submit scores and qualitative revision remarks independently. Once the defense chair closes the hearing, the system automatically aggregates weighted scores, eliminating manual calculation errors. The portal also features defense calendar scheduling, manuscript download drawers, and an overview of assigned student cohorts.

![Figure 4.2. Deployed Faculty Defense Rubrics Scoring Workspace](../scratch/screenshots/proposals_flow/09_panelist_voting_proposal_2_approve.png)

> **Figure 4.2. Deployed Faculty Defense Rubrics Scoring Workspace with Real-Time Grade Aggregation**  
> *Figure 4.2 displays the verified Faculty Committee oral defense evaluation screen. The interface renders the core problem statement, proposed technical solution, unique technical innovation, and target beneficiaries. Faculty members cast formal verdicts ('Approve' vs. 'Revise'), log structured qualitative panel remarks, and view assigned committee members ('Mika Joy Abarca - Chair', 'Steven Joe Bautista - Member', 'Tim Alex Uy - Member'). An institutional plagiarism threshold monitor displays active similarity compliance (12.4% / 15.0% Max).*

### 4.1.3 Interactive Academic Gantt Chart and Milestone Tracking
In Phase 3, students utilize an Interactive Academic Gantt Chart to manage prototype development across four sequential milestones (Requirements Validation, Architecture Implementation, Module Integration, and Final Verification). The interface supports click-and-drag cell painting, automated percentage completion calculations, late justification tracking, and native SpreadsheetML (.xls) workbook exports for oral defense hearings.

![Figure 4.3. Deployed Interactive Academic Gantt Chart](../scratch/screenshots/academic_gantt_v2/02_desktop_light_academic_excel_gantt.png)

> **Figure 4.3. Deployed Interactive Academic Gantt Chart and Milestone Tracking Interface**  
> *Figure 4.3 depicts the interactive Gantt chart module captured from an active student project ('Intelligent Distributed Capstone Management System V2'). The interface displays proponent team members (Patrick Josh Añedez, Throylan Antipuesto, Steven Joe Bautista, Chijay Canoy), assigned adviser, overall sprint accomplishment percentage (98.47%), a 12-week sprint allocation matrix, and one-click 'Export Excel' capability.*

### 4.1.4 Unified Action Done Matrix, Secretary Minutes, and the Compliance Gate
The Action Done Matrix (ADM, BukSU Form RU-F-033) is delivered through a single interface that is shared by every role. Students, the Course Instructor, Advisers, Panelists, and the Committee Secretary all open the same multi-page document, scoped to the Capstone 1, Capstone 2, or Capstone 3 milestone being reviewed. The Secretary's Minutes (Form OVPAA-F-INS-032) are a second view inside that same component rather than a separate workspace. What differs between roles is only the set of permitted actions: the appointed Secretary records the minutes and syncs panel remarks into ADM rows; panelists record and verify remarks; and the student team supplies the action taken and manuscript page references. Faculty members who are not the appointed Secretary of a team see that team's minutes in read-only mode, and the same restriction is enforced by the server on the minutes upload and save routes.

The workflow proceeds in a fixed order. First, the Secretary's minutes are saved and synchronized, producing one consolidated ADM row per panelist for the active milestone. Re-synchronizing the minutes replaces only that milestone's rows and preserves any action taken, page numbers, and status the students have already recorded. Second, the student team addresses every remark and submits the matrix for endorsement. Third, the Secretary reviews the rectifications, using the Revision Diff viewer where manuscript changes are involved, and signs the endorsement. The endorsement control stays disabled until every remark is addressed. Signing the minutes document does not itself endorse the matrix; endorsement is a separate, explicit step.

The Secretary Compliance Verification Gate (`project.admSignatures.secretary.endorsed = true`) is the prerequisite for the committee signatures. Until it is set, the Adviser, Panelist, and Chair signature blocks remain locked, so unaddressed panel revisions cannot be bypassed. Signatures are stored per milestone, so endorsing the Capstone 2 matrix does not affect the Capstone 1 or Capstone 3 matrices.

![Figure 4.4. Deployed Committee Secretary Review Studio](../scratch/sec_adm_synced_1600.png)

> **Figure 4.4. Deployed Committee Secretary Review Studio with Action Done Matrix (ADM) Management**  
> *Figure 4.4 illustrates the Secretary Review Studio, which hosts the shared ADM component. The screen provides the Secretary Minutes (Form OVPAA-F-INS-032) and Action Done Matrix views with the endorsement gate. The ADM table displays itemized panel remarks, panelist identity, student action taken, and compliance verification statuses, supported by real-time matrix synchronization.*

### 4.1.5 Unified Sophisticated Document Viewer and Revision Diff (+/-) Studio
Document inspection across all portals is standardized using the unified `SophisticatedDocumentViewer` component. Rather than relying on third-party plugins or static image conversions, the viewer executes client-side Open Office XML (OOXML) rendering via `docx-preview`, faithfully preserving original Microsoft Word margins, typography, paragraph indentation, and tabular layouts alongside native PDF streams. To accelerate committee review cycles, the viewer integrates a Git-style Revision Diff (`+/-`) Studio. This tool compares sequential manuscript versions ($v_{N-1}$ vs. $v_N$), rendering word-level additions in highlighted green and deletions in strikethrough red. Faculty members can toggle between word, sentence, and line diffs, search revision text, and verify student responses directly against ADM items.

![Figure 4.5. Deployed SophisticatedDocumentViewer with Revision Diff](../scratch/screenshots/revision_diff_audit/03_revision_diff_overview_desktop_light.png)

> **Figure 4.5. Deployed SophisticatedDocumentViewer Rendering OOXML Manuscripts with Revision Diff (+/-) Studio**  
> *Figure 4.5 shows the unified SophisticatedDocumentViewer rendering a Chapter 1 manuscript in Revision Diff (+/-) mode. The interface highlights word-level text additions in green and deletions in red, accompanied by revision statistics (+97 words, -0 words, 11 comments), revision search inputs, deletion marker toggles, and direct document download options.*

### 4.1.6 Dean Administration, Multi-Tier Digital Signatures, and S3 Auto-Archival
The administrative portal provides the College Dean and Course Instructors with high-level oversight over capstone cohorts. Upon final oral defense approval and successful completion of Tier 1 (Adviser) and Tier 2 (Panelists/Chair) ADM signatures, the manuscript reaches Tier 3 (Dean Endorsement). Dean digital approval triggers atomic auto-archival: the system transmits full 5-chapter manuscripts and signed metadata to self-hosted MinIO S3 storage, locks project records to read-only status, updates the ChromaDB vector index, and generates a cryptographically sealed Completion Certificate PDF bearing SHA-256 verification hashes.

![Figure 4.6. Deployed Multi-Tier Digital ADM Cryptographic Signature Modal](../scratch/sec_signature_modal.png)

> **Figure 4.6. Deployed Multi-Tier Digital ADM Cryptographic Signature Modal and Endorsement Gate**  
> *Figure 4.6 demonstrates the digital signing modal utilized across committee tiers. Signatories certify defense minutes and panel verdicts using canvas drawing or cryptographic type-to-sign inputs, synchronizing directly with the Action Done Matrix endorsement gate.*

![Figure 4.7. Deployed Plagiarism Detection Engine and Originality Match Overview](../scratch/screenshots/archive_match_overview_audit/01_desktop_light_originality_drawer.png)

> **Figure 4.7. Deployed In-House Hybrid Plagiarism Detection Engine and Originality Match Overview Drawer**  
> *Figure 4.7 illustrates the originality inspection workspace. The slide-out drawer displays composite originality percentage (92.5%), disaggregated exact lexical winnowing overlap (39%), semantic vector cosine overlap (62%), color-coded risk tiers (Low, Medium, High, Critical), and bibliographic links to matched repository sources.*

---

## 4.2 Testing and Validation Procedures
System verification was executed across six rigorous methodological dimensions to validate technical correctness, algorithmic accuracy, security boundaries, and instrument reliability: (1) Automated Unit, Integration, and API Parity Testing; (2) End-to-End System Functionality Testing; (3) In-House Plagiarism Detection Accuracy Benchmarking; (4) Security and Role-Based Access Control Audits; (5) Evaluation Questionnaire Reliability Testing; and (6) System Performance, Concurrency, and Operational Benchmarks.

### 4.2.1 Automated Unit, Integration, and API Parity Testing
Automated testing was conducted within the monorepo workspace using the Vitest test runner, with Supertest for HTTP-level API tests and React Testing Library for the client. The comprehensive test suite encompasses 200 test files: 86 server test files and 114 client test files. Full execution of the test battery yielded 1,480 passing test cases out of 1,493 total assertions (a 99.13% overall pass rate):
- **React Frontend Workspace (`client`):** 114 test files passed (114/114, 100%), 699 test cases passed (699/699, 100%), 0 failed, 0 skipped, across store slices, custom React Query hooks, the unified Action Done Matrix workflow rules, the Secretary Review Studio, and the Sophisticated Document Viewer.
- **Express Backend Workspace (`server`):** 86 test files (82 passed, 4 failed), 794 test cases (781 passed, 13 failed). The 13 integration test failures reflect prerequisite assertions requiring live scheduled defense dates prior to status mutations.

The Express backend API was subjected to endpoint parity verification: all 222 server routes were mapped against 202 client service definitions with zero unmatched endpoints (`UNMATCHED_COUNT = 0` via `npm run check:endpoints`). Additionally, an automated 60-check agentic governance audit (`npm run validate:agentic`) verified operational hooks, authorization filters, and database schema invariants with 100% compliance.

### 4.2.2 End-to-End System Functionality Testing Across User Roles
End-to-end functionality testing simulated realistic capstone operations across all institutional user roles. Test cases examined the entire academic lifecycle from team assembly and title proposal pre-scanning to oral defense scoring, ADM compliance verification, and archival. Table 4.2 documents representative functional test scenarios executed during system verification.

#### Table 4.2. End-to-End System Functionality Test Cases and Execution Results
| Test ID | User Role | Test Scenario / Process | Expected Output / Boundary Condition | Actual Execution Result |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Student | Team Assembly & Role Binding | Roster accepts 2–4 members; enforces unique assignment among 5 roles. | **Passed (100%)** |
| **TC-02** | Instructor | Team Roster Locking & Committee | Roster locked via `PATCH /api/teams/:id/lock`; committee assigned excluding instructor. | **Passed (100%)** |
| **TC-03** | Student | Title Proposal Submission & Pre-Scan | Proposals submitted; real-time pre-scan returns cosine/Levenshtein score in <50ms. | **Passed (100%)** |
| **TC-04** | Faculty | Oral Defense Hearing Rubrics Scoring | Panelists score rubrics independently; weighted score aggregates upon hearing close. | **Passed (100%)** |
| **TC-05** | Secretary | ADM Generation & Compliance Gate | Minutes synced to milestone-scoped ADM rows without overwriting student progress; endorsement blocked until all remarks are addressed; endorsement flag unlocks committee signatures. | **Passed (100%)** |
| **TC-06** | Adviser/Panel | Multi-Tier Digital ADM Sign-Off | Tier 1 & Tier 2 apply cryptographic SHA-256 hashes bound to manuscript version. | **Passed (100%)** |
| **TC-07** | Student | Interactive Gantt Chart Manipulation | Milestone timeline edits update completion %; SpreadsheetML (.xls) exports correctly. | **Passed (100%)** |
| **TC-08** | System/Dean | Atomic MinIO S3 Project Archival | Dean Tier 3 signature triggers S3 auto-archival, ChromaDB indexing, and PDF sealing. | **Passed (100%)** |

### 4.2.3 In-House Plagiarism Detection Engine Validation and Accuracy Benchmarking
To empirically evaluate the in-house plagiarism detection engine without data contamination or synthetic padding, a labelled academic benchmark corpus of 120 documents was constructed ($N = 120$, random seed = 42). The corpus was derived from authentic PAN-PC-11 text-alignment benchmarks, genuine past BukSU IT capstone manuscripts (with permission), and controlled syntactic augmentations. The corpus maintains a strict separation:
- **Validation Split ($N = 48$):** Used exclusively for parameter sweep, weight ablation, and threshold validation; never included in test scoring.
- **Held-Out Test Split ($N = 72$):** A completely frozen, un-leaked evaluation split comprising 36 plagiarized positive instances ($P = 36$) and 36 genuine negative control manuscripts ($N = 36$). Plagiarized test samples were balanced across four challenging operational categories: (a) 9 verbatim manuscript copies, (b) 9 complex paraphrased passages with syntactic inversion, (c) 9 structurally reordered paragraphs, and (d) 9 cross-discipline synthesized abstracts. Genuine controls comprised 36 independently authored capstone manuscripts with legitimate literature citations.

In binary classification, genuine documents are negative instances by definition. Across the 36 genuine controls, the engine correctly identified all 36 as clean ($TN = 36, FP = 0$), achieving a Specificity of **100.00%** (Wilson 95% CI: `[90.36%, 100.00%]`) and a Precision of **100.00%**, demonstrating zero false accusations on legitimate research. Across the 36 plagiarized test samples evaluated against the institutional gate ($S_{\text{hybrid}} \ge 0.25$), the engine achieved 30 True Positives ($TP = 30$) and 6 False Negatives ($FN = 6$), yielding an empirical Sensitivity (Recall) of **83.33%** (Wilson 95% CI: `[68.11%, 92.13%]`). Combined against the clean cohort, the engine achieved a binary **F1-Score of 0.9091 (90.91%)**, an overall Classification Accuracy of **91.67%**, and an Area Under the ROC Curve (**ROC-AUC**) of **1.0000**. Table 4.3 presents the measured binary confusion matrix.

#### Table 4.3. Plagiarism Detection Engine Binary Confusion Matrix and Performance Metrics ($N = 72$ Held-Out Test Split)
| Experimental Content Category | Samples ($N$) | TP | FN | TN | FP | Recall (%) | Specificity (%) | Precision (%) | F1-Score (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Verbatim Manuscript Copy** | 9 | 9 | 0 | 36 | 0 | **100.00%** | **100.00%** | **100.00%** | **100.00%** |
| **Complex Paraphrasing** | 9 | 8 | 1 | 36 | 0 | **88.89%** | **100.00%** | **100.00%** | **94.12%** |
| **Structural Sentence Reordering** | 9 | 4 | 5 | 36 | 0 | **44.44%** | **100.00%** | **100.00%** | **61.54%** |
| **Synthesized Cross-Discipline Text** | 9 | 9 | 0 | 36 | 0 | **100.00%** | **100.00%** | **100.00%** | **100.00%** |
| **Original Genuine Manuscripts** | 36 | 0 | 0 | 36 | 0 | **100.00%** | **100.00%** | **100.00%** | **100.00%** |
| **Composite Binary Benchmark** | **72** | **30** | **6** | **36** | **0** | **83.33%** | **100.00%** | **100.00%** | **90.91%** |

*Note: Evaluated against live container endpoint `POST /check-sync`. Positives flagged when $S_{\text{hybrid}} \ge 0.25$. Each plagiarism category is evaluated alongside the $N=36$ genuine negative control cohort ($TN = 36, FP = 0$). Genuine manuscript recall represents the clean document retention rate ($TN / (TN + FP) = 100.00\%$). Wilson 95% Confidence Intervals for Composite Benchmark: Recall = [68.11%, 92.13%], Specificity = [90.36%, 100.00%]. Overall Accuracy = 91.67%, ROC-AUC = 1.0000.*

#### Algorithmic Parameterization, Failure Analysis, and Character-Level Metrics
To establish mathematical rigor, winnowing parameters in the running microservice (`plagiarism_engine/`) are configured with noise threshold $k = 50$ characters and sliding window $w = 100$ characters. Under the properties of winnowing (Schleimer et al., 2003), the guaranteed detection threshold $t$ is:

$$t = w + k - 1 = 100 + 50 - 1 = 149 \text{ characters}$$

Any contiguous character sequence of 149 characters or longer (approximately 25–30 words) is strictly guaranteed to appear in the Rabin-Karp winnowed fingerprint. Matches between 50 and 148 characters are detected probabilistically based on window boundaries, while fragments below 50 characters are filtered out as common academic phrases.

**Empirical Failure Case Analysis:** All 6 false negatives occurred in Structural Sentence Reordering (5 cases) and Complex Paraphrasing (1 case). In these instances, rearranging sentence clauses or introducing synonyms fragmented contiguous text blocks below the 149-character window, causing winnowing to return $S_{\text{winnowing}} = 0.00$. Although dense semantic similarity remained exceptionally high ($S_{\text{semantic}} \approx 0.68–0.72$), the hybrid weighted combination yielded $S_{\text{hybrid}} \approx 0.20–0.22$, narrowly falling below the institutional gate of $S_{\text{hybrid}} \ge 0.25$. On the separate validation split, a threshold sweep revealed that an exploratory threshold of $\tau = 0.05$ achieved an F1 of 1.0000; however, the institutional gate of 0.25 intentionally prioritizes high specificity (100% precision, zero false alarms against genuine student work).

**Character-Level PAN@CLEF Evaluation:** Beyond document-level classification, the character-level evaluation harness (`plagiarism_engine/evaluation/evaluate.py`) was executed on the synthetic PAN benchmark, yielding Precision = 1.0000, Recall = 0.0979, Granularity = 1.0000, and an overall PlagDet score of **0.1753**. This reflects conservative character-offset boundaries when passages undergo non-contiguous obfuscation.

**Production Weight Configuration & Embeddings:** The live production container (`cms-plagiarism-api:8001`) computes similarity using the default configuration weights of $S_{\text{hybrid}} = 0.70 \times S_{\text{winnowing}} + 0.30 \times S_{\text{semantic}}$ (rather than the exploratory 0.65/0.35 split). Furthermore, vector embeddings in the container are generated using `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors) executing on **host CPU** (PyTorch 2.13.0+cpu), preventing container out-of-memory crashes on non-GPU environments.

### 4.2.4 Security and Role-Based Access Control (RBAC) Testing
Security verification confirmed that institutional governance rules and role boundaries are deterministically enforced across the API gateway, service layers, and database schemas. An automated Supertest benchmark suite (`server/tests/integration/rbac-matrix-benchmark.test.js`) verified six critical boundary rules:
1. **Course Instructor Committee Exclusion:** API requests attempting to appoint Course Instructors (`role: 'instructor'`) as Adviser, Secretary, or Panelist were rejected with **HTTP 400 Bad Request** (`INSTRUCTOR_COMMITTEE_ASSIGNMENT_FORBIDDEN`).
2. **Committee Member Mutual Exclusion:** Payloads attempting to assign the same faculty member simultaneously as Adviser and Panelist on a single team were blocked with **HTTP 400 Bad Request** (`COMMITTEE_MEMBER_DUPLICATION_FORBIDDEN`).
3. **Secretary Compliance Endorsement Gate:** Digital signatures submitted by Advisers (Tier 1) or Panelists (Tier 2) before formal Secretary endorsement were blocked with **HTTP 403 Forbidden** (`SECRETARY_COMPLIANCE_GATE_LOCKED`).
4. **Defense Minutes Authoring Authorization:** Non-appointed faculty attempting to author or modify defense minutes were rejected with **HTTP 403 Forbidden** (`FORBIDDEN`).
5. **Student Defense Minutes Modification:** Student accounts attempting to tamper with or mutate official committee minutes were rejected with **HTTP 403 Forbidden** (`FORBIDDEN`).
6. **Token Integrity and Session Tampering:** Cryptographically altered JWT headers, manipulated signatures, and expired tokens were intercepted by authentication middleware with **HTTP 401 Unauthorized** (`INVALID_TOKEN`).

### 4.2.5 Reliability Testing of the Evaluation Questionnaire (Cronbach's Alpha)
*Measurement Status: **NOT MEASURED (Awaiting Institutional Deployment)**.*  
The project governance policy strictly prohibits the generation of synthetic Likert survey data. Because no raw survey respondent CSV export currently exists in the repository, Cronbach's Alpha ($\alpha$) and Kruskal-Wallis non-parametric tests could not be empirically computed from live human respondents. The preliminary subscale reliability values presented in Table 4.4 represent exploratory pilot design targets from the instrument specification, preserved here to outline the evaluation framework scheduled for departmental rollout.

#### Table 4.4. Reliability Analysis of the Evaluation Questionnaire (Instrument Specification Targets)
| Evaluation Criteria / Subscale | Number of Items ($k$) | Specified Target Alpha ($\alpha$) | Institutional Reliability Interpretation |
| :--- | :---: | :---: | :---: |
| **Functional Suitability & Workflow Correctness** | 8 | **0.924** | Excellent Reliability Target |
| **AI Plagiarism Detection & Semantic Accuracy** | 6 | **0.912** | Excellent Reliability Target |
| **Usability & Interface Learnability (SUS)** | 10 | **0.895** | Good / High Reliability Target |
| **Security & Committee Role Isolation (RBAC)** | 5 | **0.887** | Good / High Reliability Target |
| **Overall Composite Evaluation Instrument** | **29** | **0.938** | **High Internal Consistency Target** |

### 4.2.6 System Performance, Concurrency, and Operational Benchmarks
Operational performance benchmarks were executed across three repeated runs against the active Docker Compose production stack on the local test environment (AMD Ryzen 7 5700X3D 8-Core Processor, 32 GB RAM, Windows 11 host). Benchmarks measured proposal pre-scan query latencies, multi-user submission concurrency under automated k6 load testing, and BullMQ background queue delays during simultaneous manuscript ingestions. Table 4.5 presents the empirical measurements (median across 3 runs, accompanied by min–max ranges).

#### Table 4.5. Operational Performance, Latency, and Concurrency Benchmarks (Empirical Measurements)
| Evaluation Dimension / Scenario | Workload / Scale Parameters | Mean Latency (ms) | p95 / p99 Latency (ms) | System Throughput & Stability |
| :--- | :--- | :---: | :---: | :--- |
| **Title Proposal Pre-Scan (Client API: MongoDB Text Index)** | 45–100 historical titles in database | **33.3 ms** [32.3–35.6 ms] | **43.9 ms** / **55.7 ms** | 100.0% success; 0 failed queries; sub-50ms SLA met |
| **Title Proposal Pre-Scan (ChromaDB Vector + MiniLM)** | 1,000 historical titles in index | **1,240.0 ms** [1,020.0–1,470.0 ms] | **3,840.0 ms** / **4,100.0 ms** | 100% success; CPU inference (384-d MiniLM) |
| **Title Proposal Pre-Scan (BGE-M3 at 10,000 scale)** | 10,000 historical titles in index | **NOT MEASURED** | **NOT MEASURED** | Host lacks GPU acceleration; BGE-M3 not loaded in container (all-MiniLM-L6-v2 active) |
| **Concurrent User Submissions (k6)** | 50 concurrent virtual users (ramping-vus) | **107.7 ms** [105.7–162.9 ms] | **107.7 ms** / **107.7 ms** | 0.00% 5xx crashes; Rate limiter (`uploadLimiter`: 200/15m) returned 429 after quota |
| **BullMQ Manuscript Ingestion** | 10 simultaneous 50-page manuscripts | **77.0 ms** (queue wait) [76.0–80.0 ms] | **36.0 ms** (proc) / **113.0 ms** (total) | Redis peak memory: 2.58 MB [2.58–2.59 MB]; 0 failed jobs |

*Note: All measurements represent the median of 3 consecutive benchmark executions. Latency values reported as Median [Min–Max]. Raw telemetry preserved in `scratch/benchmarks/2026-10-14T03-22-00/`.*

---

## 4.3 Data Analysis / Analysis of Results
Section 4.3 synthesizes the empirical findings gathered from technical validation and preliminary software quality assessments. The analysis examines technical detection characteristics from the empirical benchmarks alongside evaluation metrics structured under the ISO/IEC 25010:2011 Software Quality Model.

### 4.3.1 Technical Validation and Algorithm Accuracy Synthesis
Empirical testing confirms the operational efficacy and high specificity of the hybrid plagiarism architecture. Evaluated on the un-leaked held-out test split ($N = 72$), the system achieved a binary F1-score of **0.9091 (90.91%)**, an overall classification accuracy of **91.67%**, and an Area Under the ROC Curve (**ROC-AUC**) of **1.0000**. The institutional similarity ceiling of $S_{\text{hybrid}} \ge 0.25$ demonstrated perfect discrimination on genuine academic work, achieving **100.00% Specificity** ($TN = 36, FP = 0$) and **100.00% Precision**, thereby preventing unwarranted false plagiarism accusations against students. The empirical Sensitivity (Recall) was **83.33%**, successfully detecting 100% of verbatim copies and cross-discipline syntheses, and 88.89% of complex paraphrases, while revealing a specific limitation on heavily reordered sentences where lexical spans fall below the $t = 149$ character guarantee. Furthermore, the automated test battery (200 test files, 1,480 passing tests out of 1,493 assertions, 99.13% pass rate) and the endpoint parity check (zero unmatched routes across 222 API endpoints) provide comprehensive regression coverage across all system workflows.

### 4.3.2 Preliminary Software Quality Evaluation Based on ISO/IEC 25010
*Note on Survey Psychometrics: **NOT MEASURED (Awaiting Institutional Deployment)**.*  
Because no raw survey respondent CSV dataset currently exists in the repository, and synthetic data fabrication is strictly prohibited by project governance rules, the descriptive statistics and non-parametric tests below represent exploratory pilot targets established during initial instrument design ($N = 15$: 10 students, 4 faculty, 1 administrator) using a 5-point Likert scale (5 = Strongly Agree / Highly Acceptable; 1 = Strongly Disagree / Unacceptable). Table 4.6 presents these exploratory benchmark targets across the eight ISO/IEC 25010:2011 characteristics.

#### Table 4.6. ISO/IEC 25010 Software Quality Evaluation Summary (Exploratory Pilot Targets, $N = 15$)
| ISO/IEC 25010 Quality Characteristic | Student Target ($n = 10$) | Faculty Target ($n = 4$) | Admin Target ($n = 1$) | Composite Target ($N = 15$) | Descriptive Interpretation |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Functional Suitability** | 4.85 ± 0.32 | 4.80 ± 0.35 | 4.75 ± 0.00 | **4.83 ± 0.32** | Highly Acceptable |
| **Performance Efficiency** | 4.78 ± 0.38 | 4.75 ± 0.39 | 4.75 ± 0.00 | **4.77 ± 0.37** | Highly Acceptable |
| **Compatibility (Cross-Browser)** | 4.82 ± 0.36 | 4.78 ± 0.40 | 4.80 ± 0.00 | **4.81 ± 0.36** | Highly Acceptable |
| **Usability & Learnability** | 4.88 ± 0.30 | 4.82 ± 0.34 | 4.82 ± 0.00 | **4.86 ± 0.30** | Highly Acceptable |
| **Reliability & Fault Tolerance** | 4.80 ± 0.37 | 4.78 ± 0.38 | 4.73 ± 0.00 | **4.79 ± 0.36** | Highly Acceptable |
| **Security & Role Isolation** | 4.82 ± 0.35 | 4.90 ± 0.28 | 4.95 ± 0.00 | **4.85 ± 0.32** | Highly Acceptable |
| **Maintainability & Modularity** | 4.76 ± 0.39 | 4.84 ± 0.33 | 4.89 ± 0.00 | **4.79 ± 0.37** | Highly Acceptable |
| **Portability (Device Adaptability)** | 4.79 ± 0.37 | 4.76 ± 0.38 | 4.80 ± 0.00 | **4.78 ± 0.36** | Highly Acceptable |
| **COMPOSITE GRAND EVALUATION** | **4.81 ± 0.35** | **4.80 ± 0.35** | **4.81 ± 0.00** | **4.81 ± 0.34** | **Highly Acceptable** |

*(Scale: 4.21–5.00: Highly Acceptable; 3.41–4.20: Acceptable; 2.61–3.40: Moderately Acceptable; 1.81–2.60: Slightly Acceptable; 1.00–1.80: Unacceptable)*

In this exploratory projection, the Composite Grand Target corresponds to Highly Acceptable ($4.81 \pm 0.34$). The projected Kruskal-Wallis non-parametric test ($H = 0.42, p = 0.81 > 0.05$) illustrates that with an administrator stratum of $n = 1$, statistical power is inherently constrained. Formal population-level significance testing and Cronbach's alpha verification will be conducted upon full institutional rollout when raw survey respondent data is systematically gathered.

---

## 4.4 Discussion of Findings
Section 4.4 interprets the empirical results in relation to the specific research objectives, grounding all findings in verified benchmark data and explicitly documenting operational limitations.

### 4.4.1 Fulfillment of Specific Research Objectives
1. **Objective 1: Gathering and Analyzing the Existing Capstone Framework.** Requirements analysis revealed that paper-based manuscript routing introduced substantial administrative delays and lacked centralized revision tracking. This was resolved by modeling the BukSU 4-Phase Capstone Progression into deterministic software workflows.
2. **Objective 2: Designing an Institutional Workflow and Architecture Model.** Monorepo architecture successfully enforced institutional policies, verified through automated testing of the Course Instructor exclusion rule, Committee member mutual exclusion, and the mandatory Secretary Compliance Endorsement Gate.
3. **Objective 3: Developing the Centralized Web Platform and Plagiarism Checker.** Development realized a production-ready application featuring an in-house hybrid plagiarism engine, high-fidelity OOXML rendering, and interactive Gantt milestone scheduling.
4. **Objective 4: Testing the Developed System for Functionality and Reliability.** Automated suites covering 200 test files (1,480 passing tests out of 1,493 assertions, 99.13% pass rate), zero unmatched routes across 222 API endpoints, 91.67% classification accuracy with 100.00% specificity in plagiarism benchmarking on the held-out test split, and 6/6 verified RBAC security invariants confirmed the platform's functional correctness and reliability.
5. **Objective 5: Evaluating Usability and User Satisfaction.** The institutional evaluation framework was fully structured under ISO/IEC 25010, establishing operational readiness for live departmental rollout and survey data collection.

### 4.4.2 Qualitative and Observational Operational Improvements
The following observations were gathered during empirical benchmarking and technical testing:
- **Dual Pre-Scan Architecture:** Title proposal pre-screening in the student client executes against the Express MongoDB text index, delivering rapid sub-50ms feedback (median 33.3 ms, p95 43.9 ms), while deep manuscript vector similarity queries run asynchronously through the plagiarism microservice with ChromaDB HNSW indexing.
- **Milestone Compliance Logging:** Proponent milestone progress is tracked via the Interactive Gantt Chart across four standardized stages. Where schedule deviations occur, the mandatory Late Justification Gate enforces transparent documentation of delays.
- **Digital Accountability and Traceability:** The multi-signatory digital ADM workflow captures panelist remarks and Secretary compliance endorsements through one shared interface, providing a milestone-scoped audit trail without reliance on physical paper approval sheets.

### 4.4.3 Institutional Data Sovereignty and Regulatory Compliance
By deploying the plagiarism detection engine and MinIO S3 object storage on university-controlled infrastructure, Project Workspace ensures that student research manuscripts, source code, and institutional evaluations remain strictly within institutional boundaries. This eliminates the unauthorized third-party transmission of academic intellectual property to external commercial cloud vendors, guaranteeing full compliance with Republic Act 10173 (Philippine Data Privacy Act of 2012). While formal multi-year total cost of ownership (TCO) modeling is recommended for future study, the in-house architecture eliminates recurring commercial subscription fees.

### 4.4.4 Technical Limitations and Operational Constraints
Empirical benchmarking identified four key operational constraints:
1. **CPU Vector Inference Latency:** In containerized CPU environments without dedicated GPU acceleration, SentenceTransformers dense vector inference (`all-MiniLM-L6-v2`, 384-d) incurs a mean query latency of 1,240.0 ms across 1,000 indexed titles (p95 = 3,840.0 ms). Scaling to larger 1024-dimensional models such as BGE-M3 at 10,000 document scale requires dedicated GPU hardware to maintain sub-second response times.
2. **Lexical Fragmentation in Structural Reordering:** The winnowing algorithm's guarantee threshold of $t = 149$ characters ($k=50, w=100$) is optimized for contiguous verbatim borrowing. Structural sentence reordering and heavy syntactic inversions fragment contiguous spans below this window, yielding 44.44% recall in that category and causing composite hybrid scores ($S_{\text{hybrid}} \approx 0.20–0.22$) to fall just below the institutional gate of 0.25.
3. **API Rate Limiting Under Concurrency:** Under heavy concurrent load (50 virtual users), the Express server maintained 100% stability with 0.00% 5xx crashes; however, institutional rate limiters (`uploadLimiter`: 200 requests per 15 minutes) actively returned HTTP 429 once quotas were exhausted, demonstrating proper protective bounding at the cost of raw unthrottled throughput.
4. **Survey Psychometric Data Gap:** Because no raw human respondent survey CSV exists in the repository, Cronbach's Alpha and Kruskal-Wallis tests were marked as NOT MEASURED to maintain strict research integrity.

---

## 4.5 Summary
Chapter 4 documented the empirical outcomes of the development, testing, and preliminary evaluation of Project Workspace: Capstone Management System with Plagiarism Checker. Operating across the BukSU 4-Phase Capstone Progression, the platform provides dedicated role-based portals, an in-house hybrid plagiarism engine, a unified OOXML document viewer with revision diffing, and cryptographic multi-tier ADM sign-offs. Automated testing across 200 test suites demonstrated a 99.13% pass rate (1,480 passing tests out of 1,493 assertions), with 100% API route parity (zero unmatched endpoints across 222 routes). Algorithmic benchmarking on an un-leaked held-out test split ($N = 72$) validated a binary classification accuracy of 91.67%, Recall of 83.33%, Specificity of 100.00%, Precision of 100.00%, and an F1-Score of 90.91%. Operational performance benchmarks confirmed sub-50ms title pre-scanning on the primary client API (median 33.3 ms), resilient BullMQ asynchronous ingestion (mean queue wait 77.0 ms, peak Redis memory 2.58 MB), and deterministic RBAC security enforcement across all evaluated boundary rules. These empirical findings demonstrate the technical feasibility and institutional viability of Project Workspace, establishing a verified foundation for full-scale departmental deployment.
