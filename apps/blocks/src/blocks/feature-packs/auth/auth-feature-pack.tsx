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
  AuthAccountSection,
  AuthChallengeContribution,
  AuthChallengeDescriptor,
  AuthChallengeResponse,
  AuthConnectedAccount,
  AuthEntryMode,
  AuthFeatureAction,
  AuthFeatureActions,
  AuthFeatureNotice,
  AuthFeaturePackProps,
  AuthFlowState,
  AuthIdentity,
  AuthMethod,
  AuthPasswordPolicy,
  AuthSession
} from './auth-contracts';
