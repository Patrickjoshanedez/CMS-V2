# Handoff Report — Explorer 3 (Milestone 1)
**Task:** Feature 5 (Printable Evaluation Rubric Scoresheet) & Feature 6 (Global Print Stylesheet Polish)  
**Author:** teamwork_explorer_m1_3  
**Target Recipient:** sub_orch_m1 (Conversation ID: `e3f60e4d-7f0a-4d64-bb81-9c38d8cbf017`)  
**Timestamp:** 2026-11-13T18:20:00Z  

---

## 1. Observation

### 1.1 Current Implementation of Feature 5 (`EvaluationPanel.jsx`)
Direct inspection of `client/src/components/projects/EvaluationPanel.jsx` (857 lines) reveals:

1. **Defense Report Link Opens Raw JSON** (lines 716-724, 747-751):
   ```jsx
   const handleDownloadReport = async () => {
     try {
       window.open(`/api/evaluations/project/${projectId}/${defenseType}/report`, '_blank');
       toast.success('Opening defense evaluation report...');
     } catch {
       toast.error('Failed to download evaluation report.');
     }
   };
   ...
   {!isStudent && (
     <Button size="sm" variant="outline" onClick={handleDownloadReport}>
       <Download className="mr-1.5 h-3.5 w-3.5" />
       Defense Report
     </Button>
   )}
   ```
   **Finding:** On the backend (`server/modules/evaluations/evaluation.controller.js:148-156`), the endpoint `GET /api/evaluations/project/:projectId/:defenseType/report` returns JSON: `{ success: true, data: { report: { ... } } }`. It is NOT a printable page, HTML document, or PDF. Clicking "Defense Report" in the UI opens a new browser tab dumping raw JSON.

2. **Accordion Hiding on Print** (lines 473-615):
   ```jsx
   function PanelistSection({ evaluation, role }) {
     const [open, setOpen] = useState(false);
     ...
     return (
       <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border">
       ...
         <CollapsibleContent>
           <div className="border-t px-4 py-4 space-y-4">
             <div className="rounded-md border">
               <Table className="min-w-[38rem]">
                 ...
   ```
   **Finding:** Criteria breakdowns for panelists are wrapped in `@radix-ui/react-collapsible` (`PanelistSection`). By default, `open` is `false`. When printing, Radix unmounts or applies `display: none` to `CollapsibleContent`. As a result, the physical printout contains zero criteria scores, ratings, or panelist comments.

3. **No Cross-Panelist Consensus Scoring Matrix**:
   `EvaluationsSummary` only displays 4 aggregate metric cards (Average Score, BukSU Grade, Panelists count, Evaluations count) followed by the accordion list of individual panelists. There is no side-by-side consensus comparison table showing how Panelist 1, Panelist 2, and Panelist 3 scored each individual rubric criterion.

4. **Integration in Capstone Stages**:
   - `Capstone1CollapsibleSections.jsx:1087`: `<EvaluationPanel projectId={project?._id} defenseType="proposal" />`
   - `Capstone2CollapsibleSections.jsx:281`: `<EvaluationPanel projectId={project?._id} defenseType="midterm" />`
   - `Capstone3CollapsibleSections.jsx:544`: `<EvaluationPanel projectId={project?._id} defenseType="final" />`
   All three parent sections have the `project` object in scope, but currently only pass `projectId` and `defenseType`. In `EvaluationPanel.jsx:844`, `EvaluationPanel({ projectId, defenseType })` does not accept `project` or fetch project details, meaning proponent team members, thesis title, and adviser details are not directly accessible inside `EvaluationPanel`.

5. **Reference Pattern in `EvaluationWorkspace.jsx`** (lines 347-357, 611-809):
   - Uses `Printer` icon button with `onClick={() => window.print()}` and `data-no-print="true"`.
   - Embeds a print-only container:
     ```jsx
     <section data-print-only="true" className="hidden print:block p-8 space-y-6 bg-white text-black text-sm">
       <div className="border-b-2 border-black pb-4 text-center space-y-1">
         <h1 className="text-xl font-bold tracking-tight uppercase">Bukidnon State University</h1>
         <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-700">
           College of Technologies · Capstone Management System
         </h2>
         ...
     ```
   - Includes official metadata table, structured criteria table, and 3-column signature block (`Panel Chair Signature`, `Adviser Signature`, `Secretary Compliance Seal`).

