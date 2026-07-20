import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

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

  it('forwards plan selection, blocks duplicates, and surfaces rejected actions', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onSelectPlan = vi.fn(() => pending.promise);
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <BillingPricingTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onSelectPlan={onSelectPlan}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const select = screen.getByRole('button', { name: 'Select plan' });
    await user.click(select);
    fireEvent.click(select);

    expect(onSelectPlan).toHaveBeenCalledTimes(1);
    expect(onSelectPlan).toHaveBeenCalledWith({
      planId: 'growth',
      priceId: 'growth-month',
      account
    });
    expect(screen.getByRole('button', { name: 'Selecting…' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('Selection failed'));
    });

    await waitFor(() =>
      expect(screen.getByText('Selection failed')).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({ message: 'Selection failed' });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingPricingTable.selectPlan.error',
      message: 'Selection failed'
    });
  });

  it('forwards contact-sales selections without inventing a price id', async () => {
    const user = userEvent.setup();
    const onContactSales = vi.fn();
    const contactSales: BillingResource<BillingPlan[]> = {
      status: 'ready',
      data: [
        {
          id: 'enterprise',
          name: 'Enterprise',
          prices: [
            {
              kind: 'contact_sales',
              id: 'enterprise-sales',
              interval: 'month'
            }
          ]
        }
      ]
    };

    render(
      <BillingPricingTable
        resource={contactSales}
        account={account}
        formatOptions={formatOptions}
        onContactSales={onContactSales}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Contact sales' }));
    expect(onContactSales).toHaveBeenCalledWith({
      planId: 'enterprise',
      account
    });
  });
});
