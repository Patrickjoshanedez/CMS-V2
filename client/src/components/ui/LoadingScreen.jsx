import { memo } from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * LoadingScreen — Alex Warnes CodePen-inspired 3D Dual Orbit Spinner (jXYYKL).
 *
 * Features:
 * - Dual counter-rotating 3D gradient orbital rings with brand color palette
 * - Inner core mask creating dimensional hollow luminous arcs
 * - Ambient radial glow pulse at the vortex center
 * - Fluid indeterminate progress track (GPU-accelerated composite layer)
 * - Configurable `showLogo`:
 *   - false (default): minimal logo-free loader (for dashboard & page views)
 *   - true: includes full brand badge & CMS BukSU header (for initial landing/session opening)
 * - Pure CSS GPU-composited animations (zero JS animation frame overhead)
 * - Memoized component to avoid re-renders during background fetching
 * - Respects prefers-reduced-motion
 *
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - Status message
 * @param {string} [props.subtitle="Capstone Management System"] - Subtitle
 * @param {boolean} [props.fullScreen=true] - Whether to occupy full viewport
 * @param {'sm'|'md'|'lg'} [props.size="md"] - Size preset
 * @param {boolean} [props.showLogo=false] - Whether to render logo badge & brand title
 * @param {string} [props.className=""] - Additional container classes
 */
function LoadingScreenComponent({
  message = 'Loading...',
  subtitle = 'Capstone Management System',
  fullScreen = true,
  size = 'md',
  showLogo = false,
  className = '',
}) {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const spinnerBoxSize = isSmall ? 'h-32 w-32' : isLarge ? 'h-64 w-64' : 'h-48 w-48';
  const ringSize = isSmall ? 'h-28 w-28' : isLarge ? 'h-56 w-56' : 'h-40 w-40';
  const glowSize = isSmall ? 'h-12 w-12' : isLarge ? 'h-28 w-28' : 'h-20 w-20';
  const iconSize = isSmall ? 'h-6 w-6' : isLarge ? 'h-12 w-12' : 'h-8 w-8';
  const badgeSize = isSmall ? 'h-16 w-16' : isLarge ? 'h-24 w-24' : 'h-20 w-20';
  const trackWidth = isSmall ? 'w-32' : isLarge ? 'w-64' : 'w-48';

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
        {/* ── Alex Warnes 3D Orbit Spinner (CodePen jXYYKL) ── */}
        <div className={`cms-spinner-box ${spinnerBoxSize}`} aria-hidden="true">
          <div className={`cms-orbit-glow ${glowSize}`} />
          <div className={`cms-orbit-ring-1 ${ringSize}`}>
            <div className="cms-orbit-core" />
          </div>
          <div className={`cms-orbit-ring-2 ${ringSize}`}>
            <div className="cms-orbit-core" />
          </div>
        </div>

        {/* ── Optional Brand Badge (excluded on dashboard loading, shown only on landing/first opening) ── */}
        {showLogo && (
          <div
            className={`cms-badge-pop relative flex items-center justify-center rounded-2xl border border-border/60 bg-card/90 shadow-lg backdrop-blur-md ${badgeSize}`}
            aria-hidden="true"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
            <GraduationCap
              className={`${iconSize} text-primary drop-shadow-[0_1px_6px_rgba(233,30,99,0.35)]`}
            />
          </div>
        )}

        {/* ── Text & fluid progress track — only on branded landing/session init screen ── */}
        {showLogo && (
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
              <p className="text-xs font-medium text-muted-foreground/70 cms-text-fade">
                {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const LoadingScreen = memo(LoadingScreenComponent);

export default LoadingScreen;
export { LoadingScreen as PageLoadingSpinner, LoadingScreen as LoadingLogo };