---

### 1.2 Current Implementation of Feature 6 (`client/src/index.css`)
Direct inspection of `client/src/index.css` (1,171 lines) reveals:

1. **Missing `@page` Rule**:
   There is NO `@page` rule in `client/src/index.css`. Without `@page { size: letter portrait; margin: 0.75in; }` (or `margin: 1in;`), browsers generate unpredictable margins, unwanted browser headers (date/time, URLs), and unpredictable page cuts.

2. **`.docx-outer-container` Lacks Print Unrolling** (lines 608-657):
   ```css
   .docx-outer-container .docx-wrapper {
     background: transparent !important;
     padding: 16px !important;
     display: flex !important;
     flex-direction: column !important;
     align-items: center !important;
     gap: 16px !important;
   }
   .docx-outer-container .docx-wrapper > section.docx {
     background: #ffffff !important;
     color: #0f172a !important;
     box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.18), 0 1px 4px 0 rgba(0, 0, 0, 0.1) !important;
     border-radius: 4px !important;
     margin: 0 !important;
   }
   ```
   **Finding:** Under `@media print` (lines 953-1171), there are ZERO rules targeting `.docx-outer-container`, `.docx-wrapper`, or `section.docx`. When printing a Word document from `SophisticatedDocumentViewer`:
   - Parent `<div className="flex-1 overflow-auto bg-muted">` cuts off pages after 100vh.
   - `.docx-zoom-wrapper` scales document via CSS `zoom`, distorting print resolution.
   - Heavy drop shadows (`box-shadow`) and `border-radius: 4px` print on physical pages.
   - `section.docx` lacks `break-inside: avoid; break-after: page; page-break-after: always;`.

3. **Radix Dialog Dark Overlay Bleed & 90vh Viewport Clipping**:
   In `client/src/components/ui/Dialog.jsx`:
   - `DialogOverlay` (line 15): `className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] ..."`
   - `DialogContent` (line 39): `className="fixed left-1/2 top-1/2 z-50 ... max-h-[min(90vh,48rem)] overflow-y-auto ..."`
   **Finding:** When printing any modal dialog (such as `LiveDefenseMinutesModal` or `SophisticatedDocumentViewer` in dialog mode), the dark overlay prints as a muddy gray wash over the page, and the modal container is locked at `max-h: 90vh` centered on page 1, completely truncating multi-page content.

4. **Global Theme Inversion & Background Adjust**:
   In `index.css`:
   - Dark mode CSS variables (`--background: 220 60% 5%`, `--foreground: 0 0% 100%`) are active whenever `html.dark` is present.
   - Only `.reports-dashboard-container` has local theme inversion (lines 1077-1087). Other views printed in dark mode bleed black backgrounds and light text onto paper.
   - `-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;` is applied selectively in `.reports-dashboard-container` and `mark`, but is missing on global tables, badge pills, and print containers.

5. **Recharts Print Containment**:
   Lines 1128-1152 only apply static print dimensions to `.reports-dashboard-container .chart-container`. Any other view utilizing Recharts risks 0px height collapse during print due to `ResizeObserver` detachment.

---

## 2. Logic Chain

### Feature 5: Printable Evaluation Rubric Scoresheet
1. **Observation:** Defense panel evaluation records are institutional academic artifacts required for physical filing, accreditation, and graduation clearance.
2. **Observation:** Currently, `EvaluationPanel` allows panelists to score rubrics and instructors to release grades, but provides no printable scoresheet (clicking "Defense Report" opens a raw JSON API endpoint, and collapsible panelist sections are closed on print).
3. **Deduction:** `EvaluationPanel` requires:
   - A dedicated `Print Scoresheet` button (using `Printer` from `lucide-react`) in both `EvaluationsSummary` (for instructors, advisers, and students) and `PanelistEvaluationForm` (for individual panelists).
   - An integrated `PrintableEvaluationScoresheet` sub-component (`hidden print:block evaluation-rubric-print-container`) that renders when `window.print()` is triggered.
   - Full access to project metadata (`title`, `teamId`, `academicYear`, `capstoneType`, committee members). Accepting `project` as an optional prop with fallback to `useProject(projectId)` guarantees zero-regression backward compatibility across all Capstone stages.
   - A cross-panelist consensus matrix calculating:
     - Per-criterion average: $\bar{S}_i = \frac{1}{K}\sum_{k=1}^K S_{ik}$
     - Per-criterion percentage: $P_i = \frac{\bar{S}_i}{\text{Max}_i} \times 100\%$
     - Composite BukSU grade: `computeBukSUGrade(summary.averagePercentage)`
     - Consensus verdict: Majority / unanimous defense decision
   - Multi-signatory attestation blocks for Panel Chair, Panelist 2, Panelist 3, Adviser, Secretary, and Capstone Instructor.

