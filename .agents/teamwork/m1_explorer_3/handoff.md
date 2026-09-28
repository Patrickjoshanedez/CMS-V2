# Handoff Report — Milestone 1 Exploration (Task 3)
**Investigator**: `m1_explorer_3`  
**Target Component**: `client/src/components/auth/BukSULoginSidePanel.jsx`  
**Related Scope**: `client/src/pages/auth/` and `client/src/components/auth/`  
**Date**: 2026-09-28T06:32:00Z  

---

## 1. Observation

### 1.1 Direct Inspection of `client/src/components/auth/BukSULoginSidePanel.jsx`
A full AST and textual inspection of `client/src/components/auth/BukSULoginSidePanel.jsx` (231 lines) identified exactly 15 `style` attribute usages. 

Of these, **4 are essential dynamic/layout styles** that must be **preserved**:
1. **Line 61**: `style={{ perspective: '1200px' }}` — 3D CSS container perspective.
2. **Lines 68-70**: `style={{ transform: \`translate3d(${coords.x * -25}px, ${coords.y * -25}px, 0) rotate(${coords.x * 4}deg)\` }}` — Parallax angular vector facet transform.
3. **Line 136**: `style={getStyle(18, 9)}` — Parallax 3D tilt transform calculated by `useParallax`.
4. **Lines 141-143**: `style={{ background: \`radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(229, 168, 35, 0.22) 0%, transparent 60%)\` }}` — Specular highlight gradient following mouse movement.

The remaining **11 instances** are static inline `style={{ color: ... }}` tags that directly duplicate existing Tailwind classes:

1. **Line 101**:
   - Element: `<p className="text-[11px] font-sans font-medium tracking-tight text-slate-200 group-hover:text-white transition-colors" style={{ color: '#e2e8f0' }}>`
   - Content: `"College of Technologies · BSIT Capstone Studio"`
   - Style: `style={{ color: '#e2e8f0' }}`
   - Tailwind Class: `text-slate-200`
   - Conflict: Inline style has higher specificity than `group-hover:text-white`, actively suppressing/degrading hover transition.

2. **Line 126**:
   - Element: `<p className="text-xs xl:text-sm leading-relaxed font-sans max-w-md text-slate-200" style={{ color: '#e2e8f0' }}>`
   - Content: Narrative body text
   - Style: `style={{ color: '#e2e8f0' }}`
   - Tailwind Class: `text-slate-200`

3. **Line 151**:
   - Element: `<span className="text-xs font-sans font-bold tracking-wider text-slate-200 uppercase" style={{ color: '#e2e8f0' }}>`
   - Content: `"4-Phase Capstone Lifecycle"`
   - Style: `style={{ color: '#e2e8f0' }}`
   - Tailwind Class: `text-slate-200`

4. **Line 158**:
   - Element: `<span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#E5A823]/20 border border-[#E5A823]/50 text-[#F5C253] tracking-tight shadow-xs" style={{ color: '#F5C253' }}>`
   - Content: `"Deterministic Gating"`
   - Style: `style={{ color: '#F5C253' }}`
   - Tailwind Class: `text-[#F5C253]`

5. **Line 175**:
   - Element: `<span className="text-[10px] font-mono text-[#F5C253] font-bold uppercase tracking-wider" style={{ color: '#F5C253' }}>`
   - Content: `{stage.phase}`
   - Style: `style={{ color: '#F5C253' }}`
   - Tailwind Class: `text-[#F5C253]`

6. **Line 179**:
   - Element: `<Icon className="w-3.5 h-3.5 text-slate-300" style={{ color: '#cbd5e1' }} />`
   - Content: Lucide stage icon
   - Style: `style={{ color: '#cbd5e1' }}`
   - Tailwind Class: `text-slate-300` (SVG stroke inherits currentColor)

7. **Line 183**:
   - Element: `<h3 className="text-xs font-semibold text-white leading-tight font-sans" style={{ color: '#ffffff' }}>`
   - Content: `{stage.title}`
   - Style: `style={{ color: '#ffffff' }}`
   - Tailwind Class: `text-white`

8. **Line 189**:
   - Element: `<p className="text-[11px] leading-snug line-clamp-2 font-sans text-slate-300" style={{ color: '#cbd5e1' }}>`
   - Content: `{stage.desc}`
   - Style: `style={{ color: '#cbd5e1' }}`
   - Tailwind Class: `text-slate-300`

9. **Line 202**:
   - Element: `<span className="flex items-center gap-1.5 text-slate-200 font-medium" style={{ color: '#e2e8f0' }}>`
   - Content: `Secretary Compliance Gate`
   - Style: `style={{ color: '#e2e8f0' }}`
   - Tailwind Class: `text-slate-200`

10. **Line 208**:
    - Element: `<span className="flex items-center gap-1.5 text-[#F5C253] font-medium" style={{ color: '#F5C253' }}>`
    - Content: `MinIO Vault`
    - Style: `style={{ color: '#F5C253' }}`
    - Tailwind Class: `text-[#F5C253]`

