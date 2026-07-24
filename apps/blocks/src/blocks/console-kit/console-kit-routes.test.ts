import { describe, expect, it } from 'vitest';

import {
  consoleKitRouteKey,
  defaultConsoleKitRoute,
  type ConsoleKitRoute
} from './console-kit-routes';
import {
  authEntryModeFromFlow,
  authFlowFromEntryMode,
  authRouteFromFlow,
  createConsoleKitStore
} from './store';

describe('Console Kit semantic routes', () => {
  it('provides a stable landing route for every installable feature', () => {
    expect([
      'data',
      'auth',
      'users',
      'organizations',
      'storage',
      'billing',
      'notifications'
    ].map((feature) => defaultConsoleKitRoute(
      feature as ConsoleKitRoute['feature']
    ))).toEqual([
      { feature: 'data', screen: 'tables' },
      { feature: 'auth', screen: 'entry' },
      { feature: 'users', screen: 'members' },
      { feature: 'organizations', screen: 'organizations' },
      { feature: 'storage', screen: 'buckets' },
      { feature: 'billing', screen: 'overview' },
      { feature: 'notifications', screen: 'inbox' }
    ]);
  });

  it('keeps nested detail routes distinct and credential-free', () => {
    const first: ConsoleKitRoute = {
      feature: 'organizations',
      screen: 'member',
      organizationId: 'organization-1',
      membershipId: 'membership-1'
    };
    const second: ConsoleKitRoute = {
      feature: 'users',
      screen: 'profile',
      profileId: 'profile-1'
    };

    expect(consoleKitRouteKey(first)).toBe(
      'organizations:member:organization-1:membership-1'
    );
    expect(consoleKitRouteKey(second)).toBe('users:profile:profile-1');
    expect(JSON.stringify([first, second])).not.toMatch(/token|credential/u);
  });

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
