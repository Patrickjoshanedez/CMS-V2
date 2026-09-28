# Handoff Report: Technical Survey of Phase 3 & Phase 4

**Agent**: `survey_explorer_2`  
**Date**: 2026-09-28  
**Parent**: `orchestrator_1` (Conversation ID: `1714716d-2fa0-43f0-bb45-4ec063aeb453`)  
**Mission**: Comprehensive Technical Survey and Exploration of Phase 3 (Accessible Semantics & Administrative Route Hardening) and Phase 4 (Institutional Typography & Anti-Patterns De-Slop Pass)

---

## 1. Observation

### 1.1 Phase 3: Accessible Semantics & Administrative Route Hardening

#### A. Accordion Triggers & Icon-Only Controls in `TeamCommitteeAssignmentsView.jsx`
- **File Path**: `client/src/components/users/TeamCommitteeAssignmentsView.jsx`
- **Associated Test**: `client/src/components/users/TeamCommitteeAssignmentsView.test.jsx` (5/5 tests passing in 1.44s)
- **Deadlines Accordion Trigger (Lines 870–894)**:
  ```jsx
  870:                 <CardHeader
  871:                   className="cursor-pointer py-3"
  872:                   onClick={() => setIsDeadlinesOpen((prev) => !prev)}
  873:                 >
  874:                   <div className="flex items-center justify-between">
  ...
  886:                     <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
  887:                       {isDeadlinesOpen ? (
  888:                         <ChevronUp className="h-4 w-4" />
  889:                       ) : (
  890:                         <ChevronDown className="h-4 w-4" />
  891:                       )}
  892:                     </Button>
  893:                   </div>
  894:                 </CardHeader>
  ```
  - **Missing Attributes**:
    - The icon-only `<Button>` at line 886 lacks `aria-label` (e.g. `aria-label={isDeadlinesOpen ? 'Collapse project milestones and deadlines' : 'Expand project milestones and deadlines'}`).
    - The button lacks `aria-expanded={isDeadlinesOpen}`.
    - The button lacks `aria-controls="deadlines-accordion-content"`.
    - The collapsible body at line 896 (`{isDeadlinesOpen && (<CardContent ...>...)}`) lacks an ID anchor `id="deadlines-accordion-content"`.
- **Icon-Only Action Controls (Lines 682–690, 743–751, 825–833)**:
  - **Adviser Slot Clear (Line 682–690)**:
    ```jsx
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setSelectedAdviserId('')}
      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
      title="Clear Adviser"
    >
      <X className="h-3 w-3" />
    </Button>
    ```
    Has `title="Clear Adviser"` but missing `aria-label="Clear Adviser"`.
  - **Secretary Slot Clear (Line 743–751)**:
    ```jsx
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setSelectedSecretaryId('')}
      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
      title="Clear Secretary"
    >
      <X className="h-3 w-3" />
    </Button>
    ```
    Has `title="Clear Secretary"` but missing `aria-label="Clear Secretary"`.
  - **Panelist Slot Removal (Line 825–833)**:
    ```jsx
    <Button
      variant="ghost"
      size="icon"
      onClick={() => handleRemovePanelist(panId)}
      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
      title="Remove Panelist"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
    ```
    Has `title="Remove Panelist"` but missing `aria-label="Remove Panelist"`.

---

#### B. Workload Balancing Optimizer Component & Asynchronous Announcements
- **Component Path**: `client/src/components/dashboards/OptimizationEngine.jsx`
- **Parent Consumer**: `client/src/components/dashboards/InstructorDashboard.jsx` (Lines 43–51, 114–119)
- **Service Route**: `client/src/services/dashboardService.js:optimizeInstructorWorkload` (`POST /api/dashboard/instructor/optimize`)
- **Direct Code Inspection (`OptimizationEngine.jsx` lines 18–22, 24–64)**:
  ```jsx
  18:         <Button onClick={onGenerate} disabled={loading} size="sm">
  19:           <Wand2 className="mr-2 h-4 w-4" />
  20:           {loading ? 'Generating...' : 'Generate Suggestions'}
  21:         </Button>
  ```
  - **Missing Attributes & Live Regions**:
    - The `<Button>` and parent `<section>` lack `aria-busy={loading}`.
    - There is no screen reader live region announcing asynchronous states.
    - When `loading` is active, visual users see `'Generating...'`, but screen readers receive no polite announcement (`role="status"`, `aria-live="polite"`).
    - When generation completes, screen readers are not notified of the result (e.g. `"${suggestions.length} optimization suggestions generated."` or `"Workload distribution is already balanced."`).

---

