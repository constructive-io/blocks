import { BillingUsageOverview } from '@/blocks/billing/billing-usage-overview/billing-usage-overview';
import {
  billingShowcaseFormatOptions,
  billingShowcaseOrganizationAccount,
  billingShowcaseUsageResources,
} from '@/lib/billing-showcase-fixtures';

/** Real billing block — the org usage snapshot from the showcase fixtures. */
export function UsageCard() {
  return (
    <BillingUsageOverview
      account={billingShowcaseOrganizationAccount}
      formatOptions={billingShowcaseFormatOptions}
      resource={billingShowcaseUsageResources.ready}
    />
  );
}
