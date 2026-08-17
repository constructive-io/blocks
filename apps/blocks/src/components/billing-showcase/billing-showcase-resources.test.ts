import { describe, expect, it } from 'vitest';

import {
  getBillingShowcaseSettingsResources,
  isBillingShowcaseAccountKind,
  isBillingShowcaseResourceState,
  isBillingShowcaseSettingsState
} from './billing-showcase-resources';

describe('billing showcase resources', () => {
  it('validates control values without accepting arbitrary strings', () => {
    expect(isBillingShowcaseAccountKind('personal')).toBe(true);
    expect(isBillingShowcaseAccountKind('workspace')).toBe(false);
    expect(isBillingShowcaseResourceState('stale')).toBe(true);
    expect(isBillingShowcaseResourceState('partial')).toBe(false);
    expect(isBillingShowcaseSettingsState('partial')).toBe(true);
    expect(isBillingShowcaseSettingsState('unknown')).toBe(false);
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
