/**
 * scim-token-generation-card — message catalog
 *
 * STUB block (Phase 3 — SCIM backend not yet designed).
 * All copy is English defaults; override by passing `messages` prop.
 *
 * The `errors` map will be wired to `parseGraphQLError` once the backend
 * ships. PROCEDURE_NOT_FOUND is pre-populated so the block surfaces a clear
 * message if the proc is partially deployed (endpoint-contract.md §6).
 */

export type OrgScimTokenGenerationCardMessages = {
  title: string;
  description: string;
  deferredTitle: string;
  deferredDescription: string;
  generateLabel: string;
  revokeLabel: string;
  /** Shown once after generation, before the token is copied. */
  tokenShownOnceWarning: string;
  copyLabel: string;
  copiedLabel: string;
  revokeConfirmTitle: string;
  revokeConfirmDescription: string;
  revokeConfirmLabel: string;
  revokeCancelLabel: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export type OrgScimTokenGenerationCardMessageOverrides = Partial<
  Omit<OrgScimTokenGenerationCardMessages, 'errors'>
> & {
  errors?: Partial<OrgScimTokenGenerationCardMessages['errors']>;
};

export const defaultOrgScimTokenGenerationCardMessages: OrgScimTokenGenerationCardMessages = {
  title: 'SCIM Token',
  description: 'Manage the bearer token used by your identity provider to provision users via SCIM.',
  deferredTitle: 'SCIM provisioning is not yet available',
  deferredDescription:
    'SCIM token generation requires backend infrastructure that is still being designed. ' +
    'This card will activate when the SCIM provisioning feature ships.',
  generateLabel: 'Generate token',
  revokeLabel: 'Revoke token',
  tokenShownOnceWarning: 'Copy this token now — it will not be shown again.',
  copyLabel: 'Copy',
  copiedLabel: 'Copied!',
  revokeConfirmTitle: 'Revoke SCIM token?',
  revokeConfirmDescription:
    'Your identity provider will stop being able to sync users until you generate a new token.',
  revokeConfirmLabel: 'Revoke',
  revokeCancelLabel: 'Cancel',
  errors: {
    PROCEDURE_NOT_FOUND: 'SCIM token generation is not yet available on this account.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
