# Frontend Mythos: Accessibility & WCAG 2.2 Level AA Spec

## 1. Core Compliance Contract

Every user interface produced under the Mythos standard must pass **WCAG 2.2 Level AA** compliance without exception. Accessibility is not an afterthought or an optional toggle; it is an architectural prerequisite built into the semantic structure of every component.

### Non-Negotiable Accessibility Rules
1. **Interactive Element Semantics**: Zero click handlers on `<div>`, `<span>`, or `<p>`. Use native `<button>`, `<a>`, `<input>`, or `<select>`.
2. **Accessible Name Computation**: Every interactive element must have a discernible text name (via visible text, `aria-label`, or `aria-labelledby`).
3. **No Focus Traps in Page Flow**: A keyboard-only user must be able to navigate to and away from every component using standard keys (`Tab`, `Shift+Tab`, `Arrow` keys).
4. **Contrast**: Minimum 4.5:1 for body text; minimum 3:1 for large text and UI boundaries.

---

## 2. Focus Management & Dialog Focus Traps

### Accessible Focus Rings
Never suppress outline rings with `outline-none` alone. Always supply a distinct, high-visibility focus indicator:

```css
/* Standard Focus Visible Token */
.focus-ring {
  @apply outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background;
}
```

### Complete Focus Trap Hook (`useFocusTrap`)
When opening modal dialogs, drawers, or lightbox overlays, focus must be trapped inside the container until dismissed:

```typescript
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Store previous active element to restore later
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // 2. Focus first focusable child
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape dismissal
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      // Handle Tab loop trap
      if (e.key === 'Tab') {
        const elements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab (backwards)
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (forwards)
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 3. Restore focus back to the triggering element
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return containerRef;
}
```

---

## 3. Keyboard Navigation Parity & Roving Tabindex

Components with internal navigation (Tabs, Menus, Comboboxes, Toolbars) must support standard arrow-key navigation using the **Roving Tabindex** pattern:

```typescript
// Roving Tabindex Pattern in Tabs or Menu Lists
import { useState, useRef, KeyboardEvent } from 'react';

interface TabItem {
  id: string;
  label: string;
}

export function AccessibleTabs({ tabs }: { tabs: TabItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex = selectedIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (selectedIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (selectedIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    setSelectedIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div role="tablist" aria-orientation="horizontal" onKeyDown={handleKeyDown} className="flex gap-2 border-b border-border/60">
      {tabs.map((tab, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[index] = el)}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isSelected ? 0 : -1} // Only active tab is in sequential tab order
            onClick={() => setSelectedIndex(index)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isSelected ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

---

## 4. Minimum Touch Target Geometry ($44 \times 44\text{ px}$)

Under WCAG 2.2 Success Criterion 2.5.5 (Target Size) and 2.5.8 (Target Size Minimum):
* The physical tap area for touch screens must be at least **$44 \times 44\text{ px}$** (or $24 \times 24\text{ px}$ with at least $12\text{px}$ spacing from adjacent targets).
* If a visual icon is small (e.g. $16\text{px}$ or $20\text{px}$), extend the interactive hit target using padding or an absolute pseudo-element:

```html
<!-- Visual icon is 20px, but interactive hit area is 44px -->
<button 
  type="button" 
  class="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary sm:h-9 sm:w-9"
  aria-label="Close dialog"
>
  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

---

## 5. Screen Reader Announcements & Form Associations

### Dynamic Live Regions
* `aria-live="polite"`: Used for asynchronous feed refreshes, table sorting updates, and search result counts. The screen reader finishes current speech before announcing.
* `aria-live="assertive"`: Reserved strictly for urgent errors, system disconnects, or critical session expiration warnings.
* `aria-atomic="true"`: Guarantees the screen reader reads the complete updated region rather than just a diff of words.

```html
<!-- Live Status Region -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  Showing 24 matching results for query
</div>
```

### Form Input ARIA Binding Standard
Every form field must strictly bind labels, helper descriptions, and error states:

```tsx
export function AccessibleInputField({
  id,
  label,
  helperText,
  error,
  value,
  onChange,
}: {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        className={`rounded-lg border px-3 py-2 text-sm bg-background text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          error ? 'border-destructive focus-visible:ring-destructive' : 'border-border/60 hover:border-border'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
```

---

## 6. Skip to Main Content Link

Every multi-page layout with complex headers or sidebars must provide an accessible skip-link as the very first focusable element in the DOM:

```html
<!-- Accessible Skip Link -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
>
  Skip to main content
</a>
```
