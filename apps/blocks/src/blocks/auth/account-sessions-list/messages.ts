/**
 * account-sessions-list — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and handed straight to `parseGraphQLError` as
 * `customMessages`, so a host localizes any code by overriding a single key.
 */

export type AccountSessionsListMessages = {
  title: string;
  description: string;
  currentSessionBadge: string;
  revokeButton: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmButton: string;
  revokeCancelButton: string;
  revokeAllOtherButton: string;
  revokeAllConfirmTitle: string;
  revokeAllConfirmDescription: string;
  revokeAllConfirmButton: string;
  revokeAllCancelButton: string;
  sessionRevokedMessage: string;
  allOtherRevokedMessage: string;
  lastUsedLabel: string;
  createdLabel: string;
  ipLabel: string;
  unknownDevice: string;
  unknownLocation: string;
  stepUpCancelled: string;
  noSessionsDescription: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level copy is shallow-partial; `errors` is
 * itself partial so a host can localize a single error code without restating
 * the whole map.
 */
export type AccountSessionsListMessageOverrides = Partial<Omit<AccountSessionsListMessages, 'errors'>> & {
  errors?: Partial<AccountSessionsListMessages['errors']>;
};

export const defaultAccountSessionsListMessages: AccountSessionsListMessages = {
  title: 'Active sessions',
  description: 'These are the devices currently signed in to your account. Revoke any session you do not recognise.',
  currentSessionBadge: 'This device',
  revokeButton: 'Revoke',
  revokeConfirmTitle: 'Revoke session?',
  revokeConfirmDescription: 'This device will be signed out immediately.',
  revokeConfirmButton: 'Revoke',
  revokeCancelButton: 'Cancel',
  revokeAllOtherButton: 'Revoke all other sessions',
  revokeAllConfirmTitle: 'Revoke all other sessions?',
  revokeAllConfirmDescription:
    'All sessions except the current one will be signed out. You will remain signed in on this device.',
  revokeAllConfirmButton: 'Revoke all',
  revokeAllCancelButton: 'Cancel',
  sessionRevokedMessage: 'Session revoked.',
  allOtherRevokedMessage: 'All other sessions revoked.',
  lastUsedLabel: 'Last active',
  createdLabel: 'Signed in',
  ipLabel: 'IP',
  unknownDevice: 'Unknown device',
  unknownLocation: 'Unknown location',
  stepUpCancelled: 'Step-up verification cancelled.',
  noSessionsDescription: 'No active sessions found.',
  errors: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
  }
};
