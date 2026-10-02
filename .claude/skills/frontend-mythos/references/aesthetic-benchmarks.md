# Frontend Mythos: Aesthetic Benchmarks & Design System Heuristics

This reference codifies concrete layout heuristics from industry-defining design systems (**Linear**, **Stripe**, and **Vercel**). Agents reference these rules to replace default AI styling with production-tier polish.

---

## 1. Linear-Grade Density & Information Hierarchy

Linear sets the benchmark for high-performance, keyboard-first desktop applications and developer tooling.

### The 8pt Baseline Spatial Grid
* **Mathematical Progression**: Apply a strict 8pt grid for primary spacing (`gap-2` [8px], `p-4` [16px], `p-6` [24px], `p-8` [32px]).
* **Prohibited Arbitrary Padding**: Never use random, non-tokenized padding like `p-7` (28px), `p-11` (44px), or `gap-5` (20px). Non-standard increments break subconscious rhythm.
* **Component-Level 4pt Sub-grid**: Sub-elements (icon-to-label gaps, badge paddings, tag margins) may use 4pt increments (`space-1` [4px], `space-1.5` [6px], `space-2` [8px]).

### Subtle Micro-Borders over Drop Shadows
* **Border Dominance**: Separate cards, panels, and sidebars using clean 1px micro-borders:
  ```html
  <!-- Light and Dark Mode Micro-Border -->
  <div class="rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900/60">
    <!-- Content -->
  </div>
  ```
* **Shadow Restraint**: Never place diffuse, muddy dropshadows (`shadow-lg`, `shadow-2xl`) on flat cards or tables. Shadows are reserved strictly for floating overlays that change z-index plane (dropdowns, popovers, dialogs).

### Keyboard Navigation Cues
* Render discrete shortcut badges next to interactive actions to signal speed and keyboard capability:
  ```html
  <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
    <span>Search</span>
    <kbd class="inline-flex h-5 items-center justify-center rounded border border-border/80 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-xs">
      ⌘K
    </kbd>
  </span>
  ```

---

## 2. Stripe-Grade Data Alignment & Typography

Stripe sets the global standard for financial clarity, tabular precision, and visual trust.

### Tabular Alignment & Number Formatting
* **Tabular Figures (`tabular-nums`)**: Numbers inside dashboards, metrics widgets, pricing tables, and timers must use `font-variant-numeric: tabular-nums` or `font-mono`.
  ```html
  <!-- Prevents horizontal jitter as numbers change -->
  <span class="font-mono text-2xl font-semibold tracking-tight tabular-nums text-foreground">
    $14,289.50
  </span>
  ```
* **Decimal Alignment**: Financial columns in tables must align to the right (`text-right`) with equal padding to ensure decimal points align vertically.

### Color Temperature & Canvas Hue
* **No Pitch Black / Stark White**: Avoid harsh `#000000` (pitch black) and stark `#ffffff` on high-contrast backgrounds.
  - Dark Mode Canvas: Use deep slate or zinc tones (`#09090b` or `#0b0f19`) to reduce eye fatigue and prevent stark white halos.
  - Light Mode Canvas: Use subtle warm or neutral tints (`#fafafa` or `#f8fafc`).

### Status Badges: Dot Indicators over Heavy Saturated Pills
* **Anti-Slop Pill Elimination**: Replace glaring, fully-saturated colored pill badges (`bg-green-500 text-white font-bold rounded-full`) with subtle dot indicators:
  ```html
  <!-- Stripe-Grade Accessible Status Badge -->
  <span class="inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span>
    Operational
  </span>
  ```

---

## 3. Vercel-Grade Negative Space & Content Flow

Vercel defines modern monochrome minimalism, structural restraint, and fluid responsive flow.

### Zero Horizontal Jitter & Layout Anchoring
* **Explicit Container Bounds**: Standardize horizontal layout boundaries with responsive gutter defense:
  ```html
  <main class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Fluid Content -->
  </main>
  ```
* **No Horizontal Overflow**: Prevent accidental horizontal scrollbars caused by `w-screen` (which includes OS scrollbar widths). Use `w-full` and `overflow-x-hidden` on parent wrappers.

### Visual Rhythm & The Doubling Hierarchy
Section vertical spacing follows an intentional doubling scale:
1. **Intra-Element (Inside Badges / Buttons)**: $4\text{px} - 8\text{px}$ (`gap-1` to `gap-2`).
2. **Card Interior**: $16\text{px} - 24\text{px}$ (`p-4` to `p-6`).
3. **Card-to-Card Grid Gap**: $16\text{px} - 24\text{px}$ (`gap-4` to `gap-6`).
4. **Sub-Section Separation**: $32\text{px} - 48\text{px}$ (`my-8` to `my-12`).
5. **Major Section Dividers**: $64\text{px} - 96\text{px}$ (`py-16` to `py-24`).

### Monochromatic Restraint
* Primary interfaces should be 90% monochromatic (grays, slates, and borders).
* Color is reserved exclusively for semantic signals: blue for focus/active links, green for verified/success, amber for warnings, and red for destructive errors.
