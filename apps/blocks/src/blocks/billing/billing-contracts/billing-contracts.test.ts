import { describe, expect, it } from 'vitest';

import {
  formatBillingDate,
  formatBillingMoney,
  formatBillingQuantity,
  getBillingUsageProgress,
  normalizeBillingError,
  resolveBillingStatus,
  billingSubscriptionStatusPresentations
} from './billing-contracts';

const formatOptions = {
  locale: 'en-US',
  timeZone: 'UTC'
} as const;

describe('billing-contracts helpers', () => {
  it('normalizes errors for the action contract', () => {
    expect(
      normalizeBillingError(
        { message: 'timeout', code: 'TIMEOUT', retryable: true },
        'fallback'
      )
    ).toEqual({
      message: 'timeout',
      code: 'TIMEOUT',
      retryable: true
    });
    expect(normalizeBillingError(null, 'fallback')).toEqual({
      message: 'fallback'
    });
  });

  it('formats quantities and money without Number coercion', () => {
    expect(
      formatBillingQuantity('900719925474099312345.5', formatOptions)
    ).toBe('900,719,925,474,099,312,345.5');
    expect(
      formatBillingMoney(
        { amountMinor: '4900', currency: 'USD' },
        formatOptions
      )
    ).toBe('$49.00');
    expect(
      formatBillingMoney(
        { amountMinor: '4900', currency: 'JPY' },
        formatOptions
      )
    ).toBe('¥4,900');
    expect(
      formatBillingMoney(
        { amountMinor: '4900', currency: 'not-a-currency' },
        formatOptions
      )
    ).toBe('not-a-currency 4,900');
  });

  it('formats dates with the supplied locale and time zone', () => {
    expect(
      formatBillingDate('2026-07-20T00:00:00.000Z', {
        ...formatOptions,
        dateStyle: 'medium'
      })
    ).toMatch(/2026/);
  });

  it('caps usage progress visually while preserving exact percent', () => {
    const progress = getBillingUsageProgress('150', {
      kind: 'limited',
      limit: '100'
    });
    expect(progress.visualPercent).toBe(100);
    expect(Number(progress.exactPercent)).toBe(150);
    expect(progress.overage).toBe(true);
  });

  it('resolves known status tokens for presentation', () => {
    expect(
      resolveBillingStatus('active', billingSubscriptionStatusPresentations)
        .label
    ).toBeTruthy();
    expect(
      resolveBillingStatus(
        'provider_specific_future_state',
        billingSubscriptionStatusPresentations
      )
    ).toEqual({
      label: 'Provider specific future state',
      tone: 'outline'
    });
  });
});
