import { TabsTrigger } from '@/components/ui/Tabs';

/** The shared className applied to all workflow tab triggers across the application. */
export const WORKFLOW_TAB_TRIGGER_CLASS =
  'data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-muted-foreground';

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
}) {
  return (
    <TabsTrigger
      value={value}
      locked={locked}
      lockedReason={lockedReason}
      onLockedClick={onLockedClick}
      className={WORKFLOW_TAB_TRIGGER_CLASS}
    >
      {Icon && <Icon className="h-4 w-4 mr-2" />}
      {label}
    </TabsTrigger>
  );
}
