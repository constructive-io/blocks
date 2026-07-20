import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  BillingAccountRef,
  BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';

import {
  BillingSettingsPage,
  type BillingSettingsResources
} from './billing-settings-page';

const account: BillingAccountRef = {
  entityId: 'org_1',
  kind: 'organization',
  label: 'Acme'
};

const formatOptions = { locale: 'en-US', timeZone: 'UTC' } as const;

const empty = { status: 'empty' as const };

const resources: BillingSettingsResources = {
  plans: empty,
  subscription: empty,
  entitlements: empty,
  usage: empty,
  credits: empty,
  usageHistory: empty,
  activity: empty
};

describe('BillingSettingsPage props contract', () => {
  it('mounts required props and exposes the settings surface', () => {
    const { container } = render(
      <BillingSettingsPage
        account={account}
        resources={resources}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector('[data-slot="billing-settings-page"]')
    ).toHaveClass('@container/billing-settings-page');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('accepts controlled section + optional actions without throwing', () => {
    render(
      <BillingSettingsPage
        account={account}
        resources={resources}
        formatOptions={formatOptions}
        section="usage"
        onSectionChange={vi.fn()}
        actions={{
          onViewHistory: vi.fn(),
          onSelectPlan: vi.fn()
        }}
        showHeader={false}
      />
    );

    expect(
      screen.getByRole('tab', { name: /usage/i })
    ).toBeInTheDocument();
  });

  it('forwards ready nested resource data into child blocks', () => {
    const readyUsage: BillingResource<{
      period: {
        startsAt: string;
        endsAt: string;
        label?: string;
      };
      meters: Array<{
        meterSlug: string;
        label: string;
        kind: 'quota';
        used: string;
        unit: string;
        allowance: { kind: 'limited'; limit: string };
      }>;
    }> = {
      status: 'ready',
      data: {
        period: {
          startsAt: '2026-07-01T00:00:00.000Z',
          endsAt: '2026-08-01T00:00:00.000Z',
          label: 'July 2026'
        },
        meters: [
          {
            meterSlug: 'api',
            label: 'API calls',
            kind: 'quota',
            used: '10',
            unit: 'req',
            allowance: { kind: 'limited', limit: '100' }
          }
        ]
      }
    };

    render(
      <BillingSettingsPage
        account={account}
        resources={{ ...resources, usage: readyUsage }}
        formatOptions={formatOptions}
        defaultSection="overview"
      />
    );

    expect(screen.getByText('API calls')).toBeInTheDocument();
  });
});
