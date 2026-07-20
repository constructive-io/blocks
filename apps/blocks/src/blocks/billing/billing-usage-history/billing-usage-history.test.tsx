import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingPage,
  BillingResource,
  BillingUsagePeriod
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingUsageHistory } from './billing-usage-history';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const page: BillingPage<BillingUsagePeriod> = {
  page: 1,
  pageSize: 20,
  items: [
    {
      id: 'p1',
      startsAt: '2026-06-01T00:00:00.000Z',
      endsAt: '2026-07-01T00:00:00.000Z',
      meterSlug: 'api_calls',
      meterLabel: 'API calls',
      used: '100',
      unit: 'requests',
      allowance: { kind: 'limited', limit: '1000' }
    }
  ],
  hasNextPage: false,
  hasPreviousPage: false
};

const ready: BillingResource<BillingPage<BillingUsagePeriod>> = {
  status: 'ready',
  data: page
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

describe('BillingUsageHistory props contract', () => {
  it('mounts required props and surfaces period rows', () => {
    const { container } = render(
      <BillingUsageHistory
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-usage-history"]')
    ).toHaveClass('@container/billing-usage-history');
    expect(screen.getByText('API calls')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingUsageHistory
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-usage-history"]')
    ).toBeTruthy();
  });

  it('only shows meter filter when options and callback are both provided', () => {
    const { rerender } = render(
      <BillingUsageHistory
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        meterOptions={[{ value: 'api_calls', label: 'API calls' }]}
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    rerender(
      <BillingUsageHistory
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        meterOptions={[{ value: 'api_calls', label: 'API calls' }]}
        onMeterChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('serializes page changes and surfaces rejected interactions', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onPageChange = vi.fn(() => pending.promise);
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <BillingUsageHistory
        resource={{
          status: 'ready',
          data: {
            ...page,
            hasNextPage: true,
            totalPages: 2
          }
        }}
        account={account}
        formatOptions={formatOptions}
        onPageChange={onPageChange}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const next = screen.getByRole('link', { name: 'Next' });
    await user.click(next);
    fireEvent.click(next);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Updating usage history…'
    );

    await act(async () => {
      pending.reject(new Error('History unavailable'));
    });

    await waitFor(() =>
      expect(screen.getByText('History unavailable')).toBeInTheDocument()
    );
    expect(onError).toHaveBeenCalledWith({ message: 'History unavailable' });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingUsageHistory.pageChange.error',
      message: 'History unavailable'
    });
  });
});
