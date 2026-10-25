import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const sideClasses = {
  top: 'inset-x-0 top-0 h-auto max-h-[85vh] w-full border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
  bottom:
    'inset-x-0 bottom-0 h-auto max-h-[85vh] w-full border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  left: 'inset-y-0 left-0 h-dvh w-[min(21rem,85vw)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  right:
    'inset-y-0 right-0 h-dvh w-[min(21rem,85vw)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
};

const SheetContent = forwardRef(({ side = 'right', className, ...props }, ref) => (
  <SheetPortal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 overflow-y-auto border-border bg-background p-6 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
        sideClasses[side] || sideClasses.right,
        className,
      )}
      {...props}
    />
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';
SheetContent.propTypes = {
  side: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  className: PropTypes.string,
  children: PropTypes.node,
};

const SheetTitle = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';
SheetTitle.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

const SheetDescription = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';
SheetDescription.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetPortal, SheetTitle, SheetTrigger };
