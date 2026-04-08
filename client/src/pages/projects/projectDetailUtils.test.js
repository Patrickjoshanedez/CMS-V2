import { describe, expect, it } from 'vitest';
import { getProjectResolveErrorMessage } from './projectDetailUtils';

describe('getProjectResolveErrorMessage', () => {
  it('prefers the backend error message when present', () => {
    const error = {
      response: {
        data: {
          error: {
            message: 'No pending title modification request to resolve.',
          },
        },
      },
    };

    expect(getProjectResolveErrorMessage(error)).toBe(
      'No pending title modification request to resolve.',
    );
  });

  it('falls back to a top-level response message', () => {
    const error = {
      response: {
        data: {
          message: 'Request rejected by the server.',
        },
      },
    };

    expect(getProjectResolveErrorMessage(error)).toBe('Request rejected by the server.');
  });

  it('falls back to the error message string', () => {
    expect(getProjectResolveErrorMessage(new Error('Network Error'))).toBe('Network Error');
  });

  it('uses the provided fallback when no message exists', () => {
    expect(getProjectResolveErrorMessage({}, 'Fallback message')).toBe('Fallback message');
  });
});
