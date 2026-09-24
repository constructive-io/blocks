'use client';

import { useId, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import { Field } from '@constructive-io/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';

import { LivePreview } from '@/components/docs/live-preview';
import { getBillingBlock, type BillingBlockName } from '@/lib/billing-blocks';

import {
  BILLING_SHOWCASE_ACCOUNT_OPTIONS,
  BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS,
  BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS,
  getBillingShowcaseAccount,
  isBillingShowcaseAccountKind,
  isBillingShowcaseResourceState,
  isBillingShowcaseSettingsState,
  type BillingShowcaseAccountKind,
  type BillingShowcaseSettingsState
} from './billing-showcase-resources';

const DEFAULT_PREVIEW_HEIGHT = 720;
const MINIMUM_PREVIEW_HEIGHT = 480;
const MAXIMUM_PREVIEW_HEIGHT = 960;

function stateBadgeVariant(state: BillingShowcaseSettingsState) {
  if (state === 'ready') return 'success' as const;
  if (state === 'stale' || state === 'estimated') return 'warning' as const;
  if (state === 'error' || state === 'partial') return 'error' as const;
  return 'outline' as const;
}

export function BillingShowcasePreview({
  name,
  previewPath = `/blocks/billing/${name}/preview/`
}: {
  name: BillingBlockName;
  previewPath?: string;
}) {
  const accountControlId = useId();
  const stateControlId = useId();
  const [accountKind, setAccountKind] =
    useState<BillingShowcaseAccountKind>('organization');
  const [resourceState, setResourceState] =
    useState<BillingShowcaseSettingsState>('ready');

  const account = getBillingShowcaseAccount(accountKind);
  const isSettings = name === 'billing-settings-page';
  const stateOptions = isSettings
    ? BILLING_SHOWCASE_SETTINGS_STATE_OPTIONS
    : BILLING_SHOWCASE_RESOURCE_STATE_OPTIONS;
  const selectedStateLabel = stateOptions.find(
    (option) => option.value === resourceState
  )?.label;
  const previewSource = `${previewPath}?account=${accountKind}&state=${resourceState}`;

  function handleAccountChange(value: string) {
    if (!isBillingShowcaseAccountKind(value)) return;
    setAccountKind(value);
  }

  function handleResourceStateChange(value: string) {
    if (isSettings) {
      if (!isBillingShowcaseSettingsState(value)) return;
      setResourceState(value);
      return;
    }

    if (!isBillingShowcaseResourceState(value)) return;
    setResourceState(value);
  }

  return (
    <LivePreview
      controls={
        <>
          <Field
            className="w-full sm:w-56"
            htmlFor={accountControlId}
            label="Account"
          >
            <Select value={accountKind} onValueChange={handleAccountChange}>
              <SelectTrigger id={accountControlId} size="lg">
                <SelectValue>
                  {(value: string | null) =>
                    BILLING_SHOWCASE_ACCOUNT_OPTIONS.find(
                      (option) => option.value === value
                    )?.label ?? 'Choose an account'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {BILLING_SHOWCASE_ACCOUNT_OPTIONS.map((option) => (
                    <SelectItem
                      className="min-h-11 sm:min-h-11"
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field
            className="w-full sm:w-56"
            htmlFor={stateControlId}
            label="Resource state"
          >
            <Select
              value={resourceState}
              onValueChange={handleResourceStateChange}
            >
              <SelectTrigger id={stateControlId} size="lg">
                <SelectValue>
                  {() => selectedStateLabel ?? 'Choose a resource state'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {stateOptions.map((option) => (
                    <SelectItem
                      className="min-h-11 sm:min-h-11"
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="hidden flex-wrap gap-2 sm:ms-auto sm:flex sm:pb-1">
            <Badge variant="secondary">{account.kind}</Badge>
            <Badge variant={stateBadgeVariant(resourceState)}>
              {selectedStateLabel}
            </Badge>
          </div>
        </>
      }
      frameSlot="billing-preview-frame"
      fullscreenTitle="Live source preview"
      height={{
        selector: '[data-slot="billing-showcase-canvas"]',
        min: MINIMUM_PREVIEW_HEIGHT,
        max: MAXIMUM_PREVIEW_HEIGHT,
        initial: DEFAULT_PREVIEW_HEIGHT
      }}
      name={getBillingBlock(name)?.title ?? name}
      responsive
      slot="billing-showcase-preview"
      src={previewSource}
    />
  );
}
