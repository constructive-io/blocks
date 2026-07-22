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

export type AuthAccountData = Readonly<{
  identity: AuthIdentity;
  sessions?: readonly AuthSession[];
}>;

export type AuthFeatureAction =
  | 'signIn'
  | 'signUp'
  | 'recoverPassword'
  | 'resetPassword'
  | 'signOut'
  | 'updateProfile'
  | 'changePassword'
  | 'revokeSession';

export type AuthFeatureActions = Readonly<{
  signIn?: (input: { email: string; password: string }) => FeatureActionResult;
  signUp?: (input: {
    email: string;
    password: string;
  }) => FeatureActionResult;
  recoverPassword?: (input: { email: string }) => FeatureActionResult;
  resetPassword?: (input: {
    password: string;
    resetToken?: string;
  }) => FeatureActionResult;
  signOut?: () => FeatureActionResult;
  updateProfile?: (input: { displayName: string }) => FeatureActionResult;
  changePassword?: (input: {
    currentPassword: string;
    newPassword: string;
  }) => FeatureActionResult;
  revokeSession?: (input: { sessionId: string }) => FeatureActionResult;
}>;

export type AuthFeaturePackProps = Readonly<{
  view: 'entry' | 'account';
  account?: FeaturePackResource<AuthAccountData>;
  mode?: AuthEntryMode;
  resetToken?: string;
  policy?: FeatureActionPolicy<AuthFeatureAction>;
  actions?: AuthFeatureActions;
  onModeChange?: (mode: AuthEntryMode) => void;
  onAuthenticated?: () => void;
  onError?: (error: FeaturePackError) => void;
}>;
