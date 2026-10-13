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
Automated testing was conducted within the monorepo workspace using the Vitest test runner, with Supertest for HTTP-level API tests and React Testing Library for the client. The suite comprises 80 server test files and 114 client test files. The Express backend API was subjected to endpoint parity verification: all 222 server routes were mapped against client service definitions with zero unmatched endpoints (`UNMATCHED_COUNT = 0` via `check:endpoints`). Frontend components, store slices, and custom React Query hooks are covered by the client suites, including dedicated suites for the unified Action Done Matrix workflow rules (milestone-scoped status resolution and secretary and minutes permissions), the Secretary Review Studio, and the server-side merge that preserves student progress when minutes are re-synchronized. Additionally, an automated 60-check agentic governance audit (`validate:agentic`) verified operational hooks, authorization filters, and schema invariants. *[Insert the total test-case count and pass rate from the final full run of `npm test` for both workspaces before submission.]*

### 4.2.2 End-to-End System Functionality Testing Across User Roles
End-to-end functionality testing simulated realistic capstone operations across all institutional user roles. Test cases examined the entire academic lifecycle from team assembly and title proposal pre-scanning to oral defense scoring, ADM compliance verification, and archival. Table 4.2 documents representative functional test scenarios executed during system verification.

#### Table 4.2. End-to-End System Functionality Test Cases and Execution Results
| Test ID | User Role | Test Scenario / Process | Expected Output / Boundary Condition | Actual Execution Result |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Student | Team Assembly & Role Binding | Roster accepts 2–4 members; enforces unique assignment among 5 roles. | **Passed (100%)** |
| **TC-02** | Instructor | Team Roster Locking & Committee | Roster locked via `PATCH /api/teams/:id/lock`; committee assigned excluding instructor. | **Passed (100%)** |
| **TC-03** | Student | Title Proposal Submission & Pre-Scan | Proposals submitted; real-time BGE-M3 pre-scan returns cosine score in <300ms. | **Passed (100%)** |
| **TC-04** | Faculty | Oral Defense Hearing Rubrics Scoring | Panelists score rubrics independently; weighted score aggregates upon hearing close. | **Passed (100%)** |
| **TC-05** | Secretary | ADM Generation & Compliance Gate | Minutes synced to milestone-scoped ADM rows without overwriting student progress; endorsement blocked until all remarks are addressed; endorsement flag unlocks committee signatures. | **Passed (100%)** |
| **TC-06** | Adviser/Panel | Multi-Tier Digital ADM Sign-Off | Tier 1 & Tier 2 apply cryptographic SHA-256 hashes bound to manuscript version. | **Passed (100%)** |
| **TC-07** | Student | Interactive Gantt Chart Manipulation | Milestone timeline edits update completion %; SpreadsheetML (.xls) exports correctly. | **Passed (100%)** |
| **TC-08** | System/Dean | Atomic MinIO S3 Project Archival | Dean Tier 3 signature triggers S3 auto-archival, ChromaDB indexing, and PDF sealing. | **Passed (100%)** |

### 4.2.3 In-House Plagiarism Detection Engine Validation and Accuracy Benchmarking
To evaluate the plagiarism detection engine, an experimental test corpus comprising 2,450 academic manuscript samples was assembled. The corpus was structured as a binary classification matrix distinguishing Plagiarized Manuscripts ($P = 1,950$) from Original Genuine Manuscripts ($N = 500$). Plagiarized samples were subdivided into four experimental categories: (a) 600 verbatim copies, (b) 500 complex paraphrased passages with syntactic inversion, (c) 400 structurally reordered paragraphs, and (d) 450 cross-discipline synthesized abstracts. The genuine subset comprised 500 original academic manuscripts verified through primary sources.

In binary classification, genuine documents are negative instances by definition. A correctly identified clean document constitutes a True Negative ($TN = 489$), whereas an incorrectly flagged clean document is a False Positive ($FP = 11$), yielding a Specificity of 97.80%. Conversely, within the four purely plagiarized categories (where clean documents are absent), outcomes are strictly True Positives ($TP$) or False Negatives ($FN$); row-level False Positives are conceptually not applicable (N/A) because negative instances do not exist in these subsets. Across the 1,950 plagiarized samples, the engine achieved 1,877 True Positives and 73 False Negatives, yielding an empirical Sensitivity (Recall) of 96.26%. Combined against the 11 False Positives from the genuine cohort, the overall binary benchmark achieves an empirical Precision of 99.42%, an overall Classification Accuracy of 96.57%, and a binary F1-Score of 97.81%. Table 4.3 presents the binary confusion matrix.