### Feature 6: Global Print Stylesheet Polish
1. **Observation:** Web browsers printing HTML applications face CSS box-model limitations: viewport-bound heights (`h-screen`, `max-h-[90vh]`), overflow scrolling (`overflow-auto`, `overflow-y-auto`), dark mode color tokens, and Radix modal overlays.
2. **Observation:** In `index.css`, `@media print` currently lacks `@page`, docx container unrolling, Radix dialog unrolling, and global dark-mode reset.
3. **Deduction:** Modifying `client/src/index.css` with:
   - Explicit `@page { size: letter portrait; margin: 0.75in; }`
   - Complete unrolling for `.docx-outer-container`, `.docx-wrapper`, and `.docx-zoom-wrapper`
   - Zero-opacity suppression of `[data-radix-dialog-overlay]` and static positioning of `[role="dialog"]`
   - Global root print theme inversion (`background: #ffffff !important; color: #000000 !important; color-scheme: light !important;`)
   - Institutional print isolation for `body:has(.evaluation-rubric-print-container)`
   will ensure that any document, report, modal, or evaluation scoresheet prints cleanly without clipping or theme corruption.

---

## 3. Caveats

1. **Student Role Privacy (Grade Leakage Prevention)**:
   - In accordance with institutional rules, students must NEVER see unreleased evaluations.
   - If `role === ROLES.STUDENT` and evaluations are not yet released, `EvaluationsSummary` already renders the `Grades Pending Panel Sign-Off` banner. The printable scoresheet must likewise obey this guard and only render when evaluations are released.
2. **Single-Panelist vs. Multi-Panelist Scoring**:
   - Some legacy or draft projects may have 1 or 2 submitted evaluations while others are pending.
   - The consensus calculation must safely filter out `null`/`undefined` scores and gracefully indicate "Pending" for unsubmitted panelists without causing `NaN` or layout collapse.
3. **Paper Sizing & Margins**:
   - BukSU official defense forms are standard Letter (`8.5in × 11in`).
   - Using `size: letter portrait; margin: 0.75in;` in `@page` provides the standard academic border while maximizing printable area for tables and signatures.
4. **Vite Development Server Synchronization**:
   - The Vite development server runs inside the `cms-client` container. When modifying `index.css` or `EvaluationPanel.jsx`, changes hot-reload cleanly, but visual verification via Playwright must run in `scratch/` against the running Vite port.

---

## 4. Conclusion & Concrete Implementation Specifications

### 4.1 Feature 5: Implementation in `client/src/components/projects/EvaluationPanel.jsx`

#### 4.1.1 Add `Printer` Import (line 66)
```jsx
// client/src/components/projects/EvaluationPanel.jsx
import {
  ChevronDown,
  ChevronRight,
  Save,
  Send,
  Unlock,
  ClipboardList,
  Download,
  Lock,
  Clock,
  Printer, // <-- ADDED
} from 'lucide-react';
```

#### 4.1.2 Accept `project` Prop and Fallback to `useProject`
In `EvaluationPanel.jsx`:
```jsx
// Add import at top:
import { useProject } from '@/hooks/useProjects';

// Update export default function EvaluationPanel (lines 844-857):
export default function EvaluationPanel({ projectId, defenseType, project: propProject }) {
  const authState = useAuthStore((s) => s?.user);
  const user = authState?.user ?? authState;
  const { data: fetchedProject } = useProject(projectId, {
    enabled: !propProject && !!projectId,
  });
  const project = propProject || fetchedProject;

  if (!user) return null;

  const canHavePanelAssignment = user.role === ROLES.PANELIST || user.role === ROLES.FACULTY;

  if (canHavePanelAssignment) {
    return (
      <PanelistEvaluationForm
        projectId={projectId}
        defenseType={defenseType}
        project={project}
      />
    );
  }

  return (
    <EvaluationsSummary
      projectId={projectId}
      defenseType={defenseType}
      role={user.role}
      project={project}
    />
  );
}
```

