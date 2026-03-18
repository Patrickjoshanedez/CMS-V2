/**
 * Tabs — lightweight tab navigation components.
 *
 * Usage:
 *   <Tabs defaultValue="proposal">
 *     <TabsList>
 *       <TabsTrigger value="proposal">Proposal</TabsTrigger>
 *       <TabsTrigger value="capstone_1" locked={!isUnlocked}>Capstone 1</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="proposal">...</TabsContent>
 *     <TabsContent value="capstone_1">...</TabsContent>
 *   </Tabs>
 */
import { createContext, useContext, useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const TabsContext = createContext(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs sub-components must be used inside <Tabs>');
  return ctx;
}

/**
 * Root container. Manages active tab state.
 * @param {string} defaultValue - Initial active tab value
 * @param {string} value - Controlled active tab (optional)
 * @param {function} onValueChange - Called when tab changes (optional)
 */
export function Tabs({ children, defaultValue, value, onValueChange, className }) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const active = value !== undefined ? value : internalValue;

  const setActive = (val) => {
    if (value === undefined) setInternalValue(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

/**
 * Horizontal list of tab triggers.
 */
export function TabsList({ children, className }) {
  return (
    <div
      className={cn('flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1', className)}
      role="tablist"
    >
      {children}
    </div>
  );
}

/**
 * Individual tab trigger button.
 * @param {string} value - Tab identifier
 * @param {boolean} locked - When true, tab is disabled with a lock icon
 */
export function TabsTrigger({ children, value, locked = false, className }) {
  const { active, setActive } = useTabsContext();
  const isActive = active === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={locked}
      disabled={locked}
      onClick={() => !locked && setActive(value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        locked && 'cursor-not-allowed opacity-40',
        className,
      )}
    >
      {locked && <Lock className="h-3 w-3 shrink-0" />}
      {children}
    </button>
  );
}

/**
 * Content panel for a tab — only rendered when the tab is active.
 * @param {string} value - Matches a TabsTrigger value
 */
export function TabsContent({ children, value, className }) {
  const { active } = useTabsContext();
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={cn('space-y-6', className)}>
      {children}
    </div>
  );
}
