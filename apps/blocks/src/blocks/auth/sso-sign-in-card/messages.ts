/**
 * sso-sign-in-card — message catalog
 *
 * v2 stub (Phase 3). Backend procedures for SSO domain lookup and OAuth redirect
 * do not yet exist — see backend-spec/v2-sso-scim.md. The block is a
 * presentational placeholder that renders the SSO sign-in surface and exposes
 * `onDomainSubmit` for host wiring when the backend ships.
 *
 * PROCEDURE_NOT_FOUND is required per endpoint-contract.md §6 for backend-pending blocks.
 */

export type AuthSsoSignInCardMessages = {
  title: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitLabel: string;
  loadingLabel: string;
  backLabel: string;
  ssoDetectedLabel: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    SSO_NOT_CONFIGURED: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultAuthSsoSignInCardMessages: AuthSsoSignInCardMessages = {
  title: 'Sign in with SSO',
  description: 'Enter your work email to continue with your organisation SSO.',
  emailLabel: 'Work email',
  emailPlaceholder: 'you@company.com',
  submitLabel: 'Continue with SSO',
  loadingLabel: 'Checking domain...',
  backLabel: 'Back to sign in',
  ssoDetectedLabel: 'Sign in with {{orgName}} SSO',
  errors: {
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    SSO_NOT_CONFIGURED: 'SSO is not configured for this domain.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