#### 4.1.3 Dedicated `PrintableEvaluationScoresheet` Component
Insert this helper component directly into `EvaluationPanel.jsx` (before the main export):

```jsx
/**
 * PrintableEvaluationScoresheet — Official BukSU Defense Rubric & Consensus Record
 * Renders only during print (@media print / hidden print:block).
 */
function PrintableEvaluationScoresheet({
  project,
  defenseType = 'proposal',
  evaluations = [],
  summary = {},
  singleEvaluation = null,
}) {
  const isIndividual = !!singleEvaluation;
  const activeEvals = isIndividual ? [singleEvaluation] : evaluations;

  const titleStageMap = {
    proposal: 'CAPSTONE 1: TITLE & PROPOSAL DEFENSE',
    midterm: 'CAPSTONE 2: SYSTEM DEVELOPMENT & MIDTERM DEFENSE',
    final: 'CAPSTONE 3: FINAL MANUSCRIPT & ORAL DEFENSE',
  };
  const stageHeading = titleStageMap[defenseType] || `${defenseType.toUpperCase()} DEFENSE`;

  // Extract criteria template from the first evaluation with criteria
  const templateCriteria =
    activeEvals.find((e) => e.criteria?.length > 0)?.criteria || [];

  // Team proponent names
  const teamMembers =
    project?.teamId?.members?.map((m) =>
      typeof m === 'object' ? `${m.firstName || ''} ${m.lastName || ''}`.trim() : m
    ).filter(Boolean) || [];

  const teamLead =
    project?.teamId?.leaderId
      ? typeof project.teamId.leaderId === 'object'
        ? `${project.teamId.leaderId.firstName || ''} ${project.teamId.leaderId.lastName || ''}`.trim()
        : ''
      : '';

  const proponentsText = teamMembers.length > 0
    ? teamMembers.join(', ')
    : teamLead || 'Proponent Team';

  // Format committee names
  const panelNames = activeEvals.map((ev, idx) => {
    const explicit = typeof ev.panelistName === 'string' ? ev.panelistName.trim() : '';
    const derived = [ev.panelistId?.firstName, ev.panelistId?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return explicit || derived || `Panelist ${idx + 1}`;
  });

  return (
    <div
      data-print-only="true"
      className="hidden print:block evaluation-rubric-print-container p-6 space-y-5 bg-white text-black font-sans text-xs"
    >
      {/* 1. BukSU Institutional Header */}
      <div className="border-b-2 border-black pb-3 text-center space-y-1">
        <h1 className="text-base font-bold tracking-tight uppercase">
          Bukidnon State University
        </h1>
        <h2 className="text-xs font-semibold tracking-wider uppercase text-neutral-800">
          College of Technologies · Department of Information Technology
        </h2>
        <p className="text-[11px] text-neutral-600">Malaybalay City, Bukidnon 8700</p>
        <div className="pt-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wide">
            Official Defense Evaluation Rubric & Consensus Scoresheet
          </h3>
          <p className="text-xs font-bold text-neutral-700">{stageHeading}</p>
        </div>
      </div>

      {/* 2. Project & Hearing Metadata */}
      <div className="grid grid-cols-2 gap-3 border border-neutral-400 p-3 rounded-none text-xs">
        <div className="space-y-1">
          <p>
            <span className="font-bold">Project Title:</span>{' '}
            <span className="font-medium">{project?.title || 'Academic Capstone Project'}</span>
          </p>
          <p>
            <span className="font-bold">Proponents:</span>{' '}
            <span>{proponentsText}</span>
          </p>
          <p>
            <span className="font-bold">Team:</span>{' '}
            <span>{project?.teamId?.name || 'Assigned Capstone Team'}</span>
          </p>
          <p>
            <span className="font-bold">Program:</span>{' '}
            <span>Bachelor of Science in Information Technology (BSIT)</span>
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-bold">Academic Year:</span>{' '}
            <span>{project?.academicYear || 'Current Academic Year'}</span>
          </p>
          <p>
            <span className="font-bold">Date Evaluated:</span>{' '}
            <span>{new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })}</span>
          </p>
          <p>
            <span className="font-bold">Evaluation Type:</span>{' '}
            <span>{isIndividual ? 'Individual Panelist Scoresheet' : 'Committee Consensus Record'}</span>
          </p>
          <p>
            <span className="font-bold">Assigned Panelists:</span>{' '}
            <span>{activeEvals.length} Member(s) Submitted</span>
          </p>
        </div>
      </div>

      {/* 3. Criteria Scoring & Consensus Matrix */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs uppercase tracking-wide border-b border-neutral-400 pb-0.5">
          Grading Criteria & Committee Score Breakdown
        </h4>
        <table className="w-full text-left text-xs border border-neutral-400 border-collapse">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-400">
              <th className="p-2 border-r border-neutral-400 w-10 text-center">#</th>
              <th className="p-2 border-r border-neutral-400">Evaluation Criterion</th>
              <th className="p-2 border-r border-neutral-400 w-16 text-center">Max Pts</th>
              {panelNames.map((name, i) => (
                <th key={i} className="p-2 border-r border-neutral-400 text-center w-24">
                  <div className="font-bold truncate max-w-[5.5rem]">{name}</div>
                  <div className="text-[10px] font-normal text-neutral-600">Score</div>
                </th>
              ))}
              {!isIndividual && (
                <th className="p-2 border-r border-neutral-400 w-20 text-center">
                  Consensus
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {templateCriteria.map((criterion, idx) => {
              const scores = activeEvals.map((ev) => ev.criteria?.[idx]?.score);
              const validScores = scores.filter((s) => typeof s === 'number' && !isNaN(s));
              const critAvg =
                validScores.length > 0
                  ? Math.round(
                      (validScores.reduce((sum, val) => sum + val, 0) / validScores.length) * 10
                    ) / 10
                  : null;

              return (
                <tr key={criterion.name || idx} className="border-b border-neutral-300">
                  <td className="p-2 border-r border-neutral-300 text-center font-mono font-semibold">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-neutral-300">
                    <p className="font-semibold text-neutral-900">{criterion.name}</p>
                    {criterion.description && (
                      <p className="text-[10px] text-neutral-600 pt-0.5">{criterion.description}</p>
                    )}
                  </td>
                  <td className="p-2 border-r border-neutral-300 text-center font-mono">
                    {criterion.maxScore}
                  </td>
                  {scores.map((sc, sIdx) => (
                    <td
                      key={sIdx}
                      className="p-2 border-r border-neutral-300 text-center font-mono font-bold text-neutral-800"
                    >
                      {sc !== null && sc !== undefined ? sc : '—'}
                    </td>
                  ))}
                  {!isIndividual && (
                    <td className="p-2 border-r border-neutral-300 text-center font-mono font-bold bg-neutral-50">
                      {critAvg !== null ? critAvg : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-100 font-bold border-t-2 border-neutral-400">
              <td colSpan={2} className="p-2 border-r border-neutral-400 text-right uppercase">
                Total Composite Score:
              </td>
              <td className="p-2 border-r border-neutral-400 text-center font-mono">
                {templateCriteria.reduce((sum, c) => sum + (c.maxScore || 0), 0)}
              </td>
              {activeEvals.map((ev, eIdx) => (
                <td key={eIdx} className="p-2 border-r border-neutral-400 text-center font-mono text-sm">
                  {ev.totalScore !== null && ev.totalScore !== undefined ? ev.totalScore : '—'}
                </td>
              ))}
              {!isIndividual && (
                <td className="p-2 border-r border-neutral-400 text-center font-mono text-sm bg-neutral-200">
                  {summary.averageScore !== null && summary.averageScore !== undefined
                    ? summary.averageScore.toFixed(1)
                    : '—'}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Grade Consensus & Verdict Summary */}
      <div className="grid grid-cols-2 gap-4 border border-neutral-400 p-3 bg-neutral-50 text-xs">
        <div>
          <p className="font-bold uppercase text-[11px] text-neutral-700">Official BukSU Grade Rating</p>
          <div className="flex items-center gap-2 pt-1 font-mono">
            <span className="text-base font-extrabold">
              {summary.buksuGrade?.grade || (singleEvaluation?.buksuGrade?.grade) || 'N/A'}
            </span>
            <span className="text-neutral-700 text-xs">
              ({summary.buksuGrade?.descriptor || (singleEvaluation?.buksuGrade?.descriptor) || 'Evaluated'})
            </span>
          </div>
          <p className="text-[10px] text-neutral-600 pt-0.5">
            Equivalent: {summary.averagePercentage || singleEvaluation?.percentage || '0'}% Computed Percentage
          </p>
        </div>
        <div>
          <p className="font-bold uppercase text-[11px] text-neutral-700">Consensus Defense Verdict</p>
          <p className="text-sm font-bold uppercase text-neutral-900 pt-1">
            {isIndividual
              ? (singleEvaluation?.decision?.replace(/_/g, ' ') || 'PENDING')
              : (activeEvals.every((e) => e.decision === 'passed')
                  ? 'PASSED'
                  : activeEvals.some((e) => e.decision === 're_defense_required')
                    ? 'RE-DEFENSE REQUIRED'
                    : activeEvals.some((e) => e.decision === 'failed')
                      ? 'FAILED'
                      : 'PASSED WITH REVISIONS')}
          </p>
          <p className="text-[10px] text-neutral-600 pt-0.5">
            Subject to completion of all Action Done Matrix (ADM) directives.
          </p>
        </div>
      </div>

      {/* 5. Committee Remarks & Observations */}
      <div className="space-y-2 pt-1">
        <h4 className="font-bold text-xs uppercase tracking-wide border-b border-neutral-400 pb-0.5">
          Committee Directives & Specific Remarks
        </h4>
        <div className="space-y-2 text-xs">
          {activeEvals.map((ev, idx) => {
            const comment = ev.overallComment || 'No general comments recorded.';
            return (
              <div key={ev._id || idx} className="border-l-2 border-neutral-400 pl-2">
                <span className="font-bold text-neutral-800">{panelNames[idx]}:</span>{' '}
                <span className="italic text-neutral-700">&ldquo;{comment}&rdquo;</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Multi-Signatory Attestation Lines */}
      <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs">
        <div className="border-t border-black pt-1.5 space-y-0.5">
          <p className="font-bold text-neutral-900">{panelNames[0] || 'Panel Chair'}</p>
          <p className="text-[10px] uppercase text-neutral-600">Panel Chair / Lead Evaluator</p>
          <p className="text-[9px] text-neutral-400">Date: ________________________</p>
        </div>
        <div className="border-t border-black pt-1.5 space-y-0.5">
          <p className="font-bold text-neutral-900">{panelNames[1] || 'Panel Member 2'}</p>
          <p className="text-[10px] uppercase text-neutral-600">Defense Panelist Member</p>
          <p className="text-[9px] text-neutral-400">Date: ________________________</p>
        </div>
        <div className="border-t border-black pt-1.5 space-y-0.5">
          <p className="font-bold text-neutral-900">{panelNames[2] || 'Panel Member 3'}</p>
          <p className="text-[10px] uppercase text-neutral-600">Defense Panelist Member</p>
          <p className="text-[9px] text-neutral-400">Date: ________________________</p>
        </div>
      </div>

      <div className="pt-5 grid grid-cols-2 gap-12 text-center text-xs">
        <div className="border-t border-black pt-1.5 space-y-0.5">
          <p className="font-bold text-neutral-900">
            {project?.adviserId
              ? `${project.adviserId.firstName || ''} ${project.adviserId.lastName || ''}`.trim()
              : 'Capstone Adviser'}
          </p>
          <p className="text-[10px] uppercase text-neutral-600">Capstone Project Adviser</p>
          <p className="text-[9px] text-neutral-400">Date: ________________________</p>
        </div>
        <div className="border-t border-black pt-1.5 space-y-0.5">
          <p className="font-bold text-neutral-900">Department Capstone Committee</p>
          <p className="text-[10px] uppercase text-neutral-600">Instructor / Chair Attestation</p>
          <p className="text-[9px] text-neutral-400">Date: ________________________</p>
        </div>
      </div>
    </div>
  );
}
```

