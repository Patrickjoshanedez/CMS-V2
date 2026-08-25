import { GraduationCap } from 'lucide-react';

/**
 * LoadingScreen — CodePen-inspired staggered dot cascade loader.
 *
 * Animation inspired by: css-loaders.com / Temani Afif's single-element
 * dot patterns & Noel Delgado's orbit dot technique on CodePen.
 *
 * Features:
 * - 5 dots in a bouncing wave cascade with staggered animation-delay
 * - Brand gradient color applied across the dot row (orange → pink → purple)
 * - Fluid indeterminate progress track (moving gradient blob)
 * - Subtle pulsing badge icon centered below the dots
 * - Respects prefers-reduced-motion
 *
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - Status message
 * @param {string} [props.subtitle="Capstone Management System"] - Subtitle
 * @param {boolean} [props.fullScreen=true] - Whether to occupy full viewport
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size preset
 * @param {string} [props.className=""] - Additional container classes
 */
export default function LoadingScreen({
  message = 'Loading...',
  subtitle = 'Capstone Management System',
  fullScreen = true,
  size = 'md',
  className = '',
}) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const iconSize = isSmall ? 'h-6 w-6' : isLarge ? 'h-10 w-10' : 'h-8 w-8';
  const badgeSize = isSmall ? 'h-12 w-12' : isLarge ? 'h-20 w-20' : 'h-16 w-16';
  const dotSize = isSmall ? 'h-2 w-2' : isLarge ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5';
  const dotGap = isSmall ? 'gap-1.5' : isLarge ? 'gap-2.5' : 'gap-2';
  const trackWidth = isSmall ? 'w-28' : isLarge ? 'w-52' : 'w-40';

  // 5 colour stops sampled from the brand orange→pink→purple gradient
  const DOT_COLORS = [
    'cms-dot-color-1',
    'cms-dot-color-2',
    'cms-dot-color-3',
    'cms-dot-color-4',
    'cms-dot-color-5',
  ];
  const DOT_DELAYS = ['0ms', '100ms', '200ms', '300ms', '400ms'];

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md'
    : 'flex min-h-[300px] w-full flex-col items-center justify-center py-10';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={`${containerClasses} ${className}`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* ── Bouncing dot wave ── */}
        <div className={`flex items-end ${dotGap}`} aria-hidden="true">
          {DOT_COLORS.map((colorClass, i) => (
            <span
              key={i}
              className={`cms-dot-wave ${dotSize} ${colorClass} block rounded-full`}
              style={{ animationDelay: DOT_DELAYS[i] }}
            />
          ))}
        </div>

        {/* ── Brand badge icon ── */}
        <div
          className={`cms-badge-pop relative flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-md ${badgeSize}`}
          aria-hidden="true"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
          <GraduationCap
            className={`${iconSize} text-primary drop-shadow-[0_1px_6px_rgba(233,30,99,0.35)]`}
          />
        </div>

        {/* ── Text & fluid progress track ── */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
              CMS
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
              BukSU
            </span>
          </div>

          {subtitle && (
            <p className="-mt-1 text-xs font-medium tracking-wide text-muted-foreground/60">
              {subtitle}
            </p>
          )}

          {/* Fluid indeterminate track — CodePen-style moving blob */}
          <div
            className={`relative h-1 ${trackWidth} overflow-hidden rounded-full bg-muted/50`}
            aria-hidden="true"
          >
            <div className="cms-fluid-track absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple" />
          </div>

          {message && (
            <p className="text-xs font-medium text-muted-foreground/70 cms-text-fade">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { LoadingScreen as PageLoadingSpinner, LoadingScreen as LoadingLogo };
