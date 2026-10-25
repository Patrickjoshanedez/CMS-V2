import PropTypes from 'prop-types';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { toPercent } from '@/utils/similarityColor';

export default function ScoreBar({ finalScore, lexicalScore, semanticScore }) {
  const finalValue = toPercent(finalScore);
  const lexicalValue = toPercent(lexicalScore);
  const semanticValue = toPercent(semanticScore);
  const scoreLabel =
    finalValue > 70 ? 'Critical' : finalValue > 40 ? 'High' : finalValue > 15 ? 'Moderate' : 'Low';
  const scoreVariant =
    scoreLabel === 'Critical' ? 'destructive' : scoreLabel === 'Low' ? 'success' : 'warning';
  const indicatorClassName =
    scoreVariant === 'destructive'
      ? 'bg-destructive'
      : scoreVariant === 'success'
        ? 'bg-success'
        : 'bg-warning';

  return (
    <div className="space-y-1.5">
      <Progress
        value={finalValue}
        max={100}
        aria-label="Final similarity score"
        className="h-1.5"
        indicatorClassName={indicatorClassName}
      />

      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(finalValue)}% final</span>
        <Badge variant={scoreVariant} className="px-1.5 py-0 text-[10px]">
          {scoreLabel}
        </Badge>
        {'  |  '}
        Lexical: {Math.round(lexicalValue)}%{'  '}
        Semantic: {Math.round(semanticValue)}%
      </p>
    </div>
  );
}

ScoreBar.propTypes = {
  finalScore: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lexicalScore: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  semanticScore: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
