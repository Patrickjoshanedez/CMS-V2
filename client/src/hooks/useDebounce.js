import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating the returned value until the
 * caller has stopped changing `value` for `delay` milliseconds.
 *
 * Commonly used for search-as-you-type inputs to avoid firing
 * API calls on every keystroke.
 *
 * @param {*} value - The raw (fast-changing) value to debounce.
 * @param {number} [delay=500] - Debounce window in ms.
 * @returns {*} The debounced value.
 *
 * @example
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 400);
 *   // debouncedQuery updates 400 ms after the user stops typing
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
