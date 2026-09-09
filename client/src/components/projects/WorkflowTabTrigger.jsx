import { TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

/** The shared className applied to all workflow tab triggers across the application. */
export const WORKFLOW_TAB_TRIGGER_CLASS =
  'h-10 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all select-none gap-2 shrink-0 whitespace-nowrap flex items-center justify-center data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:font-semibold data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50';

/**
 * WorkflowTabTrigger — reusable tab trigger with optional locked state.
 * Wraps TabsTrigger with the standard styling and optional lock props.
 */
export default function WorkflowTabTrigger({
  value,
  icon: Icon,
  label,
  locked,
  lockedReason,
  onLockedClick,
  className,
}) {
  return (
    <TabsTrigger
      value={value}
      locked={locked}
      lockedReason={lockedReason}
      onLockedClick={onLockedClick}
      className={cn(WORKFLOW_TAB_TRIGGER_CLASS, className)}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 mr-1.5" />}
      <span>{label}</span>
    </TabsTrigger>
  );
}
