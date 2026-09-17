# Gantt Chart Null/Pending Initial States, Dual-View Bidirectional Synchronization & Independent Section/Row Creation Architecture Governance Rule

## Architecture & Implementation Details

### 1. Elimination of Template Data & Enforcement of Null/Pending Initial States
- **Lesson learned**: Hardcoded task templates (`DEFAULT_ACADEMIC_TASKS`, `INITIAL_TASKS`) and mock data (`PLAN-01`, `Antipuesto, Throylan`, `T87 / TF 10:00AM-12:30PM`) in Gantt chart initializers inject false tasks into newly created capstone projects. Charts must initialize empty (`[]`) and unassigned project fields must cleanly display `'Pending'`.
- **Implementation**:
  - In `client/src/utils/exportExcelGantt.js`: Replaced hardcoded default values with `'Pending'` and calculate accomplishment as `'Pending'` when `validTasks.length === 0`.
  - In `client/src/components/projects/AcademicExcelGanttChart.jsx`: Updated extraction helpers to return `'Pending'` for unassigned adviser/instructor and `[]` for unassigned members; stripped auto-injection of template tasks on empty `localStorage`; and display `'Pending'` for unassigned metadata.
  - In `client/src/components/projects/InteractiveGanttChart.jsx`: Cleared `INITIAL_TASKS = []` and `DEFAULT_SECTIONS = []`. Empty roadmap renders "No Gantt Roadmap Data" with a clear CTA to add the first section.

### 2. Dual-View Bidirectional State Synchronization
- **Lesson learned**: When one view (`AcademicExcelGanttChart`) maintains its own internal task state while another (`InteractiveGanttChart`) uses separate or static data, changes made in one view fail to reflect in the other.
- **Implementation**:
  - Hoisted `tasks`, `sections`, `setTasks`, and `setSections` to the parent `InteractiveGanttChart` container, synchronized with debounced `localStorage` keys (`gantt_state_${projectId}` and `gantt_sections_${projectId}`).
  - Passed state and mutation handlers (`onAddSection`, `onAddRow`, `onDeleteRow`, `onDeleteSection`) down to `AcademicExcelGanttChart` as controlled props.
  - Changes in either view (adding/editing/deleting tasks or sections) are instantly reflected across both views in real time.

### 3. Independent Add Section and Add Row / Add Task Triggers
- **Lesson learned**: Combining section and task creation creates confusion for users structuring academic capstones into distinct milestone sections.
- **Implementation**:
  - In `AcademicExcelGanttChart.jsx`, added a separate `+ Add Section` button in the toolbar alongside `+ Add Row`. Built a dedicated `+ Add Section` modal dialog with milestone suggestion presets. Added `+ Add` row and trash (Delete Section) buttons directly to section divider rows.
  - In `InteractiveGanttChart.jsx`, added separate `+ Add Section` and `+ Add Task` buttons in the toolbar, section header action triggers, and task row deletion buttons.

## Prevention, Runbook & Checklist

### 1. Prevention Rules
- **Prevention rule**: Never embed static mock tasks or hardcoded personnel into Gantt or project planning initializers. All project charts must start at `[]` and unassigned fields must display `'Pending'`.
- **Prevention rule**: Dual-view or multi-tab representations of the same underlying dataset must share a hoisted single source of truth; never allow child view components to diverge into isolated internal state.

### 2. Runbook & Checklist
- **Checklist**: Run targeted tests `npm test --workspace=client -- src/components/projects/AcademicExcelGanttChart.test.jsx src/components/projects/InteractiveGanttChart.test.jsx`.
- **Checklist**: Run Playwright visual audit `node scratch/audit_gantt_sync_and_empty_state.mjs` verifying empty states, modal dialog, and real-time dual-view synchronization in light and dark modes across desktop (1440x900) and mobile (390x844).
- **Checklist**: Verify 0 route mismatches (`npm run check:endpoints`), 60/60 agentic validation checks (`npm run validate:agentic`), and pristine workspace cleanliness (`python scripts/workspace_guardrail.py`).

### 3. Evidence & Verification Passed
- Targeted tests evidence passed: `AcademicExcelGanttChart.test.jsx` (11/11 passed) and `InteractiveGanttChart.test.jsx` (4/4 passed) — 15/15 passed.
- Playwright visual audit passed: 9 screenshots verified (`01_gantt_empty_excel_desktop_light.png` to `09_gantt_mobile_dark.png`) showing empty null/pending states, modal dialog, populated dual-view sync, and dark/mobile responsive layouts.
- Agentic governance: 60/60 checks passed (`npm run validate:agentic`).
- Endpoint parity: 204 Server / 182 Client (`UNMATCHED_COUNT = 0`).
- Governance validation pipeline: All 4 stages valid, 0 errors, 0 warnings.
- Workspace cleanliness: Pristine workspace, 0 clutter.
