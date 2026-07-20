import { describe, expect, it } from 'vitest';

import {
  BILLING_BLOCKS,
  getBillingBlock,
  isBillingBlockName
} from './billing-blocks';

describe('billing block catalog', () => {
  it('contains the eight unique customer-first visual blocks', () => {
    expect(BILLING_BLOCKS).toHaveLength(8);
    expect(new Set(BILLING_BLOCKS.map(({ name }) => name)).size).toBe(8);
    expect(BILLING_BLOCKS.at(-1)?.name).toBe('billing-settings-page');
  });

  it('keeps usage and accessibility guidance on every block', () => {
    for (const block of BILLING_BLOCKS) {
      expect(block.resource.length).toBeGreaterThan(0);
      expect(block.whenToUse.length).toBeGreaterThan(0);
      expect(block.usage.description.length).toBeGreaterThan(0);
      expect(block.usage.example).toContain(block.exportName);
      expect(block.state.description.length).toBeGreaterThan(0);
      expect(block.accessibility.length).toBeGreaterThan(0);
    }
  });

  it('resolves only catalogued billing block names', () => {
    expect(isBillingBlockName('billing-usage-overview')).toBe(true);
    expect(getBillingBlock('billing-usage-overview')?.title).toBe(
      'Usage overview'
    );
    expect(isBillingBlockName('billing-invoice-history')).toBe(false);
    expect(getBillingBlock('billing-invoice-history')).toBeUndefined();
  });
});
