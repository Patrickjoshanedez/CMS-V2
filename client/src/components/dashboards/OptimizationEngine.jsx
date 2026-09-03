import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Wand2 } from 'lucide-react';

const OptimizationEngine = ({ optimization, onGenerate, loading }) => {
  const suggestions = optimization?.suggestions || [];

  return (
    <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Optimization Engine</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate balancing actions to reduce adviser overload and overdue pressure.
          </p>
        </div>
        <Button onClick={onGenerate} disabled={loading} size="sm">
          <Wand2 className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </Button>
      </div>

      {!optimization ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
          <p className="text-sm text-muted-foreground">
            No optimization snapshot yet. Generate to analyze current workload imbalance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-muted/50 border border-border rounded-xl p-4">
            <p className="text-sm text-foreground">{optimization.reason}</p>
          </div>

          {optimization.suggested && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, index) => (
                <article
                  key={`${s.fromAdviserId}-${s.toAdviserId}-${index}`}
                  className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4"
                >
                  <p className="font-semibold text-amber-700 dark:text-amber-400">{s.action}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                    Move load from <span className="font-medium">{s.fromAdviserName}</span> to{' '}
                    <span className="font-medium">{s.toAdviserName}</span>
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-2">
                    Estimated score gap reduction: {s.estimatedScoreGapReduction}
                  </p>
                </article>
              ))}
            </div>
          )}

          {optimization.suggested && suggestions.length === 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                No load transfer needed right now. Current distribution appears balanced.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

OptimizationEngine.propTypes = {
  optimization: PropTypes.shape({
    suggested: PropTypes.bool,
    reason: PropTypes.string,
    suggestions: PropTypes.arrayOf(PropTypes.object),
  }),
  onGenerate: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default React.memo(OptimizationEngine);
