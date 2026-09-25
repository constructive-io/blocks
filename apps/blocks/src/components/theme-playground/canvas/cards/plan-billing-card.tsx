import { BILLING_ACCOUNT_DEMO, DEMO_NOW } from '@/components/ui/billing-account/fixtures';
import { BillingFormatProvider } from '@/components/ui/billing-kit/context';
import { CurrentPlanCard } from '@/components/ui/billing-kit/plan';

const PLAN = BILLING_ACCOUNT_DEMO.plans.find((plan) => plan.id === BILLING_ACCOUNT_DEMO.subscription?.planId)!;

/** Real billing block — the same plan card the Billing Account overview shows. */
export function PlanBillingCard() {
  return (
    <BillingFormatProvider now={DEMO_NOW}>
      <CurrentPlanCard
        plan={PLAN}
        subscription={BILLING_ACCOUNT_DEMO.subscription}
        lifecycle="active"
        nextInvoice={BILLING_ACCOUNT_DEMO.nextInvoice}
      />
    </BillingFormatProvider>
  );
}
