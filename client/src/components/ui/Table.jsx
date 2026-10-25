import { cn } from '@/lib/utils';

const Table = ({ className, ...props }) => (
  <div className="relative w-full overflow-auto">
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
);

const TableHeader = ({ className, ...props }) => (
  <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
);

const TableBody = ({ className, ...props }) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

const TableFooter = ({ className, ...props }) => (
  <tfoot className={cn('border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0', className)} {...props} />
);

const TableRow = ({ className, ...props }) => (
  <tr className={cn('border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
);

const TableHead = ({ className, ...props }) => (
  <th className={cn('h-10 px-3 text-left align-middle text-xs font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0', className)} {...props} />
);

const TableCell = ({ className, ...props }) => (
  <td className={cn('p-3 align-middle [&:has([role=checkbox])]:pr-0', className)} {...props} />
);

const TableCaption = ({ className, ...props }) => (
  <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
);

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
