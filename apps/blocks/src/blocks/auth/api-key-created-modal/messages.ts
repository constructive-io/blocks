/**
 * api-key-created-modal — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy. No `errors` map — this is a presentational block
 * with no data operations and no backend error codes to surface.
 */

export type ApiKeyCreatedModalMessages = {
  title: string;
  warningHeading: string;
  warningBody: string;
  keyLabel: string;
  expiresLabel: string;
  noExpiry: string;
  copyButton: string;
  copiedButton: string;
  copyErrorMessage: string;
  acknowledgementLabel: string;
  dismissButton: string;
};

export const defaultApiKeyCreatedModalMessages: ApiKeyCreatedModalMessages = {
  title: 'API key created',
  warningHeading: 'Save this key now',
  warningBody:
    'This is the only time you will see this key. It cannot be recovered once you close this window.',
  keyLabel: 'Your new API key',
  expiresLabel: 'Expires',
  noExpiry: 'Never',
  copyButton: 'Copy',
  copiedButton: 'Copied!',
  copyErrorMessage: 'Could not copy to clipboard. Please select and copy the key manually.',
  acknowledgementLabel: 'I have copied and saved this API key in a secure location.',
  dismissButton: 'Done'
};
