---
name: cognitive-ergonomics-ux
description: >
  Empirical UX & Cognitive Ergonomics Specialist skill enforcing Cowan (2001) 4-chunk working memory limits,
  Arnheim (1954) perceptual weight & active fieldset hierarchy, WCAG 2.2 AA programmatic focus & aria-live regions,
  and Strict Anti-AI-Slop rules across CMS-V2 forms, wizards, and views. Triggers on: "cognitive ergonomics",
  "empirical ux", "cowan chunking", "arnheim hierarchy", "form ux overhaul", "anti-ai-slop", "wcag form accessibility".
---

# Cognitive Ergonomics & Empirical UX Engineering (`cognitive-ergonomics-ux`)

This skill governs all UI/UX design, form chunking, visual hierarchy, and accessibility remediation across `client/src/`.

## 1. The 4 Empirical UX Pillars

### Pillar 1: Cognitive Load & Chunking (Cowan, 2001)
- **Working Memory Limit (~4 Chunks):** Never expose more than 3–4 form inputs inside a single ungrouped visual block.
- **Progressive Grouping / Stepped Wizards:** Partition dense forms into semantic `<fieldset>` groups (or multi-step wizards) with at most 3–4 fields per group.
- **Smart Defaults & State Persistence:** Pre-fill known institutional defaults (e.g., active academic year, current user email) and preserve state across `Back` / `Next` transitions.

### Pillar 2: Visual Hierarchy & Perceptual Weight (Arnheim, 1954)
- **Section Headers (`<legend>`):** `text-base` or `text-lg font-semibold text-foreground`, paired with a subtle surface background (`bg-muted/50`) and `1px` border separation (`border-b border-border`).
- **Field Labels (`<Label>`):** `text-sm font-medium text-foreground`, positioned directly above the input.
- **Helper & Validation Text:** `text-xs text-muted-foreground` (or `text-xs text-destructive` on inline error) directly below the input.
- **Action Hierarchy:** Primary submit uses high-contrast brand styling (`bg-primary text-primary-foreground`); secondary/cancel uses low-weight `variant="ghost"` so users never misclick.
- **Active Section Focus:** Track the active `<fieldset>` via `onFocusCapture` so the focused section stands out (`border-foreground/30 bg-background opacity-100`) while inactive sections visually recede (`border-border bg-muted/10 opacity-80`).

### Pillar 3: Accessibility & Interaction Resilience (WCAG 2.2 AA)
- **Programmatic Focus Management:** Move focus (`ref.current?.focus()`) to the step heading or first invalid field upon navigation or validation failure.
- **Screen Reader Live Regions:** Use `aria-live="polite"` and `aria-atomic="true"` on status alerts, step counters, password strength feedback, and inline validation errors.
- **Semantic Fieldset Grouping:** Wrap logical sections in `<fieldset>` with `<legend>`, include a visible `* Required` legend at the top of the form, and bind inputs with `aria-required="true"`, `aria-invalid`, and `aria-describedby`.
- **Responsive Mobile Ergonomics:** Stack action buttons full-width on mobile viewports (`flex flex-col-reverse sm:flex-row`, `w-full sm:w-auto`).

### Pillar 4: Strict Anti-AI-Slop Enforcement
- **NO Decorative Gradients or Neon Glows:** Ban `bg-gradient-to-r`, `auth-btn-gradient`, purple/pink/indigo AI tropes (`text-brand-purple`, `text-brand-pink`), and hardcoded hex focus rings (`focus:ring-[#673ab7]/50`).
- **NO Emoji or Icon Spam:** Never inject emojis into headings, labels, or buttons, and do not slap decorative icons onto every form label.
- **NO Card-in-Card Nesting Bloat:** Avoid wrapping inputs inside multiple nested bordered boxes with heavy drop shadows (`shadow-xl`). Use crisp `1px` borders (`border-border`), intentional whitespace, and flat semantic surfaces.
