import type { StateCreator } from 'zustand/vanilla';

import {
  defaultConsoleKitRoute,
  type ConsoleKitAuthRoute,
  type ConsoleKitRoute
} from '../console-kit-routes';

export type ConsoleKitAuthEntryMode =
  | 'sign-in'
  | 'sign-up'
  | 'recover-password'
  | 'reset-password';

export type ConsoleKitAuthFlowState =
  | Readonly<{ status: 'entry'; mode: 'sign-in' | 'sign-up' }>
  | Readonly<{ status: 'recovery'; phase: 'request' | 'sent' }>
  | Readonly<{
      status: 'callback';
      kind: 'account-deletion' | 'email-verification' | 'password-reset';
      phase: 'ready' | 'processing' | 'success' | 'invalid' | 'expired' | 'reused' | 'error';
      message?: string;
    }>
  | Readonly<{
      status: 'account';
      screen: 'overview' | 'security' | 'connected-accounts' | 'devices' | 'sessions';
    }>
  | Readonly<{
      status: 'step-up';
      method: 'password';
      reason: 'account-deletion' | 'connected-account-disconnect' | string;
    }>
  | Readonly<{
      status: 'challenge';
      method: 'email-otp' | 'sms-otp' | 'totp' | 'passkey' | 'oauth';
      step: string;
    }>;

export const INITIAL_AUTH_FLOW: ConsoleKitAuthFlowState = {
  status: 'entry',
  mode: 'sign-in'
};

export function authFlowFromEntryMode(
  mode: ConsoleKitAuthEntryMode
): ConsoleKitAuthFlowState {
  switch (mode) {
    case 'sign-in':
    case 'sign-up':
      return { status: 'entry', mode };
    case 'recover-password':
      return { status: 'recovery', phase: 'request' };
    case 'reset-password':
      return {
        status: 'callback',
        kind: 'password-reset',
        phase: 'ready'
      };
  }
}

export function authEntryModeFromFlow(
  flow: ConsoleKitAuthFlowState
): ConsoleKitAuthEntryMode {
  switch (flow.status) {
    case 'entry':
      return flow.mode;
    case 'recovery':
      return 'recover-password';
    case 'callback':
      return flow.kind === 'password-reset' ? 'reset-password' : 'sign-in';
    case 'account':
    case 'step-up':
    case 'challenge':
      return 'sign-in';
  }
}

export function authRouteFromFlow(
  flow: ConsoleKitAuthFlowState
): ConsoleKitAuthRoute {
  switch (flow.status) {
    case 'entry':
      return { feature: 'auth', screen: 'entry' };
    case 'recovery':
      return { feature: 'auth', screen: 'recovery' };
    case 'callback':
      return { feature: 'auth', screen: 'callback' };
    case 'account':
      return {
        feature: 'auth',
        screen: flow.screen === 'overview' ? 'account' : flow.screen
      };
    case 'step-up':
    case 'challenge':
      return { feature: 'auth', screen: 'security' };
  }
}

function authFlowFromRoute(
  route: ConsoleKitAuthRoute,
  current: ConsoleKitAuthFlowState
): ConsoleKitAuthFlowState {
  switch (route.screen) {
    case 'entry':
      return current.status === 'entry'
        ? current
        : { status: 'entry', mode: 'sign-in' };
    case 'recovery':
      return current.status === 'recovery'
        ? current
        : { status: 'recovery', phase: 'request' };
    case 'callback':
      return current;
    case 'account':
      return { status: 'account', screen: 'overview' };
    case 'security':
      return current.status === 'step-up' || current.status === 'challenge'
        ? current
        : { status: 'account', screen: 'security' };
    case 'connected-accounts':
    case 'devices':
    case 'sessions':
      return { status: 'account', screen: route.screen };
  }
}

export type ConsoleKitNavigationSlice = {
  route: ConsoleKitRoute;
  authFlow: ConsoleKitAuthFlowState;
  setRoute: (route: ConsoleKitRoute) => void;
  setAuthFlow: (flow: ConsoleKitAuthFlowState) => void;
};

export function createConsoleKitNavigationSlice(
  initialRoute: ConsoleKitRoute
): StateCreator<
  ConsoleKitNavigationSlice,
  [],
  [],
  ConsoleKitNavigationSlice
> {
  const initialAuthFlow = initialRoute.feature === 'auth'
    ? authFlowFromRoute(initialRoute, INITIAL_AUTH_FLOW)
    : INITIAL_AUTH_FLOW;
  return (set) => ({
    route: { ...initialRoute },
    authFlow: { ...initialAuthFlow },
    setRoute: (route) => set((state) => ({
      route,
      authFlow: route.feature === 'auth'
        ? authFlowFromRoute(route, state.authFlow)
        : state.authFlow
    })),
    setAuthFlow: (authFlow) => set({
      authFlow,
      route: authRouteFromFlow(authFlow)
    })
  });
}

export function normalizeInitialConsoleKitRoute(
  route: ConsoleKitRoute | ConsoleKitRoute['feature']
): ConsoleKitRoute {
  return typeof route === 'string' ? defaultConsoleKitRoute(route) : route;
}
