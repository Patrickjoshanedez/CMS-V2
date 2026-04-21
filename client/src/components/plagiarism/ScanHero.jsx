import { ShieldCheck } from 'lucide-react';

export default function ScanHero({ semanticModel }) {
  return (
    <header className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-neutral)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Archive Integrity Scan
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl leading-tight text-[var(--color-text-primary)] [font-family:var(--font-display)] sm:text-[2.9rem]">
          Archive Similarity Scanner
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base [font-family:var(--font-body)]">
          Compare your submission against the full capstone archive using lexical fingerprinting +
          semantic embeddings.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-neutral)_8%,white)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] [font-family:var(--font-body)]">
        <span className="text-[var(--color-neutral)]">Model:</span>
        <span className="font-semibold text-[var(--color-text-primary)]">{semanticModel}</span>
      </div>
    </header>
  );
}
