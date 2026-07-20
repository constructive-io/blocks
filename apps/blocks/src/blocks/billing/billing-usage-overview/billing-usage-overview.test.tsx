import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('exposes one focusable progressbar with its true usage in accessible text', () => {
    render(
      <BillingUsageOverview
        resource={ready}
        account={account}
        formatOptions={formatOptions}
      />
    );

    const progressbar = screen.getByRole('progressbar', {
      name: 'API calls used'
    });

    expect(progressbar).toHaveAttribute('tabindex', '0');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '25');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      'Exact values: 250 / 1000; 25% used; Remaining: 750 requests'
    );
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('caps visual overage while announcing the true percentage and values', () => {
    const overage: BillingResource<BillingUsageSnapshot> = {
      status: 'ready',
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
            used: '1500',
            overage: '500',
            allowance: { kind: 'limited', limit: '1000', remaining: '0' }
          }
        ]
      }
    };

    const { container } = render(
      <BillingUsageOverview
        resource={overage}
        account={account}
        formatOptions={formatOptions}
      />
    );

    const progressbar = screen.getByRole('progressbar', {
      name: 'API calls used'
    });

    expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    expect(progressbar).toHaveAttribute(
      'aria-valuetext',
      'Exact values: 1500 / 1000; 150% used; Remaining: 0 requests; Overage: 500 requests'
    );
    expect(
      container.querySelector('[data-visual-percent="100"]')
    ).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('runs history exclusively and reports a rejected action beside its meter', async () => {
    const user = userEvent.setup();
    let rejectHistory!: (reason: unknown) => void;
    const onViewHistory = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectHistory = reject;
        })
    );
    const onError = vi.fn();
    const onMessage = vi.fn();

    render(
      <BillingUsageOverview
        resource={ready}
        account={account}
        formatOptions={formatOptions}
        onViewHistory={onViewHistory}
        onError={onError}
        onMessage={onMessage}
      />
    );

    const historyButton = screen.getByRole('button', {
      name: 'API calls: View history'
    });
    await user.click(historyButton);

    expect(onViewHistory).toHaveBeenCalledOnce();
    expect(onViewHistory).toHaveBeenCalledWith('api_calls');
    expect(historyButton).toBeDisabled();
    expect(historyButton).toHaveAttribute('aria-busy', 'true');
    expect(historyButton).toHaveTextContent('Opening history…');

    await user.click(historyButton);
    expect(onViewHistory).toHaveBeenCalledOnce();

    await act(async () => {
      rejectHistory(new Error('history failed'));
    });

    expect(
      await screen.findByText('The billing action could not be completed')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Please try again. If the problem continues, contact support.'
      )
    ).toBeInTheDocument();
    await waitFor(() => expect(historyButton).toBeEnabled());
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      message: 'history failed'
    });
    expect(onMessage).toHaveBeenCalledWith({
      kind: 'error',
      key: 'billingUsage.history:api_calls.error',
      message: 'Please try again. If the problem continues, contact support.'
    });
  });
});
