import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { topProgress } from '@/lib/topProgress';

/**
 * Safely extracts location values even when rendered outside a Router.
 */
function useSafeLocation() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
    topProgress.initGlobalListeners();
    const unsubscribe = topProgress.subscribe((s) => {
      setState({ ...s });
    });
    return () => unsubscribe();
  }, []);

  // When location changes (route commits), mark progress as done
  useEffect(() => {
    const currentLoc = `${location.pathname}${location.search}`;
    if (!location.pathname) return;

    // Only complete if location actually changed after mount
    if (prevLocationRef.current !== currentLoc) {
      prevLocationRef.current = currentLoc;
      topProgress.done();
    }
  }, [location.pathname, location.search]);

  if (status === 'idle' && progress === 0) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Loading page"
      className="fixed top-0 left-0 right-0 z-[999999] h-[2.5px] pointer-events-none overflow-hidden"
      style={{
        opacity: status === 'idle' ? 0 : 1,
        transition: status === 'idle' ? 'opacity 250ms ease-out' : 'none',
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple relative"
        style={{
          width: `${progress}%`,
          transition:
            status === 'completing'
              ? 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'width 200ms ease-out',
          boxShadow: '0 0 10px rgba(233, 30, 99, 0.7), 0 0 5px rgba(255, 87, 34, 0.5)',
        }}
      >
        {/* Glowing aura at the leading head of the bar */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/40 shadow-xs" />
      </div>
    </div>
  );
}
