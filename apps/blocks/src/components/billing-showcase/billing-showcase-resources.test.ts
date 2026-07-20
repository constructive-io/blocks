import { describe, expect, it } from 'vitest';

import {
  BILLING_SHOWCASE_ACCOUNT_OPTIONS,
  BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS,
  BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS,
  getBillingShowcaseAccount,
  getBillingShowcaseSettingsResources,
  getBillingShowcaseSubscriptionResources,
  isBillingShowcaseAccountKind,
  isBillingShowcaseResourceState,
  isBillingShowcaseSettingsState
} from './billing-showcase-resources';

describe('billing showcase resources', () => {
  it('keeps the two account variants and six shared resource states explicit', () => {
    expect(BILLING_SHOWCASE_ACCOUNT_OPTIONS.map(({ value }) => value)).toEqual([
      'organization',
      'personal'
    ]);
    expect(
      BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS.map(({ value }) => value)
    ).toEqual([
      'ready',
      'loading',
      'empty',
      'error',
      'stale',
      'estimated'
    ]);
    expect(BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS.at(-1)?.value).toBe(
      'partial'
    );
  });

  it('validates control values without accepting arbitrary strings', () => {
    expect(isBillingShowcaseAccountKind('personal')).toBe(true);
    expect(isBillingShowcaseAccountKind('workspace')).toBe(false);
    expect(isBillingShowcaseResourceState('stale')).toBe(true);
    expect(isBillingShowcaseResourceState('partial')).toBe(false);
    expect(isBillingShowcaseSettingsState('partial')).toBe(true);
    expect(isBillingShowcaseSettingsState('unknown')).toBe(false);
  });

  it('switches account and subscription fixtures together', () => {
    expect(getBillingShowcaseAccount('personal').label).toBe('Avery Chen');
    expect(
      getBillingShowcaseSubscriptionResources('personal').ready.status
    ).toBe('ready');
    const personal = getBillingShowcaseSubscriptionResources('personal').ready;
    expect(personal.status === 'ready' ? personal.data.planName : undefined).toBe(
      'Developer'
    );
  });

  it('builds uniform settings states and preserves the partial-failure boundary', () => {
    const loading = getBillingShowcaseSettingsResources(
      'loading',
      'organization'
    );
    expect(Object.values(loading).every(({ status }) => status === 'loading')).toBe(
      true
    );

    const partial = getBillingShowcaseSettingsResources('partial', 'personal');
    expect(partial.subscription.status).toBe('ready');
    expect(
      partial.subscription.status === 'ready'
        ? partial.subscription.data.planName
        : undefined
    ).toBe('Developer');
    expect(partial.usage.status).toBe('error');
    expect(partial.credits.status).toBe('ready');
    expect(partial.activity.status).toBe('loading');
  });
});
