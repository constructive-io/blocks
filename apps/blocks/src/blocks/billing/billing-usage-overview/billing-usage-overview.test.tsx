import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingFormatOptions,
  BillingResource,
  BillingUsageSnapshot
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingUsageOverview } from './billing-usage-overview';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization',
  label: 'Acme'
};

const formatOptions: BillingFormatOptions = {
  locale: 'en-US',
  timeZone: 'UTC'
};

const ready: BillingResource<BillingUsageSnapshot> = {
  status: 'ready',
  quality: 'authoritative',
  data: {
    period: {
      startsAt: '2026-07-01T00:00:00.000Z',
      endsAt: '2026-08-01T00:00:00.000Z',
      label: 'July 2026'
    },
    meters: [
      {
        meterSlug: 'api_calls',
        label: 'API calls',
        unit: 'requests',
        kind: 'quota',
        used: '250',
        allowance: { kind: 'limited', limit: '1000', remaining: '750' }
      }
    ]
  }
};

describe('BillingUsageOverview props contract', () => {
  it('mounts required props and exposes the block surface', () => {
    const { container } = render(
      <BillingUsageOverview
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-usage-overview"]')
    ).toHaveClass('@container/billing-usage');
    expect(screen.getByText('API calls')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    {
      status: 'error' as const,
      error: { message: 'unavailable' }
    }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingUsageOverview
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-usage-overview"]')
    ).toBeTruthy();
  });

  it('only wires optional action callbacks when provided', () => {
    const onViewHistory = vi.fn();
    const { rerender } = render(
      <BillingUsageOverview
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      screen.queryByRole('button', { name: /view history/i })
    ).not.toBeInTheDocument();

    rerender(
      <BillingUsageOverview
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onViewHistory={onViewHistory}
      />
    );
    expect(
      screen.getByRole('button', { name: /view history/i })
    ).toBeInTheDocument();
  });
});
