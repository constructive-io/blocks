import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingResource,
  BillingSubscription
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingSubscriptionCard } from './billing-subscription-card';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization',
  label: 'Acme'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const subscription: BillingSubscription = {
  id: 'sub_1',
  planId: 'growth',
  planName: 'Growth',
  status: 'active',
  price: {
    kind: 'fixed',
    id: 'growth-month',
    interval: 'month',
    money: { amountMinor: '2900', currency: 'USD' }
  }
};

const ready: BillingResource<BillingSubscription> = {
  status: 'ready',
  data: subscription
};

describe('BillingSubscriptionCard props contract', () => {
  it('mounts required props and surfaces plan data', () => {
    const { container } = render(
      <BillingSubscriptionCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-subscription-card"]')
    ).toHaveClass('@container/billing-subscription-card');
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingSubscriptionCard
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-subscription-card"]')
    ).toBeTruthy();
  });

  it('omits action controls when callbacks are absent', () => {
    const { rerender } = render(
      <BillingSubscriptionCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      screen.queryByRole('button', { name: /manage/i })
    ).not.toBeInTheDocument();

    rerender(
      <BillingSubscriptionCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onManageSubscription={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /manage/i })
    ).toBeInTheDocument();
  });
});