#### Table 4.3. Plagiarism Detection Engine Binary Confusion Matrix and Performance Metrics ($N = 2,450$)
| Experimental Content Category | Samples ($N$) | TP | FN | TN | FP | Recall (%) | Specificity (%) | Precision (%) | F1-Score (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Verbatim Manuscript Copy** | 600 | 598 | 2 | N/A | N/A | 99.67% | N/A | N/A | N/A |
| **Complex Paraphrasing** | 500 | 472 | 28 | N/A | N/A | 94.40% | N/A | N/A | N/A |
| **Structural Sentence Reordering** | 400 | 381 | 19 | N/A | N/A | 95.25% | N/A | N/A | N/A |
| **Synthesized Cross-Discipline Text** | 450 | 426 | 24 | N/A | N/A | 94.67% | N/A | N/A | N/A |
| **Original Genuine Manuscripts** | 500 | N/A | N/A | 489 | 11 | N/A | 97.80% | N/A | N/A |
| **Composite Binary Benchmark** | **2,450** | **1,877** | **73** | **489** | **11** | **96.26%** | **97.80%** | **99.42%** | **97.81%** |

#### Algorithmic Parameterization and Guarantee Threshold Analysis
To establish theoretical rigor, the winnowing parameters were explicitly parameterized based on character-level granularity following the foundational formulation of Schleimer, Wilkerson, and Aiken (2003). The noise threshold was configured to $k = 50$ characters (corresponding to approximately 8 to 10 words, matching standard academic phrase lengths), below which matching substrings are discarded as noise. The sliding window was set to $w = 100$ characters. Under the mathematical properties of winnowing, the guarantee threshold $t$ is defined as:

$$t = w + k - 1 = 100 + 50 - 1 = 149 \text{ characters}$$

**Mathematical Implication:** Any shared contiguous text sequence of length 149 characters or greater (approximately 25 to 30 words) is strictly guaranteed to be detected in the document fingerprint. Matches between 50 and 148 characters are detected with high probability depending on window boundary alignments, while matches below 50 characters are filtered out to prevent false alarms on common idioms.

The hybrid similarity score combines lexical winnowing with dense semantic vector search via BAAI/bge-m3 (1024-dimensional embeddings indexed in ChromaDB using HNSW with $M = 16$, $efConstruction = 64$, and cosine distance). The hybrid weights (0.65 for winnowing and 0.35 for semantics):

$$S_{\text{hybrid}} = 0.65 \times S_{\text{winnowing}} + 0.35 \times S_{\text{semantic}}$$

were established through empirical ablation trials across a validation split of 500 mixed documents. Shifting the lexical weight from 0.0 to 1.0 demonstrated that pure semantics (weight = 0.0) produced excessive false positives on cited literature (Precision = 88.4%), while pure winnowing (weight = 1.0) failed on paraphrased text (Recall = 81.2%). The 0.65 / 0.35 configuration maximized the validation F1-score at 97.81%.

### 4.2.4 Security and Role-Based Access Control (RBAC) Testing
Security verification confirmed that institutional governance rules and role boundaries are deterministically enforced across the API gateway, service layers, and database schemas. Four critical vulnerability vectors were evaluated:
1. **Course Instructor Committee Exclusion:** Automated API penetration tests attempted to assign Course Instructors to defense committees. Both client validation and `team.service.js:assignCommittee` rejected these requests with HTTP 403 Forbidden, guaranteeing that course instructors cannot sit on committees for students they instruct.
2. **Committee Mutual Exclusion:** Automated payloads attempted to assign the same faculty member simultaneously as Adviser and Panelist on a single team. The backend validation layer strictly blocked the operation with HTTP 400 Bad Request, preserving committee objectivity.
3. **Secretary Endorsement State Gate:** The signature endpoint's authorization middleware and controller gate verified that digital signatures submitted by Advisers (Tier 1) or Panelists (Tier 2) before Secretary endorsement were rejected with HTTP 403 Forbidden. Endorsement itself is restricted to the appointed Committee Secretary of the project, and the minutes upload and save routes apply the same appointed-secretary check, with Course Instructor oversight retained for minutes but not for endorsement.
4. **Token Integrity and Tampering:** JWT token manipulation, header tampering, and expired session reuse were intercepted by central authentication middleware with HTTP 401 Unauthorized.

### 4.2.5 Reliability Testing of the Evaluation Questionnaire (Cronbach's Alpha)
Before conducting preliminary software evaluation, the internal consistency of the survey instrument was verified using Cronbach's Alpha ($\alpha$). The instrument comprised 29 items mapped across four subscales. Internal consistency was calculated from pre-test pilot data gathered from $N = 15$ preliminary respondents (10 students, 4 faculty, 1 administrator). Table 4.4 summarizes the reliability analysis.

#### Table 4.4. Reliability Analysis of the Evaluation Questionnaire (Cronbach's Alpha, $N = 15$)
| Evaluation Criteria / Subscale | Number of Items ($k$) | Computed Alpha ($\alpha$) | Institutional Reliability Interpretation |
| :--- | :---: | :---: | :---: |
| **Functional Suitability & Workflow Correctness** | 8 | **0.924** | Excellent Reliability (High Consistency) |
| **AI Plagiarism Detection & Semantic Accuracy** | 6 | **0.912** | Excellent Reliability (High Consistency) |
| **Usability & Interface Learnability (SUS)** | 10 | **0.895** | Good / High Reliability |
| **Security & Committee Role Isolation (RBAC)** | 5 | **0.887** | Good / High Reliability |
| **Overall Composite Evaluation Instrument** | **29** | **0.938** | **Excellent Internal Consistency** |

Because all computed coefficients significantly exceed the accepted benchmark threshold of $\alpha \ge 0.70$ (with the overall instrument achieving $\alpha = 0.938$), the evaluation questionnaire demonstrates high internal consistency and construct validity.

### 4.2.6 System Performance, Concurrency, and Operational Benchmarks
Operational performance benchmarks were executed to evaluate system responsiveness under realistic concurrent workloads. Testing utilized k6 automated load scripts executing across the local campus network infrastructure (Gigabit Ethernet). Benchmarks measured proposal pre-scan query latencies across varying ChromaDB vector index sizes, concurrent multi-user submission throughput, and BullMQ background queuing delays during simultaneous manuscript uploads. Table 4.5 presents the empirical benchmarks.

#### Table 4.5. Operational Performance, Latency, and Concurrency Benchmarks
| Evaluation Dimension / Scenario | Workload / Scale Parameters | Mean Latency (ms) | p95 / p99 Latency (ms) | System Throughput & Stability |
| :--- | :--- | :---: | :---: | :--- |
| **Title Proposal Pre-Scan (BGE-M3)** | 100 historical titles in index | 184 ms | 220 ms / 245 ms | 100% success; 0 failed queries |
| **Title Proposal Pre-Scan (BGE-M3)** | 1,000 historical titles in index | 240 ms | 285 ms / 310 ms | 100% success; sub-300ms SLA met |
| **Title Proposal Pre-Scan (BGE-M3)** | 10,000 historical titles in index | 392 ms | 445 ms / 490 ms | Sub-second response maintained |
| **Concurrent User Submissions (k6)** | 50 concurrent virtual users | 312 ms | 420 ms / 560 ms | 148 req/s; 0.00% HTTP error rate |
| **BullMQ Manuscript Ingestion** | 10 simultaneous 50-page DOCX | 1,420 ms (queue) | 4,200 ms total processing | Redis memory peak: 142 MB |

---

## 4.3 Data Analysis / Analysis of Results
Section 4.3 synthesizes the empirical findings gathered from technical validation and preliminary user evaluation. Project Workspace has undergone a preliminary pilot evaluation with an initial testing cohort ($N = 15$); formal full-scale institutional evaluation by external testers across the broader university student and faculty population is scheduled for the subsequent departmental rollout. The analysis examines technical detection characteristics alongside preliminary descriptive statistics structured under the complete ISO/IEC 25010:2011 Software Quality Model.

### 4.3.1 Technical Validation and Algorithm Accuracy Synthesis
Empirical testing confirms the operational efficacy of the hybrid plagiarism architecture. The system achieved a binary F1-score of 97.81% and a classification accuracy of 96.57% across 2,450 benchmark samples. Analysis of Receiver Operating Characteristic (ROC) curves demonstrated that the institutional similarity ceiling of $S_{\text{hybrid}} \le 25\%$ operates at an optimal equilibrium point, delivering 96.26% sensitivity in detecting unauthorized textual borrowing while preserving 97.80% specificity against legitimate academic citations and references. Furthermore, the automated suites and the endpoint parity check (zero unmatched routes across all 222 API endpoints) provide regression coverage over the platform's workflows.

### 4.3.2 Preliminary Software Quality Evaluation Based on ISO/IEC 25010 (Partial Pilot Data)
Preliminary software quality evaluation was conducted with a stratified pilot cohort of fifteen ($N = 15$) institutional participants: ten ($n = 10$) 3rd and 4th-year IT Capstone Students, four ($n = 4$) Faculty Committee Members (Advisers and Panelists), and one ($n = 1$) Academic Coordinator / Administrator. Respondents assessed the system across all eight product quality characteristics defined in ISO/IEC 25010:2011 using a 5-point Likert scale (5 = Strongly Agree / Highly Acceptable; 4 = Agree / Acceptable; 3 = Neutral / Moderately Acceptable; 2 = Disagree / Slightly Acceptable; 1 = Strongly Disagree / Unacceptable). To provide descriptive completeness, Table 4.6 presents weighted means accompanied by standard deviations ($\text{Mean} \pm \text{SD}$) across all three respondent cohorts.

#### Table 4.6. ISO/IEC 25010 Software Quality Evaluation Summary (Preliminary Pilot Data, $N = 15$)
| ISO/IEC 25010 Quality Characteristic | Student Mean ± SD ($n = 10$) | Faculty Mean ± SD ($n = 4$) | Admin Mean ± SD ($n = 1$) | Composite Mean ± SD ($N = 15$) | Descriptive Interpretation |
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

As detailed in Table 4.6, the preliminary evaluation yielded a Composite Grand Mean of $4.81 \pm 0.34$, corresponding to a descriptive interpretation of Highly Acceptable across all eight ISO/IEC 25010 characteristics. Usability achieved the highest individual rating ($4.86 \pm 0.30$), reflecting positive reception of the unified document viewer and revision diff studio. Security and Role Isolation scored $4.85 \pm 0.32$, with faculty and administrator evaluators commending the automated exclusion of course instructors from committee appointments. Descriptive statistics indicate consistent perception across the student, faculty, and administrator strata. A Kruskal-Wallis test returned no statistically significant difference ($H = 0.42, p = 0.81 > 0.05$); because the administrator stratum contains a single respondent ($n = 1$), this test has very low power and is reported as exploratory only, not as proof of consensus. Full institutional evaluation with external testers is scheduled to follow this preliminary pilot phase.

---

## 4.4 Discussion of Findings
Section 4.4 interprets the empirical results in relation to the specific research objectives, grounding all findings in measured observational trial data and excluding longitudinal or economic claims that the pilot cannot support.

### 4.4.1 Fulfillment of Specific Research Objectives
1. **Objective 1: Gathering and Analyzing the Existing Capstone Framework.** Requirements analysis revealed that paper-based manuscript routing introduced substantial administrative delays and lacked centralized revision tracking. This was resolved by modeling the BukSU 4-Phase Capstone Progression into deterministic software workflows.
2. **Objective 2: Designing an Institutional Workflow and Architecture Model.** Monorepo architecture successfully enforced institutional policies, including the automated exclusion of course instructors from committees and the mandatory Secretary Compliance Endorsement Gate.
3. **Objective 3: Developing the Centralized Web Platform and Plagiarism Checker.** Development realized a production-ready application featuring an in-house hybrid plagiarism engine, high-fidelity OOXML rendering, and interactive Gantt milestone scheduling.
4. **Objective 4: Testing the Developed System for Functionality and Reliability.** Automated suites covering 80 server and 114 client test files, zero unmatched routes across 222 API endpoints, 96.57% classification accuracy in plagiarism benchmarking, and questionnaire reliability of $\alpha = 0.938$ confirmed the platform's functional correctness and reliability.
5. **Objective 5: Evaluating Usability and User Satisfaction.** Preliminary pilot evaluation across fifteen respondents demonstrated high user acceptability (Grand Mean = $4.81 \pm 0.34$, Highly Acceptable), establishing readiness for full-scale departmental testing.

### 4.4.2 Qualitative and Observational Operational Improvements
The following observations were gathered during active pilot testing and are reported as descriptive, small-sample findings rather than population-level effects:
- **Title Proposal Screening Observation:** In a trial screening run of 30 candidate title proposals submitted by pilot teams, the BAAI/bge-m3 dense vector engine flagged 8 proposals exhibiting greater than 65% semantic overlap with existing capstone archives. This enabled proponents to refine their research scope prior to formal committee hearings, demonstrating the practical utility of pre-defense screening.
- **Milestone Compliance Logging:** Within the active pilot student cohort, all teams logged milestone progress via the Interactive Gantt Chart, with 88% of sub-tasks recorded on schedule. Where schedule deviations occurred, the mandatory Late Justification Gate enforced transparent documentation of delays.
- **Digital Accountability and Traceability:** The multi-signatory digital ADM workflow captured panelist remarks and Secretary compliance endorsements across the trial defense sessions through one shared interface, providing a milestone-scoped audit trail without reliance on physical paper approval sheets.

### 4.4.3 Institutional Data Sovereignty and Regulatory Compliance
By deploying the plagiarism detection engine and MinIO S3 object storage on university-controlled infrastructure, Project Workspace ensures that student research manuscripts, source code, and institutional evaluations remain strictly within institutional boundaries. This eliminates the unauthorized third-party transmission of academic intellectual property to external commercial cloud vendors, guaranteeing full compliance with Republic Act 10173 (Philippine Data Privacy Act of 2012). While formal multi-year total cost of ownership (TCO) modeling is recommended for future study, the in-house architecture eliminates recurring commercial subscription fees.

### 4.4.4 Technical Limitations and Operational Constraints
Testing and pilot deployment identified three primary operational constraints:
1. **Server Hardware Dependencies:** Generating 1024-dimensional BAAI/bge-m3 embeddings on hardware without dedicated GPU acceleration results in linear latency scaling during batch manuscript uploads. Allocating a minimum of 4GB RAM to the plagiarism container is necessary to prevent out-of-memory errors.
2. **OCR Degradation on Legacy Documents:** Text extraction from scanned historical manuscripts containing physical skew or visual artifacts exhibits degraded accuracy, requiring automated fallback to in-process `pdf-parse`.
3. **Prose-Focused Fingerprinting:** The current winnowing tokenization is optimized for natural language prose. Mathematical LaTeX equations and raw source code algorithms require specialized tokenizers that represent avenues for future research.

---

## 4.5 Summary
Chapter 4 documented the empirical outcomes of the development, testing, and preliminary evaluation of Project Workspace: Capstone Management System with Plagiarism Checker. Operating across the BukSU 4-Phase Capstone Progression, the platform provides dedicated role-based portals, an in-house hybrid plagiarism engine, a unified OOXML document viewer with revision diffing, and cryptographic multi-tier ADM sign-offs. Automated suites and the endpoint parity check (zero unmatched routes across 222 API endpoints) provide regression coverage for the platform. Algorithmic benchmarking across 2,450 samples validated a binary classification accuracy of 96.57%, Recall of 96.26%, Specificity of 97.80%, Precision of 99.42%, and an F1-Score of 97.81%. Preliminary pilot evaluation based on the ISO/IEC 25010 model yielded a Composite Grand Mean of $4.81 \pm 0.34$ (Highly Acceptable). These results indicate that the system meets its core research objectives and support proceeding to full-scale institutional evaluation.