11. **Line 220**:
    - Element: `<span className="text-slate-200 font-medium" style={{ color: '#e2e8f0' }}>`
    - Content: `"BukSU CMS V2 · Full-Stack Capstone System"`
    - Style: `style={{ color: '#e2e8f0' }}`
    - Tailwind Class: `text-slate-200`

---

### 1.2 Inspection of Related Auth Components & Pages
Search tools (`grep_search`, `find_by_name`, `view_file`) were executed across:
- `client/src/pages/auth/`
  - `LoginPage.jsx`: 0 inline styles; uses Tailwind semantic classes exclusively.
  - `RegisterPage.jsx`: 1 inline style at line 96 (`style={{ width: `${(score / 5) * 100}%`, backgroundColor: color }}`) calculating dynamic password strength progress bar. No static redundant color styles.
  - `ForgotPasswordPage.jsx`: 0 inline styles.
  - `ResetPasswordPage.jsx`: 0 inline styles.
  - `VerifyOtpPage.jsx`: 0 inline styles.
- `client/src/components/auth/`
  - `AuthStatusAlert.jsx`: 0 inline styles.
  - `AuthSubmitButton.jsx`: 0 inline styles.

**Finding**: `BukSULoginSidePanel.jsx` is the sole file with redundant static inline color styles in the auth module.

---

## 2. Logic Chain

1. **Premise 1 (Tailwind Color Equivalence)**:
   - In Tailwind CSS (standard default palette and BukSU design system config):
     - `text-slate-200` compiles to `color: #e2e8f0;` (`rgb(226, 232, 240)`).
     - `text-[#F5C253]` compiles to `color: #F5C253;`.
     - `text-slate-300` compiles to `color: #cbd5e1;` (`rgb(203, 213, 225)`).
     - `text-white` compiles to `color: #ffffff;` (`rgb(255, 255, 255)`).
     - Lucide icons inherit `stroke: currentColor`, binding directly to `color`.

2. **Premise 2 (Exact Value Comparison)**:
   - Lines 101, 126, 151, 202, 220: Inline style specifies `#e2e8f0`. Adjacent class is `text-slate-200` (`#e2e8f0`). The values are 100% identical.
   - Lines 158, 175, 208: Inline style specifies `#F5C253`. Adjacent class is `text-[#F5C253]`. The values are 100% identical.
   - Lines 179, 189: Inline style specifies `#cbd5e1`. Adjacent class is `text-slate-300` (`#cbd5e1`). The values are 100% identical.
   - Line 183: Inline style specifies `#ffffff`. Adjacent class is `text-white` (`#ffffff`). The values are 100% identical.

3. **Premise 3 (CSS Cascade & Specificity Invariants)**:
   - Inline styles carry higher specificity (`1-0-0-0`) than CSS utility classes (`0-0-1-0`).
   - At line 100-101, the element specifies `group-hover:text-white`. The presence of `style={{ color: '#e2e8f0' }}` suppresses `group-hover:text-white` unless overridden with `!important`. Removing the redundant inline style restores the intended interaction behavior without modifying visual defaults.

4. **Premise 4 (Safety of Preservation)**:
   - Perspective (`style={{ perspective: '1200px' }}`), Parallax (`style={{ transform: ... }}`), Parallax Card Tilt (`style={getStyle(18, 9)}`), and Radial Light Highlights (`style={{ background: ... }}`) are computational styles dependent on runtime mouse coordinates and hooks. They must remain untouched.

---

## 3. Caveats

- **Future Milestone 4 / Milestone 5 Coordination**:
  - `PROJECT.md` Feature 16 (Milestone 4) targets the hero heading gradient text in `BukSULoginSidePanel.jsx:118-120` (`bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]`).
  - `PROJECT.md` Feature 23 (Milestone 5) targets the 2x2 grid in `BukSULoginSidePanel.jsx:164-196` to convert it to a 5-step milestone timeline.
  - The worker executing Milestone 1 Task 5 must make **only surgical inline style deletions** without touching the surrounding layout or future milestone features.

---

## 4. Conclusion & Surgical CST Diff Plan

All 11 instances of `style={{ color: ... }}` in `BukSULoginSidePanel.jsx` are strictly redundant and should be cleanly pruned. No other files in the auth domain require remediation.

### Surgical CST Diff Specification for Worker

#### Chunk 1: Line 99-105
```diff
<<<<
            <p
              className="text-[11px] font-sans font-medium tracking-tight text-slate-200 group-hover:text-white transition-colors"
              style={{ color: '#e2e8f0' }}
            >
              College of Technologies · BSIT Capstone Studio
            </p>
====
            <p className="text-[11px] font-sans font-medium tracking-tight text-slate-200 group-hover:text-white transition-colors">
              College of Technologies · BSIT Capstone Studio
            </p>
>>>>
```

