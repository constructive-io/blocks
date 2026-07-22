'use client';

import { useState } from 'react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';

import { BillingActivityTable } from '@/blocks/billing/billing-activity-table/billing-activity-table';
import { BillingCreditsCard } from '@/blocks/billing/billing-credits-card/billing-credits-card';
import { BillingEntitlementsList } from '@/blocks/billing/billing-entitlements-list/billing-entitlements-list';
import { BillingPricingTable } from '@/blocks/billing/billing-pricing-table/billing-pricing-table';
import {
  BillingSettingsPage,
  type BillingSettingsActions,
  type BillingSettingsSection
} from '@/blocks/billing/billing-settings-page/billing-settings-page';
import { BillingSubscriptionCard } from '@/blocks/billing/billing-subscription-card/billing-subscription-card';
import { BillingUsageHistory } from '@/blocks/billing/billing-usage-history/billing-usage-history';
import { BillingUsageOverview } from '@/blocks/billing/billing-usage-overview/billing-usage-overview';
import {
  billingShowcaseActivityResources,
  billingShowcaseCreditResources,
  billingShowcaseEntitlementResources,
  billingShowcaseFormatOptions,
  billingShowcasePlanResources,
  billingShowcaseUsageHistoryResources,
  billingShowcaseUsageResources
} from '@/lib/billing-showcase-fixtures';
import type { BillingBlockName } from '@/lib/billing-blocks';
import { cn } from '@/lib/utils';

import {
  getBillingShowcaseAccount,
  getBillingShowcaseResource,
  getBillingShowcaseSettingsResources,
  getBillingShowcaseSubscriptionResources,
  type BillingShowcaseAccountKind,
  type BillingShowcaseResourceState,
  type BillingShowcaseSettingsState
} from './billing-showcase-resources';

const HISTORY_METER_OPTIONS = [
  { value: 'all', label: 'All meters' },
  { value: 'api_requests', label: 'API requests' },
  { value: 'storage_pool', label: 'Storage pool' }
];

const HISTORY_PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Monthly periods' },
  { value: 'quarterly', label: 'Quarterly periods' }
];

const ACTIVITY_METER_OPTIONS = [
  { value: 'all', label: 'All meters' },
  { value: 'api_requests', label: 'API requests' },
  { value: 'storage_pool', label: 'Storage pool' }
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All entry types' },
  { value: 'usage_recorded', label: 'Usage recorded' },
  { value: 'credits_granted', label: 'Credits granted' },
  { value: 'credits_expired', label: 'Credits expired' }
];

function previewWidth(name: BillingBlockName) {
  if (
    name === 'billing-subscription-card' ||
    name === 'billing-credits-card'
  ) {
    return 'max-w-2xl';
  }
  if (name === 'billing-entitlements-list') return 'max-w-4xl';
  if (name === 'billing-usage-overview') return 'max-w-5xl';
  // Settings is a full SaaS page — give it the reading width of a product surface.
  if (name === 'billing-settings-page') return 'max-w-6xl';
  return 'max-w-7xl';
}

