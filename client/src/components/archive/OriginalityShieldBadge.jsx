import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ShieldCheck, ShieldAlert, Shield, Info } from 'lucide-react';

/**
 * OriginalityShieldBadge — Academic Google Scholar-style color-coded originality indicator.
 *
 * Tiering Specifications:
 * - High Originality (>95% unique): Green shield badge (#2e7d32 text, #e8f5e9 bg, border #c8e6c9)
 * - Moderate Originality (80%-95% unique): Amber shield badge (#f57c00 text, #fff3e0 bg, border #ffe0b2)
 * - High Similarity / Warning (<80% unique): Red shield badge (#c62828 text, #ffebee bg, border #ffcdd2)
 */
export default function OriginalityShieldBadge({ score, className = '', onClick }) {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : 95.0;
  const roundedScore = Math.round(numericScore);
  const similarityScore = Math.max(0, Math.min(100, 100 - roundedScore));
  const [showTooltip, setShowTooltip] = useState(false);

  let badgeConfig = {
    colorClass:
      'text-[#2e7d32] bg-[#e8f5e9] border-[#c8e6c9] dark:text-[#81c784] dark:bg-[#1b5e20]/30 dark:border-[#2e7d32]/40',
    icon: ShieldCheck,
    label: `${roundedScore}% Original`,
    status: 'Verified Original',
    description: `Originality exceeds standard compliance thresholds with only ${similarityScore}% matched content.`,
  };

  if (numericScore < 80) {
    badgeConfig = {
      colorClass:
        'text-[#c62828] bg-[#ffebee] border-[#ffcdd2] dark:text-[#ef9a9a] dark:bg-[#b71c1c]/30 dark:border-[#c62828]/40',
      icon: ShieldAlert,
      label: `Similarity Alert (${similarityScore}%)`,
      status: 'Similarity Warning',
      description: `Elevated similarity detected (${similarityScore}% matched). Review required prior to citation.`,
    };
  } else if (numericScore <= 95) {
    badgeConfig = {
      colorClass:
        'text-[#f57c00] bg-[#fff3e0] border-[#ffe0b2] dark:text-[#ffb74d] dark:bg-[#e65100]/30 dark:border-[#f57c00]/40',
      icon: Shield,
      label: `${roundedScore}% Original`,
      status: 'Moderate Originality',
      description: `Manuscript meets standard institutional clearance criteria (${similarityScore}% matched).`,
    };
  }

  const IconComponent = badgeConfig.icon;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer hover:opacity-90 ${badgeConfig.colorClass} ${className}`}
        aria-label={`Originality score: ${badgeConfig.label}`}
      >
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
        <span className="font-semibold tracking-tight">{badgeConfig.label}</span>
      </button>

      {/* Floating detail popover */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg text-xs animate-in fade-in-50 zoom-in-95 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
            <IconComponent className="w-4 h-4 text-primary" />
            <span>{badgeConfig.status}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">{badgeConfig.description}</p>
          <div className="mt-2 pt-2 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>Originality: {roundedScore}%</span>
            <span>Similarity: {similarityScore}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

OriginalityShieldBadge.propTypes = {
  score: PropTypes.number,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
