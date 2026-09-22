import { BillingSubscriptionCard } from '@/blocks/billing/billing-subscription-card/billing-subscription-card';
import {
  billingShowcaseFormatOptions,
  billingShowcaseOrganizationAccount,
  billingShowcaseOrganizationSubscriptionResources,
} from '@/lib/billing-showcase-fixtures';

/** Real billing block — same fixture the billing showcase uses. */
export function PlanBillingCard() {
  return (
    <BillingSubscriptionCard
      account={billingShowcaseOrganizationAccount}
      formatOptions={billingShowcaseFormatOptions}
      resource={billingShowcaseOrganizationSubscriptionResources.ready}
    />
  );
}
