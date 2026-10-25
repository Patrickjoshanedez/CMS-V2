import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
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
    <Card aria-busy={loading} className="shadow-sm">
      <CardHeader className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl font-bold tracking-tight">Workload Suggestions</CardTitle>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
              {currentScope === 'all' ? 'Multi-Role' : currentScope}
            </Badge>
          </div>
          <CardDescription className="max-w-prose">
            Generate balancing actions across faculty advisers, panelists, and committee members to
            reduce overload.
          </CardDescription>
        </div>
        <Button
          onClick={handleGenerateClick}
          disabled={loading}
          size="sm"
          className="min-h-11 px-3.5 shadow-xs shrink-0"
          aria-label={
            loading ? 'Generating balancing suggestions' : 'Generate balancing suggestions'
          }
        >
          <Wand2 className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Generate Suggestions'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-0">
        <RadioGroup
          aria-label="Committee role scope"
          value={currentScope}
          onValueChange={handleScopeChange}
          disabled={loading}
          className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-1"
        >
          {ROLE_SCOPES.map(({ id, label, icon: Icon }) => (
            <label
              key={id}
              htmlFor={`workload-scope-${id}`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              } ${
                currentScope === id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              }`}
            >
              <RadioGroupItem id={`workload-scope-${id}`} value={id} className="sr-only" />
              <Icon className="h-3.5 w-3.5" />
              {label}
            </label>
          ))}
        </RadioGroup>

        <span className="sr-only" role="status" aria-live="polite">
          {loading ? 'Analyzing workload and generating balancing actions...' : ''}
        </span>

        {!optimization ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-5">
            <p className="text-sm text-muted-foreground">
              Choose a committee role, then generate suggestions to review workload distribution.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
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
                      className="rounded-xl border border-warning/30 bg-warning/10 p-4 shadow-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="font-semibold text-warning-foreground">{s.action}</p>
                        {role && (
                          <Badge
                            variant="warning"
                            className="shrink-0 text-[10px] font-semibold capitalize"
                          >
                            {role}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-warning-foreground">
                        Move load from <span className="font-medium">{fromName}</span> to{' '}
                        <span className="font-medium">{toName}</span>
                      </p>
                      {s.restrictionNote && (
                        <p className="mt-1.5 text-xs italic text-muted-foreground">
                          Note: {s.restrictionNote}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-xs tabular-nums text-warning-foreground">
                        Estimated score gap reduction: {s.estimatedScoreGapReduction}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}

            {optimization.suggested && suggestions.length === 0 && (
              <Alert variant="success" className="rounded-xl">
                <AlertDescription>
                  No load transfer needed right now. Current distribution appears balanced.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
