'use client';

/**
 * Billing settings composition page.
 *
 * Lessons from usage overview / credits card:
 * - One identity cluster at the page level (not on every child card)
 * - Help copy in tooltips, not banners
 * - Container-query layout: 390 / tablet / desktop density
 * - Child blocks use embedded mode to drop repeated account chrome
 */

import * as React from 'react';
import { CircleHelpIcon } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@constructive-io/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@constructive-io/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@constructive-io/ui/tooltip';

import {
  BillingActivityTable,
  type BillingActivityTableProps
} from '../billing-activity-table/billing-activity-table';
import {
  formatBillingDate,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingActivityEntry,
  type BillingCreditBalance,
  type BillingEntitlement,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingPage,
  type BillingPlan,
  type BillingResource,
  type BillingSubscription,
  type BillingUsagePeriod,
  type BillingUsageSnapshot
} from '../billing-contracts/billing-contracts';
import { BillingCreditsCard } from '../billing-credits-card/billing-credits-card';
import { BillingEntitlementsList } from '../billing-entitlements-list/billing-entitlements-list';
import {
  BillingPricingTable,
  type BillingPricingTableProps
} from '../billing-pricing-table/billing-pricing-table';
import {
  BillingSubscriptionCard,
  type BillingSubscriptionCardProps
} from '../billing-subscription-card/billing-subscription-card';
import {
  BillingUsageHistory,
  type BillingUsageHistoryProps
} from '../billing-usage-history/billing-usage-history';
import {
  BillingUsageOverview,
  type BillingUsageOverviewProps
} from '../billing-usage-overview/billing-usage-overview';
import { cn } from '@/lib/utils';

import {
  defaultBillingSettingsPageMessages,
  type BillingSettingsPageMessageOverrides,
  type BillingSettingsPageMessages
} from './messages';

export type BillingSettingsSection = 'overview' | 'usage' | 'plans';

export type BillingSettingsResources = Readonly<{
  plans: BillingResource<BillingPlan[]>;
  subscription: BillingResource<BillingSubscription>;
  entitlements: BillingResource<BillingEntitlement[]>;
  usage: BillingResource<BillingUsageSnapshot>;
  credits: BillingResource<BillingCreditBalance[]>;
  usageHistory: BillingResource<BillingPage<BillingUsagePeriod>>;
  activity: BillingResource<BillingPage<BillingActivityEntry>>;
}>;

export type BillingSettingsActions = Readonly<{
  onPricingIntervalChange?: NonNullable<
    BillingPricingTableProps['onIntervalChange']
  >;
  onSelectPlan?: NonNullable<BillingPricingTableProps['onSelectPlan']>;
  onContactSales?: NonNullable<BillingPricingTableProps['onContactSales']>;
  onManageSubscription?: NonNullable<
    BillingSubscriptionCardProps['onManageSubscription']
  >;
  onChangePlan?: NonNullable<BillingSubscriptionCardProps['onChangePlan']>;
  onResolvePayment?: NonNullable<
    BillingSubscriptionCardProps['onResolvePayment']
  >;
  onViewHistory?: NonNullable<BillingUsageOverviewProps['onViewHistory']>;
  onBuyCredits?: NonNullable<BillingUsageOverviewProps['onBuyCredits']>;
  onHistoryMeterChange?: NonNullable<
    BillingUsageHistoryProps['onMeterChange']
  >;
  onHistoryPeriodChange?: NonNullable<
    BillingUsageHistoryProps['onPeriodChange']
  >;
  onHistoryPageChange?: NonNullable<
    BillingUsageHistoryProps['onPageChange']
  >;
  onActivityMeterChange?: NonNullable<
    BillingActivityTableProps['onMeterChange']
  >;
  onActivityEntryTypeChange?: NonNullable<
    BillingActivityTableProps['onEntryTypeChange']
  >;
  onActivityPageChange?: NonNullable<
    BillingActivityTableProps['onPageChange']
  >;
}>;

export type BillingSettingsControls = Readonly<{
  pricing?: Readonly<
    Pick<BillingPricingTableProps, 'interval' | 'defaultInterval'>
  >;
  history?: Readonly<
    Pick<
      BillingUsageHistoryProps,
      'meterOptions' | 'periodOptions' | 'meterSlug' | 'period'
    >
  >;
  activity?: Readonly<
    Pick<
      BillingActivityTableProps,
      'meterOptions' | 'entryTypeOptions' | 'meterSlug' | 'entryType'
    >
  >;
}>;

