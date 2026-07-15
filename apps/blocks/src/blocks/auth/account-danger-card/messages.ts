/**
 * account-danger-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localises any code by overriding a single key.
 */

export type AccountDangerCardMessages = {
  title: string;
  description: string;
  deleteButton: string;
  confirmDialogTitle: string;
  confirmDialogDescription: string;
  confirmDialogBody: string;
  confirmButton: string;
  cancelButton: string;
  stepUpPrompt: string;
  emailSentTitle: string;
  emailSentDescription: string;
  stepUpCancelled: string;
  loadingLabel: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type AccountDangerCardMessageOverrides = Partial<Omit<AccountDangerCardMessages, 'errors'>> & {
  errors?: Partial<AccountDangerCardMessages['errors']>;
};

export const defaultAccountDangerCardMessages: AccountDangerCardMessages = {
  title: 'Danger zone',
  description: 'Permanently delete your account and all associated data.',
  deleteButton: 'Delete account',
  confirmDialogTitle: 'Delete your account?',
  confirmDialogDescription: 'This action cannot be undone. All your data will be permanently deleted.',
  confirmDialogBody: 'We will send you a confirmation email. Click the link in that email to complete deletion.',
  confirmButton: 'Send deletion email',
  cancelButton: 'Cancel',
  stepUpPrompt: 'Confirm your identity before deleting your account.',
  emailSentTitle: 'Check your inbox',
  emailSentDescription:
    'A confirmation email has been sent. Follow the link in the email to permanently delete your account.',
  stepUpCancelled: 'Step-up verification cancelled.',
  loadingLabel: 'Sending...',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
