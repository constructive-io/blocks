'use client';

import { AuthAccountView } from './auth-account-view';
import type { AuthFeaturePackProps } from './auth-contracts';
import { AuthEntryPanel } from './auth-entry-panel';

export function AuthFeaturePack(props: AuthFeaturePackProps) {
  if (props.view === 'account') {
    return <AuthAccountView {...props} />;
  }

  return <AuthEntryPanel {...props} />;
}

export type {
  AuthAccountData,
  AuthEntryMode,
  AuthFeatureAction,
  AuthFeatureActions,
  AuthFeaturePackProps,
  AuthIdentity,
  AuthSession
} from './auth-contracts';
