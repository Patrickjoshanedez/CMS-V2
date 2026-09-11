# 🎨 ENVIRONMENT HARNESS & UI PRESENTATION RECIPES

**Rule File:** `.agents/rules/04-environment-and-ui-recipes.md`  
**Parent Blueprint:** [workspace-rules.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/workspace-rules.md)  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. DOCKER CONTAINER DEPENDENCY SYNCHRONIZATION

In CMS-V2's local stack, the Vite client development server runs inside Docker container `cms-client` (port 43211).
* When adding or updating npm packages (`npm install --workspace=client <pkg>`), the host `node_modules` is updated, but the container's isolated `node_modules` remains out of sync.
* This causes Vite to display overlay errors: `[plugin:vite:import-analysis] Failed to resolve import "<package>"`.
* **Standard 3-Step Recipe**:
  1. Install on host: `npm install --workspace=client <pkg>`
  2. Install in container: `docker exec cms-client npm install --workspace=client <pkg>`
  3. Restart container: `docker restart cms-client`
* Visual audit scripts in `scratch/` must listen for `page.on('pageerror', ...)` to catch Vite resolution overlays immediately.

---

## 2. DEFENSIVE ENTITY PREFIX NORMALIZATION

Database records and seeder fixtures frequently contain classification prefixes (e.g. `team.name = "Team Gamma"`, `section = "Section 4A"`).
* Naive string interpolation like `"Team " + team.name` results in duplicate prefix bugs: `"Team Team Gamma"`.
* **Standard Recipe**:
  ```javascript
  const cleanTeamName = useMemo(() => {
    if (!team?.name) return 'Team';
    return team.name.replace(/^Team\s+/i, '').trim();
  }, [team?.name]);
  ```
  Render cleanly as: `Team {cleanTeamName}`.

---

## 3. 16:9 PRESENTATION CANVAS & OVERFLOW ISOLATION

Slide decks, proposal rehearsals, and pitch previews must adhere to strict 16:9 widescreen canvas standards:
* **Aspect Ratio & Layout**: Must use `aspect-video` (`LAYOUT_16x9`), `relative`, `overflow-hidden`, and flex column distribution (`flex flex-col justify-between`).
* **Typography & Clamping**: Use responsive typography (`text-sm sm:text-base lg:text-lg`) with line clamping to eliminate clipping.
* **External Navigation**: Deck toolbars, buttons, slide indicator pills, and export triggers must live outside or below the slide canvas to prevent layout displacement.
* **Keyboard Listener Guards**: Global keyboard listeners (`ArrowLeft`/`ArrowRight`/`Escape`) must check:
  ```javascript
  if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
  ```
  This prevents slide navigation while users type in form fields.

---

## 4. FLOATING LABELS & BROWSER AUTOFILL RECIPE

In controlled input components (React Hook Form / `useController`), label floating must never cause input value loss:
* **Compositor-Level Floating**: Never attach native DOM event listeners (`input`, `change`) that call `setState` inside an input wrapper. Synchronous state updates on initial keypress race with controlled input values and wipe the first typed character.
* **Pure CSS Floating**: Delegate autofill and value detection to CSS compositor rules:
  ```css
  .floating-input:focus ~ .floating-label,
  .floating-input:not(:placeholder-shown) ~ .floating-label,
  .floating-input:-webkit-autofill ~ .floating-label,
  .floating-label-active {
    top: 0.5rem !important;
    transform: translateY(0) scale(0.75) !important;
    transform-origin: top left !important;
  }
  ```
* **Vertical Headroom**: Use `h-14 pt-5 pb-1.5` on input elements to ensure clear vertical separation between the floating label and the text value.

---

## 5. MANDATORY UNIFIED SOPHISTICATED DOCUMENT READER CONTRACT

All document reading, reviewing, and revision inspection across BukSU CMS-V2 must strictly use the canonical `SophisticatedDocumentViewer` component (`client/src/components/documents/SophisticatedDocumentViewer.jsx`). Isolated, ad-hoc, or simplified viewers (`PaginatedDocumentViewer`, raw `<pre>`, plain unstyled HTML converters) are strictly prohibited to prevent visual and functional inconsistencies.

### Core Feature Mandate (Zero Regression)
Every document reading surface must retain all institutional capabilities intact:
1. **Document Identity Bar**: Top bar displaying Chapter / Manuscript Title, Version Badge (`v{N}`), Format Badge (`Word Document` / `PDF Manuscript`), Originality Compliance Badge (`{N}% Original`), Filename, and human-readable File Size.
2. **Revision Diff (+/-) Studio**: Dynamic side-by-side / inline revision diffing (`v{N-1} → v{N}`) with Word Diff, Sentence Diff, Line Diff, revision search input, deletion marker toggles, comment markers, and word delta counters.
3. **High-Fidelity Document Rendering**: Direct browser-side OOXML rendering via `docx-preview` reproducing genuine Word styles, fonts, margins, tables, and alignment without lossy server conversions. Native PDF iframe with scroll containment.
4. **Interactive Toolbar**: Zoom controls (`-`, `100%`, `+`, `Fit`), Details metadata drawer, direct file download (`?download=true`), and Fullscreen/Maximize expansion.

### Implementation Standard: Dual Presentation (Embedded Inline vs. Modal Dialog)
```jsx
// 1. Embedded Inline (Page Flow / Tabs)
<SophisticatedDocumentViewer
  embedded={true}
  submission={viewerSubmission}
  fileUrl={currentDocUrl || `/api/submissions/${submissionId}/file`}
/>

// 2. Modal Dialog (Fullscreen overlay on trigger)
<SophisticatedDocumentViewer
  open={viewerOpen}
  onOpenChange={setViewerOpen}
  submission={viewerSubmission}
  fileUrl={currentDocUrl}
/>
```
In embedded mode (`embedded={true}`), clicking the Maximize button promotes the viewer directly to a full-screen fixed overlay (`fixed inset-0 z-50`), preserving all active states (`viewMode`, zoom, diff comparisons) without layout jumps.
