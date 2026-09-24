'use client';

import { useId, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { Field } from '@constructive-io/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { LivePreview } from '@/components/docs/live-preview';
import { getFeaturePackDoc, type FeaturePackDocId } from '@/lib/feature-packs';

import {
  FEATURE_PACK_SHOWCASE_STATE_OPTIONS,
  getDefaultFeaturePackShowcaseVariant,
  getFeaturePackShowcaseVariants,
  isFeaturePackShowcaseState,
  isFeaturePackShowcaseVariant,
  type FeaturePackShowcaseState,
} from './feature-pack-showcase-resources';

const MINIMUM_INLINE_PREVIEW_HEIGHT = 320;

function previewHeight(pack: FeaturePackDocId) {
  if (pack === 'data') return 840;
  if (pack === 'billing') return 920;
  if (pack === 'users' || pack === 'organizations' || pack === 'storage') {
    return 800;
  }
  if (pack === 'auth') return 760;
  return 720;
}

function stateBadgeVariant(state: FeaturePackShowcaseState) {
  if (state === 'ready') return 'success' as const;
  if (state === 'error') return 'error' as const;
  return 'outline' as const;
}

export function FeaturePackShowcasePreview({
  pack,
  previewPath = `/blocks/features/${pack}/preview/`,
}: {
  pack: FeaturePackDocId;
  previewPath?: string;
}) {
  const variantControlId = useId();
  const stateControlId = useId();
  const variants = getFeaturePackShowcaseVariants(pack);
  const [variant, setVariant] = useState(getDefaultFeaturePackShowcaseVariant(pack));
  const [resourceState, setResourceState] = useState<FeaturePackShowcaseState>('ready');
  const selectedVariant = variants.find((option) => option.value === variant);
  const selectedState = FEATURE_PACK_SHOWCASE_STATE_OPTIONS.find((option) => option.value === resourceState);
  const entryView = pack === 'auth' && variant !== 'account';
  const title = getFeaturePackDoc(pack)?.title ?? pack;
  const previewSource = `${previewPath}?variant=${encodeURIComponent(variant)}&state=${resourceState}`;

  function handleVariantChange(value: string) {
    if (!isFeaturePackShowcaseVariant(pack, value)) return;
    setVariant(value);
    if (pack === 'auth' && value !== 'account') setResourceState('ready');
  }

  function handleResourceStateChange(value: string) {
    if (!isFeaturePackShowcaseState(value)) return;
    setResourceState(value);
  }

  return (
    <LivePreview
      controls={
        <>
          {variants.length > 1 ? (
            <Field className="w-full sm:w-56" htmlFor={variantControlId} label={pack === 'auth' ? 'View' : 'Account'}>
              <Select value={variant} onValueChange={handleVariantChange}>
                <SelectTrigger id={variantControlId} size="lg">
                  <SelectValue>{() => selectedVariant?.label ?? 'Choose an example'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {variants.map((option) => (
                      <SelectItem className="min-h-11 sm:min-h-11" key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {!entryView ? (
            <Field className="w-full sm:w-56" htmlFor={stateControlId} label="Resource state">
              <Select value={resourceState} onValueChange={handleResourceStateChange}>
                <SelectTrigger id={stateControlId} size="lg">
                  <SelectValue>{() => selectedState?.label ?? 'Choose a resource state'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {FEATURE_PACK_SHOWCASE_STATE_OPTIONS.map((option) => (
                      <SelectItem className="min-h-11 sm:min-h-11" key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <div className="hidden flex-wrap gap-2 sm:ms-auto sm:flex sm:pb-1">
            <Badge variant="secondary">{selectedVariant?.label}</Badge>
            {!entryView ? <Badge variant={stateBadgeVariant(resourceState)}>{selectedState?.label}</Badge> : null}
          </div>
        </>
      }
      frameSlot="feature-pack-preview-frame"
      fullscreenTitle={`${title} feature pack preview`}
      height={{
        selector: '[data-slot="feature-pack-showcase-canvas"]',
        min: MINIMUM_INLINE_PREVIEW_HEIGHT,
        initial: previewHeight(pack),
      }}
      name={`${title} feature pack`}
      responsive
      slot="feature-pack-showcase-preview"
      src={previewSource}
    />
  );
}
