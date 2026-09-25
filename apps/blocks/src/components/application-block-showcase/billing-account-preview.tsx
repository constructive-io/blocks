'use client';

import { useMemo, useState } from 'react';
import { useTheme } from 'next-themes';

import { BillingAccount } from '@/components/ui/billing-account/billing-account';
import {
  BILLING_ACCOUNT_SCENARIOS,
  type BillingAccountScenario,
  billingAccountScenario,
  DEMO_NOW,
  demoRedeemCode
} from '@/components/ui/billing-account/fixtures';
import type { BillingAccountAction, BillingAccountTheme } from '@/components/ui/billing-account/types';

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function describe(action: BillingAccountAction) {
  switch (action.type) {
    case 'open-portal':
      return 'The host would open the provider’s customer portal.';
    case 'pay-invoice':
    case 'open-invoice':
      return `The host would open invoice ${action.invoiceId} on the provider.`;
    case 'switch-account':
      return `The host would load billing for ${action.accountId}.`;
    case 'cancel-scheduled-change':
      return 'The host would release the scheduled plan change.';
    case 'contact-sales':
      return `The host would start a sales conversation for ${action.planId}.`;
    default:
      return `The host received ${action.type}.`;
  }
}

export function BillingAccountPreview() {
  const { theme, setTheme } = useTheme();
  const [scenario, setScenario] = useState<BillingAccountScenario>('active');
  const [message, setMessage] = useState('Pick a scenario, open a meter, or preview a plan change. Every purchase goes to the host.');
  const data = useMemo(() => billingAccountScenario(scenario), [scenario]);
  // One redeemer per scenario, so a code redeemed here reads as already redeemed next time.
  const redeem = useMemo(() => demoRedeemCode(data), [data]);

  return (
    <div className="flex h-dvh min-h-[640px] w-full flex-col" data-slot="application-block-showcase-canvas">
      <div role="radiogroup" aria-label="Scenario" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-background px-3 py-2 [scrollbar-width:none]">
        {BILLING_ACCOUNT_SCENARIOS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={scenario === entry.id}
            title={entry.description}
            onClick={() => {
              setScenario(entry.id);
              setMessage(entry.description);
            }}
            className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-xs whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-checked:bg-card aria-checked:font-medium aria-checked:text-foreground aria-checked:shadow-card"
          >
            {entry.label}
          </button>
        ))}
      </div>
      <BillingAccount
        key={scenario}
        className="min-h-0 flex-1"
        data={data}
        now={DEMO_NOW}
        theme={(theme as BillingAccountTheme | undefined) ?? 'system'}
        onThemeChange={setTheme}
        onChangePlan={async (request) => {
          await wait(700);
          setMessage(
            request.checkout
              ? `The host would open ${data.provider?.name ?? 'the provider'} checkout for ${request.plan.displayName}.`
              : `The host would ${request.timing === 'period_end' ? 'schedule' : 'apply'} ${request.plan.displayName}.`
          );
        }}
        onBuyCredits={async (pack) => {
          await wait(700);
          setMessage(`The host would open checkout for the ${pack.displayName} pack.`);
        }}
        onRedeemCode={async (code) => {
          await wait(600);
          const result = await redeem(code);
          setMessage(result.status === 'redeemed' ? `The host redeemed ${code} for this account.` : `The host refused ${code}: ${result.reason.replace('_', ' ')}.`);
          return result;
        }}
        onAlertsChange={(alerts) => setMessage(`The host would save ${alerts.length} usage alerts.`)}
        onAction={(action) => setMessage(describe(action))}
      />
      <p aria-live="polite" role="status" className="shrink-0 truncate border-t border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
