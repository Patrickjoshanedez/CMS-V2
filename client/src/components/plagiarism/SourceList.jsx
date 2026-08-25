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
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">No sources found</p>
        <p className="text-xs text-muted-foreground/70">
          This document had no significant matches in the archive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => {
        const isActive = source._sourceId === activeSourceId;
        const sourceMeta = [source.authors?.join(', '), source.year].filter(Boolean).join(' · ');

        return (
          <button
            key={source._sourceId}
            type="button"
            ref={(node) => registerSourceNode(source._sourceId, node)}
            onClick={() => onSelectSource(source._sourceId)}
            onMouseEnter={() => onHoverSource(source._sourceId)}
            onMouseLeave={onLeaveSource}
            className={[
              'block w-full rounded-xl border p-3 text-left transition-all duration-150',
              isActive
                ? 'border-primary/40 bg-primary/5 shadow-sm shadow-primary/10'
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/40',
            ].join(' ')}
          >
            <div className="flex items-start gap-2.5">
              {/* Color swatch */}
              <span
                className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: source.sourceColor }}
              />

              <div className="min-w-0 flex-1 space-y-1.5">
                {/* Title */}
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                  {source.title || 'Untitled Source'}
                </p>

                {/* Meta */}
                {sourceMeta && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{sourceMeta}</p>
                )}

                {/* Score bar */}
                <ScoreBar
                  finalScore={source.finalScore}
                  lexicalScore={source.similarity}
                  semanticScore={source.semanticSimilarity}
                />

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-muted-foreground">
                    {source.matchCount || 0} matches
                  </span>
                  {source.semanticOnly && (
                    <span className="rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 font-medium text-primary">
                      Semantic only
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
