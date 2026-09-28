import { ShieldCheck, Zap } from 'lucide-react';

export default function ScanHero({ semanticModel }) {
  return (
    <header className="space-y-4">
      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Archive Integrity Scan
        </span>
        {semanticModel && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            {semanticModel.toLowerCase().includes('bge-m3')
              ? 'BAAI/bge-m3 · 1,024-dim · 8,192 tokens'
              : semanticModel}
          </span>
        )}
      </div>

      {/* Headline */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Plagiarism &amp; Similarity Checker
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Scan capstone manuscripts and proposals against the institutional archive using{' '}
          <span className="font-medium text-foreground">lexical fingerprinting (Winnowing)</span>{' '}
          and <span className="font-medium text-foreground">dense vector embeddings</span>.
        </p>
      </div>
    </header>
  );
}
