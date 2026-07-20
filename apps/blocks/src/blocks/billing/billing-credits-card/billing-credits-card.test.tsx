import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
  BillingAccountRef,
  BillingCreditBalance,
  BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingCreditsCard } from './billing-credits-card';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization',
  label: 'Acme'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const balances: BillingCreditBalance[] = [
  {
    meterSlug: 'query_time',
    label: 'Query time',
    unit: 'seconds',
    available: '7200',
    lots: [
      {
        id: 'lot_1',
        kind: 'permanent',
        amount: '7200',
        remaining: '3600'
      }
    ]
  }
];

const ready: BillingResource<BillingCreditBalance[]> = {
  status: 'ready',
  data: balances
};

describe('BillingCreditsCard props contract', () => {
  it('mounts required props and surfaces balance data', () => {
    const { container } = render(
      <BillingCreditsCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-credits-card"]')
    ).toHaveClass('@container/billing-credits');
    expect(screen.getByText('Query time')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingCreditsCard
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-credits-card"]')
    ).toBeTruthy();
  });
});
