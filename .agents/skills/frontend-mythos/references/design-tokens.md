# Frontend Mythos: Design Tokens & Layout Architecture Spec

## 1. Spatial System & Grid Foundations

### Linear Base-4 & Base-8 Spacing Scale
All layout margins, paddings, gaps, and component dimensions must derive from an immutable base-4 / base-8 linear spacing grid:

| Token | Pixels | Rem (16px base) | Tailwind Class | Primary Application |
| :--- | :--- | :--- | :--- | :--- |
| `space-0.5` | 2px | 0.125rem | `p-0.5`, `gap-0.5` | Hairline offsets, badge internal padding |
| `space-1` | 4px | 0.25rem | `p-1`, `gap-1` | Compact icon gaps, tight button padding |
| `space-1.5` | 6px | 0.375rem | `p-1.5`, `gap-1.5` | Standard badge padding, table cell vertical padding |
| `space-2` | 8px | 0.5rem | `p-2`, `gap-2` | Input field vertical padding, toolbar item gaps |
| `space-3` | 12px | 0.75rem | `p-3`, `gap-3` | Compact card padding, button horizontal padding |
| `space-4` | 16px | 1.0rem | `p-4`, `gap-4` | Standard card internal padding, grid column gaps |
| `space-6` | 24px | 1.5rem | `p-6`, `gap-6` | Large card / panel padding, section inner gaps |
| `space-8` | 32px | 2.0rem | `p-8`, `gap-8` | Modal dialog interior, dashboard section spacing |
| `space-12` | 48px | 3.0rem | `p-12`, `gap-12` | Page header separation, empty state vertical rhythm |
| `space-16` | 64px | 4.0rem | `p-16`, `gap-16` | Major layout hero blocks, landing page section dividers |

### Grid Layouts & Containers
* **Container Breakpoints**: Standardize max-width containers with dynamic horizontal padding:
  - Mobile (`< 640px`): `w-full px-4`
  - Tablet (`640px - 1024px`): `max-w-4xl mx-auto px-6`
  - Desktop Workspace (`1024px - 1536px`): `max-w-7xl mx-auto px-8`
  - Ultra-Wide Canvas (`> 1536px`): `max-w-[1600px] mx-auto px-10`
