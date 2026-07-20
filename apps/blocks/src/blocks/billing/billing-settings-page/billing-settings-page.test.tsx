import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('uses the latest valid ready-resource timestamp with deterministic ties', () => {
    const timestampResources: BillingSettingsResources = {
      ...resources,
      usage: {
        status: 'ready',
        asOf: 'not-an-iso-timestamp',
        data: {
          period: {
            startsAt: '2026-07-01T00:00:00.000Z',
            endsAt: '2026-08-01T00:00:00.000Z'
          },
          meters: []
        }
      },
      subscription: {
        status: 'ready',
        asOf: '2026-07-20T00:00:00.000Z',
        data: {
          id: 'subscription_1',
          planId: 'plan_1',
          planName: 'Growth',
          status: 'active'
        }
      },
      credits: {
        status: 'ready',
        asOf: '2026-07-22T00:00:00.000Z',
        data: []
      },
      activity: {
        status: 'ready',
        asOf: '2026-07-22T02:00:00.000+02:00',
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          hasPreviousPage: false,
          hasNextPage: false
        }
      }
    };

    const { container } = render(
      <BillingSettingsPage
        account={account}
        resources={timestampResources}
        formatOptions={formatOptions}
      />
    );

    expect(
      container.querySelector(
        '[data-slot="billing-settings-page"] > header time'
      )
    ).toHaveAttribute('datetime', '2026-07-22T00:00:00.000Z');
  });

  it('announces a rejected section change with the correct heading level', async () => {
    const onSectionChange = vi
      .fn()
      .mockRejectedValue(new Error('Usage could not be opened.'));
    const onError = vi.fn();
    const onMessage = vi.fn();
    const user = userEvent.setup();

    render(
      <BillingSettingsPage
        account={account}
        resources={resources}
        formatOptions={formatOptions}
        section="overview"
        onSectionChange={onSectionChange}
        onError={onError}
        onMessage={onMessage}
      />
    );

    await user.click(screen.getByRole('tab', { name: 'Usage' }));

    const alertTitle = await screen.findByRole('heading', {
      level: 2,
      name: 'Billing section could not be synchronized'
    });
    const alert = alertTitle.closest<HTMLElement>('[role="alert"]');
    expect(alert).not.toBeNull();
    if (!alert) throw new Error('Expected the section error alert.');
    expect(within(alert).getByText('Usage could not be opened.')).toBeVisible();
    expect(onSectionChange).toHaveBeenCalledWith('usage');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Usage could not be opened.' })
    );
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingSettingsPage.sectionChange.error',
      message: 'Usage could not be opened.'
    });
  });
});
