import * as TabsPrimitive from '@radix-ui/react-tabs';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const Tabs = ({ className, ...props }) => (
  <TabsPrimitive.Root className={cn('space-y-4', className)} {...props} />
);

const TabsList = ({ className, ...props }) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex h-10 max-w-full items-center justify-start gap-1 overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
);

const TabsTrigger = ({
  className,
  locked = false,
  onLockedClick,
  lockedReason,
  children,
  onSelect,
  ...props
}) => (
  <TabsPrimitive.Trigger
    aria-disabled={locked || undefined}
    aria-label={
      locked && lockedReason
        ? `${lockedReason}: ${typeof children === 'string' ? children : 'locked tab'}`
        : undefined
    }
    data-locked={locked || undefined}
    onSelect={(event) => {
      if (locked) {
        event.preventDefault();
        onLockedClick?.();
        return;
      }
      onSelect?.(event);
    }}
    title={locked ? lockedReason : undefined}
    className={cn(
      'inline-flex min-h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      locked && 'cursor-not-allowed opacity-60',
      className,
    )}
    {...props}
  >
    {locked && <Lock className="size-3.5 shrink-0" aria-hidden="true" />}
    {children}
  </TabsPrimitive.Trigger>
);

const TabsContent = ({ className, ...props }) => (
  <TabsPrimitive.Content
    className={cn(
      'mt-2 space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      className,
    )}
    {...props}
  />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };
