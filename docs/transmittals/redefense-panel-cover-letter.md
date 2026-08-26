# BUKIDNON STATE UNIVERSITY
### College of Technologies — Department of Information Technology
**Malaybalay City, Bukidnon 8700**

---

### **TRANSMITTAL & FORMAL COVER LETTER FOR CAPSTONE RE-DEFENSE SUBMISSION**

**DATE:** August 26, 2026  

**TO:**  
**MR. LOUIE JAY LABASTIDA**  
*Research & Ethics Committee (REC) Chair / Associate Professor*  
College of Technologies, Bukidnon State University  

**MR. RAUL LECAROS**  
*Capstone Evaluation Panel Member / Assistant Professor*  
College of Technologies, Bukidnon State University  

**MR. JOSEPH ABELLA**  
*Capstone Evaluation Panel Member / Assistant Professor*  
College of Technologies, Bukidnon State University  

**VIA:**  
**DR. MARIA SANTOS**  
*Capstone Project Adviser*  

---

**SUBJECT:** Formal Transmittal of Revised Final Manuscript (Chapters 1–5), Completed Action Done Matrix (ADM), and Final Submission Package for **"BukSU Capstone Management System V2 (CMS-V2)"**

---

**Dear Chair Labastida and Honorable Panel Members Lecaros and Abella,**

Warm academic greetings.

We, the undersigned members of the Capstone Research Team, respectfully submit our revised final manuscript entitled:

> **"BukSU Capstone Management System V2 (CMS-V2): Intelligent Workflow Automation with Dual-Engine Plagiarism Analysis"**

along with the fully addressed and signed **Action Done Matrix (ADM)** (`project-workspace-adm-completed.docx`) and verified system artifacts for your final review and endorsement.

---

### Summary of Major Revisions & Committee Compliance

In strict adherence to the guidance and recommendations provided during our previous defense proceedings, we have implemented the following comprehensive enhancements:

1. **Algorithmic Justification & Complexity Analysis (Addressed for Chair Louie Jay Labastida)**:
   - Formulated a comprehensive asymptotic complexity analysis in **Chapter 3 (Section 3.4)** comparing the **Winnowing Algorithm ($O(N)$)** for exact character matching against **Sentence-Transformers/all-MiniLM-L6-v2 ($O(N \cdot D)$)** for dense semantic cosine similarity.
   - Incorporated empirical benchmarks demonstrating latency, token throughput, and memory consumption tradeoffs.

2. **Action Done Matrix Multi-Signatory Integration (Addressed for Member Raul Lecaros)**:
   - Engineered an end-to-end, multi-signatory digital verification pipeline within the CMS-V2 web application (`ActionDoneMatrixTab.jsx`).
   - Integrated dynamic role validation with digital signature timestamps for Panel Chair, Panelists, Adviser, and Defense Secretary.

3. **Offline LAN & Edge Deployment Capabilities (Addressed for Member Joseph Abella)**:
   - Added production Docker Compose profiles (`docker-compose.prod.yml`) and LAN deployment automation (`scripts/lan-deploy.ps1`).
   - Pre-cached all PyTorch dense embedding model weights in container volumes to support zero-internet rural campus deployments.

4. **Literature Standardization & APA 7th Edition Formatting (Addressed for Adviser Dr. Maria Santos)**:
   - Thoroughly audited all 42 academic references in **Chapter 2**, formatting each in accordance with APA 7th edition standards and providing verified digital object identifiers (DOIs).

---

### Package Contents & Transmittal Checklist

The accompanying archival submission package (`CMS-V2-Final-Submission.zip`) contains:

| Item No. | Document / Artifact | Description | Status |
| :---: | :--- | :--- | :---: |
| **01** | `Revised_Final_Manuscript_Ch1-5.pdf` | Complete Chapters 1 through 5 with integrated results and discussions | **COMPLETED** |
| **02** | `project-workspace-adm-completed.docx` | Full Action Done Matrix with verbatim recommendations, actions taken, and signatures | **VERIFIED** |
| **03** | `Dual_Plagiarism_Scan_Report.pdf` | Similarity report showing 8.4% exact (Winnowing) & 11.2% semantic (MiniLM) overlap | **PASSED (< 20%)** |
| **04** | `CMS-V2-Final-Submission.zip` | Clean, audit-safe source code repository matching the institutional architectural contract | **PACKAGED** |
| **05** | `Live_Demonstration_Sandbox` | Seeded database sandbox with 4-person team, realistic mock reports, and prototype link | **ONLINE** |

---

We express our sincere gratitude to the committee for your invaluable guidance, rigorous critiques, and continuous mentorship in elevating this project to institutional production standards. We remain at your full disposal for any further verifications or demonstration requirements.

Respectfully submitted,

**THE CAPSTONE RESEARCH TEAM (InnovateIT Group):**

*   **Patrick Josh Anedez** — *Project Lead / Full-Stack Engineer* (Student ID: 2022-00101)  
*   **Jane Doe** — *Frontend & UI/UX Specialist* (Student ID: 2022-00102)  
*   **John Smith** — *Backend & Database Engineer* (Student ID: 2022-00103)  
*   **Alice Johnson** — *Quality Assurance & Documentation Lead* (Student ID: 2022-00104)  

---

**Endorsed by:**

_______________________________________  
**DR. MARIA SANTOS**  
*Capstone Project Adviser*  
Date: August 26, 2026  
