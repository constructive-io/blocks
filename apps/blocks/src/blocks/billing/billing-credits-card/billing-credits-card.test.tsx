import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('exposes one focusable progressbar with true remaining-credit values', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <BillingCreditsCard
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    await user.click(
      screen.getByRole('button', { name: 'Query time: Show grants (1)' })
    );

    const progressbar = screen.getByRole('progressbar', {
      name: 'Permanent remaining'
    });

    expect(progressbar).toHaveAttribute('tabindex', '0');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      'Exact values: 3600 / 7200; 50% remaining'
    );
    expect(
      container.querySelector('[data-visual-percent="50"]')
    ).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });
});