#### C. Administrative Route Declarations & Redirects in `client/src/App.jsx`
- **File Path**: `client/src/App.jsx`
- **Current Route Definitions (Lines 214–239)**:
  ```jsx
  214:   // Scheduling Center (Instructor command center)
  215:   {
  216:     path: '/scheduling-center',
  217:     Component: DefenseSchedulingPage,
  218:     allowedRoles: [ROLES.INSTRUCTOR],
  219:   },
  220:   {
  221:     path: '/defense-schedule',
  222:     Component: DefenseSchedulingPage,
  223:     allowedRoles: [ROLES.INSTRUCTOR],
  224:   },
  225:   {
  226:     path: '/instructor/defense-schedule',
  227:     Component: DefenseSchedulingPage,
  228:     allowedRoles: [ROLES.INSTRUCTOR],
  229:   },
  230:   {
  231:     path: '/defense-scheduling',
  232:     Component: DefenseSchedulingPage,
  233:     allowedRoles: [ROLES.INSTRUCTOR],
  234:   },
  235:   // Committee Assignments (Instructor workflow)
  236:   {
  237:     path: '/committee-assignments',
  238:     Component: CommitteeAssignmentsPage,
  239:     allowedRoles: [ROLES.INSTRUCTOR],
  240:   },
  ```
  - **Deficiency**:
    - Neither `/committee` nor `/scheduling` exists in `PROTECTED_ROUTES` or `<Routes>`.
    - Navigating directly to `http://localhost:5173/committee` or `http://localhost:5173/scheduling` falls through to line 360 `<Route path="*" element={<NotFoundPage />} />`.
  - **Target Insertion Point**:
    In `App.jsx`, within `<Routes>` before `<Route path="*">` (or as dedicated redirect routes):
    ```jsx
    <Route path="/committee" element={<Navigate to="/committee-assignments" replace />} />
    <Route path="/scheduling" element={<Navigate to="/scheduling-center" replace />} />
    ```

---

### 1.2 Phase 4: Institutional Typography & Anti-Patterns De-Slop Pass

#### A. Cliché Gradient Headings in `BukSULoginSidePanel.jsx` & `LandingPage.jsx`
- **File Paths**:
  - `client/src/components/auth/BukSULoginSidePanel.jsx` (Line 118)
  - `client/src/pages/LandingPage.jsx` (Line 480)
- **Observations in `BukSULoginSidePanel.jsx` (Lines 116–122)**:
  ```jsx
  116:         <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug font-serif">
  117:           Academic capstone governance from <br />
  118:           <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]">
  119:             title proposal
  120:           </span>{' '}
  121:           to university archival.
  122:         </h1>
  ```
  - Also note redundant duplicate inline color styles: Lines 101, 126, 151 have `style={{ color: '#e2e8f0' }}`.
- **Observations in `LandingPage.jsx` (Lines 478–483)**:
  ```jsx
  478:             <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight leading-[1.15]">
  479:               Manage your capstone projects with{' '}
  480:               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A448A] to-[#2563EB] dark:from-[#F5C253] dark:via-[#E5A823] dark:to-[#C68A1B]">
  481:                 institutional rigor.
  482:               </span>
  483:             </h1>
  ```
- **Ripgrep Confirmation**:
  A global search across `client/src` confirmed that `bg-clip-text` exists **only** in these two exact files and lines.

---

#### B. Asymmetric `border-l-4` Card Accents
- **File Paths**:
  - `client/src/components/projects/ProjectCohortCard.jsx` (Line 162)
  - `client/src/pages/instructor/DefenseSchedulingPage.jsx` (Line 2116)
- **Observations in `ProjectCohortCard.jsx` (Lines 160–165)**:
  ```jsx
  160:       className={cn(
  161:         'group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer',
  162:         isActionNeeded && 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
  163:         isHighlighted && 'ring-2 ring-primary/40 bg-primary/5',
  164:       )}
  ```
  - **Deficiency**: `isActionNeeded` applies an asymmetric 4px left border (`border-l-4 border-l-amber-500`), creating visual lopsidedness and failing WCAG when accent borders lack balanced visual status indicators.
- **Observations in `DefenseSchedulingPage.jsx` (Lines 2116–2122)**:
  ```jsx
  2116: className={`absolute left-1 right-1 rounded-lg border-l-4 border-l-blue-600 border border-border bg-card shadow-xs hover:shadow-md transition-all select-none text-left z-10 flex flex-col justify-between group cursor-grab active:cursor-grabbing overflow-hidden ${...}`}
  ```
  - **Deficiency**: Calendar defense event slots combine `border border-border` with `border-l-4 border-l-blue-600`.

