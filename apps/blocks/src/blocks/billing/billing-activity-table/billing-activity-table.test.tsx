import { render, screen } from '@testing-library/react';
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
});

