import { useReducer, useCallback, useRef } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type AsyncState<T, E = Error> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'empty'; data: []; error: null }
  | { status: 'error'; data: T | null; error: E };

type Action<T, E = Error> =
  | { type: 'START' }
  | { type: 'OPTIMISTIC_UPDATE'; payload: T }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'EMPTY' }
  | { type: 'ERROR'; error: E; rollbackData?: T | null }
  | { type: 'RESET' };

function optimisticReducer<T, E = Error>(
  state: AsyncState<T, E>,
  action: Action<T, E>,
): AsyncState<T, E> {
  switch (action.type) {
    case 'START':
      return { status: 'loading', data: state.data, error: null };
    case 'OPTIMISTIC_UPDATE':
      return { status: 'loading', data: action.payload, error: null };
    case 'SUCCESS':
      return { status: 'success', data: action.payload, error: null };
    case 'EMPTY':
      return { status: 'empty', data: [], error: null };
    case 'ERROR':
      return {
        status: 'error',
        data: action.rollbackData !== undefined ? action.rollbackData : state.data,
        error: action.error,
      };
    case 'RESET':
      return { status: 'idle', data: null, error: null };
    default:
      return state;
  }
}

export function useOptimisticReducer<T, TVariables = any, E = Error>(
  initialState: AsyncState<T, E> = { status: 'idle', data: null, error: null },
) {
  const [state, dispatch] = useReducer(optimisticReducer<T, E>, initialState);
  const snapshotRef = useRef<T | null>(state.data);

  const executeOptimisticMutation = useCallback(
    async (
      variables: TVariables,
      optimisticFn: (current: T | null, vars: TVariables) => T,
      mutationFn: (vars: TVariables) => Promise<T>,
      callbacks?: {
        onSuccess?: (result: T) => void;
        onError?: (error: E, rollbackValue: T | null) => void;
      },
    ) => {
      // 1. Snapshot prior state
      const previousData = state.data;
      snapshotRef.current = previousData;

      // 2. Apply optimistic local update
      const optimisticData = optimisticFn(previousData, variables);
      dispatch({ type: 'OPTIMISTIC_UPDATE', payload: optimisticData });

      try {
        // 3. Dispatch async network request
        const result = await mutationFn(variables);
        dispatch({ type: 'SUCCESS', payload: result });
        callbacks?.onSuccess?.(result);
        return result;
      } catch (err: any) {
        // 4. Atomic rollback on failure
        dispatch({
          type: 'ERROR',
          error: err,
          rollbackData: previousData,
        });
        callbacks?.onError?.(err, previousData);
        throw err;
      }
    },
    [state.data],
  );

  return {
    state,
    dispatch,
    executeOptimisticMutation,
  };
}
