import { useState } from 'react';

/**
 * Keeps explicit selection state while safely deriving a fallback selection
 * from current data without using effect-driven state synchronization.
 */
export default function useResolvedSelection(initialValue = null, fallbackValue = null) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const resolvedValue = selectedValue || fallbackValue || null;

  return {
    selectedValue,
    resolvedValue,
    setSelectedValue,
  };
}
