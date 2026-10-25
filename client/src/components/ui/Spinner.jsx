import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, ...props }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
      {...props}
    />
  );
}

export default Spinner;
