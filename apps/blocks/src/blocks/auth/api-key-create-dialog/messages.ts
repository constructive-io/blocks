/**
 * api-key-create-dialog — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type ApiKeyCreateDialogMessages = {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  accessLevelLabel: string;
  mfaLevelLabel: string;
  expiresInLabel: string;
  expiresInOptions: {
    noExpiry: string;
    days30: string;
    days90: string;
    days180: string;
    days365: string;
  };
  createButton: string;
  creatingButton: string;
  cancelButton: string;
  stepUpPrompt: string;
  stepUpCancelled: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level copy is shallow-partial; `errors` is
 * itself partial so a host can localize a single error code without restating
 * the full catalog.
 */
export type ApiKeyCreateDialogMessageOverrides = Partial<Omit<ApiKeyCreateDialogMessages, 'errors' | 'expiresInOptions'>> & {
  errors?: Partial<ApiKeyCreateDialogMessages['errors']>;
  expiresInOptions?: Partial<ApiKeyCreateDialogMessages['expiresInOptions']>;
};

export const defaultApiKeyCreateDialogMessages: ApiKeyCreateDialogMessages = {
  title: 'Create API key',
  description: 'API keys provide programmatic access to your account.',
  nameLabel: 'Key name',
  namePlaceholder: 'e.g. CI deploy key',
  accessLevelLabel: 'Access level',
  mfaLevelLabel: 'MFA requirement',
  expiresInLabel: 'Expiry',
  expiresInOptions: {
    noExpiry: 'No expiry',
    days30: '30 days',
    days90: '90 days',
    days180: '180 days',
    days365: '1 year'
  },
  createButton: 'Create key',
  creatingButton: 'Creating…',
  cancelButton: 'Cancel',
  stepUpPrompt: 'Confirm your identity before creating an API key.',
  stepUpCancelled: 'Step-up verification cancelled.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
