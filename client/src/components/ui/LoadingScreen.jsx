import { memo } from 'react';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingScreen — Trhino CodePen-inspired Beam & Aperture Cinematic Loader (jOQJPQ).
 *
 * Visual Sequence:
 * 1. Horizontal Beam: A high-energy laser line expands outward from center (0% -> 100% width).
 * 2. Vertical Aperture: The beam splits and expands vertically (height 3px -> 100%),
 *    revealing the institutional portal canvas.
 * 3. Content Reveal: BukSU collegiate seal, typography, and fluid shimmer progress bar
 *    gracefully slide up and fade into view.
 *
 * Dual-Mode Visual Themes:
 * - Dark Mode: Deep university midnight space (#071329), radiant Academic Gold beam flares
 *   (#E5A823), gold-to-navy progress shimmer, and warm halo backlights.
 * - Light Mode: Crisp collegiate white canvas, sharp BukSU Royal Blue beam flares
 *   (#1A448A), royal blue-to-gold progress shimmer, and atmospheric sky accents.
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
  const iconSize = isSmall ? 'h-6 w-6' : isLarge ? 'h-12 w-12' : 'h-8 w-8';
  const badgeSize = isSmall ? 'h-16 w-16' : isLarge ? 'h-24 w-24' : 'h-20 w-20';
  const trackWidth = isSmall ? 'w-32' : isLarge ? 'w-64' : 'w-48';

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/95 dark:bg-[#020617]/98 backdrop-blur-md'
    : 'relative flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-slate-900/90 dark:bg-[#030816]/95 py-10';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(containerClasses, className)}
    >
      {/* ── Trhino CodePen Beam Aperture (jOQJPQ) ── */}
      <div
        className={cn(
          'cms-beam-aperture border-y flex flex-col items-center justify-center',
          /* Light Mode: Crisp white portal with BukSU Royal Blue flares */
          'bg-white border-[#1A448A]/30 shadow-[0_20px_60px_-15px_rgba(26,68,138,0.25)]',
          /* Dark Mode: Deep university midnight portal with Academic Gold flares */
          'dark:bg-[#071329] dark:border-[#E5A823]/40 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]',
        )}
        aria-hidden="true"
      >
        {/* Top & Bottom Horizontal Laser Beam Flares (CodePen Slit Edges) */}
        <div className="cms-beam-flare absolute top-0 inset-x-0 h-[2px] bg-[#1A448A] dark:bg-[#E5A823] shadow-[0_0_12px_rgba(26,68,138,0.8)] dark:shadow-[0_0_14px_rgba(229,168,35,0.85)]" />
        <div className="cms-beam-flare absolute bottom-0 inset-x-0 h-[2px] bg-[#1A448A] dark:bg-[#E5A823] shadow-[0_0_12px_rgba(26,68,138,0.8)] dark:shadow-[0_0_14px_rgba(229,168,35,0.85)]" />

        {/* ── Branded Content Reveal (Landing & Session Initialization) ── */}
        {showLogo ? (
          <div className="cms-content-reveal flex flex-col items-center justify-center px-6 py-8 max-w-md text-center z-10">
            {/* University Seal / Academic Icon wrapped in spinnerBox for size preset matching */}
            <div
              className={cn(
                'cms-spinner-box relative flex items-center justify-center mb-2',
                spinnerBoxSize,
              )}
            >
              <div
                className={cn(
                  'cms-badge-pop relative flex items-center justify-center rounded-2xl shadow-lg border transition-all duration-300',
                  badgeSize,
                  'border-[#1A448A]/20 bg-white/95 text-[#1A448A] shadow-blue-900/10',
                  'dark:border-[#E5A823]/30 dark:bg-slate-900/90 dark:text-[#E5A823] dark:shadow-[0_0_25px_rgba(229,168,35,0.25)]',
                )}
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent" />
                <GraduationCap className={cn(iconSize, 'drop-shadow-sm')} />
              </div>
            </div>

            {/* Brand Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xl font-black tracking-tight text-[#1A448A] dark:text-[#E5A823]">
                CMS
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#1A448A]/25 text-[#1A448A] dark:border-[#E5A823]/30 dark:text-[#E5A823]/90">
                BukSU
              </span>
            </div>

            {/* Subtitle */}
            {subtitle && (
              <h2 className="text-xs font-semibold tracking-wide text-slate-700 dark:text-slate-300 mb-4">
                {subtitle}
              </h2>
            )}

            {/* Fluid Shimmer Progress Track */}
            <div
              className={cn(
                'relative h-1.5 overflow-hidden rounded-full mb-3',
                trackWidth,
                'bg-slate-200 dark:bg-white/10',
              )}
            >
              <div
                className={cn(
                  'cms-fluid-track',
                  'bg-gradient-to-r from-[#1A448A] via-[#2563EB] to-[#E5A823]',
                  'dark:from-[#F5C253] dark:via-[#E5A823] dark:to-[#1A448A]',
                )}
              />
            </div>

            {/* Dynamic Status Message */}
            {message && (
              <p className="cms-text-fade font-mono text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-400">
                {message}
              </p>
            )}

            {/* Institutional Coordinates */}
            <div className="mt-6 flex items-center gap-2 text-[10px] font-mono tracking-wider opacity-60 text-slate-500 dark:text-slate-400">
              <span>8.156° N, 125.127° E</span>
              <span>&bull;</span>
              <span>CHED CMO 25</span>
            </div>
          </div>
        ) : (
          /* ── Minimal Beam Aperture Spinner (for in-page / dashboard views without text) ── */
          <div className="cms-content-reveal flex flex-col items-center justify-center">
            <div
              className={cn(
                'cms-spinner-box relative flex items-center justify-center',
                spinnerBoxSize,
              )}
            >
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl border border-[#1A448A]/20 dark:border-[#E5A823]/30 bg-white/90 dark:bg-slate-900/90 shadow-md">
                <GraduationCap className="h-6 w-6 text-[#1A448A] dark:text-[#E5A823] animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const LoadingScreen = memo(LoadingScreenComponent);

export default LoadingScreen;
export { LoadingScreen as PageLoadingSpinner, LoadingScreen as LoadingLogo };
