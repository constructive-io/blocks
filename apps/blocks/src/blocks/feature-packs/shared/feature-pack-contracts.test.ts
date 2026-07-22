import { describe, expect, it } from 'vitest';

import {
  canPerform,
  normalizeFeaturePackError
} from './feature-pack-contracts';

describe('feature pack contracts', () => {
  it('allows only explicitly granted actions', () => {
    const policy = { invite: true, remove: false } as const;
    expect(canPerform<'invite' | 'remove'>(policy, 'invite')).toBe(true);
    expect(canPerform<'invite' | 'remove'>(policy, 'remove')).toBe(false);
    expect(canPerform(undefined, 'invite')).toBe(false);
  });

  it('normalizes unknown errors without leaking arbitrary fields', () => {
    expect(
      normalizeFeaturePackError(
        { message: 'Denied', code: 'FORBIDDEN', retryable: false, token: 'secret' },
        'Failed'
      )
    ).toEqual({ message: 'Denied', code: 'FORBIDDEN', retryable: false });
    expect(normalizeFeaturePackError('nope', 'Failed')).toEqual({
      message: 'Failed'
    });
  });
});
