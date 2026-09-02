import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useNavigationSkeleton — triggers a skeleton state on every sidebar navigation.
 *
 * On each pathname change, `isSkeleton` flips to `true` for `durationMs`
 * milliseconds, then back to `false`.  This gives all pages a consistent
 * skeleton transition instead of a jarring instant content swap.
 *
 * The very first render is NOT treated as navigation (mounting the layout
 * after login should just show the real page immediately).
 *
 * @param {number} [durationMs=180] — how long to show the skeleton (ms)
 * @returns {{ isSkeleton: boolean, pathname: string }}
 */
export function useNavigationSkeleton(durationMs = 180) {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);
  const [isSkeleton, setIsSkeleton] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Skip skeleton on initial mount — only fire on actual navigations
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    // Clear any existing timer before starting a new one
    if (timerRef.current) clearTimeout(timerRef.current);

    setIsSkeleton(true);
    timerRef.current = setTimeout(() => {
      setIsSkeleton(false);
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, durationMs]);

  return { isSkeleton, pathname };
}

export default useNavigationSkeleton;
