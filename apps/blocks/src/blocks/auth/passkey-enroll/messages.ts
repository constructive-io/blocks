/**
 * passkey-enroll — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is included because the public-schema wrappers
 * (passkey_begin_registration / passkey_finish_registration) are backend-pending;
 * see sdk-binding-contract.md §10.
 */

export type PasskeyEnrollMessages = {
  title: string;
  description: string;
  credentialNameLabel: string;
  credentialNamePlaceholder: string;
  credentialNameHint: string;
  credentialNameRequired: string;
  credentialNameTooLong: string;
  enrollButton: string;
  enrollingButton: string;
  browserPromptHint: string;
  unsupportedBrowser: string;
  successToast: string;
  errors: {
    ALREADY_REGISTERED: string;
    CHALLENGE_FAILED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Message overrides. Top-level copy is shallow-partial; `errors` is itself
 * partial so a host can localize a single error code without restating the map.
 */
export type PasskeyEnrollMessageOverrides = Partial<Omit<PasskeyEnrollMessages, 'errors'>> & {
  errors?: Partial<PasskeyEnrollMessages['errors']>;
};

export const defaultPasskeyEnrollMessages: PasskeyEnrollMessages = {
  title: 'Add a passkey',
  description:
    'Passkeys let you sign in with Face ID, Touch ID, or a hardware key — no password needed.',
  credentialNameLabel: 'Passkey name',
  credentialNamePlaceholder: 'e.g. MacBook Touch ID',
  credentialNameHint: 'Give this passkey a name to identify it later.',
  enrollButton: 'Add passkey',
  enrollingButton: 'Follow browser prompts…',
  browserPromptHint: 'Your browser will ask you to authenticate.',
  unsupportedBrowser: 'Your browser does not support passkeys.',
  successToast: 'Passkey added successfully.',
  credentialNameRequired: 'Passkey name is required',
  credentialNameTooLong: 'Passkey name must be 100 characters or fewer',
  errors: {
    ALREADY_REGISTERED: 'This passkey is already registered to your account.',
    CHALLENGE_FAILED: 'Failed to start passkey registration. Please try again.',
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
