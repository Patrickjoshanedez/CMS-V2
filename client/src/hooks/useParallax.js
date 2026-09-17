import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useParallax — High-performance 60fps multi-depth parallax & 3D tilt hook.
 *
 * Tracks mouse coordinates normalized to [-1, 1] relative to viewport or target container,
 * with buttery-smooth linear interpolation (LERP), tilt angles, and CSS variables for
 * specular reflection highlights.
 *
 * Automatically respects `prefers-reduced-motion`.
 *
 * @param {Object} options
 * @param {number} options.ease - LERP easing factor (0.05 - 0.2). Default 0.08.
 * @param {boolean} options.disabled - Force disable parallax.
 * @returns {Object} { ref, coords, getTransform, getStyle }
 */
export function useParallax({ ease = 0.08, disabled = false } = {}) {
  const containerRef = useRef(null);

  // Target mouse coordinates [-1, 1]
  const targetX = useRef(0);
  const targetY = useRef(0);

  // Interpolated coordinates
  const currentX = useRef(0);
  const currentY = useRef(0);

  const animationFrameId = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  // Check user preference for reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isInactive = disabled || prefersReducedMotion;

  const handleMouseMove = useCallback(
    (e) => {
      if (isInactive) return;

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        // Normalize between -1 and 1 relative to container center
        targetX.current = Math.max(-1, Math.min(1, (clientX / rect.width) * 2 - 1));
        targetY.current = Math.max(-1, Math.min(1, (clientY / rect.height) * 2 - 1));
      } else {
        // Fallback to window viewport
        const width = window.innerWidth || 1;
        const height = window.innerHeight || 1;
        targetX.current = Math.max(-1, Math.min(1, (e.clientX / width) * 2 - 1));
        targetY.current = Math.max(-1, Math.min(1, (e.clientY / height) * 2 - 1));
      }
    },
    [isInactive],
  );

  const handleMouseLeave = useCallback(() => {
    targetX.current = 0;
    targetY.current = 0;
  }, []);

  useEffect(() => {
    if (isInactive) {
      setCoords({ x: 0, y: 0 });
      return;
    }

    const animate = () => {
      // Linear interpolation: current + (target - current) * ease
      currentX.current += (targetX.current - currentX.current) * ease;
      currentY.current += (targetY.current - currentY.current) * ease;

      // Small threshold to avoid continuous setState when nearly static
      const diff =
        Math.abs(targetX.current - currentX.current) + Math.abs(targetY.current - currentY.current);

      if (diff > 0.0005) {
        setCoords({
          x: Number(currentX.current.toFixed(4)),
          y: Number(currentY.current.toFixed(4)),
        });
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    const targetEl = containerRef.current || window;
    targetEl.addEventListener('mousemove', handleMouseMove, { passive: true });
    if (containerRef.current) {
      containerRef.current.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      targetEl.removeEventListener('mousemove', handleMouseMove);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [ease, handleMouseMove, handleMouseLeave, isInactive]);

  /**
   * Helper to compute 3D tilt / translate transform string
   * @param {number} depth - Movement depth multiplier (e.g. 10 to 40)
   * @param {number} maxRotate - Max tilt degrees (e.g. 5 to 15)
   */
  const getTransform = useCallback(
    (depth = 15, maxRotate = 8) => {
      if (isInactive) return undefined;
      const rotateX = -coords.y * maxRotate;
      const rotateY = coords.x * maxRotate;
      const translateX = coords.x * depth;
      const translateY = coords.y * depth;

      return `perspective(1000px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    [coords, isInactive],
  );

  /**
   * Helper to get CSS style object with dynamic specular lighting coordinates
   */
  const getStyle = useCallback(
    (depth = 15, maxRotate = 8) => {
      const transform = getTransform(depth, maxRotate);
      // Normalized to 0% - 100% for specular highlights
      const lightX = `${((coords.x + 1) / 2) * 100}%`;
      const lightY = `${((coords.y + 1) / 2) * 100}%`;

      return {
        transform,
        '--mouse-x': lightX,
        '--mouse-y': lightY,
        transition: isInactive ? 'transform 0.3s ease-out' : undefined,
      };
    },
    [coords, getTransform, isInactive],
  );

  return {
    ref: containerRef,
    coords,
    getTransform,
    getStyle,
  };
}

export default useParallax;