---

#### C. Google Identity Services OAuth English Locale Enforcement (`hl="en"`)
- **File Paths**:
  - `client/src/pages/auth/LoginPage.jsx` (Lines 237–244)
  - `client/src/main.jsx` (Lines 69–73)
  - `@react-oauth/google` source: `node_modules/@react-oauth/google/dist/index.esm.js`
- **Observations in `LoginPage.jsx` (Lines 235–245)**:
  ```jsx
  237:           <GoogleLogin
  238:             onSuccess={handleGoogleSuccess}
  239:             onError={handleGoogleError}
  240:             theme={theme === 'dark' ? 'filled_black' : 'outline'}
  241:             size="large"
  242:             text="signin_with"
  243:             shape="rectangular"
  244:           />
  ```
- **Observations in `client/src/main.jsx` (Lines 69–73)**:
  ```jsx
  69: const rootTree = googleAuth.hasClientId ? (
  70:   <GoogleOAuthProvider clientId={googleAuth.clientId}>{appTree}</GoogleOAuthProvider>
  71: ) : (
  72:   appTree
  73: );
  ```
- **Deep Inspection of `@react-oauth/google` internals**:
  - In `useLoadGsiScript(options)` (lines 12–15 of `dist/index.esm.js`):
    ```javascript
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://accounts.google.com/gsi/client';
    if (locale)
        scriptTag.src += `?hl=${locale}`;
    ```
  - In `GoogleLogin` (lines 69 & 105 of `dist/index.esm.js`):
    ```javascript
    const { clientId, locale, scriptLoadedSuccessfully } = useGoogleOAuth();
    ...
    window.google.accounts.id.renderButton(btnContainerRef.current, {
        type,
        theme,
        size,
        text,
        shape,
        logo_alignment,
        width,
        locale, // Passed directly to Google GSI renderButton
        click_listener,
        state,
    });
    ```
  - **Root Mechanism**:
    Because `<GoogleOAuthProvider clientId={googleAuth.clientId}>` in `main.jsx` omits `locale`, `useLoadGsiScript` loads `https://accounts.google.com/gsi/client` with no `?hl=` query parameter, and `useGoogleOAuth()` sets `locale: undefined`. Google defaults to the user's browser/OS language.

---

## 2. Logic Chain

1. **Phase 3 Accessibility**:
   - WCAG 2.1 SC 4.1.2 (Name, Role, Value) requires all interactive controls to expose an accessible name and dynamic state.
   - In `TeamCommitteeAssignmentsView.jsx`, the chevron button toggles deadline visibility (`isDeadlinesOpen`), but screen readers only encounter an unnamed button with no state. Adding `aria-expanded={isDeadlinesOpen}`, an accessible `aria-label`, and ID linkage (`aria-controls`) resolves this compliance gap.
   - The three icon-only `X` buttons currently use `title`, which is not reliably conveyed by screen readers and does not satisfy touch/accessible name requirements without an explicit `aria-label`.
   - In `OptimizationEngine.jsx`, optimization calculations take variable time. Without `aria-busy` and a polite live region (`role="status"`), assistive tech users receive no confirmation that optimization computation was triggered or completed.

2. **Phase 3 Route Hardening**:
   - The capstone user navigation standardizes on `/committee-assignments` and `/scheduling-center`. Users accessing short paths (`/committee` or `/scheduling`) encounter an unhandled 404.
   - Installing declarative `<Navigate replace />` routes in `App.jsx` handles short alias navigation deterministically without mutating history stack or requiring complex regex.

3. **Phase 4 De-Slop & Institutional Typography**:
   - Cliché multi-stop text gradients (`text-transparent bg-clip-text bg-gradient-to-r ...`) are hallmarks of low-grade generic AI web templates (documented in `anti-slop` design patterns).
   - BukSU's institutional visual identity uses authentic solid primary tones: BukSU Deep Blue (`#1A448A`) and BukSU Academic Gold (`#F5C253` / `#E5A823`). Replacing gradient text with solid institutional colors restores crisp readability and passes AAA contrast.

4. **Phase 4 Balanced Status Accents**:
   - `border-l-4` creates visual asymmetry and was flagged in the interface audit as an overused AI card accent.
   - Replacing `border-l-4` with uniform borders (`border border-border/70` with subtle state borders) paired with balanced indicator badges (`Action Required` or status pills) satisfies visual rhythm and accessible status identification.

5. **Phase 4 Google OAuth Locale**:
   - Grounded inspection of `@react-oauth/google` proves that locale control is strictly governed at the `<GoogleOAuthProvider locale="...">` provider level. Passing `locale="en"` sets `?hl=en` on the script tag and passes `locale: "en"` to `google.accounts.id.renderButton()`.

