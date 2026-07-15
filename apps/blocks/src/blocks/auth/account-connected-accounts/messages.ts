/**
 * account-connected-accounts — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localises any code by overriding a single key.
 *
 * The override type uses a deep-partial so callers can override a single error
 * code without restating the entire map.
 */

export type AccountConnectedAccountsMessages = {
  title: string;
  description: string;
  connectedLabel: string;
  notConnectedLabel: string;
  disconnectButton: string;
  connectButton: (providerName: string) => string;
  disconnectConfirmTitle: string;
  disconnectConfirmDescription: string;
  disconnectConfirmButton: string;
  disconnectCancelButton: string;
  disconnectedToast: string;
  verifiedBadge: string;
  loadingLabel: string;
  noProvidersMessage: string;
  errors: {
    LAST_AUTH_METHOD: string;
    UNKNOWN_ERROR: string;
  };
};

export type AccountConnectedAccountsMessageOverrides = Partial<
  Omit<AccountConnectedAccountsMessages, 'errors' | 'connectButton'>
> & {
  connectButton?: (providerName: string) => string;
  errors?: Partial<AccountConnectedAccountsMessages['errors']>;
};

export const defaultAccountConnectedAccountsMessages: AccountConnectedAccountsMessages = {
  title: 'Connected accounts',
  description: 'Link third-party accounts for sign-in and data access.',
  connectedLabel: 'Connected',
  notConnectedLabel: 'Not connected',
  disconnectButton: 'Disconnect',
  connectButton: (name) => `Connect ${name}`,
  disconnectConfirmTitle: 'Disconnect account?',
  disconnectConfirmDescription: 'You will no longer be able to sign in with this account.',
  disconnectConfirmButton: 'Disconnect',
  disconnectCancelButton: 'Cancel',
  disconnectedToast: 'Account disconnected.',
  verifiedBadge: 'Verified',
  loadingLabel: 'Loading…',
  noProvidersMessage: 'No identity providers are configured.',
  errors: {
    LAST_AUTH_METHOD:
      'Cannot disconnect your only sign-in method. Add a password or another account first.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