#### 4.1.4 Add Print Buttons in `EvaluationsSummary` and `PanelistEvaluationForm`
1. In `EvaluationsSummary` (around line 747):
```jsx
<div className="flex items-center gap-2">
  <Button
    size="sm"
    variant="outline"
    onClick={() => window.print()}
    className="no-print"
    title="Print Official Evaluation Rubric Scoresheet"
    data-no-print="true"
  >
    <Printer className="mr-1.5 h-3.5 w-3.5" />
    Print Scoresheet
  </Button>
  {!isStudent && (
    <Button size="sm" variant="outline" onClick={handleDownloadReport} className="no-print" data-no-print="true">
      <Download className="mr-1.5 h-3.5 w-3.5" />
      Defense Report
    </Button>
  )}
</div>
```
And mount `<PrintableEvaluationScoresheet project={project} defenseType={defenseType} evaluations={visibleEvaluations} summary={summary} />` inside `EvaluationsSummary`.

2. In `PanelistEvaluationForm` (around line 265):
```jsx
<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
  <CardTitle className="text-lg font-semibold flex items-center gap-2">
    <ClipboardList className="h-5 w-5" />
    Your Evaluation
  </CardTitle>
  <div className="flex items-center gap-2">
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => window.print()}
      className="no-print"
      title="Print Evaluation Scoresheet"
      data-no-print="true"
    >
      <Printer className="mr-1.5 h-3.5 w-3.5" />
      <span className="hidden sm:inline">Print Scoresheet</span>
    </Button>
    <StatusBadge status={evaluation.status} />
  </div>
</CardHeader>
```
And mount `<PrintableEvaluationScoresheet project={project} defenseType={defenseType} singleEvaluation={evaluation} summary={{ buksuGrade: computeBukSUGrade((totalScore / maxTotalScore) * 100), averageScore: totalScore, averagePercentage: (totalScore / maxTotalScore) * 100 }} />` inside `PanelistEvaluationForm`.

