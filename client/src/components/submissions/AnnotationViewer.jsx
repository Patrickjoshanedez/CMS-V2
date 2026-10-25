/**
 * AnnotationViewer.jsx
 * Displays a single annotation with:
 * - Page reference
 * - Comment content
 * - Resolved status
 * - Author and timestamp
 */

import React from 'react';
import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const AnnotationViewer = ({ annotation, isExpanded = false, onToggle }) => {
  const triggerId = `annotation-trigger-${annotation._id}`;
  const panelId = `annotation-panel-${annotation._id}`;
  const addedAt = new Date(annotation.addedAt);

  return (
    <Card className="overflow-hidden p-0">
      <Button
        id={triggerId}
        type="button"
        variant="ghost"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="h-auto min-h-[44px] w-full justify-between rounded-none px-4 py-3 text-left hover:bg-accent/50"
      >
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">Page {annotation.page}</span>
            <Badge variant={annotation.resolved ? 'success' : 'warning'}>
              {annotation.resolved ? 'Addressed' : 'Unresolved'}
            </Badge>
          </span>
          <span className="block line-clamp-1 text-sm font-normal text-muted-foreground">
            {annotation.content}
          </span>
        </span>
        {isExpanded ? (
          <ChevronDown aria-hidden="true" className="ml-3 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight aria-hidden="true" className="ml-3 size-4 shrink-0 text-muted-foreground" />
        )}
      </Button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isExpanded}
        className="space-y-3 border-t border-border/70 bg-muted/40 p-4"
      >
        {annotation.highlightCoords && (
          <div className="rounded-md border border-border/70 bg-card p-3">
            <p className="mb-1 text-xs text-muted-foreground">Highlighted Area</p>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-card-foreground">
              {JSON.stringify(annotation.highlightCoords, null, 2)}
            </pre>
          </div>
        )}

        <div className="rounded-md border border-border/70 bg-card p-4">
          <p className="whitespace-pre-wrap text-sm text-card-foreground">{annotation.content}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          <time dateTime={addedAt.toISOString()}>
            Added {formatDistanceToNow(addedAt, { addSuffix: true })}
          </time>
          {annotation.resolved && (
            <span className="text-success-foreground">Marked as addressed</span>
          )}
        </div>
      </div>
    </Card>
  );
};

AnnotationViewer.propTypes = {
  annotation: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    page: PropTypes.number.isRequired,
    content: PropTypes.string.isRequired,
    highlightCoords: PropTypes.any,
    addedBy: PropTypes.string,
    addedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
    resolved: PropTypes.bool,
  }).isRequired,
  isExpanded: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

export default AnnotationViewer;