type BillingSettingsSectionControl =
  | {
      section: BillingSettingsSection;
      defaultSection?: never;
    }
  | {
      section?: never;
      defaultSection?: BillingSettingsSection;
    };

type BillingSettingsPageBaseProps = {
  account: BillingAccountRef;
  resources: BillingSettingsResources;
  formatOptions: BillingFormatOptions;
  actions?: BillingSettingsActions;
  controls?: BillingSettingsControls;
  onSectionChange?: (
    section: BillingSettingsSection
  ) => void | Promise<void>;
  showHeader?: boolean;
  messages?: BillingSettingsPageMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  className?: string;
};

export type BillingSettingsPageProps = BillingSettingsPageBaseProps &
  BillingSettingsSectionControl;

function isBillingSettingsSection(
  value: unknown
): value is BillingSettingsSection {
  return value === 'overview' || value === 'usage' || value === 'plans';
}

function mergeMessages(
  overrides: BillingSettingsPageMessageOverrides | undefined
): BillingSettingsPageMessages {
  return {
    ...defaultBillingSettingsPageMessages,
    ...overrides,
    accountKind: {
      ...defaultBillingSettingsPageMessages.accountKind,
      ...overrides?.accountKind
    },
    errors: {
      ...defaultBillingSettingsPageMessages.errors,
      ...overrides?.errors
    }
  };
}

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u;

