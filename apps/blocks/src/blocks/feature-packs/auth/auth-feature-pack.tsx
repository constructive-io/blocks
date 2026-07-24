'use client';

import { AuthAccountView } from './auth-account-view';
import type { AuthFeaturePackComponentProps } from './auth-contracts';
import { AuthEntryPanel } from './auth-entry-panel';

export function AuthFeaturePack(props: AuthFeaturePackComponentProps) {
  if (props.view === 'account') {
    return <AuthAccountView {...props} />;
  }

  return <AuthEntryPanel {...props} />;
}

export type {
  AuthAccountData,
  AuthAccountNavigationProps,
  AuthAccountSection,
  AuthChallengeContribution,
  AuthChallengeDescriptor,
  AuthChallengeResponse,
  AuthConnectedAccount,
  AuthEntryMode,
  AuthFeatureAction,
  AuthFeatureActions,
  AuthFeatureNotice,
  AuthFeaturePackComponentProps,
  AuthFeaturePackProps,
  AuthFlowState,
  AuthIdentity,
  AuthMethod,
  AuthPasswordPolicy,
  AuthSession
} from './auth-contracts';
