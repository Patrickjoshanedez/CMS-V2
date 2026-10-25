import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Separator = forwardRef(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        isHorizontal ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
});

Separator.displayName = 'Separator';

export { Separator };
