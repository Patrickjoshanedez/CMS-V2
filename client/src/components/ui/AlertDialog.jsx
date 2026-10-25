import { forwardRef } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './Dialog';
import { Button } from './Button';

const AlertDialogContent = ({ ...props }) => (
  <DialogContent
    {...props}
    role="alertdialog"
    showClose={false}
    onPointerDownOutside={(event) => event.preventDefault()}
  />
);

const AlertDialogCancel = forwardRef(({ variant = 'outline', ...props }, ref) => (
  <DialogClose asChild>
    <Button ref={ref} variant={variant} {...props} />
  </DialogClose>
));
AlertDialogCancel.displayName = 'AlertDialogCancel';

const AlertDialogAction = forwardRef(({ variant = 'default', ...props }, ref) => (
  <DialogClose asChild>
    <Button ref={ref} variant={variant} {...props} />
  </DialogClose>
));
AlertDialogAction.displayName = 'AlertDialogAction';

export {
  Dialog as AlertDialog,
  DialogTrigger as AlertDialogTrigger,
  AlertDialogContent,
  DialogHeader as AlertDialogHeader,
  DialogFooter as AlertDialogFooter,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
