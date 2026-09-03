import { getSimilarityColor, toPercent } from '@/utils/similarityColor';

export default function ScoreBar({ finalScore, lexicalScore, semanticScore }) {
  const finalValue = toPercent(finalScore);
  const lexicalValue = toPercent(lexicalScore);
  const semanticValue = toPercent(semanticScore);

  return (
    <div className="space-y-2 [font-family:var(--font-body)]">
      <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_70%,white)]">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${finalValue}%`,
            backgroundColor: getSimilarityColor(finalValue),
          }}
        />
      </div>

      <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
        <span className="font-semibold text-[var(--color-text-primary)]">
          {Math.round(finalValue)}% final
        </span>
        {'  |  '}
        Lexical: {Math.round(lexicalValue)}%{'  '}
        Semantic: {Math.round(semanticValue)}%
      </p>
    </div>
  );
}
