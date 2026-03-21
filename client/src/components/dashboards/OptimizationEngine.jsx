import React from 'react';
import PropTypes from 'prop-types';

const OptimizationEngine = ({ optimization, onGenerate, loading }) => {
  const suggestions = optimization?.suggestions || [];

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Optimization Engine</h3>
          <p className="text-sm text-slate-600 mt-1">
            Generate balancing actions to reduce adviser overload and overdue pressure.
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </button>
      </div>

      {!optimization ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            No optimization snapshot yet. Generate to analyze current workload imbalance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-700">{optimization.reason}</p>
          </div>

          {optimization.suggested && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, index) => (
                <article
                  key={`${s.fromAdviserId}-${s.toAdviserId}-${index}`}
                  className="border border-amber-200 bg-amber-50 rounded-xl p-4"
                >
                  <p className="font-semibold text-amber-900">{s.action}</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Move load from <span className="font-medium">{s.fromAdviserName}</span> to{' '}
                    <span className="font-medium">{s.toAdviserName}</span>
                  </p>
                  <p className="text-xs text-amber-700 mt-2">
                    Estimated score gap reduction: {s.estimatedScoreGapReduction}
                  </p>
                </article>
              ))}
            </div>
          )}

          {optimization.suggested && suggestions.length === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">
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