---

### 4.2 Feature 6: Implementation in `client/src/index.css`

#### 4.2.1 Global `@page` and Print Media Rules
In `client/src/index.css`, polish the `@media print` section (starting around line 951) with the following exact CSS rules:

```css
/* ══════════════════════════════════════════════════════════════════════ */
/* Global Print Stylesheet Polish (@media print)                          */
/* ══════════════════════════════════════════════════════════════════════ */

@page {
  size: letter portrait;
  margin: 0.75in;
}

@media print {
  /* 1. Global Theme Inversion: Force clean white surface and high-contrast dark text */
  :root,
  html,
  body {
    background: #ffffff !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    color-scheme: light !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 2. Unclip root scroll wrappers */
  html,
  body,
  #root,
  .h-screen,
  .h-dvh,
  .min-h-screen,
  .overflow-hidden,
  .overflow-y-auto,
  .overflow-x-auto,
  .overflow-auto {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }

  /* 3. Hide interactive layout chrome, sidebars, navigations, toasters, and floating modals */
  aside,
  header,
  nav,
  [role='navigation'],
  [role='status'],
  [data-sonner-toaster],
  .toaster,
  .no-print,
  [data-no-print='true'],
  button:not(.print-preserve) {
    display: none !important;
  }

  .print-only,
  [data-print-only='true'] {
    display: block !important;
  }

  /* 4. Radix Dialog Unrolling: Eliminate fixed centering, 90vh clipping, and dark overlays */
  [data-radix-dialog-overlay],
  [class*='DialogOverlay'] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }

  [role='dialog'],
  .dialog-centered,
  .dialog-fullscreen {
    position: static !important;
    transform: none !important;
    max-height: none !important;
    max-width: 100% !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    background: transparent !important;
  }

  /* 5. docx-preview OOXML Unrolling: Remove viewport clipping, zoom distortion, and card shadows */
  .docx-outer-container,
  .docx-outer-container .docx-wrapper {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    display: block !important;
    gap: 0 !important;
  }

  .docx-zoom-wrapper {
    zoom: 1 !important;
    transform: none !important;
    width: 100% !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    display: block !important;
  }

  .docx-outer-container .docx-wrapper > section.docx {
    background: #ffffff !important;
    color: #000000 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 auto !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: auto !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    break-after: page !important;
    page-break-after: always !important;
  }

  .docx-outer-container .docx-wrapper > section.docx:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  .docx-outer-container .docx-wrapper > section.docx * {
    color: #000000 !important;
    text-shadow: none !important;
  }

  /* 6. Institutional Document Print Isolation (ADM, Minutes, & Evaluation Rubrics) */
  body:has(.adm-sheet-paper-container) .project-title-card,
  body:has(.adm-sheet-paper-container) .workflow-phase-tracker,
  body:has(.adm-sheet-paper-container) [role='tablist'],
  body:has(.secretary-sheet-paper-container) .project-title-card,
  body:has(.secretary-sheet-paper-container) .workflow-phase-tracker,
  body:has(.secretary-sheet-paper-container) [role='tablist'],
  body:has(.evaluation-rubric-print-container) .project-title-card,
  body:has(.evaluation-rubric-print-container) .workflow-phase-tracker,
  body:has(.evaluation-rubric-print-container) [role='tablist'],
  body:has(.evaluation-rubric-print-container)
    [data-testid='capstone1-collapsible-workspace']
    > div:not(:has(.evaluation-rubric-print-container)),
  body:has(.evaluation-rubric-print-container)
    [data-testid='capstone2-collapsible-workspace']
    > div:not(:has(.evaluation-rubric-print-container)),
  body:has(.evaluation-rubric-print-container)
    [data-testid='capstone3-collapsible-workspace']
    > div:not(:has(.evaluation-rubric-print-container)),
  body:has(.evaluation-rubric-print-container) .card:not(:has(.evaluation-rubric-print-container)) {
    display: none !important;
  }

  /* 7. Evaluation Rubric Scoresheet Print Rules */
  .evaluation-rubric-print-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }

  .evaluation-rubric-print-container table {
    width: 100% !important;
    border-collapse: collapse !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  .evaluation-rubric-print-container th,
  .evaluation-rubric-print-container td {
    border: 1pt solid #71717a !important;
    color: #000000 !important;
  }

  .evaluation-rubric-print-container th {
    background-color: #f4f4f5 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* 8. Recharts & Data Visualization Print Hardening */
  .chart-container,
  .recharts-responsive-container {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    height: 7.5cm !important;
    min-height: 7.5cm !important;
    max-height: 7.5cm !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  svg.recharts-surface {
    overflow: visible !important;
    max-width: 100% !important;
  }

  .recharts-cartesian-grid line {
    stroke: #e2e8f0 !important;
    opacity: 0.8 !important;
  }

  .recharts-text {
    fill: #111827 !important;
    font-size: 8.5pt !important;
  }
}
```

