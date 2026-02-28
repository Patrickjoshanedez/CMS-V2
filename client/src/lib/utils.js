import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function that merges Tailwind CSS classes with clsx.
 * Handles conditional classes and resolves Tailwind conflicts.
 * @param  {...any} inputs - Class values to merge.
 * @returns {string} Merged class string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
