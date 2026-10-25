---
name: ui-design-principles
description: Core UI design principles for creating intuitive, accessible, and beautiful interfaces. Use this when designing or reviewing user interfaces.
---

# UI Design Principles

These are the 7 core UI design principles based on Figma's guidelines for creating products that serve and delight users.

## 1. Hierarchy
Designers use hierarchy to help users recognize key information and distinguish them from less important elements at a glance.
- **Font size and weight:** Large and bold fonts stand out and can emphasize important information and buttons.
- **Contrast:** The strategic use of contrasting colors directs users to key elements.
- **Spacing:** Thoughtful spacing between elements creates visual interest and shows users how different UI elements are related.

*Pro Tip:* Be intentional about what goes where on a screen, especially what users see first and what they have to scroll to see. Your UI content hierarchy should reflect what the user cares about most.

## 2. Progressive Disclosure
Guide users through a multi-step process, providing the right amount of information to make clear choices at each step. Prioritize what to include in the UI and what to exclude since too many features can be overwhelming.
- Sequence features and flows to make the experience feel less overwhelming.
- Example: Instead of a massive onboarding form on a single screen, break it up into steps.
- **Warning:** Give users a way to orient themselves so they know where they are and how many steps they have to go.

## 3. Consistency
A good interface feels familiar from the first click. Design systems create this familiarity through consistent patterns.
- When a button looks and works the same way throughout your product, users stop thinking about the interface and focus on their tasks.
- Continuity becomes increasingly important as users advance through a flow. If one UI button is suddenly bigger, users will wonder why, adding to cognitive load.

## 4. Contrast
Use contrast strategically to draw attention to important content or features.
- For a critical piece of information, introduce a higher, more jarring contrast to command attention.
- Example: A red "Delete Account" button on a white background grabs attention, while a gray "Keep Account" button works well for a secondary action to avoid confusion.

## 5. Accessibility
Carefully contrast colors and luminosity to make designs distinctive and accessible to users with vision impairments.
- Provide alternative text.
- Use appropriate padding rules.
- Ensure compatibility with assistive technology.
- Provide proper keyboard navigation.
- Use sufficient contrast between foreground and background colors.

## 6. Proximity
Things that belong together should stay together. Users naturally perceive UI elements that are close together as related.
- This creates a more intuitive user experience and natural user flow.
- Example: Media controls (Play, Fast-forward, Rewind) sit close together, while the Quit button is placed far away to prevent accidental clicks.

## 7. Alignment
Clean lines make designs feel professional.
- A strong grid system helps establish order and balance.
- Consistent alignment improves readability and creates predictability, making it easier for users to navigate the application.

---

## Pro Tips for Effective UI Design

1. **Apply perspective:** Position UI elements on a screen to guide users through a logical sequence of information and actions. Determine the user flow and adjust element placement accordingly.
2. **Make it effortless:** Good interfaces feel invisible. Keep navigation consistent, provide clear visual feedback, and add smart shortcuts (like search).
3. **Apply shortcuts:** Speed up common tasks with keyboard shortcuts and quick-access tools.
4. **Conduct testing:** Watch how people use your interface to catch problems early.


---

## Empirical UX & Cognitive Ergonomics Law (CMS-V2 Mandatory Contract)

Every form, wizard, modal, and interactive workflow in `client/src/` must obey four empirical UX pillars:

### 1. Cognitive Load & Chunking (Cowan, 2001)
- Working memory holds ~4 chunks of information at once.
- Break dense forms or views into logical `<fieldset>` sections or progressive steps with **3–4 fields maximum per step/group**.
- Pre-fill **smart defaults** wherever contextually known to eliminate unnecessary micro-decisions.
- Persist state seamlessly across step navigation (`Back` / `Next`).

### 2. Visual Hierarchy & Perceptual Weight (Arnheim, 1954)
- **Section Headers (`<legend>`):** Larger (`text-base` / `text-lg`), `font-semibold`, paired with a subtle surface background (`bg-muted/50`) and clear `1px` border separation (`border-border`).
- **Field Labels:** Smaller than headers (`text-sm`), `font-medium`, positioned directly above inputs.
- **Helper & Validation Text:** Smallest (`text-xs`), `text-muted-foreground` (or `text-destructive` on inline error) directly below the input.
- **Action Hierarchy:** Primary submit uses a high-contrast brand button (`bg-primary text-primary-foreground`); secondary/cancel uses a low-weight text/ghost button (`variant="ghost"`) so users never misclick.
- **Active Section Focus:** Emphasize the currently active `<fieldset>` via `onFocusCapture` (`border-foreground/30 bg-background opacity-100`) while letting inactive sections visually recede (`border-border bg-muted/10 opacity-80`).

### 3. Accessibility & Interaction Resilience (WCAG 2.2 AA)
- **Focus Management:** Programmatically move focus (`ref.current?.focus()`) to the new step heading or first invalid field upon navigation or error.
- **Screen Reader Announcements:** Use `aria-live="polite"` and `aria-atomic="true"` regions for step progress updates, dynamic search counts, and inline validation errors.
- **Semantic Grouping:** Wrap logical sections in `<fieldset>` with `<legend>`, include a clear `* Required` legend, and bind inputs via `aria-required="true"` and `aria-describedby`.
- **Responsive Ergonomics:** Full-width stacked controls and action buttons on mobile viewports (`flex-col-reverse sm:flex-row`, `w-full sm:w-auto`).

### 4. Strict Anti-AI-Slop Enforcement
- **NO Decorative Gradients or Neon Glows:** Ban `bg-gradient-to-r`, `auth-btn-gradient`, purple/pink/indigo AI tropes (`text-brand-purple`, `text-brand-pink`), or hardcoded hex focus rings (`focus:ring-[#673ab7]/50`).
- **NO Emoji or Icon Spam:** Never inject emojis into headings, labels, or buttons, and do not slap decorative icons onto every form label.
- **NO Card-in-Card Nesting Bloat:** Avoid wrapping inputs inside multiple nested bordered boxes with heavy drop shadows (`shadow-xl`). Use crisp `1px` borders (`border-border`), intentional whitespace, and flat/subtle neutral surfaces.
