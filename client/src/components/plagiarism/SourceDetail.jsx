import { ArrowLeft, Braces } from 'lucide-react';
import MatchSnippet from '@/components/plagiarism/MatchSnippet';
import { toPercent } from '@/utils/similarityColor';

export default function SourceDetail({ source, matches, onBackToList, onJumpToMatch }) {
  if (!source) return null;

  const finalScore = toPercent(source.finalScore);
  const lexicalScore = toPercent(source.similarity);
  const semanticScore = toPercent(source.semanticSimilarity);
  const sourceMeta = [source.authors?.join(', '), source.year].filter(Boolean).join(' | ');

  return (
    <section className="space-y-4 [font-family:var(--font-body)]">
      <button
        type="button"
        onClick={onBackToList}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-neutral)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sources
      </button>

      <header className="space-y-2">
        <h3 className="text-xl leading-tight text-[var(--color-text-primary)] [font-family:var(--font-display)]">
          {source.title || 'Untitled Source'}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {sourceMeta || 'Unknown metadata'}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--color-border)] bg-white p-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Final Score
          </p>
          <p className="text-xl font-semibold" style={{ color: source.sourceColor }}>
            {Math.round(finalScore)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Lexical
          </p>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {Math.round(lexicalScore)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Semantic
          </p>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {Math.round(semanticScore)}%
          </p>
        </div>
      </div>

      <details className="group rounded-lg border border-[var(--color-border)] bg-white p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
          <Braces className="h-4 w-4 text-[var(--color-neutral)]" />
          Score Formula
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          finalScore = max(lexical, semantic) when semantic exceeds backend threshold, lexical
          otherwise.
        </p>
      </details>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
          Match Snippets ({matches.length} found)
        </h4>

        {matches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-3 py-4 text-sm text-[var(--color-text-secondary)]">
            No lexical snippet payload was attached for this source.
          </p>
        ) : (
          matches.map((match, index) => (
            <MatchSnippet
              key={`${source._sourceId}-${match.startIndex}-${index}`}
              match={match}
              sourceColor={source.sourceColor}
              onJump={() => onJumpToMatch(match)}
            />
          ))
        )}
      </div>
    </section>
  );
}
