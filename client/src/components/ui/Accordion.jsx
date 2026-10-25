import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = ({ className, ...props }) => (
  <AccordionPrimitive.Item className={cn('border-b border-border', className)} {...props} />
);

const AccordionTrigger = ({ className, children, ...props }) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={cn('flex min-h-11 flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180', className)}
      {...props}
    >
      {children}
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" aria-hidden="true" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

const AccordionContent = ({ className, children, ...props }) => (
  <AccordionPrimitive.Content
    className={cn('overflow-hidden text-sm data-[state=closed]:hidden', className)}
    {...props}
  >
    <div className="pb-4 pt-0">{children}</div>
  </AccordionPrimitive.Content>
);

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