function parseIsoTimestamp(value: string): number | undefined {
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  if (day > daysInMonth[month - 1]) return undefined;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

/** Prefer the freshest valid ready snapshot across composed resources. */
function pickAsOf(resources: BillingSettingsResources): string | undefined {
  const candidates = [
    resources.usage,
    resources.subscription,
    resources.credits,
    resources.entitlements,
    resources.plans,
    resources.usageHistory,
    resources.activity
  ];

  let selected: { value: string; timestamp: number } | undefined;
  for (const resource of candidates) {
    if (resource.status !== 'ready' || !resource.asOf) continue;

    const timestamp = parseIsoTimestamp(resource.asOf);
    if (timestamp === undefined) continue;

    // Candidate order is the deterministic tie-breaker for equal instants.
    if (!selected || timestamp > selected.timestamp) {
      selected = { value: resource.asOf, timestamp };
    }
  }

  return selected?.value;
}

/**
 * Page identity cluster. Title is optional (`showHeader`); account meta is
 * always shown so embedded children can drop repeated Avery/Acme chrome.
 */
function SettingsIdentity({
  headingId,
  account,
  messages,
  asOf,
  formatOptions,
  showTitle
}: {
  headingId: string;
  account: BillingAccountRef;
  messages: BillingSettingsPageMessages;
  asOf?: string;
  formatOptions: BillingFormatOptions;
  showTitle: boolean;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-3">
      {showTitle ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <h1
            id={headingId}
            className="text-balance text-2xl font-semibold tracking-tight @min-[640px]/billing-settings-page:text-3xl"
          >
            {messages.title}
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={messages.helpTitle}
              >
                <CircleHelpIcon className="size-3.5" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-pretty">
              <p className="font-medium">{messages.helpTitle}</p>
              <p className="mt-1">{messages.description}</p>
            </TooltipContent>
          </Tooltip>
          <span className="sr-only" role="note">
            {messages.description}
          </span>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-1 text-sm">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-medium text-foreground">
            {account.label ?? account.entityId}
          </span>
          <span className="text-muted-foreground">
            {messages.accountKind[account.kind]}
          </span>
        </div>
        {asOf ? (
          <p className="tabular-nums text-muted-foreground">
            {messages.asOfLabel}{' '}
            <time dateTime={asOf}>
              {formatBillingDate(asOf, formatOptions)}
            </time>
          </p>
        ) : null}
      </div>
    </header>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function BillingSettingsPage({
  account,
  resources,
  formatOptions,
  actions,
  controls,
  section,
  defaultSection,
  onSectionChange,
  showHeader = true,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: BillingSettingsPageProps) {
  const headingId = React.useId();
  const sectionLock = React.useRef(false);
  const [sectionPending, setSectionPending] = React.useState(false);
  const [sectionError, setSectionError] = React.useState<string | null>(null);
  const messages = mergeMessages(messageOverrides);
  const asOf = pickAsOf(resources);
  const tabsState =
    section === undefined
      ? { defaultValue: defaultSection ?? 'overview' }
      : { value: section };
  const sectionControlsDisabled =
    sectionPending || (section !== undefined && !onSectionChange);

  async function handleSectionChange(value: unknown) {
    if (
      !isBillingSettingsSection(value) ||
      !onSectionChange ||
      sectionLock.current
    ) {
      return;
    }

    sectionLock.current = true;
    setSectionPending(true);
    setSectionError(null);

    try {
      await onSectionChange(value);
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setSectionError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: 'billingSettingsPage.sectionChange.error',
        message: billingError.message
      });
    } finally {
      sectionLock.current = false;
      setSectionPending(false);
    }
  }

  return (
    <TooltipProvider>
      <section
        data-slot="billing-settings-page"
        aria-busy={sectionPending}
        aria-label={showHeader ? undefined : messages.title}
        aria-labelledby={showHeader ? headingId : undefined}
        className={cn(
          // Container is the layout engine — media queries alone aren't enough
          // when this page is embedded in a sidebar shell or showcase frame.
          '@container/billing-settings-page mx-auto flex w-full max-w-7xl min-w-0 flex-col',
          'gap-4 @min-[640px]/billing-settings-page:gap-6',
          className
        )}
      >
        <SettingsIdentity
          headingId={headingId}
          account={account}
          messages={messages}
          asOf={asOf}
          formatOptions={formatOptions}
          showTitle={showHeader}
        />

        {sectionError ? (
          <Alert variant="destructive">
            <AlertTitle
              className="text-balance"
              role="heading"
              aria-level={2}
            >
              {messages.sectionErrorTitle}
            </AlertTitle>
            <AlertDescription>{sectionError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs
          {...tabsState}
          onValueChange={(value) => void handleSectionChange(value)}
          className="min-w-0 gap-4 @min-[640px]/billing-settings-page:gap-6"
        >
          {/*
            Sticky section switcher: stays reachable while scrolling long
            overview stacks. Full-width 3-up on narrow containers; inline
            pill list when the page is wide enough.
          */}
          <div
            className={cn(
              'sticky top-0 z-10 -mx-1 border-b border-border/40 bg-background/90 px-1 py-2 backdrop-blur-sm',
              'supports-[backdrop-filter]:bg-background/75',
              '@min-[640px]/billing-settings-page:static @min-[640px]/billing-settings-page:border-0 @min-[640px]/billing-settings-page:bg-transparent @min-[640px]/billing-settings-page:p-0 @min-[640px]/billing-settings-page:backdrop-blur-none'
            )}
          >
            <div className="overflow-x-auto">
              <TabsList
                aria-label={messages.tabListLabel}
                className={cn(
                  'grid h-auto w-full min-w-0 grid-cols-3 gap-0.5 p-0.5',
                  '@min-[480px]/billing-settings-page:inline-flex @min-[480px]/billing-settings-page:w-auto @min-[480px]/billing-settings-page:min-w-max'
                )}
              >
                <TabsTrigger
                  disabled={sectionControlsDisabled}
                  value="overview"
                  className="min-w-0 px-2 text-xs @min-[480px]/billing-settings-page:px-3 @min-[480px]/billing-settings-page:text-sm"
                >
                  {messages.overviewTabLabel}
                </TabsTrigger>
                <TabsTrigger
                  disabled={sectionControlsDisabled}
                  value="usage"
                  className="min-w-0 px-2 text-xs @min-[480px]/billing-settings-page:px-3 @min-[480px]/billing-settings-page:text-sm"
                >
                  {messages.usageTabLabel}
                </TabsTrigger>
                <TabsTrigger
                  disabled={sectionControlsDisabled}
                  value="plans"
                  className="min-w-0 px-2 text-xs @min-[480px]/billing-settings-page:px-3 @min-[480px]/billing-settings-page:text-sm"
                >
                  {messages.plansTabLabel}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="min-w-0 outline-none">
            <section
              aria-label={messages.overviewSectionTitle}
              className="grid min-w-0 gap-4 @min-[640px]/billing-settings-page:gap-5"
            >
              <SectionLead>{messages.overviewSectionLead}</SectionLead>

              {/*
                Two-stage layout so the side rail never paints over entitlements:
                1) usage + rail share one row
                2) entitlements is a full-width sibling below (not a grid peer
                   that sticky content can cover). No sticky rail — tall
                   subscription+credits stacks must scroll with the page.
              */}
              <div className="flex min-w-0 flex-col gap-4 @min-[640px]/billing-settings-page:gap-5">
                <div
                  className={cn(
                    'grid min-w-0 gap-4',
                    '@min-[720px]/billing-settings-page:grid-cols-12 @min-[720px]/billing-settings-page:items-start @min-[720px]/billing-settings-page:gap-5'
                  )}
                >
                  <div
                    data-slot="billing-settings-overview-rail"
                    className={cn(
                      'order-1 flex min-w-0 flex-col gap-4',
                      '@min-[720px]/billing-settings-page:order-2 @min-[720px]/billing-settings-page:col-span-4'
                    )}
                  >
                    <BillingSubscriptionCard
                      resource={resources.subscription}
                      account={account}
                      formatOptions={formatOptions}
                      embedded
                      onManageSubscription={actions?.onManageSubscription}
                      onChangePlan={actions?.onChangePlan}
                      onResolvePayment={actions?.onResolvePayment}
                      onError={onError}
                      onMessage={onMessage}
                    />
                    <BillingCreditsCard
                      resource={resources.credits}
                      account={account}
                      formatOptions={formatOptions}
                      embedded
                      onError={onError}
                      onMessage={onMessage}
                    />
                  </div>

                  <div
                    data-slot="billing-settings-usage-primary"
                    className={cn(
                      'order-2 min-w-0',
                      '@min-[720px]/billing-settings-page:order-1 @min-[720px]/billing-settings-page:col-span-8'
                    )}
                  >
                    <BillingUsageOverview
                      resource={resources.usage}
                      account={account}
                      formatOptions={formatOptions}
                      embedded
                      onViewHistory={actions?.onViewHistory}
                      onBuyCredits={actions?.onBuyCredits}
                      onError={onError}
                      onMessage={onMessage}
                    />
                  </div>
                </div>

                <div
                  data-slot="billing-settings-entitlements"
                  className="min-w-0"
                >
                  <BillingEntitlementsList
                    resource={resources.entitlements}
                    account={account}
                    formatOptions={formatOptions}
                    embedded
                    onError={onError}
                    onMessage={onMessage}
                  />
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="usage" className="min-w-0 outline-none">
            <section
              aria-label={messages.usageSectionTitle}
              className="grid min-w-0 gap-4 @min-[640px]/billing-settings-page:gap-5"
            >
              <SectionLead>{messages.usageSectionLead}</SectionLead>

              {/*
                Stack on phone/tablet; side-by-side only when the container is
                truly wide enough for two dense tables (~1100cqw).
              */}
              <div
                className={cn(
                  'grid min-w-0 gap-4',
                  '@min-[1100px]/billing-settings-page:grid-cols-2 @min-[1100px]/billing-settings-page:items-start @min-[1100px]/billing-settings-page:gap-5'
                )}
              >
                <div className="min-w-0">
                  <BillingUsageHistory
                    resource={resources.usageHistory}
                    account={account}
                    formatOptions={formatOptions}
                    meterOptions={controls?.history?.meterOptions}
                    periodOptions={controls?.history?.periodOptions}
                    meterSlug={controls?.history?.meterSlug}
                    period={controls?.history?.period}
                    onMeterChange={actions?.onHistoryMeterChange}
                    onPeriodChange={actions?.onHistoryPeriodChange}
                    onPageChange={actions?.onHistoryPageChange}
                    onError={onError}
                    onMessage={onMessage}
                  />
                </div>
                <div className="min-w-0">
                  <BillingActivityTable
                    resource={resources.activity}
                    account={account}
                    formatOptions={formatOptions}
                    meterOptions={controls?.activity?.meterOptions}
                    entryTypeOptions={controls?.activity?.entryTypeOptions}
                    meterSlug={controls?.activity?.meterSlug}
                    entryType={controls?.activity?.entryType}
                    onMeterChange={actions?.onActivityMeterChange}
                    onEntryTypeChange={actions?.onActivityEntryTypeChange}
                    onPageChange={actions?.onActivityPageChange}
                    onError={onError}
                    onMessage={onMessage}
                  />
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="plans" className="min-w-0 outline-none">
            <section
              aria-label={messages.plansSectionTitle}
              className="grid min-w-0 gap-4 @min-[640px]/billing-settings-page:gap-5"
            >
              <SectionLead>{messages.plansSectionLead}</SectionLead>
              <div className="min-w-0 overflow-x-auto">
                <BillingPricingTable
                  resource={resources.plans}
                  account={account}
                  formatOptions={formatOptions}
                  interval={controls?.pricing?.interval}
                  defaultInterval={controls?.pricing?.defaultInterval}
                  onIntervalChange={actions?.onPricingIntervalChange}
                  onSelectPlan={actions?.onSelectPlan}
                  onContactSales={actions?.onContactSales}
                  onError={onError}
                  onMessage={onMessage}
                />
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </section>
    </TooltipProvider>
  );
}
