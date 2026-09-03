import { CornerDownRight } from 'lucide-react';
import { toPercent } from '@/utils/similarityColor';

function trimSnippet(text) {
  if (typeof text !== 'string') return 'N/A';
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'N/A';
  return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
}

export default function MatchSnippet({ match, sourceColor, onJump }) {
  const similarity = toPercent(match?.similarity);

  return (
    <article className="space-y-3 rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-[0_8px_18px_-16px_rgba(13,27,42,0.55)]">
      <div className="space-y-1 [font-family:var(--font-body)]">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
          Your text
        </p>
        <p className="rounded-md bg-[color-mix(in_srgb,var(--color-bg)_85%,white)] p-2 text-sm text-[var(--color-text-primary)] [font-family:var(--font-mono)]">
          {trimSnippet(match?.submittedText)}
        </p>
      </div>

      <div className="space-y-1 [font-family:var(--font-body)]">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
          Source text
        </p>
        <p className="rounded-md bg-[color-mix(in_srgb,var(--color-bg)_78%,white)] p-2 text-sm text-[var(--color-text-primary)] [font-family:var(--font-mono)]">
          {trimSnippet(match?.matchedText)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 [font-family:var(--font-body)]">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
          Similarity: <span style={{ color: sourceColor }}>{Math.round(similarity)}%</span>
        </span>

        <button
          type="button"
          onClick={onJump}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg)]"
        >
          <CornerDownRight className="h-3.5 w-3.5" />
          Jump to in document
        </button>
      </div>
    </article>
  );
}
