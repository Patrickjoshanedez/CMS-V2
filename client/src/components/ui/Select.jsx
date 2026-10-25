import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = ({ className, children, ...props }) => (
  <SelectPrimitive.Trigger
    className={cn(
      'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors data-[placeholder]:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

const SelectScrollUpButton = ({ className, ...props }) => (
  <SelectPrimitive.ScrollUpButton
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="size-4" aria-hidden="true" />
  </SelectPrimitive.ScrollUpButton>
);

const SelectScrollDownButton = ({ className, ...props }) => (
  <SelectPrimitive.ScrollDownButton
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="size-4" aria-hidden="true" />
  </SelectPrimitive.ScrollDownButton>
);

const SelectContent = ({ className, children, position = 'popper', ...props }) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      position={position}
      className={cn(
        'relative z-50 max-h-96 min-w-32 w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

const SelectLabel = ({ className, ...props }) => (
  <SelectPrimitive.Label
    className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
    {...props}
  />
);

const SelectItem = ({ className, children, ...props }) => (
  <SelectPrimitive.Item
    className={cn(
      'relative flex w-full min-w-0 cursor-default select-none items-center whitespace-normal break-words rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="size-4" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText className="min-w-0 whitespace-normal break-words">
      {children}
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

const SelectSeparator = ({ className, ...props }) => (
  <SelectPrimitive.Separator
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
);

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

export default Select;
