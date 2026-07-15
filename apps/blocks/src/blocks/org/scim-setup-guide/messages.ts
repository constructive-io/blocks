/**
 * scim-setup-guide — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy. This is a v2 stub (static presentational block)
 * so there are no errors map — no mutations are called.
 */

export type OrgScimSetupGuideMessages = {
  title: string;
  description: string;
  deferredBannerTitle: string;
  deferredBannerBody: string;
  sectionEndpointTitle: string;
  sectionEndpointDescription: string;
  sectionTokenTitle: string;
  sectionTokenDescription: string;
  sectionAttributesTitle: string;
  sectionAttributesDescription: string;
  copyButtonLabel: string;
  copiedButtonLabel: string;
  providerLabel: string;
};

export const defaultOrgScimSetupGuideMessages: OrgScimSetupGuideMessages = {
  title: 'SCIM Provisioning Setup',
  description:
    'Configure SCIM 2.0 automatic user provisioning between your identity provider and this organization.',
  deferredBannerTitle: 'SCIM backend not yet available',
  deferredBannerBody:
    'Full SCIM support (token generation and live endpoint) requires the SCIM backend feature, which is currently under development. This guide shows the expected configuration values once the feature ships.',
  sectionEndpointTitle: 'SCIM Endpoint URL',
  sectionEndpointDescription: 'Enter this URL as the SCIM base URL / provisioning endpoint in your IdP.',
  sectionTokenTitle: 'Bearer Token',
  sectionTokenDescription:
    'Generate a SCIM bearer token from the SCIM Token panel and enter it in your IdP. Tokens are shown only once at creation.',
  sectionAttributesTitle: 'Attribute Mappings',
  sectionAttributesDescription:
    'Map the following attributes in your IdP to enable correct user provisioning.',
  copyButtonLabel: 'Copy',
  copiedButtonLabel: 'Copied',
  providerLabel: 'Identity Provider'
};
