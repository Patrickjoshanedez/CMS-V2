import { TabsTrigger } from '@/components/ui/Tabs';

/** The shared className applied to all workflow tab triggers across the application. */
export const WORKFLOW_TAB_TRIGGER_CLASS =
  'h-9 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all select-none gap-2';

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
