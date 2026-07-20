import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
  BillingAccountRef,
  BillingEntitlement,
  BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';

import { BillingEntitlementsList } from './billing-entitlements-list';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization',
  label: 'Acme'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const entitlements: BillingEntitlement[] = [
  {
    id: 'sso',
    kind: 'feature',
    label: 'Single sign-on',
    enabled: true
  },
  {
    id: 'seats',
    kind: 'quota',
    label: 'Seats',
    unit: 'seats',
    allowance: { kind: 'limited', limit: '25', remaining: '10' }
  }
];

const ready: BillingResource<BillingEntitlement[]> = {
  status: 'ready',
  data: entitlements
};

describe('BillingEntitlementsList props contract', () => {
  it('mounts required props and surfaces entitlement labels', () => {
    const { container } = render(
      <BillingEntitlementsList
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-entitlements-list"]')
    ).toHaveClass('@container/billing-entitlements-list');
    expect(screen.getByText('Single sign-on')).toBeInTheDocument();
    expect(screen.getByText('Seats')).toBeInTheDocument();
  });

  it.each([
    { status: 'loading' as const },
    { status: 'empty' as const },
    { status: 'error' as const, error: { message: 'failed' } }
  ])('accepts resource.status=$status', (resource) => {
    const { container } = render(
      <BillingEntitlementsList
        resource={resource}
        account={account}
        formatOptions={formatOptions}
      />
    );
    expect(
      container.querySelector('[data-slot="billing-entitlements-list"]')
    ).toBeTruthy();
  });
});
