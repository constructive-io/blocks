/**
 * account-profile-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError`
 * as `customMessages`, so a host localises any code by overriding a single key.
 */

export type AccountProfileCardMessages = {
  title: string;
  description: string;
  displayNameLabel: string;
  displayNamePlaceholder: string;
  orgNameLabel: string;
  orgNamePlaceholder: string;
  profilePictureLabel: string;
  profilePictureHint: string;
  changePhotoButton: string;
  removePhotoButton: string;
  saveButton: string;
  savingButton: string;
  successToast: string;
  uploadingMessage: string;
  fileTooLarge: string;
  fileTypeNotAccepted: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level keys are each optional, AND the
 * `errors` sub-map is itself partial so hosts can override one code at a time.
 */
export type AccountProfileCardMessageOverrides = Partial<Omit<AccountProfileCardMessages, 'errors'>> & {
  errors?: Partial<AccountProfileCardMessages['errors']>;
};

export const defaultAccountProfileCardMessages: AccountProfileCardMessages = {
  title: 'Profile',
  description: 'Update your display name and profile picture.',
  displayNameLabel: 'Display name',
  displayNamePlaceholder: 'Your name',
  orgNameLabel: 'Organization name',
  orgNamePlaceholder: 'Your organization name',
  profilePictureLabel: 'Profile picture',
  profilePictureHint: 'JPG, PNG or WebP. Max 5 MB.',
  changePhotoButton: 'Change photo',
  removePhotoButton: 'Remove photo',
  saveButton: 'Save changes',
  savingButton: 'Saving…',
  successToast: 'Profile updated.',
  uploadingMessage: 'Uploading photo…',
  fileTooLarge: 'File exceeds maximum allowed size.',
  fileTypeNotAccepted: 'File type not accepted.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
