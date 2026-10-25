import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default function ScanHero() {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="info"
          className="gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Institutional Archive
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Plagiarism &amp; Similarity Checker
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Compare a manuscript or proposal with the institutional archive. Review matching passages
          and their sources before submitting your work.
        </p>
      </div>
    </header>
  );
}
