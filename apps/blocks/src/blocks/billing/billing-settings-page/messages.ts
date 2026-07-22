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
  /** Quiet zone labels for multi-block sections. */
  entitlementsZoneLabel: string;
  historyZoneLabel: string;
  activityZoneLabel: string;
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
    'Manage your plan, track usage and credits, and review entitlements for this account.',
  helpTitle: 'About billing settings',
  tabListLabel: 'Billing sections',
  overviewTabLabel: 'Overview',
  usageTabLabel: 'Usage',
  plansTabLabel: 'Plans',
  overviewSectionTitle: 'Overview',
  usageSectionTitle: 'Usage',
  plansSectionTitle: 'Plans',
  overviewSectionLead:
    'Your current plan and consumption for this billing period, with credits and included entitlements nearby.',
  usageSectionLead:
    'Period totals and ledger activity when you need to reconcile usage or investigate charges.',
  plansSectionLead:
    'Compare available plans and switch when your needs change.',
  entitlementsZoneLabel: 'Included entitlements',
  historyZoneLabel: 'By period',
  activityZoneLabel: 'Ledger',
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
