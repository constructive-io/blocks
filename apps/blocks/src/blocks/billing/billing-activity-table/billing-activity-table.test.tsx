import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingActivityEntry,
  BillingPage,
  BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingActivityTable } from './billing-activity-table';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const page: BillingPage<BillingActivityEntry> = {
  page: 1,
  pageSize: 1,
  items: [
    {
      id: 'evt_1',
      occurredAt: '2026-07-10T12:00:00.000Z',
      meterSlug: 'api_calls',
      ledgerClass: 'usage',
      entryType: 'consumption',
      delta: '25',
      unit: 'requests'
    }
  ],
  hasNextPage: false,
  hasPreviousPage: false
};

const ready: BillingResource<BillingPage<BillingActivityEntry>> = {
  status: 'ready',
  data: page
};

describe('BillingActivityTable props contract', () => {
  it('mounts required props and surfaces activity rows', () => {
    const { container } = render(
      <BillingActivityTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-activity-table"]')
    ).toHaveClass('@container/billing-activity-table');
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingActivityTable
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-activity-table"]')
    ).toBeTruthy();
  });

  it('only shows filters when options and callbacks are both provided', () => {
    const { rerender } = render(
      <BillingActivityTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        meterOptions={[{ value: 'api_calls', label: 'API' }]}
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    rerender(
      <BillingActivityTable
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        meterOptions={[{ value: 'api_calls', label: 'API' }]}
        onMeterChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('closes metadata when the account and resource change', () => {
    const firstAccountReady: BillingResource<
      BillingPage<BillingActivityEntry>
    > = {
      status: 'ready',
      data: {
        ...page,
        items: [
          {
            ...page.items[0],
            metadata: { accountMarker: 'first-account-only' }
          }
        ]
      }
    };
    const secondAccount: BillingAccountRef = {
      entityId: 'org_2',
      kind: 'organization'
    };
    const secondAccountReady: BillingResource<
      BillingPage<BillingActivityEntry>
    > = {
      status: 'ready',
      data: {
        ...page,
        items: [
          {
            ...page.items[0],
            id: 'evt_2',
            metadata: { accountMarker: 'second-account-only' }
          }
        ]
      }
    };
    const { rerender } = render(
      <BillingActivityTable
        resource={firstAccountReady}
        account={account}
        formatOptions={formatOptions}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /view metadata/i }));
    expect(screen.getByText(/first-account-only/)).toBeInTheDocument();

    rerender(
      <BillingActivityTable
        resource={secondAccountReady}
        account={secondAccount}
        formatOptions={formatOptions}
      />
    );

    expect(screen.queryByText(/first-account-only/)).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <BillingActivityTable
        resource={firstAccountReady}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks pagination while pending and reports a rejected page change', async () => {
    let rejectPageChange: (reason: Error) => void = () => undefined;
    const onPageChange = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectPageChange = reject;
        })
    );
    const onError = vi.fn();
    const onMessage = vi.fn();
    render(
      <BillingActivityTable
        resource={{
          status: 'ready',
          data: { ...page, hasNextPage: true, totalPages: 2 }
        }}
        account={account}
        formatOptions={formatOptions}
        onPageChange={onPageChange}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const nextPageButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextPageButton);
    fireEvent.click(nextPageButton);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(nextPageButton).toBeDisabled();

    await act(async () => {
      rejectPageChange(new Error('Page change failed'));
    });

    expect(screen.getByText('Page change failed')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Page change failed' })
    );
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingActivity.pagination.error',
      message: 'Page change failed'
    });
    expect(nextPageButton).toBeEnabled();
  });
});