---

## 3. Caveats

1. **Pre-Existing Test Failure in `ProjectCohortCard.test.jsx`**:
   - Directly running `npm test --workspace=client -- src/components/projects/ProjectCohortCard.test.jsx` produces:
     `Error: No QueryClient set, use QueryClientProvider to set one` at `usePrefetchProject` (`src/hooks/useProjects.js:108`).
   - This occurs because `ProjectCohortCard.jsx` invokes `usePrefetchProject()` (which calls `useQueryClient()`), but `ProjectCohortCard.test.jsx` does not wrap the rendered component in `<QueryClientProvider>`.
   - This is an existing test mock defect in `ProjectCohortCard.test.jsx`, not a regression in `ProjectCohortCard.jsx`. The implementer must wrap the test in `QueryClientProvider` or mock `usePrefetchProject`.
2. **Read-Only Explorer Scope**:
   - As `survey_explorer_2`, no source files have been modified. All proposed changes are documented as surgical CST patches below.
3. **No Other `bg-clip-text` in Codebase**:
   - Ripgrep confirmed zero other instances of `bg-clip-text` across `client/src`.

---

## 4. Conclusion & Recommended Surgical Changes

### 4.1 Recommendations for Phase 3

#### Recommendation 3.1: `TeamCommitteeAssignmentsView.jsx`
1. **Adviser Slot Clear Button (Line 682)**:
   ```diff
   -                        <Button
   -                          variant="ghost"
   -                          size="icon"
   -                          onClick={() => setSelectedAdviserId('')}
   -                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   -                          title="Clear Adviser"
   -                        >
   +                        <Button
   +                          variant="ghost"
   +                          size="icon"
   +                          onClick={() => setSelectedAdviserId('')}
   +                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   +                          title="Clear Adviser"
   +                          aria-label="Clear Adviser"
   +                        >
   ```
2. **Secretary Slot Clear Button (Line 743)**:
   ```diff
   -                        <Button
   -                          variant="ghost"
   -                          size="icon"
   -                          onClick={() => setSelectedSecretaryId('')}
   -                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   -                          title="Clear Secretary"
   -                        >
   +                        <Button
   +                          variant="ghost"
   +                          size="icon"
   +                          onClick={() => setSelectedSecretaryId('')}
   +                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   +                          title="Clear Secretary"
   +                          aria-label="Clear Secretary"
   +                        >
   ```
3. **Panelist Removal Button (Line 825)**:
   ```diff
   -                          <Button
   -                            variant="ghost"
   -                            size="icon"
   -                            onClick={() => handleRemovePanelist(panId)}
   -                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   -                            title="Remove Panelist"
   -                          >
   +                          <Button
   +                            variant="ghost"
   +                            size="icon"
   +                            onClick={() => handleRemovePanelist(panId)}
   +                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
   +                            title="Remove Panelist"
   +                            aria-label={`Remove panelist ${formatFullName(panUser)}`}
   +                          >
   ```
4. **Milestones & Deadlines Accordion Trigger (Lines 886 & 896)**:
   ```diff
   -                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
   +                    <Button
   +                      variant="ghost"
   +                      size="sm"
   +                      className="h-7 w-7 p-0"
   +                      aria-label={isDeadlinesOpen ? 'Collapse project milestones and deadlines' : 'Expand project milestones and deadlines'}
   +                      aria-expanded={isDeadlinesOpen}
   +                      aria-controls="project-milestones-deadlines-content"
   +                    >
   ```
   And on line 896:
   ```diff
   -                {isDeadlinesOpen && (
   -                  <CardContent className="pt-0 space-y-4">
   +                {isDeadlinesOpen && (
   +                  <CardContent id="project-milestones-deadlines-content" className="pt-0 space-y-4">
   ```

---

#### Recommendation 3.2: `OptimizationEngine.jsx`
1. Add `aria-busy={loading}` to button and container.
2. Add live status announcement:
   ```diff
   -        <Button onClick={onGenerate} disabled={loading} size="sm">
   +        <Button onClick={onGenerate} disabled={loading} size="sm" aria-busy={loading}>
              <Wand2 className="mr-2 h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Suggestions'}
            </Button>
          </div>
   +
   +      {/* Accessible live status announcement */}
   +      <div role="status" aria-live="polite" className="sr-only">
   +        {loading
   +          ? 'Calculating optimal workload distribution...'
   +          : optimization
   +            ? `${suggestions.length} optimization suggestions generated.`
   +            : ''}
   +      </div>
   ```

---

