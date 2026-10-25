import * as MenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuGroup = MenuPrimitive.Group;
const DropdownMenuPortal = MenuPrimitive.Portal;
const DropdownMenuSub = MenuPrimitive.Sub;
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = ({ className, inset, children, ...props }) => (
  <MenuPrimitive.SubTrigger
    className={cn(
      'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
      inset && 'pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto size-4" aria-hidden="true" />
  </MenuPrimitive.SubTrigger>
);

const DropdownMenuSubContent = ({ className, ...props }) => (
  <MenuPrimitive.SubContent
    className={cn('z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)}
    {...props}
  />
);

const DropdownMenuContent = ({ className, sideOffset = 4, ...props }) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        'z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-32 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    />
  </MenuPrimitive.Portal>
);

const DropdownMenuItem = ({ className, inset, variant = 'default', ...props }) => (
  <MenuPrimitive.Item
    data-variant={variant}
    className={cn(
      'relative flex min-h-9 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
      inset && 'pl-8',
      variant === 'destructive' && 'text-destructive focus:bg-destructive/10 focus:text-destructive',
      className,
    )}
    {...props}
  />
);

const DropdownMenuCheckboxItem = ({ className, children, checked, ...props }) => (
  <MenuPrimitive.CheckboxItem
    checked={checked}
    className={cn('relative flex min-h-9 cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <MenuPrimitive.ItemIndicator>
        <Check className="size-4" aria-hidden="true" />
      </MenuPrimitive.ItemIndicator>
    </span>
    {children}
  </MenuPrimitive.CheckboxItem>
);

const DropdownMenuRadioItem = ({ className, children, ...props }) => (
  <MenuPrimitive.RadioItem
    className={cn('relative flex min-h-9 cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)}
    {...props}
  >
    <span className="absolute left-2 flex size-4 items-center justify-center">
      <MenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-current" aria-hidden="true" />
      </MenuPrimitive.ItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
);

const DropdownMenuLabel = ({ className, inset, ...props }) => (
  <MenuPrimitive.Label className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...props} />
);

const DropdownMenuSeparator = ({ className, ...props }) => (
  <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
);

const DropdownMenuShortcut = ({ className, ...props }) => (
  <span className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)} {...props} />
);

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
