import { BILLING_ACCOUNT_DEMO, DEMO_NOW } from '@/components/ui/billing-account/fixtures';
import { BillingFormatProvider } from '@/components/ui/billing-kit/context';
import { Panel } from '@/components/ui/billing-kit/surface';
import { PoolGrid } from '@/components/ui/billing-kit/usage';

/** Real billing block — the category pools from the Billing Account demo. */
export function UsageCard() {
  return (
    <BillingFormatProvider now={DEMO_NOW}>
      <div className="@container/view">
        <Panel title="Usage this period" description="6 days until the period resets.">
          <PoolGrid meters={BILLING_ACCOUNT_DEMO.meters} balances={BILLING_ACCOUNT_DEMO.balances} limit={4} />
        </Panel>
      </div>
    </BillingFormatProvider>
  );
}
