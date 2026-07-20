import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingPlan,
  BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingPricingTable } from './billing-pricing-table';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const plans: BillingPlan[] = [
  {
    id: 'growth',
    name: 'Growth',
    prices: [
      {
        kind: 'fixed',
        id: 'growth-month',
        interval: 'month',
        money: { amountMinor: '4900', currency: 'USD' }
      }
    ]
  }
];

const ready: BillingResource<BillingPlan[]> = {
  status: 'ready',
  data: plans
};

describe('BillingPricingTable props contract', () => {
  it('mounts required props and surfaces plan data', () => {
    const { container } = render(
      <BillingPricingTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-pricing-table"]')
    ).toHaveClass('@container/billing-pricing-table');
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingPricingTable
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-pricing-table"]')
    ).toBeTruthy();
  });

  it('omits select action when onSelectPlan is absent', () => {
    const { rerender } = render(
      <BillingPricingTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      screen.queryByRole('button', { name: /select plan/i })
    ).not.toBeInTheDocument();

    rerender(
      <BillingPricingTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onSelectPlan={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /select plan/i })
    ).toBeInTheDocument();
  });
});
