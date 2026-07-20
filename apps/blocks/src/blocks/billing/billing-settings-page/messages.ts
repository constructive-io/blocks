export type BillingSettingsPageMessages = {
  title: string;
  description: string;
  helpTitle: string;
  tabListLabel: string;
  overviewTabLabel: string;
  usageTabLabel: string;
  plansTabLabel: string;
  overviewSectionTitle: string;
  usageSectionTitle: string;
  plansSectionTitle: string;
  /** Short lead under each section for orientation (not a wall of text). */
  overviewSectionLead: string;
  usageSectionLead: string;
  plansSectionLead: string;
  accountKind: {
    personal: string;
    organization: string;
  };
  asOfLabel: string;
  sectionErrorTitle: string;
  errors: {
    UNKNOWN_ERROR: string;
  };
};

export type BillingSettingsPageMessageOverrides = Partial<
  Omit<BillingSettingsPageMessages, 'errors' | 'accountKind'>
> & {
  accountKind?: Partial<BillingSettingsPageMessages['accountKind']>;
  errors?: Partial<BillingSettingsPageMessages['errors']>;
};

export const defaultBillingSettingsPageMessages: BillingSettingsPageMessages = {
  title: 'Billing',
  description:
    'Plan, usage, credits, entitlements, and activity for this account.',
  helpTitle: 'About billing settings',
  tabListLabel: 'Billing sections',
  overviewTabLabel: 'Overview',
  usageTabLabel: 'Usage',
  plansTabLabel: 'Plans',
  overviewSectionTitle: 'Billing overview',
  usageSectionTitle: 'Usage and activity',
  plansSectionTitle: 'Plans and pricing',
  overviewSectionLead:
    'Current plan, metered usage, credits, and entitlements for this period.',
  usageSectionLead: 'Historical usage by period and recent ledger activity.',
  plansSectionLead: 'Compare plans and change your subscription.',
  accountKind: {
    personal: 'Personal account',
    organization: 'Organization'
  },
  asOfLabel: 'Updated',
  sectionErrorTitle: 'Billing section could not be synchronized',
  errors: {
    UNKNOWN_ERROR: 'The billing section could not be updated.'
  }
};
