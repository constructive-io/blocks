/**
 * account-api-keys-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * NOTE: The list-query surface is out-of-frontend-scope (sdk-binding-contract.md §10).
 * Only the `revokeApiKey` mutation is bindable today. The host supplies rows via
 * the `keys` adapter prop; the default is `[]` which renders the empty state.
 */

export type AccountApiKeysListMessages = {
  title: string;
  description: string;
  createButton: string;
  nameHeader: string;
  prefixHeader: string;
  accessLevelHeader: string;
  lastUsedHeader: string;
  expiresHeader: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  revokeCancelButton: string;
  keyRevokedMessage: string;
  neverUsed: string;
  noExpiry: string;
  expired: string;
  maxKeysReached: string;
  noKeysDescription: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level copy is shallow-partial; `errors` is
 * itself partial so a host can localize a single error code without restating
 * the whole map.
 */
export type AccountApiKeysListMessageOverrides = Partial<Omit<AccountApiKeysListMessages, 'errors'>> & {
  errors?: Partial<AccountApiKeysListMessages['errors']>;
};

export const defaultAccountApiKeysListMessages: AccountApiKeysListMessages = {
  title: 'API keys',
  description: 'API keys allow programmatic access to your account. Treat them like passwords.',
  createButton: 'Create API key',
  nameHeader: 'Name',
  prefixHeader: 'Key',
  accessLevelHeader: 'Access',
  lastUsedHeader: 'Last used',
  expiresHeader: 'Expires',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke API key?',
  revokeConfirmDescription: 'This key will stop working immediately. This action cannot be undone.',
  revokeConfirmButton: 'Revoke key',
  revokeCancelButton: 'Cancel',
  keyRevokedMessage: 'API key revoked.',
  neverUsed: 'Never',
  noExpiry: 'No expiry',
  expired: 'Expired',
  maxKeysReached: 'Maximum number of API keys reached.',
  noKeysDescription: 'No API keys yet. Create one to get started.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
