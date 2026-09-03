import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { preloadRoute } from '@/utils/routePreload';

/**
 * useNavigateWithLoading — Navigation hook that triggers route prefetching
 * and seamless page transitions when buttons or program logic trigger navigation.
 *
 * @returns {(to: string | number, options?: any) => void}
 */
export function useNavigateWithLoading() {
  const navigate = useNavigate();

  const navigateWithLoading = useCallback(
    (to, options) => {
      if (typeof to === 'string') {
        preloadRoute(to);
      }
      navigate(to, options);
    },
    [navigate],
  );

  return navigateWithLoading;
}

export default useNavigateWithLoading;
