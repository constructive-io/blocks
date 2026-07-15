/**
 * org-create-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError`
 * as `customMessages`, so a host localizes any code by overriding a single key.
 *
 * PROCEDURE_NOT_FOUND is present because `createUser` with type=2 is an existing
 * SDK op but gated by RLS (`create_org` permission bit). The error code is
 * included to gracefully surface the case when the DB procedure has not been
 * deployed to a new environment.
 */

export type OrgCreateCardMessages = {
  title: string;
  description: string;
  // Step 1
  step1Title: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  slugAvailable: string;
  slugTaken: string;
  // Step 2
  step2Title: string;
  logoLabel: string;
  logoHint: string;
  logoSkip: string;
  // Step 3
  step3Title: string;
  confirmName: string;
  confirmSlug: string;
  // Buttons
  nextButton: string;
  backButton: string;
  submitButton: string;
  submitButtonPending: string;
  // Success
  successToast: string;
  // Validation
  nameTooShort: string;
  nameRequired: string;
  slugInvalid: string;
  slugTakenInline: string;
  // Error codes (UPPER_SNAKE_CASE — passed as customMessages to parseGraphQLError)
  errors: {
    PERMISSION_DENIED: string;
    USERNAME_TAKEN: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export type OrgCreateCardMessageOverrides = Partial<Omit<OrgCreateCardMessages, 'errors'>> & {
  errors?: Partial<OrgCreateCardMessages['errors']>;
};

export const defaultOrgCreateCardMessages: OrgCreateCardMessages = {
  title: 'Create organization',
  description: 'Set up a new organization to collaborate with your team.',
  step1Title: 'Name your organization',
  nameLabel: 'Organization name',
  namePlaceholder: 'Acme Corp',
  slugLabel: 'URL slug',
  slugPlaceholder: 'acme-corp',
  slugHint: 'Used in URLs and mentions. Letters, numbers, and hyphens only.',
  slugAvailable: 'Available',
  slugTaken: 'Already taken',
  step2Title: 'Add a logo (optional)',
  logoLabel: 'Logo',
  logoHint: 'PNG or JPG, up to 2 MB. Square images work best.',
  logoSkip: 'Skip for now',
  step3Title: 'Confirm',
  confirmName: 'Name',
  confirmSlug: 'Slug',
  nextButton: 'Continue',
  backButton: 'Back',
  submitButton: 'Create organization',
  submitButtonPending: 'Creating…',
  successToast: '{{name}} created successfully.',
  nameTooShort: 'Organization name must be at least 2 characters.',
  nameRequired: 'Organization name is required.',
  slugInvalid: 'Slug may only contain letters, numbers, and hyphens.',
  slugTakenInline: 'That slug is already taken. Choose a different one.',
  errors: {
    PERMISSION_DENIED: "You don't have permission to create organizations.",
    USERNAME_TAKEN: 'That slug is already taken. Choose a different one.',
    PROCEDURE_NOT_FOUND: 'Organization creation is not available in this environment.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