#### Chunk 2: Line 124-130
```diff
<<<<
        <p
          className="text-xs xl:text-sm leading-relaxed font-sans max-w-md text-slate-200"
          style={{ color: '#e2e8f0' }}
        >
          Standardized submission lifecycle, dual plagiarism screening, Action Done Matrix (ADM)
          endorsement, and permanent archival under BukSU institutional standards.
        </p>
====
        <p className="text-xs xl:text-sm leading-relaxed font-sans max-w-md text-slate-200">
          Standardized submission lifecycle, dual plagiarism screening, Action Done Matrix (ADM)
          endorsement, and permanent archival under BukSU institutional standards.
        </p>
>>>>
```

#### Chunk 3: Line 149-162
```diff
<<<<
              <span
                className="text-xs font-sans font-bold tracking-wider text-slate-200 uppercase"
                style={{ color: '#e2e8f0' }}
              >
                4-Phase Capstone Lifecycle
              </span>
            </div>
            <span
              className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#E5A823]/20 border border-[#E5A823]/50 text-[#F5C253] tracking-tight shadow-xs"
              style={{ color: '#F5C253' }}
            >
              Deterministic Gating
            </span>
====
              <span className="text-xs font-sans font-bold tracking-wider text-slate-200 uppercase">
                4-Phase Capstone Lifecycle
              </span>
            </div>
            <span className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#E5A823]/20 border border-[#E5A823]/50 text-[#F5C253] tracking-tight shadow-xs">
              Deterministic Gating
            </span>
>>>>
```

#### Chunk 4: Line 173-194
```diff
<<<<
                    <span
                      className="text-[10px] font-mono text-[#F5C253] font-bold uppercase tracking-wider"
                      style={{ color: '#F5C253' }}
                    >
                      {stage.phase}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-300" style={{ color: '#cbd5e1' }} />
                  </div>
                  <h3
                    className="text-xs font-semibold text-white leading-tight font-sans"
                    style={{ color: '#ffffff' }}
                  >
                    {stage.title}
                  </h3>
                  <p
                    className="text-[11px] leading-snug line-clamp-2 font-sans text-slate-300"
                    style={{ color: '#cbd5e1' }}
                  >
                    {stage.desc}
                  </p>
====
                    <span className="text-[10px] font-mono text-[#F5C253] font-bold uppercase tracking-wider">
                      {stage.phase}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <h3 className="text-xs font-semibold text-white leading-tight font-sans">
                    {stage.title}
                  </h3>
                  <p className="text-[11px] leading-snug line-clamp-2 font-sans text-slate-300">
                    {stage.desc}
                  </p>
>>>>
```

#### Chunk 5: Line 200-212
```diff
<<<<
            <span
              className="flex items-center gap-1.5 text-slate-200 font-medium"
              style={{ color: '#e2e8f0' }}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secretary Compliance Gate
            </span>
            <span
              className="flex items-center gap-1.5 text-[#F5C253] font-medium"
              style={{ color: '#F5C253' }}
            >
              <Database className="w-3.5 h-3.5" /> MinIO Vault
            </span>
====
            <span className="flex items-center gap-1.5 text-slate-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Secretary Compliance Gate
            </span>
            <span className="flex items-center gap-1.5 text-[#F5C253] font-medium">
              <Database className="w-3.5 h-3.5" /> MinIO Vault
            </span>
>>>>
```

#### Chunk 6: Line 219-223
```diff
<<<<
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-medium" style={{ color: '#e2e8f0' }}>
            BukSU CMS V2 · Full-Stack Capstone System
          </span>
====
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-medium">
            BukSU CMS V2 · Full-Stack Capstone System
          </span>
>>>>
```

---

## 5. Verification Method

### 5.1 Static Code Verification
1. Inspect `client/src/components/auth/BukSULoginSidePanel.jsx` to ensure 0 instances of `style={{ color` remain:
   ```bash
   grep -n "style={{ color" client/src/components/auth/BukSULoginSidePanel.jsx
   ```
   **Expected Result**: Zero matches (exit code 1).

2. Ensure non-color styles remain intact:
   ```bash
   grep -n "style=" client/src/components/auth/BukSULoginSidePanel.jsx
   ```
   **Expected Result**: Exactly 4 matches:
   - Line with `perspective: '1200px'`
   - Line with `transform: \`translate3d...\``
   - Line with `style={getStyle(18, 9)}`
   - Line with `background: \`radial-gradient...\``

### 5.2 Test Verification
Run client test suites covering stores and auth:
```bash
npm test --workspace=client -- src/stores/authStore.test.js
```
**Expected Result**: All tests pass with zero errors.

### 5.3 Invalidation Conditions
- Any removal of `perspective`, `transform`, `getStyle`, or `background` attributes in `BukSULoginSidePanel.jsx`.
- Any modification of `RegisterPage.jsx:96-99` dynamic password meter styles.
- Any regression in `AuthLayout.jsx` rendering.
