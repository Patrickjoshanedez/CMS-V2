import { ShieldCheck } from 'lucide-react';

export default function ScanHero() {
  return (
    <header className="space-y-4">
      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Institutional Archive
        </span>
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Plagiarism &amp; Similarity Checker
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Compare a manuscript or proposal with the institutional archive. Review matching
          passages and their sources before submitting your work.
        </p>
      </div>
    </header>
  );
}