* **Column Architectures**:
  - Dashboard Data Grid: 12-column responsive layout (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6`).
  - Studio / Inspector Split: 2/3 primary workspace + 1/3 contextual rail (`grid grid-cols-1 lg:grid-cols-3 gap-6`).

---

## 2. The Four Functional Color Layers

All visual presentation resolves strictly through 4 semantic layers. Hardcoded hex codes (`#1e293b`) or literal color classes (`bg-blue-600`) inside functional components are prohibited.

```
Layer 4: Semantic Accents & Status (Brand, Destructive, Success, Warning)
────────────────────────────────────────────────────────────────────────
Layer 3: Borders & Structural Dividers (1px subtle/prominent dividers)
────────────────────────────────────────────────────────────────────────
Layer 2: Surfaces & Elevation (Cards, Panels, Sheets, Dropdowns)
────────────────────────────────────────────────────────────────────────
Layer 1: Canvas & Base Background (Root page background)
```

### Layer Definitions

| Layer | CSS Variable | Light Mode Semantic | Dark Mode Semantic | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Canvas** | `--background` | `hsl(0 0% 100%)` | `hsl(222.2 84% 4.9%)` | The bedrock foundation. Lowest elevation. |
| **Layer 2: Surface** | `--card`<br>`--muted` | `hsl(0 0% 98%)`<br>`hsl(210 40% 96.1%)` | `hsl(217.2 32.6% 12%)`<br>`hsl(217.2 32.6% 17.5%)` | Interactive cards, modal backdrops, table rows. |
| **Layer 3: Border** | `--border`<br>`--border-muted` | `hsl(214.3 31.8% 91.4%)` | `hsl(217.2 32.6% 22%)` | Structural 1px separation. Always use `border-border/60`. |
| **Layer 4: Accent** | `--primary`<br>`--destructive` | `hsl(221.2 83.2% 53.3%)`<br>`hsl(0 84.2% 60.2%)` | `hsl(217.2 91.2% 59.8%)`<br>`hsl(0 62.8% 30.6%)` | Action triggers, focus rings, status indicators. |

---

## 3. WCAG 2.2 Contrast & Legibility Matrix

All foreground-to-background combinations must be mathematically validated against WCAG 2.2 Level AA requirements:

| Element Category | Minimum Contrast Ratio | Validation Rule |
| :--- | :--- | :--- |
| **Normal Body Text** (`< 18pt` or `< 14pt bold`) | **4.5:1** | High contrast mandatory. Use `text-foreground` or `text-foreground/90`. Never drop below 4.5:1. |
| **Large Text** ($\ge 18\text{pt}$ / $24\text{px}$ or $\ge 14\text{pt}$ / $18.66\text{px}$ bold) | **3.0:1** | Headings, display banners, metric callouts. |
| **UI Components & Graphical Objects** | **3.0:1** | Form input borders, active checkbox indicators, focus rings, status icons. |
| **Muted Metadata / Secondary Copy** | **4.5:1 (AA)** | Use `text-muted-foreground`. Verify that the muted token itself maintains 4.5:1 on `--card` and `--background`. |

---

## 4. The Golden Rule of Nested Radius Geometry

When nesting rounded containers (e.g. an image, pill, or inner block inside a rounded card), failing to calculate the inner radius creates optical warping (pinched or bulging corners).

### Mathematical Formula
$$\mathbf{R_{\text{inner}} = R_{\text{outer}} - \text{Padding}}$$

* If $\text{Padding} \ge R_{\text{outer}}$, set $R_{\text{inner}} = 0$ or use a minimal optical token ($2\text{px}$ – $4\text{px}$).
* Never set $R_{\text{inner}} = R_{\text{outer}}$ when padding is present.

### Geometry Reference Table

| Outer Radius ($R_{\text{outer}}$) | Padding | Inner Radius Calculation | Resulting Tailwind Pair |
| :--- | :--- | :--- | :--- |
| `16px` (`rounded-2xl`) | `8px` (`p-2`) | $16 - 8 = 8\text{px}$ | `rounded-2xl p-2` $\to$ child: `rounded-lg` |
| `16px` (`rounded-2xl`) | `12px` (`p-3`) | $16 - 12 = 4\text{px}$ | `rounded-2xl p-3` $\to$ child: `rounded` |
| `12px` (`rounded-xl`) | `4px` (`p-1`) | $12 - 4 = 8\text{px}$ | `rounded-xl p-1` $\to$ child: `rounded-lg` |
| `12px` (`rounded-xl`) | `8px` (`p-2`) | $12 - 8 = 4\text{px}$ | `rounded-xl p-2` $\to$ child: `rounded` |
| `8px` (`rounded-lg`) | `4px` (`p-1`) | $8 - 4 = 4\text{px}$ | `rounded-lg p-1` $\to$ child: `rounded` |

---

## 5. Typography Scale & Optical Hierarchy

### Fluid Scale Definitions
Mythos employs an optical type scale with negative tracking on headings and comfortable leading on prose:

```css
/* Typography Scale & Optical Letter Spacing */
.font-display {
  font-family: var(--font-display, "Plus Jakarta Sans", "Inter", sans-serif);
}

.font-sans {
  font-family: var(--font-sans, "Inter", -apple-system, BlinkMacSystemFont, sans-serif);
}
```

* **Display Heading 1 (`text-4xl` / `36px` - `48px`)**:
  - Tailwind: `text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-foreground`
  - Letter spacing: `-0.025em`
* **Section Heading 2 (`text-2xl` / `24px` - `30px`)**:
  - Tailwind: `text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-foreground`
  - Letter spacing: `-0.02em`
* **Card Title / Heading 3 (`text-lg` / `18px` - `20px`)**:
  - Tailwind: `text-base sm:text-lg font-medium tracking-tight leading-snug text-foreground`
  - Letter spacing: `-0.01em`
* **Body Text (`text-sm` / `14px` or `text-base` / `16px`)**:
  - Tailwind: `text-sm font-normal leading-relaxed text-foreground/90`
  - Letter spacing: `0em` (normal)
* **Metadata / Caption (`text-xs` / `12px`)**:
  - Tailwind: `text-xs font-medium leading-normal text-muted-foreground`
  - Letter spacing: `+0.01em` to `+0.02em` for optical clarity at small scale.

---

## 6. Elevation & Depth Architecture (No AI Slop)

### Border-First Layering
Avoid stacking heavy blur dropshadows. Instead, establish depth through high-precision border separation:

```html
<!-- Mythos Production Card Pattern -->
<div class="relative rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-150 hover:border-border hover:shadow-md">
  <!-- Content -->
</div>
```

### Elevation Token Hierarchy
1. **Level 0 (Flat Canvas)**: `bg-background` (No shadow, no border).
2. **Level 1 (Card / Surface)**: `border border-border/60 bg-card shadow-sm`.
3. **Level 2 (Popover / Dropdown)**: `border border-border/80 bg-popover shadow-md ring-1 ring-black/5 dark:ring-white/5`.
4. **Level 3 (Modal / Dialog)**: `border border-border bg-card shadow-xl`.
5. **Level 4 (Toast / Notification)**: `border border-border/80 bg-card/95 backdrop-blur-sm shadow-lg`.
