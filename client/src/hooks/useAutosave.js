import { useEffect, useRef, useState } from 'react';

/**
 * useAutosave
 *
 * Automatically debounces draft saves to localStorage and remote endpoints,
 * tracks draft status ('saved' | 'saving' | 'unsaved'), sets a beforeunload
 * exit guard, flushes synchronously on unmount to prevent SPA navigation drops,
 * and cancels in-flight requests with AbortController to prevent race condition rollbacks.
 *
 * @param {string} key - Cache storage key for localStorage
 * @param {any} formData - Current form data to track and persist
 * @param {number} [debounceMs=1000] - Debounce delay in milliseconds
 * @param {(data: any, signal?: AbortSignal) => Promise<void>} [onRemoteSave] - Optional remote save promise
 * @returns {{ saveStatus: 'saved' | 'saving' | 'unsaved', setSaveStatus: Function, status: 'saved' | 'saving' | 'unsaved' }}
 */
export function useAutosave(key, formData, debounceMs = 1000, onRemoteSave) {
  const [saveStatus, setSaveStatus] = useState('saved');
  const isFirstMount = useRef(true);
  const onRemoteSaveRef = useRef(onRemoteSave);
  const latestDataRef = useRef(formData);
  const abortControllerRef = useRef(null);

  latestDataRef.current = formData;

  useEffect(() => {
    onRemoteSaveRef.current = onRemoteSave;
  }, [onRemoteSave]);

  // Flush directly to localStorage if user leaves page or client route changes
  useEffect(() => {
    return () => {
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage &&
          key &&
          latestDataRef.current !== undefined
        ) {
          localStorage.setItem(key, JSON.stringify(latestDataRef.current));
        }
      } catch (err) {
        console.warn('Autosave flush on unmount failed:', err);
      }
    };
  }, [key]);

  // Prevent accidental browser closure with unsaved data
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Debounced Auto-Save Execution
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setSaveStatus('unsaved');

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        // Save locally first to prevent instant network loss failure
        if (typeof window !== 'undefined' && window.localStorage && key) {
          localStorage.setItem(key, JSON.stringify(formData));
        }

        // Optional sync to remote endpoint with in-flight cancellation
        if (onRemoteSaveRef.current) {
          abortControllerRef.current?.abort();
          const controller = new AbortController();
          abortControllerRef.current = controller;

          await onRemoteSaveRef.current(formData, controller.signal);
        }

        setSaveStatus('saved');
      } catch (error) {
        if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.error('Autosave failed:', error);
          setSaveStatus('unsaved');
        }
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formData, key, debounceMs]);

  return { saveStatus, setSaveStatus, status: saveStatus };
}

/**
 * useProposalAutosave
 *
 * Convenience wrapper for proposals scoped by projectId and proposalIndex.
 */
export function useProposalAutosave(projectId, proposalIndex, formData, onRemoteSave) {
  const storageKey = `capstone_draft_${projectId || 'current'}_p${proposalIndex ?? 0}`;
  return useAutosave(storageKey, formData, 1000, onRemoteSave);
}

export default useAutosave;
