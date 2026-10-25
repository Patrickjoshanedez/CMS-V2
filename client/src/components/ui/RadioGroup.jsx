import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const RadioGroup = ({ className, ...props }) => (
  <RadioGroupPrimitive.Root className={cn('grid gap-2', className)} {...props} />
);

const RadioGroupItem = ({ className, ...props }) => (
  <RadioGroupPrimitive.Item
    className={cn(
      'aspect-square size-4 rounded-full border border-primary text-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="size-2.5 fill-current" aria-hidden="true" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
);

export { RadioGroup, RadioGroupItem };