---

## 5. Verification Method

To verify these changes upon implementation:

1. **Targeted Unit Test Verification**:
   ```bash
   npm test --workspace=client -- src/components/projects/EvaluationPanel.test.jsx
   ```
   Verify that all existing tests pass and add unit assertions verifying:
   - "Print Scoresheet" button renders in both `EvaluationsSummary` and `PanelistEvaluationForm`.
   - `PrintableEvaluationScoresheet` mounts with `data-print-only="true"` and `hidden print:block`.
   - Clicking "Print Scoresheet" invokes `window.print()`.

2. **Parent Section Integration Tests**:
   ```bash
   npm test --workspace=client -- src/components/projects/Capstone1CollapsibleSections.test.jsx
   npm test --workspace=client -- src/components/projects/Capstone2CollapsibleSections.test.jsx
   npm test --workspace=client -- src/components/projects/Capstone3CollapsibleSections.test.jsx
   ```

3. **Playwright Visual Print Audit**:
   Execute a visual script in `scratch/test-print-evaluation.js`:
   - Emulate media print: `await page.emulateMedia({ media: 'print' })`.
   - Navigate to `/projects/:id` in Capstone 1, 2, and 3.
   - Verify that:
     1. Navigation, headers, sidebars, and unrelated accordions have `display: none`.
     2. The institutional header, criteria scores table, BukSU grade chip, and signature blocks are rendered crisply in black text on white paper.
     3. Document viewer `.docx-outer-container` pages unroll across pages without clipping.
     4. Radix dialog overlays have `display: none` and zero backdrop darkness.

4. **API Route Parity & Agentic Battery**:
   ```bash
   npm run check:endpoints
   npm run validate:agentic
   ```
