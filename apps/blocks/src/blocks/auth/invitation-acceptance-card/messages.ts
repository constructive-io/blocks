/**
 * invitation-acceptance-card — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend error
 * CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type InvitationAcceptanceMessages = {
  loadingTitle: string;
  appInviteTitle: string;
  appInviteDescription: string;
  /** Runtime interpolation: {{orgName}} */
  orgInviteTitle: string;
  /** Runtime interpolation: {{inviterName}}, {{orgName}} */
  orgInviteDescription: string;
  orgInviteRole: string;
  orgInviteFrom: string;
  acceptButton: string;
  acceptButtonPending: string;
  declineButton: string;
  appSuccessTitle: string;
  appSuccessDescription: string;
  /** Runtime interpolation: {{orgName}} */
  orgSuccessTitle: string;
  /** Runtime interpolation: {{orgName}} */
  orgSuccessDescription: string;
  orgSuccessSwitchHint: string;
  /** Shown when server returns result:false — org approval is pending. Runtime interpolation: {{orgName}} */
  pendingApprovalTitle: string;
  /** Runtime interpolation: {{orgName}} */
  pendingApprovalDescription: string;
  expiredTitle: string;
  expiredDescription: string;
  alreadyUsedTitle: string;
  alreadyUsedDescription: string;
  emailMismatchTitle: string;
  emailMismatchDescription: string;
  emailNotVerifiedError: string;
  limitReachedTitle: string;
  limitReachedDescription: string;
  notFoundTitle: string;
  notFoundDescription: string;
  missingTokenTitle: string;
  missingTokenDescription: string;
  /** Error messages — UPPER_SNAKE_CASE keys match err.extensions.code from PostGraphile */
  errors: {
    INVITE_NOT_FOUND: string;
    INVITE_LIMIT: string;
    INVITE_EMAIL_NOT_FOUND: string;
    EMAIL_NOT_VERIFIED: string;
    UNKNOWN_ERROR: string;
  };
};

/** Deep-partial override type: top-level keys optional; errors nested-partial. */
export type InvitationAcceptanceMessageOverrides = Partial<Omit<InvitationAcceptanceMessages, 'errors'>> & {
  errors?: Partial<InvitationAcceptanceMessages['errors']>;
};

export const defaultInvitationAcceptanceMessages: InvitationAcceptanceMessages = {
  loadingTitle: 'Loading invitation…',
  appInviteTitle: "You’ve been invited",
  appInviteDescription: "You’ve received an invitation to join the app.",
  orgInviteTitle: "You’ve been invited to {{orgName}}",
  orgInviteDescription: '{{inviterName}} has invited you to join {{orgName}}.',
  orgInviteRole: 'Role',
  orgInviteFrom: 'Invited by',
  acceptButton: 'Accept invitation',
  acceptButtonPending: 'Accepting…',
  declineButton: 'Decline',
  appSuccessTitle: 'Welcome aboard!',
  appSuccessDescription: "You’ve successfully joined the app.",
  orgSuccessTitle: "You’ve joined {{orgName}}",
  orgSuccessDescription: 'You are now a member of {{orgName}}.',
  orgSuccessSwitchHint: 'You can switch to this organization using the context switcher.',
  pendingApprovalTitle: 'Request submitted',
  pendingApprovalDescription: 'Your request to join {{orgName}} is pending approval by an administrator.',
  expiredTitle: 'Invitation expired',
  expiredDescription: 'This invitation link has expired. Ask the sender for a new one.',
  alreadyUsedTitle: 'Already used',
  alreadyUsedDescription: 'This invitation has already been claimed.',
  emailMismatchTitle: 'Wrong account',
  emailMismatchDescription:
    'This invitation was sent to a different email address. Sign in with the correct account.',
  emailNotVerifiedError: 'Please verify your email address before accepting this invitation.',
  limitReachedTitle: 'Invitation limit reached',
  limitReachedDescription: 'This invitation link has reached its maximum number of uses.',
  notFoundTitle: 'Invitation not found',
  notFoundDescription: 'This invitation link is invalid or has been cancelled.',
  missingTokenTitle: 'Invalid link',
  missingTokenDescription: 'This invitation link is missing required parameters.',
  errors: {
    INVITE_NOT_FOUND: 'This invitation was not found.',
    INVITE_LIMIT: 'This invitation has reached its usage limit.',
    INVITE_EMAIL_NOT_FOUND: 'This invitation was sent to a different email address.',
    EMAIL_NOT_VERIFIED: 'Please verify your email before accepting this invitation.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
};
