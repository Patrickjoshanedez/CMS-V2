import { CornerDownRight } from 'lucide-react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toPercent } from '@/utils/similarityColor';

function trimSnippet(text) {
  if (typeof text !== 'string') return 'N/A';
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'N/A';
  return compact.length > 220 ? `${compact.slice(0, 220)}...` : compact;
}

export default function MatchSnippet({ match, sourceColor, onJump }) {
  const similarity = toPercent(match?.similarity);

  return (
    <Card className="space-y-3 p-4 shadow-sm">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your text
        </p>
        <p className="break-words rounded-md bg-muted/60 p-2 font-mono text-sm text-foreground">
          {trimSnippet(match?.submittedText)}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Source text
        </p>
        <p className="break-words rounded-md bg-muted/60 p-2 font-mono text-sm text-foreground">
          {trimSnippet(match?.matchedText)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Similarity</span>
          <Badge
            variant="outline"
            className="gap-1.5 border-[color:var(--source-color)] text-foreground"
            style={{ '--source-color': sourceColor }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[color:var(--source-color)]"
            />
            {Math.round(similarity)}%
          </Badge>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onJump}
          className="gap-1.5 text-xs font-medium"
        >
          <CornerDownRight className="h-3.5 w-3.5" />
          Jump to in document
        </Button>
      </div>
    </Card>
  );
}

MatchSnippet.propTypes = {
  match: PropTypes.shape({
    similarity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    submittedText: PropTypes.string,
    matchedText: PropTypes.string,
  }),
  sourceColor: PropTypes.string,
  onJump: PropTypes.func,
};
