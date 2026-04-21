import ScoreBar from '@/components/plagiarism/ScoreBar';

export default function SourceList({
  sources,
  activeSourceId,
  onSelectSource,
  onHoverSource,
  onLeaveSource,
  registerSourceNode,
}) {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-3 py-5 text-sm text-[var(--color-text-secondary)] [font-family:var(--font-body)]">
        No sources were returned by this scan.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const isActive = source._sourceId === activeSourceId;
        const sourceMeta = [source.authors?.join(', '), source.year].filter(Boolean).join(' | ');

        return (
          <button
            key={source._sourceId}
            type="button"
            ref={(node) => registerSourceNode(source._sourceId, node)}
            onClick={() => onSelectSource(source._sourceId)}
            onMouseEnter={() => onHoverSource(source._sourceId)}
            onMouseLeave={onLeaveSource}
            className={[
              'block w-full rounded-lg border bg-white p-3 text-left transition-all',
              isActive
                ? 'border-[var(--color-neutral)] shadow-[0_0_0_1px_var(--color-neutral)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-neutral)]/50',
            ].join(' ')}
          >
            <div className="flex items-start gap-2.5 [font-family:var(--font-body)]">
              <span
                className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: source.sourceColor }}
              />

              <div className="min-w-0 flex-1 space-y-2">
                <h4 className="archive-two-line text-sm font-semibold text-[var(--color-text-primary)]">
                  {source.title || 'Untitled Source'}
                </h4>

                <p className="archive-two-line text-xs text-[var(--color-text-secondary)]">
                  {sourceMeta || 'Unknown metadata'}
                </p>

                <ScoreBar
                  finalScore={source.finalScore}
                  lexicalScore={source.similarity}
                  semanticScore={source.semanticSimilarity}
                />

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-0.5 font-semibold text-[var(--color-text-secondary)]">
                    {source.matchCount || 0} matches
                  </span>

                  {source.semanticOnly ? (
                    <span className="rounded-full border border-[var(--color-neutral)]/40 bg-[color-mix(in_srgb,var(--color-neutral)_12%,white)] px-2 py-0.5 font-semibold text-[var(--color-neutral)]">
                      Semantic match only
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