#### Recommendation 3.3: `App.jsx`
Install short administrative route redirects inside `<Routes>`:
```diff
+          {/* Administrative route redirects */}
+          <Route path="/committee" element={<Navigate to="/committee-assignments" replace />} />
+          <Route path="/scheduling" element={<Navigate to="/scheduling-center" replace />} />
```

---

### 4.2 Recommendations for Phase 4

#### Recommendation 4.1: Gradient Typography Replacement
1. **`BukSULoginSidePanel.jsx` (Lines 118–120)**:
   ```diff
            <h1 className="text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-snug font-serif">
              Academic capstone governance from <br />
   -          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]">
   -            title proposal
   -          </span>{' '}
   +          <span className="text-[#F5C253] font-bold">
   +            title proposal
   +          </span>{' '}
              to university archival.
            </h1>
   ```
2. **`LandingPage.jsx` (Lines 480–482)**:
   ```diff
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#1E293B] dark:text-white tracking-tight leading-[1.15]">
                  Manage your capstone projects with{' '}
   -              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A448A] to-[#2563EB] dark:from-[#F5C253] dark:via-[#E5A823] dark:to-[#C68A1B]">
   -                institutional rigor.
   -              </span>
   +              <span className="text-[#1A448A] dark:text-[#F5C253]">
   +                institutional rigor.
   +              </span>
                </h1>
   ```

---

#### Recommendation 4.2: Asymmetric `border-l-4` Replacement
1. **`ProjectCohortCard.jsx` (Line 162)**:
   ```diff
          className={cn(
            'group relative overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer',
   -        isActionNeeded && 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
   +        isActionNeeded && 'border-amber-500/40 dark:border-amber-400/40',
            isHighlighted && 'ring-2 ring-primary/40 bg-primary/5',
          )}
   ```
   And in the badge row (around line 196):
   ```jsx
   {isActionNeeded && (
     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
       <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
       Action Required
     </span>
   )}
   ```
2. **`DefenseSchedulingPage.jsx` (Line 2116)**:
   ```diff
   -                                className={`absolute left-1 right-1 rounded-lg border-l-4 border-l-blue-600 border border-border bg-card shadow-xs hover:shadow-md transition-all select-none text-left z-10 flex flex-col justify-between group cursor-grab active:cursor-grabbing overflow-hidden ${
   +                                className={`absolute left-1 right-1 rounded-lg border border-blue-500/40 dark:border-blue-400/40 bg-card shadow-xs hover:shadow-md transition-all select-none text-left z-10 flex flex-col justify-between group cursor-grab active:cursor-grabbing overflow-hidden ${
   ```

---

#### Recommendation 4.3: Google Identity Services OAuth Locale
In `client/src/main.jsx` (Line 70):
```diff
  const rootTree = googleAuth.hasClientId ? (
-   <GoogleOAuthProvider clientId={googleAuth.clientId}>{appTree}</GoogleOAuthProvider>
+   <GoogleOAuthProvider clientId={googleAuth.clientId} locale="en">
+     {appTree}
+   </GoogleOAuthProvider>
  ) : (
    appTree
  );
```

---

## 5. Verification Method

To independently verify these findings and subsequent implementations:

1. **Targeted Unit Tests**:
   ```bash
   # Phase 3 Tests
   npm test --workspace=client -- src/components/users/TeamCommitteeAssignmentsView.test.jsx
   npm test --workspace=client -- src/pages/instructor/CommitteeAssignmentsPage.test.jsx
   npm test --workspace=client -- src/components/layouts/Header.test.jsx

   # Phase 4 Tests
   npm test --workspace=client -- src/pages/LandingPage.test.jsx
   npm test --workspace=client -- src/pages/instructor/DefenseSchedulingPage.test.jsx
   ```

2. **Verify Zero `bg-clip-text` Remaining**:
   ```bash
   # Ripgrep search for text-transparent or bg-clip-text
   # Expected result after Phase 4: 0 occurrences
   ```

3. **Verify Zero `border-l-4` on Cards Remaining**:
   ```bash
   # Inspect ProjectCohortCard.jsx and DefenseSchedulingPage.jsx
   # Verify uniform borders and balanced status indicator pills
   ```

4. **Verify Google OAuth Script URL**:
   Inspect `<script>` tag injected into `document.body` by `GoogleOAuthProvider`:
   `https://accounts.google.com/gsi/client?hl=en`

5. **Invalidation Conditions**:
   - If `@react-oauth/google` version changes and breaks `locale` prop on `GoogleOAuthProvider`.
   - If route restructuring in `App.jsx` changes `PROTECTED_ROUTES` hierarchy.
