'use client';

import { useSearchParams } from 'next/navigation';

import { getFeaturePackDoc, type FeaturePackDocId } from '@/lib/feature-packs';

import { FeaturePackShowcaseCanvas } from './feature-pack-showcase-canvas';
import {
  getDefaultFeaturePackShowcaseVariant,
  isFeaturePackShowcaseState,
  isFeaturePackShowcaseVariant,
  type FeaturePackShowcaseState,
} from './feature-pack-showcase-resources';

export function FeaturePackShowcaseEmbed({ pack }: { pack: FeaturePackDocId }) {
  const searchParams = useSearchParams();
  const variantValue = searchParams.get('variant') ?? '';
  const stateValue = searchParams.get('state') ?? '';
  const variant = isFeaturePackShowcaseVariant(pack, variantValue)
    ? variantValue
    : getDefaultFeaturePackShowcaseVariant(pack);
  const state: FeaturePackShowcaseState = isFeaturePackShowcaseState(stateValue) ? stateValue : 'ready';
  const title = getFeaturePackDoc(pack)?.title ?? pack;

  return (
    <>
      <h1 className="sr-only">{title} feature pack preview</h1>
      <FeaturePackShowcaseCanvas key={`${pack}:${variant}:${state}`} pack={pack} state={state} variant={variant} />
    </>
  );
}
