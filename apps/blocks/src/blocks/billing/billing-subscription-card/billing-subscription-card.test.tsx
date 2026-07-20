import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

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

  it('forwards action context, blocks duplicates, and surfaces rejection', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onManageSubscription = vi.fn(() => pending.promise);
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <BillingSubscriptionCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onManageSubscription={onManageSubscription}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const manage = screen.getByRole('button', {
      name: 'Manage subscription'
    });
    await user.click(manage);
    fireEvent.click(manage);

    expect(onManageSubscription).toHaveBeenCalledTimes(1);
    expect(onManageSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_1',
      planId: 'growth',
      account
    });
    expect(screen.getByRole('button', { name: 'Opening…' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('Portal unavailable'));
    });

    await waitFor(() =>
      expect(screen.getByText('Portal unavailable')).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({ message: 'Portal unavailable' });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingSubscriptionCard.manage.error',
      message: 'Portal unavailable'
    });
  });

  it('labels endsAt as Ends and never infers a renewal date', () => {
    render(
      <BillingSubscriptionCard
        resource={{
          status: 'ready',
          data: {
            ...subscription,
            endsAt: '2026-08-01T00:00:00.000Z'
          }
        }}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(screen.getByText('Ends')).toBeInTheDocument();
    expect(screen.queryByText('Renews')).not.toBeInTheDocument();
  });
});
