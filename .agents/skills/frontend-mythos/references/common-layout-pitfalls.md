# Frontend Mythos: Common Layout Pitfalls & Autonomous Repair Strategies

This guide catalogs the most frequent visual, responsive, and architectural defects encountered in modern frontend interfaces, how the Playwright visual loop detects them, and deterministic code fixes.

---

## 1. React Hydration Mismatch & SSR Desync

### The Symptom
The UI flashes or flickers on initial load, controls fail to respond to clicks, or the console logs:
`Hydration failed because the initial UI does not match what was rendered on the server.`

### Root Cause
Components relying on client-only globals (`window.innerWidth`, `localStorage`, `navigator.userAgent`) or non-deterministic values (`Date.now()`, `Math.random()`) evaluate differently during server render vs client hydration.

### Playwright Detection
The Playwright harness captures `[PageError]` in `report.json` during the `consoleErrors` inspection stage.

### Autonomous Fix Action
Use a client-mounted guard pattern or isolate client-only values in `useEffect`:
```tsx
// ✅ Correct Client-Mounted Guard
import { useState, useEffect, ReactNode } from 'react';

export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

---

## 2. Mobile Flex Squishing & Overflow Leaks

### The Symptom
On small mobile viewports (`mobile.png`), action buttons compress into illegible vertical letter ribbons, or trailing icons collapse to zero width.

### Root Cause
CSS Flexbox defaults to `flex-shrink: 1` on children. When parent space diminishes, flex items without an explicit `flex-shrink-0` or `min-w-0` get crushed.

### Playwright Detection
Visual inspection of `mobile.png` reveals text wrapping character-by-character or clipped badges.

### Autonomous Fix Action
1. Apply `shrink-0` on critical icons, badges, and action buttons:
   ```html
   <!-- ✅ Icon and Action Button Protected from Squishing -->
   <div class="flex items-center gap-3 min-w-0">
     <div class="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
       <svg class="h-5 w-5 shrink-0" ... />
     </div>
     <div class="min-w-0 flex-1">
       <p class="truncate font-medium">Long Entity Title</p>
     </div>
     <button class="shrink-0 px-3 py-1.5 ...">Action</button>
   </div>
   ```
2. Switch multi-column layouts to vertical stacks on mobile (`flex-col sm:flex-row`).

---

## 3. Flash of Invisible Text (FOIT) & Cumulative Layout Shift (CLS)

### The Symptom
Headings or buttons visually jump several pixels after webfonts finish downloading, causing surrounding cards to shift position.

### Root Cause
Webfonts load asynchronously without a fallback font metric override, altering text dimensions once `document.fonts.ready` completes. Image containers lack reserved aspect ratios.

### Playwright Detection
Captured through the 4-stage readiness check. If font metrics shift layout, snapshots taken across stages differ in container bounding boxes.

### Autonomous Fix Action
1. Reserve explicit dimensions on all image and avatar containers using `aspect-square`, `aspect-video`, or explicit width/height:
   ```html
   <!-- ✅ Reserved Image Skeleton Container (Zero CLS) -->
   <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
     <img src="..." alt="..." class="h-full w-full object-cover" loading="lazy" />
   </div>
   ```
2. Use `font-display: swap` and assign matching fallback font families (`font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`).

---

## 4. Invisible Focus Traps & Outline Erasure

### The Symptom
A keyboard-only user presses `Tab` through a form or table, but no active focus indicator appears on the screen.

### Root Cause
A developer applied `outline-none` or `focus:outline-none` to eliminate default browser rings without substituting a design-system focus token.

### Playwright Detection
Inspecting the focused state reveals zero visual contrast between idle and active elements.

### Autonomous Fix Action
Never use bare `outline-none`. Always pair with `focus-visible:ring-2`:
```html
<!-- ✅ Accessible Focus Ring Pattern -->
<button class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
  Continue
</button>
```

---

## 5. Text Truncation & Ellipsis Collapse Bug

### The Symptom
A long user name, email, or breadcrumb refuses to truncate with an ellipsis (`...`) and instead blows out the container width, causing horizontal layout scroll.

### Root Cause
`truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`) requires an ancestor flex item to have `min-w-0`. By default, flex items have `min-width: auto`.

### Playwright Detection
The container boundary in `tablet.png` or `mobile.png` exceeds viewport width, showing a bottom horizontal scrollbar.

### Autonomous Fix Action
Add `min-w-0` to the direct flex parent containing the truncated text:
```html
<!-- ❌ Broken Truncation: Blows out parent container -->
<div class="flex items-center">
  <span class="truncate">Very Long Unbroken Text That Breaks Layout</span>
</div>

<!-- ✅ Working Truncation: min-w-0 enables ellipsis -->
<div class="flex items-center min-w-0">
  <span class="truncate">Very Long Unbroken Text That Breaks Layout</span>
</div>
```

---

## 6. Z-Index Stacking Wars & Modal Bleeding

### The Symptom
A floating dropdown menu renders behind a sticky header, or a modal backdrop leaves floating action buttons visible and clickable on top of the modal.

### Root Cause
Uncoordinated arbitrary z-index values (`z-[99]`, `z-[999]`, `z-[9999]`) and new stacking contexts created by CSS `transform`, `filter`, or `opacity`.

### Autonomous Fix Action
1. Enforce a standardized z-index scale:
   * **Base Canvas**: `z-0`
   * **Sticky Table Headers / Floating Chips**: `z-10`
   * **Sticky Page Headers / Navigation**: `z-30`
   * **Modal Backdrops**: `z-40`
   * **Modal Dialog Surfaces / Drawers**: `z-50`
   * **Tooltips & Popovers**: `z-60`
   * **Toast Notifications**: `z-[9999]`
2. Portal modal dialogs directly to `document.body` to decouple them from parent container stacking contexts.

---

## 7. Warped Nested Radii (Optical Warping)

### The Symptom
An inner thumbnail, image, or badge inside a rounded card looks pinched, warped, or unevenly spaced around the corners.

### Root Cause
The inner element was given the same border radius as the outer card (`rounded-2xl` inside `rounded-2xl`), violating concentric geometry.

### Autonomous Fix Action
Apply the concentric formula:
$$\mathbf{R_{\text{inner}} = R_{\text{outer}} - \text{Padding}}$$
```html
<!-- ✅ Concentric Nested Radius: Outer 16px (2xl), Padding 8px (p-2), Inner 8px (lg) -->
<div class="rounded-2xl p-2 border border-border/60 bg-card">
  <div class="rounded-lg bg-muted p-4">
    Inner Concentric Block
  </div>
</div>
```

---

## 8. Horizontal Scrollbar Leaks

### The Symptom
A horizontal scrollbar appears on the entire page or layout canvas on desktop or mobile.

### Root Cause
1. Usage of `w-screen` instead of `w-full` (100vw includes the OS vertical scrollbar, exceeding body width by 15–17px).
2. Unbounded code blocks (`<pre>`), tables, or multi-column grids lacking `overflow-x-auto`.

### Autonomous Fix Action
1. Replace all full-width containers with `w-full`.
2. Wrap wide tables or preformatted blocks inside an explicit overflow container:
   ```html
   <!-- ✅ Bounded Table Scroll Container -->
   <div class="w-full overflow-x-auto rounded-xl border border-border/60">
     <table class="w-full text-left text-sm">
       <!-- Table Content -->
     </table>
   </div>
   ```
