/**
 * sso-setup-card — message catalog (v2 stub)
 *
 * Minimal catalog for the SSO setup placeholder. Full catalog will be defined
 * when the backend `sso_providers` table and procedures ship (backend-spec/v2-sso-scim.md).
 *
 * Pattern: top-level camelCase = UI copy; nested `errors` = UPPER_SNAKE_CASE codes
 * handed to `parseGraphQLError` as `customMessages` (block-contract.md §4, §10).
 */

export type SsoSetupCardMessages = {
  title: string;
  description: string;
  comingSoonHeading: string;
  comingSoonBody: string;
  protocolsSectionLabel: string;
  protocolsAriaLabel: string;
  oidcLabel: string;
  samlLabel: string;
  errors: {
    PROCEDURE_NOT_FOUND: string;
    UNKNOWN_ERROR: string;
  };
};

export const defaultSsoSetupCardMessages: SsoSetupCardMessages = {
  title: 'SSO Configuration',
  description: 'Configure enterprise Single Sign-On for your organization.',
  comingSoonHeading: 'Not yet available',
  comingSoonBody:
    'SSO provider configuration (OIDC and SAML) is not yet available for this workspace. Contact your platform administrator for the rollout timeline.',
  protocolsSectionLabel: 'Supported protocols (planned)',
  protocolsAriaLabel: 'Planned SSO protocols',
  oidcLabel: 'OpenID Connect (OIDC)',
  samlLabel: 'SAML 2.0',
  errors: {
    PROCEDURE_NOT_FOUND:
      'This feature requires a backend update. See: https://constructive.io/docs/backend-spec/future-procedures',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.'
  }
};
