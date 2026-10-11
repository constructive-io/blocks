import { describe, expect, it } from 'vitest';

import {
  authEntryModeFromFlow,
  authFlowFromEntryMode,
  authRouteFromFlow,
  createConsoleKitStore
} from './store';

describe('Console Kit semantic routes', () => {
  it('supports internal nested navigation and resets it with tenant scope', () => {
    const store = createConsoleKitStore({
      feature: 'users',
      screen: 'members'
    });
    store.getState().setRoute({
      feature: 'users',
      screen: 'member',
      membershipId: 'membership-1'
    });

    expect(store.getState().route).toEqual({
      feature: 'users',
      screen: 'member',
      membershipId: 'membership-1'
    });

    store.getState().synchronizeScope('database-2', {
      status: 'anonymous',
      identity: {
        kind: 'anonymous',
        cachePartition: 'anonymous-2'
      }
    });

    expect(store.getState().route).toEqual({
      feature: 'users',
      screen: 'members'
    });
  });
});

describe('Console Kit auth flow state', () => {
  it('maps legacy entry intents only at the feature adapter boundary', () => {
    expect(authFlowFromEntryMode('sign-up')).toEqual({
      status: 'entry',
      mode: 'sign-up'
    });
    expect(authFlowFromEntryMode('recover-password')).toEqual({
      status: 'recovery',
      phase: 'request'
    });
    expect(authEntryModeFromFlow({
      status: 'callback',
      kind: 'password-reset',
      phase: 'processing'
    })).toBe('reset-password');
    expect(authEntryModeFromFlow({
      status: 'challenge',
      method: 'passkey',
      step: 'assertion'
    })).toBe('sign-in');
    expect(authRouteFromFlow({
      status: 'account',
      screen: 'connected-accounts'
    })).toEqual({
      feature: 'auth',
      screen: 'connected-accounts'
    });
  });

  it('keeps auth navigation and the auth state machine aligned', () => {
    const store = createConsoleKitStore('auth');

    store.getState().setAuthFlow({
      status: 'callback',
      kind: 'email-verification',
      phase: 'processing'
    });
    expect(store.getState().route).toEqual({
      feature: 'auth',
      screen: 'callback'
    });

    store.getState().setRoute({ feature: 'auth', screen: 'security' });
    expect(store.getState().authFlow).toEqual({
      status: 'account',
      screen: 'security'
    });

    store.getState().setAuthFlow({
      status: 'challenge',
      method: 'passkey',
      step: 'assertion'
    });
    store.getState().setRoute({ feature: 'auth', screen: 'security' });
    expect(store.getState().authFlow).toEqual({
      status: 'challenge',
      method: 'passkey',
      step: 'assertion'
    });
  });
});
