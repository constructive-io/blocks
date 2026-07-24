import type {
  FeatureActionPolicy,
  FeatureActionResult,
  FeaturePackError,
  FeaturePackResource
} from '../shared/feature-pack-contracts';

export type AuthEntryMode =
  | 'sign-in'
  | 'sign-up'
  | 'recover-password'
  | 'reset-password';

export type AuthFlowState =
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
      method: Exclude<AuthMethod, 'password'>;
      step: string;
    }>;

export type AuthMethod =
  | 'password'
  | 'email-otp'
  | 'sms-otp'
  | 'totp'
  | 'passkey'
  | 'oauth';

/**
 * Public, credential-free state that a trusted auth contribution may hand to
 * the feature pack. Backend challenge tokens stay in the contribution's own
 * closure or credential vault and must never be placed in this descriptor.
 */
export type AuthChallengeDescriptor = Readonly<{
  id: string;
  method: Exclude<AuthMethod, 'password'>;
  title: string;
  description?: string;
  response: 'code' | 'redirect' | 'webauthn' | 'custom';
}>;

export type AuthChallengeResponse =
  | Readonly<{ kind: 'code'; code: string }>
  | Readonly<{ kind: 'redirect'; callbackUrl: string }>
  | Readonly<{ kind: 'webauthn'; credential: unknown }>
  | Readonly<{ kind: 'custom'; value: unknown }>;

/**
 * A contribution is complete by construction: a method cannot be advertised
 * unless one trusted adapter owns both the start and completion lifecycle.
 */
export type AuthChallengeContribution = Readonly<{
  method: Exclude<AuthMethod, 'password'>;
  label: string;
  start: (input: Readonly<{ email?: string; returnTo?: string }>) =>
    Promise<AuthChallengeDescriptor>;
  complete: (input: Readonly<{
    challengeId: string;
    response: AuthChallengeResponse;
  }>) => FeatureActionResult;
  cancel?: (input: Readonly<{ challengeId: string }>) => FeatureActionResult;
}>;

export type AuthPasswordPolicy = Readonly<{
  minLength?: number;
  maxLength?: number;
  hint?: string;
  validate?: (password: string) => string | undefined;
}>;

export type AuthIdentity = Readonly<{
  id: string;
  displayName: string;
  primaryEmail: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  createdAt?: string;
}>;

export type AuthSession = Readonly<{
  id: string;
  current?: boolean;
  deviceLabel: string;
  location?: string;
  lastSeenAt?: string;
}>;

export type AuthConnectedAccount = Readonly<{
  id: string;
  service: string;
  identifier: string;
  isVerified?: boolean;
  createdAt?: string;
}>;

export type AuthAccountData = Readonly<{
  identity: AuthIdentity;
  sessions?: readonly AuthSession[];
  connectedAccounts?: readonly AuthConnectedAccount[];
}>;

export type AuthFeatureAction =
  | 'signIn'
  | 'signUp'
  | 'recoverPassword'
  | 'resetPassword'
  | 'sendVerificationEmail'
  | 'signOut'
  | 'updateProfile'
  | 'changePassword'
  | 'verifyPassword'
  | 'requestAccountDeletion'
  | 'disconnectConnectedAccount'
  | 'revokeSession';

export type AuthFeatureActions = Readonly<{
  signIn?: (input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => FeatureActionResult;
  signUp?: (input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => FeatureActionResult;
  recoverPassword?: (input: { email: string }) => FeatureActionResult;
  resetPassword?: (input: { password: string }) => FeatureActionResult;
  sendVerificationEmail?: (input: { email: string }) => FeatureActionResult;
  signOut?: () => FeatureActionResult;
  updateProfile?: (input: { displayName: string }) => FeatureActionResult;
  changePassword?: (input: {
    currentPassword: string;
    newPassword: string;
  }) => FeatureActionResult;
  verifyPassword?: (input: { password: string }) => FeatureActionResult;
  requestAccountDeletion?: (input: { password: string }) => FeatureActionResult;
  disconnectConnectedAccount?: (input: {
    accountId: string;
    password: string;
  }) => FeatureActionResult;
  revokeSession?: (input: { sessionId: string }) => FeatureActionResult;
}>;

export type AuthFeatureNotice = Readonly<{
  status: 'error' | 'success';
  message: string;
}>;

export type AuthFeaturePackProps = Readonly<{
  view: 'entry' | 'account';
  account?: FeaturePackResource<AuthAccountData>;
  notice?: AuthFeatureNotice;
  /** @deprecated Use notice for callback and verification feedback. */
  verificationNotice?: AuthFeatureNotice;
  mode?: AuthEntryMode;
  passwordPolicy?: AuthPasswordPolicy;
  challengeContributions?: readonly AuthChallengeContribution[];
  policy?: FeatureActionPolicy<AuthFeatureAction>;
  actions?: AuthFeatureActions;
  onModeChange?: (mode: AuthEntryMode) => void;
  onAuthenticated?: () => void;
  onError?: (error: FeaturePackError) => void;
}>;
