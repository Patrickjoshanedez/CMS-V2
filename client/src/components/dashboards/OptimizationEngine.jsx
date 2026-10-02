import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Wand2, Users, GraduationCap, ShieldCheck } from 'lucide-react';

const ROLE_SCOPES = [
  { id: 'all', label: 'All Roles', icon: Users },
  { id: 'adviser', label: 'Advisers', icon: GraduationCap },
  { id: 'panelist', label: 'Panelists', icon: ShieldCheck },
];

const OptimizationEngine = ({
  optimization,
  onGenerate,
  loading,
  roleScope = 'all',
  onRoleScopeChange,
}) => {
  const [internalScope, setInternalScope] = useState('all');
  const currentScope = onRoleScopeChange ? roleScope : internalScope;

  const handleScopeChange = (newScope) => {
    if (onRoleScopeChange) {
      onRoleScopeChange(newScope);
    } else {
      setInternalScope(newScope);
    }
  };

  const handleGenerateClick = () => {
    onGenerate(currentScope);
  };

  const suggestions = optimization?.suggestions || [];

  return (
    <section
      className="bg-card border border-border/60 rounded-xl p-5 shadow-xs space-y-4"
      aria-busy={loading}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Optimization Engine
            </h2>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
              {currentScope === 'all' ? 'Multi-Role' : currentScope}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate balancing actions across faculty advisers, panelists, and committee members to
            reduce overload.
          </p>
        </div>
        <Button
          onClick={handleGenerateClick}
          disabled={loading}
          size="sm"
          className="min-h-[44px] sm:min-h-[36px] px-3.5 shadow-xs shrink-0"
          aria-label={
            loading ? 'Generating balancing suggestions' : 'Generate balancing suggestions'
          }
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </Button>
      </div>

      {/* Role Scope Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/40 w-fit">
        {ROLE_SCOPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleScopeChange(id)}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentScope === id
                ? 'bg-background text-foreground shadow-2xs border border-border/60 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {loading ? 'Analyzing workload and generating balancing actions...' : ''}
      </span>

      {!optimization ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5">
          <p className="text-sm text-muted-foreground">
            No optimization snapshot yet. Select a role scope and generate to analyze workload
            imbalance.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-muted/30 border border-border/60 rounded-xl p-4">
            <p className="text-sm text-foreground">{optimization.reason}</p>
          </div>

          {optimization.suggested && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, index) => {
                const fromName = s.fromFacultyName || s.fromAdviserName;
                const toName = s.toFacultyName || s.toAdviserName;
                const role = s.roleType || currentScope;

                return (
                  <article
                    key={`${s.fromAdviserId || s.fromFacultyId}-${s.toAdviserId || s.toFacultyId}-${index}`}
                    className="border border-amber-500/25 bg-amber-500/5 rounded-xl p-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-amber-700 dark:text-amber-400">{s.action}</p>
                      {role && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-semibold capitalize border-amber-500/40 text-amber-700 dark:text-amber-300"
                        >
                          {role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                      Move load from <span className="font-medium">{fromName}</span> to{' '}
                      <span className="font-medium">{toName}</span>
                    </p>
                    {s.restrictionNote && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">
                        Note: {s.restrictionNote}
                      </p>
                    )}
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-2 font-mono tabular-nums">
                      Estimated score gap reduction: {s.estimatedScoreGapReduction}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

          {optimization.suggested && suggestions.length === 0 && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-2xs">
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
  roleScope: PropTypes.oneOf(['all', 'adviser', 'panelist']),
  onRoleScopeChange: PropTypes.func,
};

export default React.memo(OptimizationEngine);
