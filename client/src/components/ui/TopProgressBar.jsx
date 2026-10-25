import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { topProgress } from '@/lib/topProgress';

/**
 * Safely extracts location values even when rendered outside a Router.
 */
function useSafeLocation() {
  try {
    const location = useLocation();
    return location || { pathname: '', search: '' };
  } catch {
    return { pathname: '', search: '' };
  }
}

/**
 * TopProgressBar — YouTube / GitHub / NProgress-style route transition progress bar.
 * Pinned to the top of the viewport (`fixed top-0 left-0 right-0 z-[999999]`) and animates
 * across link clicks, programmatic navigations, and lazy-loaded route chunk downloads.
 */
export default function TopProgressBar() {
  const location = useSafeLocation();
  const [{ status, progress }, setState] = useState({
    status: topProgress.status,
    progress: topProgress.progress,
  });
  const prevLocationRef = useRef(`${location.pathname}${location.search}`);

  // Subscribe to topProgress state machine & initialize capture listeners
  useEffect(() => {
    const releaseGlobalListeners = topProgress.initGlobalListeners();
    const unsubscribe = topProgress.subscribe((s) => {
      setState({ ...s });
    });
    return () => {
      unsubscribe();
      releaseGlobalListeners();
    };
  }, []);

  // When location changes (route commits), complete progress if not currently in Suspense
  useEffect(() => {
    const currentLoc = `${location.pathname}${location.search}`;
    if (!location.pathname) return;

    // Only complete if location actually changed after mount
    if (prevLocationRef.current !== currentLoc) {
      prevLocationRef.current = currentLoc;
      // If React is currently in Suspense loading a lazy page chunk, SuspenseProgressBridge
      // will hold the bar active and complete it when the page component actually mounts.
      // Otherwise (for synchronous or preloaded routes), complete cleanly on layout render.
      if (!topProgress.isSuspended) {
        const generation = topProgress.generation;
        let frame = null;
        if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
          frame = requestAnimationFrame(() => {
            topProgress.done(generation);
          });
        } else {
          topProgress.done(generation);
        }

        return () => {
          if (frame !== null) cancelAnimationFrame(frame);
        };
      }
    }
  }, [location.pathname, location.search]);

  if (status === 'idle' && progress === 0) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      {...(status === 'completing'
        ? { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': 100 }
        : {})}
      data-status={status}
      className="cms-route-progress fixed inset-x-0 top-0 z-[999999] h-1 overflow-hidden bg-primary/10 pointer-events-none"
      style={{
        opacity: status === 'idle' ? 0 : 1,
        transition: status === 'idle' ? 'opacity 250ms ease-out' : 'none',
      }}
    >
      <div
        className="cms-route-progress-indicator h-full rounded-r-full bg-primary transition-[width] duration-200 ease-out"
        style={status === 'completing' ? { width: '100%' } : undefined}
      />
    </div>
  );
}
