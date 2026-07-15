/**
 * user-context-switcher — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy; the nested `errors` map is keyed by backend
 * error CODE (UPPER_SNAKE_CASE) and is handed straight to `parseGraphQLError`
 * as `customMessages`.
 *
 * PROCEDURE_NOT_FOUND is included because `switch_context` is backend-pending
 * (sdk-binding-contract.md §10). Until the procedure ships, any host that wires
 * the real hook via the onSwitchSubmit override or regenerates the SDK after
 * proc deployment will surface this message on failure.
 *
 * `switchedToast` uses `{{name}}` double-brace interpolation.
 */

export type UserContextSwitcherMessages = {
  /** Accessible label for the trigger button */
  triggerAriaLabel: string;
  /** Section header above personal account */
  personalAccountLabel: string;
  /** Section header above org list */
  orgsLabel: string;
  /** Active indicator text (screen-reader) */
  activeLabel: string;
  /** Footer link text */
  createOrgLink: string;
  /** Role chip for org owner */
  roleOwner: string;
  /** Role chip for org admin */
  roleAdmin: string;
  /** Role chip for regular member */
  roleMember: string;
  /** Toast on successful switch (supports {{name}} interpolation) */
  switchedToast: string;
  /** Toast on error */
  switchErrorToast: string;
  /** Shown when user has no orgs and showCreateOrgLink=true */
  noOrgsHint: string;
  errors: {
    /** Surfaced when the backend switch_context procedure has not been deployed yet */
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

/**
 * Deep-partial override type: top-level keys are optional, errors keys are
 * each independently optional so a host overrides one code without restating
 * the whole map.
 */
export type UserContextSwitcherMessageOverrides = Partial<
  Omit<UserContextSwitcherMessages, 'errors'>
> & {
  errors?: Partial<UserContextSwitcherMessages['errors']>;
};

export const defaultUserContextSwitcherMessages: UserContextSwitcherMessages = {
  triggerAriaLabel: 'Switch active context',
  personalAccountLabel: 'Personal account',
  orgsLabel: 'Organizations',
  activeLabel: 'Active',
  createOrgLink: 'Create new organization',
  roleOwner: 'Owner',
  roleAdmin: 'Admin',
  roleMember: 'Member',
  switchedToast: 'Switched to {{name}}',
  switchErrorToast: 'Failed to switch context. Please try again.',
  noOrgsHint: 'You have no organizations yet.',
  errors: {
    PROCEDURE_NOT_FOUND: 'This feature requires a backend update.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
