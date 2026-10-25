import React from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

/**
 * OriginalityShieldBadge — Academic Google Scholar-style color-coded originality indicator.
 *
 * Tiering Specifications:
 * - High Originality (>95% unique): shared success status treatment
 * - Moderate Originality (80%-95% unique): shared warning status treatment
 * - High Similarity / Warning (<80% unique): shared destructive status treatment
 */
export default function OriginalityShieldBadge({ score, className = '', onClick }) {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 95.0;
  const roundedScore = Math.round(numericScore);
  const similarityScore = Math.max(0, Math.min(100, 100 - roundedScore));
  let badgeConfig = {
    colorClass: 'border-success/30 bg-success/10 text-success-foreground',
    icon: ShieldCheck,
    label: `${roundedScore}% Original`,
    status: 'Verified Original',
    description: `Originality exceeds standard compliance thresholds with only ${similarityScore}% matched content.`,
  };

  if (numericScore < 80) {
    badgeConfig = {
      colorClass: 'border-destructive/30 bg-destructive/10 text-destructive',
      icon: ShieldAlert,
      label: `Similarity Alert (${similarityScore}%)`,
      status: 'Similarity Warning',
      description: `Elevated similarity detected (${similarityScore}% matched). Review required prior to citation.`,
    };
  } else if (numericScore <= 95) {
    badgeConfig = {
      colorClass: 'border-warning/30 bg-warning/10 text-warning-foreground',
      icon: Shield,
      label: `${roundedScore}% Original`,
      status: 'Moderate Originality',
      description: `Manuscript meets standard institutional clearance criteria (${similarityScore}% matched).`,
    };
  }

  const IconComponent = badgeConfig.icon;

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClick}
            className={`h-auto min-h-[44px] min-w-0 gap-1.5 rounded-full px-2 py-0.5 text-xs hover:opacity-90 ${badgeConfig.colorClass} ${className}`}
            aria-label={`Originality score: ${badgeConfig.label}`}
          >
            <IconComponent className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="font-semibold tracking-tight">{badgeConfig.label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="w-64 p-3">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <IconComponent className="size-4 text-primary" aria-hidden="true" />
            <span>{badgeConfig.status}</span>
          </div>
          <p className="leading-relaxed text-muted-foreground">{badgeConfig.description}</p>
          <div className="mt-2 flex justify-between border-t border-border/50 pt-2 font-mono text-[11px] text-muted-foreground">
            <span>Originality: {roundedScore}%</span>
            <span>Similarity: {similarityScore}%</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

OriginalityShieldBadge.propTypes = {
  score: PropTypes.number,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
