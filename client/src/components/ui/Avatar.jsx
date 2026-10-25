import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

const Avatar = ({ className, ...props }) => (
  <AvatarPrimitive.Root
    className={cn(
      'relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted',
      className,
    )}
    {...props}
  />
);

const AvatarImage = ({ className, ...props }) => (
  <AvatarPrimitive.Image
    className={cn('aspect-square size-full object-cover', className)}
    {...props}
  />
);

const AvatarFallback = ({ className, ...props }) => (
  <AvatarPrimitive.Fallback
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground',
      className,
    )}
    {...props}
  />
);

export { Avatar, AvatarFallback, AvatarImage };
