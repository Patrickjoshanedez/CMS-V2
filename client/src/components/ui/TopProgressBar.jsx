import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

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
 * TopProgressBar — NProgress-style route transition progress bar.
 * Mounts at the very top of the viewport and animates across route changes.
 */
export default function TopProgressBar() {
  const location = useSafeLocation();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!location.pathname) return;

    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  if (!animating) return null;

  return (
    <div
      key={`${location.pathname}${location.search}`}
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div className="h-full w-full bg-gradient-to-r from-brand-orange via-brand-pink to-brand-deep-purple cms-route-progress" />
    </div>
  );
}
