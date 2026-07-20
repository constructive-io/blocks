'use client';

import { useSearchParams } from 'next/navigation';

import { getBillingBlock, type BillingBlockName } from '@/lib/billing-blocks';

import { BillingShowcaseCanvas } from './billing-showcase-canvas';
import {
  isBillingShowcaseAccountKind,
  isBillingShowcaseResourceState,
  isBillingShowcaseSettingsState,
  type BillingShowcaseSettingsState
} from './billing-showcase-resources';

export function BillingShowcaseEmbed({ name }: { name: BillingBlockName }) {
  const searchParams = useSearchParams();
  const accountValue = searchParams.get('account') ?? '';
  const stateValue = searchParams.get('state') ?? '';
  const accountKind = isBillingShowcaseAccountKind(accountValue)
    ? accountValue
    : 'organization';

  let resourceState: BillingShowcaseSettingsState = 'ready';
  if (name === 'billing-settings-page') {
    if (isBillingShowcaseSettingsState(stateValue)) {
      resourceState = stateValue;
    }
  } else if (isBillingShowcaseResourceState(stateValue)) {
    resourceState = stateValue;
  }
  const title = getBillingBlock(name)?.title ?? name;

  return (
    <>
      <h1 className="sr-only">{title} preview</h1>
      <BillingShowcaseCanvas
        accountKind={accountKind}
        key={`${accountKind}:${resourceState}`}
        name={name}
        resourceState={resourceState}
      />
    </>
  );
}
