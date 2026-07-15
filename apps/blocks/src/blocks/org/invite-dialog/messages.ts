/**
 * org-invite-dialog — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type OrgInviteDialogMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  roleLabel: string;
  roleDefaultOption: string;
  submitButton: string;
  submitButtonPending: string;
  pendingInvitesTitle: string;
  pendingInvitesEmpty: string;
  cancelInviteButton: string;
  cancelInviteConfirmTitle: string;
  /** Supports {{email}} interpolation. */
  cancelInviteConfirmDescription: string;
  cancelInviteConfirmButton: string;
  resendButton: string;
  /** Supports {{days}} interpolation. */
  expiresIn: string;
  /** Supports {{email}} interpolation. */
  successToast: string;
  cancelSuccessToast: string;
  /** Supports {{email}} interpolation. */
  resendSuccessToast: string;
  errors: {
    INVALID_EMAIL: string;
    ALREADY_MEMBER: string;
    INVITE_EXISTS: string;
    PERMISSION_DENIED: string;
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Message overrides type: top-level is shallow-partial; `errors` is also
 * partial so a host can localize a single error code without restating the map.
 */
export type OrgInviteDialogMessageOverrides = Partial<Omit<OrgInviteDialogMessages, 'errors'>> & {
  errors?: Partial<OrgInviteDialogMessages['errors']>;
};

export const defaultOrgInviteDialogMessages: OrgInviteDialogMessages = {
  title: 'Invite member',
  description: 'Send an invitation email to add someone to this organization.',
  emailLabel: 'Email address',
  emailPlaceholder: 'colleague@example.com',
  roleLabel: 'Role',
  roleDefaultOption: 'Member',
  submitButton: 'Send invitation',
  submitButtonPending: 'Sending…',
  pendingInvitesTitle: 'Pending invitations',
  pendingInvitesEmpty: 'No pending invitations.',
  cancelInviteButton: 'Cancel',
  cancelInviteConfirmTitle: 'Cancel invitation',
  cancelInviteConfirmDescription: 'Cancel the invitation sent to {{email}}?',
  cancelInviteConfirmButton: 'Cancel invitation',
  resendButton: 'Resend',
  expiresIn: 'Expires in {{days}} days',
  successToast: 'Invitation sent to {{email}}.',
  cancelSuccessToast: 'Invitation cancelled.',
  resendSuccessToast: 'Invitation resent to {{email}}.',
  errors: {
    INVALID_EMAIL: 'Please enter a valid email address.',
    ALREADY_MEMBER: 'This person is already a member of the organization.',
    INVITE_EXISTS: 'A pending invitation already exists for this email.',
    PERMISSION_DENIED: 'You do not have permission to invite members.',
    PROCEDURE_NOT_FOUND: 'The invite procedure is not yet deployed. Contact your system administrator.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
