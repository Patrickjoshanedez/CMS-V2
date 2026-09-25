import { getSimilarityColor, toPercent } from '@/utils/similarityColor';

export default function ScoreBar({ finalScore, lexicalScore, semanticScore }) {
  const finalValue = toPercent(finalScore);
  const lexicalValue = toPercent(lexicalScore);
  const semanticValue = toPercent(semanticScore);

  return (
    <div className="space-y-1.5">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${finalValue}%`,
            backgroundColor: getSimilarityColor(finalValue),
          }}
        />
      </div>

      <p className="text-[11px] font-medium text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(finalValue)}% final</span>
        {'  |  '}
        Lexical: {Math.round(lexicalValue)}%{'  '}
        Semantic: {Math.round(semanticValue)}%
      </p>
    </div>
  );
}
