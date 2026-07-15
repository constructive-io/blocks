/**
 * account-settings-page — message catalog
 *
 * Canonical block-messages pattern (block-contract.md §4, §10): top-level
 * camelCase keys are UI copy for the page-level chrome (tab labels, page title,
 * skip-to-content). Section-level messages belong to each composed card.
 */

export type AccountSettingsPageMessages = {
  pageTitle: string;
  skipToContentLabel: string;
  profileTabLabel: string;
  emailsTabLabel: string;
  securityTabLabel: string;
  sessionsTabLabel: string;
  apiKeysTabLabel: string;
  connectedAccountsTabLabel: string;
  phonesTabLabel: string;
  dangerTabLabel: string;
};

export const defaultAccountSettingsPageMessages: AccountSettingsPageMessages = {
  pageTitle: 'Account settings',
  skipToContentLabel: 'Skip to main content',
  profileTabLabel: 'Profile',
  emailsTabLabel: 'Emails',
  securityTabLabel: 'Security',
  sessionsTabLabel: 'Sessions',
  apiKeysTabLabel: 'API keys',
  connectedAccountsTabLabel: 'Connected accounts',
  phonesTabLabel: 'Phones',
  dangerTabLabel: 'Account'
};
