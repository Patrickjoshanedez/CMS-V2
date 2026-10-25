import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getSimilarityStatus, SIGNAL_CONFIG } from '../utils/plagiarismReportHelpers';

/**
 * PlagiarismSourceRow (SourceRow) — Renders an individual matched source row
 * with blended similarity bar, context signal badge, and exact/semantic breakdown.
 */
export function PlagiarismSourceRow({ source, isActive, onSelect }) {
  const percentage = Math.round(source.similarityPercentage);
  const status = getSimilarityStatus(percentage);
  const signal = SIGNAL_CONFIG[source.contextSignal] || SIGNAL_CONFIG.mixed;
  const hasScoreBreakdown = source.winnowScore !== null || source.semanticScore !== null;
  const winnowPct = source.winnowScore !== null ? Math.round(source.winnowScore * 100) : null;
  const semanticPct = source.semanticScore !== null ? Math.round(source.semanticScore * 100) : null;

  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'outline'}
      aria-pressed={isActive}
      aria-label={`${source.sourceTitle}, ${percentage}% similarity, ${source.matchedBlocks.length} matches`}
      data-testid={`plagiarism-source-row-${source.sourceId}`}
      onClick={() => onSelect(source.sourceId)}
      className={cn(
        'h-auto w-full justify-start whitespace-normal rounded-lg border p-3 text-left text-foreground shadow-none transition-all',
        isActive
          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
          : 'border-border/60 bg-card hover:border-border hover:bg-muted/40',
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Numbered badge */}
        <Badge
          variant="outline"
          className="mt-0.5 inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold"
          style={source.palette?.badgeStyle}
        >
          {source.sourceNumber}
        </Badge>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-1.5">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground flex-1">
              {source.sourceTitle}
            </p>
            {/* Context signal badge */}
            <Badge
              variant={signal.badgeVariant}
              className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            >
              {signal.label}
            </Badge>
          </div>

          {/* Blended similarity bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {source.matchedBlocks.length} match{source.matchedBlocks.length !== 1 ? 'es' : ''}
              </span>
              <span className={cn('font-semibold', status.textClass)}>{percentage}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              title={`Blended score: ${percentage}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: status.color }}
              />
            </div>
          </div>

          {/* Dual signal bars: Exact Overlap + Semantic Match */}
          {hasScoreBreakdown && (
            <div className="space-y-0.5 pt-0.5">
              {winnowPct !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[9px] text-muted-foreground">Exact</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning transition-all duration-300"
                      style={{ width: `${winnowPct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[9px] font-mono text-muted-foreground">
                    {winnowPct}%
                  </span>
                </div>
              )}
              {semanticPct !== null && (
                <div className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[9px] text-muted-foreground">Semantic</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-info transition-all duration-300"
                      style={{ width: `${semanticPct}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[9px] font-mono text-muted-foreground">
                    {semanticPct}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Button>
  );
}

PlagiarismSourceRow.propTypes = {
  source: PropTypes.shape({
    sourceId: PropTypes.string.isRequired,
    sourceNumber: PropTypes.number,
    sourceTitle: PropTypes.string,
    similarityPercentage: PropTypes.number,
    contextSignal: PropTypes.string,
    winnowScore: PropTypes.number,
    semanticScore: PropTypes.number,
    matchedBlocks: PropTypes.array,
    palette: PropTypes.object,
  }).isRequired,
  isActive: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

export default PlagiarismSourceRow;
