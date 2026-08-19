import { GraduationCap } from 'lucide-react';

/**
 * LoadingScreen / BrandLoadingSpinner
 *
 * Premium centered loading indicator with animated CMS academic logo,
 * glowing orbital rings, brand gradient accents, and shimmer progress.
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

  const badgeDimensions = isSmall ? 'h-14 w-14' : isLarge ? 'h-24 w-24' : 'h-20 w-20';
  const iconDimensions = isSmall ? 'h-7 w-7' : isLarge ? 'h-12 w-12' : 'h-10 w-10';
  const ringSize = isSmall ? 'w-24 h-24' : isLarge ? 'w-36 h-36' : 'w-32 h-32';

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-md transition-all duration-300'
    : 'flex min-h-[300px] w-full flex-col items-center justify-center py-12 transition-all duration-300';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={`${containerClasses} ${className}`}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* ── Outer glowing gradient aura ── */}
        <div
          className={`absolute rounded-full bg-gradient-to-tr from-brand-orange/30 via-brand-pink/30 to-brand-deep-purple/30 blur-2xl transition-all duration-700 ${ringSize} opacity-70 dark:opacity-50`}
        />

        {/* ── Outer animated orbital rings ── */}
        <div className={`relative flex items-center justify-center ${ringSize}`}>
          {/* Ring 1 — clockwise slow spin with gradient border */}
          <div className="cms-ring-spin absolute inset-0 rounded-full border border-dashed border-primary/30 dark:border-primary/40" />

          {/* Ring 2 — counter-clockwise orbit with accent points */}
          <div className="cms-ring-spin-reverse absolute inset-1.5 rounded-full border border-brand-pink/25 border-t-brand-orange/80 dark:border-brand-pink/35 dark:border-t-brand-orange" />

          {/* Inner badge with floating logo & shadow */}
          <div
            className={`cms-logo-pulse relative flex items-center justify-center rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl backdrop-blur-md dark:border-border/60 dark:bg-card/80 ${badgeDimensions}`}
          >
            {/* Background subtle sheen */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            {/* Graduation Cap Logo with gradient stroke / fill */}
            <GraduationCap
              className={`${iconDimensions} text-primary drop-shadow-[0_2px_8px_rgba(233,30,99,0.3)] transition-transform duration-300`}
            />
          </div>
        </div>

        {/* ── Brand text & dynamic loading indicator ── */}
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple bg-clip-text text-lg sm:text-xl font-extrabold tracking-tight text-transparent drop-shadow-sm">
              CMS
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
              BukSU
            </span>
          </div>

          {subtitle && (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground/75 tracking-wide">
              {subtitle}
            </p>
          )}

          {/* ── Animated Shimmer Progress Bar ── */}
          <div className="mt-4 h-1.5 w-36 sm:w-44 overflow-hidden rounded-full bg-muted/60 border border-border/40">
            <div className="cms-shimmer-bar h-full w-full rounded-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple" />
          </div>

          {/* Status Message */}
          {message && (
            <p className="mt-2.5 text-xs font-medium text-muted-foreground animate-pulse">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export { LoadingScreen as PageLoadingSpinner, LoadingScreen as LoadingLogo };