export function BillingShowcaseCanvas({
  accountKind,
  name,
  resourceState
}: {
  accountKind: BillingShowcaseAccountKind;
  name: BillingBlockName;
  resourceState: BillingShowcaseSettingsState;
}) {
  const [delegatedCallback, setDelegatedCallback] = useState<string | null>(null);
  const [pricingInterval, setPricingInterval] = useState('month');
  const [historyMeter, setHistoryMeter] = useState('all');
  const [historyPeriod, setHistoryPeriod] = useState('monthly');
  const [activityMeter, setActivityMeter] = useState('all');
  const [activityType, setActivityType] = useState('all');
  const [settingsSection, setSettingsSection] =
    useState<BillingSettingsSection>('overview');

  const account = getBillingShowcaseAccount(accountKind);
  const commonState: BillingShowcaseResourceState =
    resourceState === 'partial' ? 'ready' : resourceState;

  function recordCallback(signature: string) {
    setDelegatedCallback(signature);
  }

  const settingsActions: BillingSettingsActions = {
    onPricingIntervalChange: (value) => {
      setPricingInterval(value);
      recordCallback(`onPricingIntervalChange('${value}')`);
    },
    onSelectPlan: ({ planId, priceId }) =>
      recordCallback(`onSelectPlan({ planId: '${planId}', priceId: '${priceId}' })`),
    onContactSales: ({ planId }) =>
      recordCallback(`onContactSales({ planId: '${planId}' })`),
    onManageSubscription: ({ subscriptionId }) =>
      recordCallback(
        `onManageSubscription({ subscriptionId: '${subscriptionId}' })`
      ),
    onChangePlan: ({ subscriptionId }) => {
      setSettingsSection('plans');
      recordCallback(
        `onChangePlan({ subscriptionId: '${subscriptionId}' })`
      );
    },
    onResolvePayment: ({ subscriptionId }) =>
      recordCallback(
        `onResolvePayment({ subscriptionId: '${subscriptionId}' })`
      ),
    onViewHistory: (meterSlug) => {
      setSettingsSection('usage');
      recordCallback(`onViewHistory('${meterSlug}')`);
    },
    onBuyCredits: (meterSlug) =>
      recordCallback(`onBuyCredits('${meterSlug}')`),
    onHistoryMeterChange: (value) => {
      setHistoryMeter(value);
      recordCallback(`onHistoryMeterChange('${value}')`);
    },
    onHistoryPeriodChange: (value) => {
      setHistoryPeriod(value);
      recordCallback(`onHistoryPeriodChange('${value}')`);
    },
    onHistoryPageChange: (page) =>
      recordCallback(`onHistoryPageChange(${page})`),
    onActivityMeterChange: (value) => {
      setActivityMeter(value);
      recordCallback(`onActivityMeterChange('${value}')`);
    },
    onActivityEntryTypeChange: (value) => {
      setActivityType(value);
      recordCallback(`onActivityEntryTypeChange('${value}')`);
    },
    onActivityPageChange: (page) =>
      recordCallback(`onActivityPageChange(${page})`)
  };

  function renderBlock() {
    switch (name) {
      case 'billing-pricing-table':
        return (
          <BillingPricingTable
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            interval={pricingInterval}
            onIntervalChange={(value) => {
              setPricingInterval(value);
              recordCallback(`onIntervalChange('${value}')`);
            }}
            onSelectPlan={({ planId, priceId }) =>
              recordCallback(
                `onSelectPlan({ planId: '${planId}', priceId: '${priceId}' })`
              )
            }
            onContactSales={({ planId }) =>
              recordCallback(`onContactSales({ planId: '${planId}' })`)
            }
            resource={getBillingShowcaseResource(
              billingShowcasePlanResources,
              commonState
            )}
          />
        );
      case 'billing-subscription-card':
        return (
          <BillingSubscriptionCard
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            onManageSubscription={({ subscriptionId }) =>
              recordCallback(
                `onManageSubscription({ subscriptionId: '${subscriptionId}' })`
              )
            }
            onChangePlan={({ subscriptionId }) =>
              recordCallback(
                `onChangePlan({ subscriptionId: '${subscriptionId}' })`
              )
            }
            onResolvePayment={({ subscriptionId }) =>
              recordCallback(
                `onResolvePayment({ subscriptionId: '${subscriptionId}' })`
              )
            }
            resource={getBillingShowcaseResource(
              getBillingShowcaseSubscriptionResources(accountKind),
              commonState
            )}
          />
        );
      case 'billing-entitlements-list':
        return (
          <BillingEntitlementsList
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            resource={getBillingShowcaseResource(
              billingShowcaseEntitlementResources,
              commonState
            )}
          />
        );
      case 'billing-usage-overview':
        return (
          <BillingUsageOverview
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            onViewHistory={(meterSlug) =>
              recordCallback(`onViewHistory('${meterSlug}')`)
            }
            onBuyCredits={(meterSlug) =>
              recordCallback(`onBuyCredits('${meterSlug}')`)
            }
            resource={getBillingShowcaseResource(
              billingShowcaseUsageResources,
              commonState
            )}
          />
        );
      case 'billing-credits-card':
        return (
          <BillingCreditsCard
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            resource={getBillingShowcaseResource(
              billingShowcaseCreditResources,
              commonState
            )}
          />
        );
      case 'billing-usage-history':
        return (
          <BillingUsageHistory
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            meterOptions={HISTORY_METER_OPTIONS}
            periodOptions={HISTORY_PERIOD_OPTIONS}
            meterSlug={historyMeter}
            period={historyPeriod}
            onMeterChange={(value) => {
              setHistoryMeter(value);
              recordCallback(`onMeterChange('${value}')`);
            }}
            onPeriodChange={(value) => {
              setHistoryPeriod(value);
              recordCallback(`onPeriodChange('${value}')`);
            }}
            onPageChange={(page) => recordCallback(`onPageChange(${page})`)}
            resource={getBillingShowcaseResource(
              billingShowcaseUsageHistoryResources,
              commonState
            )}
          />
        );
      case 'billing-activity-table':
        return (
          <BillingActivityTable
            account={account}
            formatOptions={billingShowcaseFormatOptions}
            meterOptions={ACTIVITY_METER_OPTIONS}
            entryTypeOptions={ACTIVITY_TYPE_OPTIONS}
            meterSlug={activityMeter}
            entryType={activityType}
            onMeterChange={(value) => {
              setActivityMeter(value);
              recordCallback(`onMeterChange('${value}')`);
            }}
            onEntryTypeChange={(value) => {
              setActivityType(value);
              recordCallback(`onEntryTypeChange('${value}')`);
            }}
            onPageChange={(page) => recordCallback(`onPageChange(${page})`)}
            resource={getBillingShowcaseResource(
              billingShowcaseActivityResources,
              commonState
            )}
          />
        );
      case 'billing-settings-page':
        return (
          <BillingSettingsPage
            account={account}
            actions={settingsActions}
            controls={{
              pricing: { interval: pricingInterval },
              history: {
                meterOptions: HISTORY_METER_OPTIONS,
                periodOptions: HISTORY_PERIOD_OPTIONS,
                meterSlug: historyMeter,
                period: historyPeriod
              },
              activity: {
                meterOptions: ACTIVITY_METER_OPTIONS,
                entryTypeOptions: ACTIVITY_TYPE_OPTIONS,
                meterSlug: activityMeter,
                entryType: activityType
              }
            }}
            formatOptions={billingShowcaseFormatOptions}
            onSectionChange={setSettingsSection}
            resources={getBillingShowcaseSettingsResources(
              resourceState,
              accountKind
            )}
            section={settingsSection}
          />
        );
    }
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-5"
      data-slot="billing-showcase-canvas"
    >
      <div className={cn('mx-auto w-full min-w-0', previewWidth(name))}>
        {renderBlock()}
      </div>

      {delegatedCallback ? (
        <Alert
          className="mx-auto w-full min-w-0 max-w-3xl"
          role="status"
          variant="info"
        >
          <AlertDescription>
            <span className="font-medium text-current">Action received.</span>{' '}
            <code className="break-all whitespace-normal">
              {delegatedCallback}
            </code>{' '}
            The preview received this action. Its example data remains unchanged.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
