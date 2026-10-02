# Frontend Mythos: State Machine & Data Flow Integrity Spec

## 1. Deterministic Finite State Modeling

### The Combinatorial Explosion Problem
In naive React code, developers often declare independent boolean flags:
```typescript
// ❌ WRONG: Independent boolean flags lead to 2^N invalid states
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isEmpty, setIsEmpty] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
const [data, setData] = useState(null);
```
With 4 boolean flags, there are $2^4 = 16$ possible combinations. This inevitably produces impossible states, such as `{ isLoading: true, isError: true }` or `{ isSuccess: true, isEmpty: true }`, resulting in flickering UI, double renders, and ghost error messages.

### The Mythos Standard: Discriminated Unions
Model all asynchronous data operations as strict, mutually exclusive states:

```typescript
export type AsyncState<T, E = string> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'empty'; data: []; error: null }
  | { status: 'error'; data: T | null; error: E };

export type AsyncAction<T, E = string> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_EMPTY' }
  | { type: 'FETCH_ERROR'; error: E }
  | { type: 'RESET' };

export function asyncStateReducer<T, E = string>(
  state: AsyncState<T, E>,
  action: AsyncAction<T, E>
): AsyncState<T, E> {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading', data: state.data, error: null };
    case 'FETCH_SUCCESS':
      return { status: 'success', data: action.payload, error: null };
    case 'FETCH_EMPTY':
      return { status: 'empty', data: [], error: null };
    case 'FETCH_ERROR':
      return { status: 'error', data: state.data, error: action.error };
    case 'RESET':
      return { status: 'idle', data: null, error: null };
    default:
      return state;
  }
}
```

---

## 2. Enterprise Form Reducer Pattern

Forms must maintain predictable state across validation, dirty checking, touched fields, and submission lifecycle:

```typescript
export interface FormFieldState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

export type FormAction<T> =
  | { type: 'SET_FIELD_VALUE'; field: keyof T; value: any }
  | { type: 'SET_FIELD_TOUCHED'; field: keyof T; isTouched: boolean }
  | { type: 'SET_FIELD_ERROR'; field: keyof T; error: string | undefined }
  | { type: 'SET_ERRORS'; errors: Partial<Record<keyof T, string>> }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_FAILURE'; errors?: Partial<Record<keyof T, string>> }
  | { type: 'RESET_FORM'; initialValues: T };

export function createFormReducer<T>() {
  return function formReducer(
    state: FormFieldState<T>,
    action: FormAction<T>
  ): FormFieldState<T> {
    switch (action.type) {
      case 'SET_FIELD_VALUE':
        return {
          ...state,
          values: { ...state.values, [action.field]: action.value },
          isDirty: true,
        };
      case 'SET_FIELD_TOUCHED':
        return {
          ...state,
          touched: { ...state.touched, [action.field]: action.isTouched },
        };
      case 'SET_FIELD_ERROR':
        return {
          ...state,
          errors: { ...state.errors, [action.field]: action.error },
        };
      case 'SET_ERRORS':
        return {
          ...state,
          errors: action.errors,
        };
      case 'SUBMIT_START':
        return {
          ...state,
          isSubmitting: true,
          submitCount: state.submitCount + 1,
        };
      case 'SUBMIT_SUCCESS':
        return {
          ...state,
          isSubmitting: false,
          isDirty: false,
          errors: {},
        };
      case 'SUBMIT_FAILURE':
        return {
          ...state,
          isSubmitting: false,
          errors: action.errors ?? state.errors,
        };
      case 'RESET_FORM':
        return {
          values: action.initialValues,
          errors: {},
          touched: {},
          isDirty: false,
          isSubmitting: false,
          submitCount: 0,
        };
      default:
        return state;
    }
  };
}
```

---

## 3. Optimistic Mutations with Atomic Rollback

Optimistic mutations provide 0ms perceived response time while guaranteeing consistency on network failure:

```
User Action (Click)
       │
       ▼
1. Capture Snapshot ─────────► [Saved in Memory]
       │
       ▼
2. Apply Optimistic Update ──► [Immediate Local UI Render]
       │
       ▼
3. Dispatch Network Request
       │
  ┌────┴───────────────┐
  │                    │
  ▼ (Success 200)      ▼ (Failure / Network Error)
Settle State     4. Atomic Rollback to Snapshot
                       │
                       ▼
                 Display Error Toast with Retry Trigger
```

### Complete Optimistic Hook Pattern
```typescript
import { useState, useCallback } from 'react';

interface MutationOptions<TData, TVariables> {
  onMutate: (variables: TVariables) => TData;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onError: (error: Error, rollbackData: TData, variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables>(
  currentData: TData,
  setData: (data: TData) => void,
  options: MutationOptions<TData, TVariables>
) {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (variables: TVariables) => {
      // 1. Capture snapshot
      const previousSnapshot = currentData;
      setIsPending(true);

      try {
        // 2. Apply optimistic speculative state
        const optimisticData = options.onMutate(variables);
        setData(optimisticData);

        // 3. Dispatch async operation
        const serverResult = await options.mutationFn(variables);
        setData(serverResult);
        options.onSuccess?.(serverResult, variables);
      } catch (err: any) {
        // 4. Atomic rollback on error
        setData(previousSnapshot);
        options.onError(err, previousSnapshot, variables);
      } finally {
        setIsPending(false);
      }
    },
    [currentData, setData, options]
  );

  return { mutate, isPending };
}
```

---

## 4. Real-time Stream & Sync UX State Machine

Real-time connections (WebSockets or Server-Sent Events) must never freeze or silently fail. They require an explicit 6-phase state machine:

```
[idle] ──► [connecting] ──► [connected]
                 ▲                │
                 │                ▼ (Network Interruption)
                 └────── [reconnecting (backoff + jitter)]
                                  │
                                  ▼ (Max Retries Exceeded)
                            [dead-letter / fallback to polling]
```

### State Machine Definition
```typescript
export type ConnectionState =
  | { status: 'idle' }
  | { status: 'connecting'; attempt: number }
  | { status: 'connected'; latencyMs: number; connectedAt: number }
  | { status: 'reconnecting'; attempt: number; nextRetryMs: number }
  | { status: 'disconnected'; reason: string }
  | { status: 'dead-letter'; error: string; fallbackActive: boolean };

export function calculateBackoffWithJitter(
  attempt: number,
  baseMs = 1000,
  maxMs = 30000
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = exponential * 0.2 * (Math.random() * 2 - 1); // ±20% jitter
  return Math.floor(exponential + jitter);
}
```

### UX Presentation Rules for Streaming
* **Subtle Non-Blocking Indicator**: While in `reconnecting` state, display a discreet amber status indicator (`border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`) without blocking user interaction on already-loaded data.
* **Dead-Letter Recovery**: If maximum retry attempts fail, transition to `dead-letter`, display an accessible error banner with a manual "Reconnect Now" button, and gracefully fall back to HTTP interval polling.
