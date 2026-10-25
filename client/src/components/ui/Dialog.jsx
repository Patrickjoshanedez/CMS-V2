import { forwardRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = ({
  className,
  children,
  showClose = true,
  fullscreen = false,
  portalContainer,
  portal = true,
  ...props
}) => {
  const content = (
    <>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          fullscreen
            ? 'dialog-fullscreen fixed inset-0 z-50 grid h-dvh w-screen max-h-none max-w-none grid-cols-1 min-w-0 gap-0 overflow-hidden rounded-none border-0 bg-background p-0 text-foreground shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            : 'dialog-centered fixed left-1/2 top-1/2 z-50 grid grid-cols-1 max-h-[min(90vh,48rem)] w-[calc(100vw_-_2rem)] min-w-0 max-w-lg gap-4 overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-full',
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 inline-flex size-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none data-[state=open]:bg-accent sm:min-h-9 sm:min-w-9">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </>
  );

  return portal ? (
    <DialogPortal container={portalContainer ?? undefined}>{content}</DialogPortal>
  ) : (
    content
  );
};

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn('flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);

const DialogTitle = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      'min-w-0 text-sm text-muted-foreground break-words [overflow-wrap:anywhere]',
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
