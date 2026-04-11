import { describe, expect, it } from 'vitest';
import { teamKeys } from './useTeams';

describe('teamKeys.my', () => {
  it('scopes My Team cache key by user id', () => {
    const userAKey = teamKeys.my('user-a');
    const userBKey = teamKeys.my('user-b');

    expect(userAKey).toEqual(['teams', 'my', 'user-a']);
    expect(userBKey).toEqual(['teams', 'my', 'user-b']);
    expect(userAKey).not.toEqual(userBKey);
  });

  it('returns stable key for the same user id', () => {
    expect(teamKeys.my('user-a')).toEqual(teamKeys.my('user-a'));
  });
});
