import { useState } from 'react';

/**
 * Local draft value that falls back to a source value until the user edits.
 * Useful for form fields fed by async data without effect-based syncing.
 */
export default function useMirroredDraftValue(sourceValue = '') {
  const [draftValue, setDraftValue] = useState(null);
  const resolvedValue = draftValue ?? sourceValue ?? '';

  const resetDraft = () => {
    setDraftValue(null);
  };

  return {
    draftValue,
    resolvedValue,
    setDraftValue,
    resetDraft,
  };
}
