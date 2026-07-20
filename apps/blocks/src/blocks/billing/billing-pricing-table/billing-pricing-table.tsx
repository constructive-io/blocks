'use client';

import { useRef, useState } from 'react';
import { CheckIcon, CircleAlertIcon, MinusIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@constructive-io/ui/alert';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@constructive-io/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@constructive-io/ui/select';
import { Separator } from '@constructive-io/ui/separator';
import { Skeleton } from '@constructive-io/ui/skeleton';

import { cn } from '@/lib/utils';
import {
  formatBillingDate,
  formatBillingQuantity,
  humanizeBillingToken,
  normalizeBillingError,
  type BillingAccountRef,
  type BillingAllowance,
  type BillingEntitlement,
  type BillingError,
  type BillingFormatOptions,
  type BillingMessageEvent,
  type BillingPlan,
  type BillingPrice,
  type BillingResource
} from '@/blocks/billing/billing-contracts/billing-contracts';
import {
  BillingMoneyText,
  BillingQualityBadge,
  billingNumericClassName
} from '@/blocks/billing/billing-ui/billing-ui';

import {
  defaultBillingPricingTableMessages,
  type BillingPricingTableMessageOverrides,
  type BillingPricingTableMessages
} from './messages';

export type BillingPlanSelection = {
  planId: string;
  priceId: string;
  account: BillingAccountRef;
};

export type BillingContactSalesSelection = {
  planId: string;
  account: BillingAccountRef;
};

export type BillingPricingTableProps = {
  resource: BillingResource<BillingPlan[]>;
  account: BillingAccountRef;
  formatOptions: BillingFormatOptions;
  interval?: string;
  defaultInterval?: string;
  onIntervalChange?: (interval: string) => void | Promise<void>;
  onSelectPlan?: (selection: BillingPlanSelection) => void | Promise<void>;
  onContactSales?: (
    selection: BillingContactSalesSelection
  ) => void | Promise<void>;
  entitlementPreviewLimit?: number;
  messages?: BillingPricingTableMessageOverrides;
  onError?: (error: BillingError) => void;
  onMessage?: (event: BillingMessageEvent) => void;
  className?: string;
};

type PendingAction = {
  kind: 'select' | 'contact';
  planId: string;
};

type PlanActionError = {
  planId: string;
  message: string;
};

function mergeMessages(
  overrides: BillingPricingTableMessageOverrides | undefined
): BillingPricingTableMessages {
  return {
    ...defaultBillingPricingTableMessages,
    ...overrides,
    quality: {
      ...defaultBillingPricingTableMessages.quality,
      ...overrides?.quality
    },
    errors: {
      ...defaultBillingPricingTableMessages.errors,
      ...overrides?.errors
    }
  };
}

function allowanceLabel(
  allowance: BillingAllowance,
  unit: string | undefined,
  messages: BillingPricingTableMessages,
  formatOptions: BillingFormatOptions
) {
  if (allowance.kind === 'unlimited') return messages.unlimited;
  if (allowance.kind === 'uninitialized') return messages.uninitialized;
  return `${formatBillingQuantity(allowance.limit, formatOptions)}${
    unit ? ` ${unit}` : ''
  }`;
}

function entitlementLabel(
  entitlement: BillingEntitlement,
  messages: BillingPricingTableMessages,
  formatOptions: BillingFormatOptions
) {
  switch (entitlement.kind) {
    case 'feature':
      return entitlement.enabled ? messages.included : messages.notIncluded;
    case 'cap':
      return `${formatBillingQuantity(entitlement.value, formatOptions)}${
        entitlement.unit ? ` ${entitlement.unit}` : ''
      }`;
    case 'quota':
    case 'meter':
      return allowanceLabel(
        entitlement.allowance,
        entitlement.unit,
        messages,
        formatOptions
      );
    case 'unknown':
      return entitlement.value ??
        (entitlement.rawKind
          ? humanizeBillingToken(entitlement.rawKind)
          : messages.uninitialized);
  }
}

function intervalLabel(interval: string) {
  return humanizeBillingToken(interval);
}

function priceForInterval(plan: BillingPlan, interval: string | undefined) {
  const exact = interval
    ? plan.prices.find((price) => price.interval === interval)
    : undefined;
  if (exact) return exact;

  const intervalIndependent = plan.prices.find(
    (price) => price.kind === 'contact_sales' && !price.interval
  );
  if (intervalIndependent) return intervalIndependent;

  return interval ? undefined : plan.prices[0];
}

function PriceDisplay({
  price,
  messages,
  formatOptions
}: {
  price: BillingPrice;
  messages: BillingPricingTableMessages;
  formatOptions: BillingFormatOptions;
}) {
  if (price.kind === 'contact_sales') {
    return (
      <p className="text-balance text-2xl font-semibold">
        {messages.contactSalesPrice}
      </p>
    );
  }

  const count =
    price.intervalCount && price.intervalCount.trim() !== '1'
      ? formatBillingQuantity(price.intervalCount, formatOptions)
      : undefined;

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-1">
      <BillingMoneyText
        money={price.money}
        formatOptions={formatOptions}
        className="text-3xl font-semibold"
      />
      <p className="text-pretty text-sm text-muted-foreground">
        {messages.perLabel} {count ? `${count} ` : ''}
        {intervalLabel(price.interval)}
      </p>
    </div>
  );
}

function EntitlementPreviewRow({
  entitlement,
  messages,
  formatOptions
}: {
  entitlement: BillingEntitlement;
  messages: BillingPricingTableMessages;
  formatOptions: BillingFormatOptions;
}) {
  const value = entitlementLabel(entitlement, messages, formatOptions);
  const isFeature = entitlement.kind === 'feature';
  const isIncluded = isFeature && entitlement.enabled;
  const isExcluded = isFeature && !entitlement.enabled;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 text-sm">
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full',
          isIncluded && 'bg-success/15 text-success-foreground',
          isExcluded && 'bg-muted text-muted-foreground',
          !isFeature && 'bg-muted text-muted-foreground'
        )}
        aria-hidden="true"
      >
        {isExcluded ? (
          <MinusIcon className="size-2.5" strokeWidth={2.5} />
        ) : (
          <CheckIcon className="size-2.5" strokeWidth={2.5} />
        )}
      </span>
      <dt className="min-w-0 break-words text-pretty text-muted-foreground">
        {entitlement.label}
      </dt>
      <dd
        className={cn(
          'min-w-0 max-w-[45%] text-end font-medium',
          billingNumericClassName,
          isExcluded && 'font-normal text-muted-foreground'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PricingLoading({
  messages,
  className
}: {
  messages: BillingPricingTableMessages;
  className?: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-label={messages.loadingAriaLabel}
      className={cn(
        '@container/billing-pricing-table flex w-full flex-col gap-6',
        className
      )}
      data-slot="billing-pricing-table"
    >
      <div aria-hidden="true" className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div
        aria-hidden="true"
        className="grid gap-4 @min-[768px]/billing-pricing-table:grid-cols-2 @min-[1024px]/billing-pricing-table:grid-cols-3 @min-[1152px]/billing-pricing-table:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Skeleton className="h-9 w-36" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PricingStateCard({
  title,
  description,
  onRetry,
  retryPending = false,
  retryError = null,
  messages,
  className,
  destructive = false
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  retryPending?: boolean;
  retryError?: string | null;
  messages: BillingPricingTableMessages;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <Card
      aria-busy={retryPending}
      className={cn(
        '@container/billing-pricing-table w-full',
        className
      )}
      data-slot="billing-pricing-table"
    >
      <CardHeader>
        <CardTitle>
          <h2 className="text-balance">{title}</h2>
        </CardTitle>
        {!destructive ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {destructive ? (
        <CardContent className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{description}</AlertDescription>
          </Alert>
          {retryPending ? (
            <p className="sr-only" role="status">
              {messages.retryingButton}
            </p>
          ) : null}
          {retryError ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertDescription>{retryError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      ) : null}
      {onRetry ? (
        <CardFooter>
          <Button
            aria-busy={retryPending}
            disabled={retryPending}
            onClick={onRetry}
          >
            {retryPending ? messages.retryingButton : messages.retryButton}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function BillingPricingTable({
  resource,
  account,
  formatOptions,
  interval,
  defaultInterval,
  onIntervalChange,
  onSelectPlan,
  onContactSales,
  entitlementPreviewLimit = 4,
  messages: messageOverrides,
  onError,
  onMessage,
  className
}: BillingPricingTableProps) {
  const messages = mergeMessages(messageOverrides);
  const [uncontrolledInterval, setUncontrolledInterval] = useState(
    defaultInterval ?? ''
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<PlanActionError | null>(null);
  const [intervalPending, setIntervalPending] = useState(false);
  const [intervalError, setIntervalError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const actionLock = useRef(false);
  const isBusy = pendingAction !== null || intervalPending || retryPending;

  async function runRetry(callback: () => void | Promise<void>) {
    if (actionLock.current) return;

    actionLock.current = true;
    setRetryPending(true);
    setRetryError(null);
    try {
      const result = callback();
      if (result) await result;
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setRetryError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: 'billingPricingTable.retry.error',
        message: billingError.message
      });
    } finally {
      actionLock.current = false;
      setRetryPending(false);
    }
  }

  if (resource.status === 'loading') {
    return <PricingLoading messages={messages} className={className} />;
  }

  if (resource.status === 'empty') {
    return (
      <PricingStateCard
        title={messages.emptyTitle}
        description={messages.emptyDescription}
        messages={messages}
        className={className}
      />
    );
  }

  if (resource.status === 'error') {
    const retry = resource.retry;
    return (
      <PricingStateCard
        title={messages.errorTitle}
        description={resource.error.message}
        onRetry={retry ? () => void runRetry(retry) : undefined}
        retryPending={retryPending}
        retryError={retryError}
        messages={messages}
        className={className}
        destructive
      />
    );
  }

  if (resource.data.length === 0) {
    return (
      <PricingStateCard
        title={messages.emptyTitle}
        description={messages.emptyDescription}
        messages={messages}
        className={className}
      />
    );
  }

  const intervals = Array.from(
    new Set(
      resource.data.flatMap((plan) =>
        plan.prices.flatMap((price) => (price.interval ? [price.interval] : []))
      )
    )
  );
  const requestedInterval = interval ?? uncontrolledInterval;
  const selectedInterval = intervals.includes(requestedInterval)
    ? requestedInterval
    : intervals.includes(defaultInterval ?? '')
      ? (defaultInterval as string)
      : (intervals[0] ?? '');

  async function handleIntervalChange(nextInterval: string) {
    if (actionLock.current) return;

    setActionError(null);
    setIntervalError(null);
    if (!onIntervalChange) {
      if (interval === undefined) setUncontrolledInterval(nextInterval);
      return;
    }

    actionLock.current = true;
    setIntervalPending(true);
    try {
      await onIntervalChange(nextInterval);
      if (interval === undefined) setUncontrolledInterval(nextInterval);
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setIntervalError(billingError.message);
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: 'billingPricingTable.intervalChange.error',
        message: billingError.message
      });
    } finally {
      actionLock.current = false;
      setIntervalPending(false);
    }
  }

  async function runAction(
    action: PendingAction,
    callback: () => void | Promise<void>,
    errorKey: string
  ) {
    if (actionLock.current) return;

    actionLock.current = true;
    setPendingAction(action);
    setActionError(null);
    try {
      await callback();
    } catch (error) {
      const billingError = normalizeBillingError(
        error,
        messages.errors.UNKNOWN_ERROR
      );
      setActionError({ planId: action.planId, message: billingError.message });
      onError?.(billingError);
      onMessage?.({
        kind: 'error',
        key: errorKey,
        message: billingError.message
      });
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  return (
    <section
      aria-busy={isBusy}
      className={cn(
        '@container/billing-pricing-table flex w-full flex-col gap-6',
        className
      )}
      data-slot="billing-pricing-table"
    >
      <div className="flex flex-col gap-4 @min-[640px]/billing-pricing-table:flex-row @min-[640px]/billing-pricing-table:items-end @min-[640px]/billing-pricing-table:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="text-balance text-xl font-semibold">{messages.title}</h2>
          <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
            {messages.description}
          </p>
          {resource.asOf ? (
            <p className="text-pretty text-xs text-muted-foreground tabular-nums">
              {messages.asOfLabel}{' '}
              {formatBillingDate(resource.asOf, formatOptions)}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2 @min-[640px]/billing-pricing-table:shrink-0 @min-[640px]/billing-pricing-table:items-end">
          {resource.quality ? (
            <BillingQualityBadge
              quality={resource.quality}
              labels={messages.quality}
              ariaPrefix={messages.qualityLabel}
            />
          ) : null}
          {intervals.length > 1 &&
          (interval === undefined || onIntervalChange) ? (
            <Select
              disabled={isBusy}
              value={selectedInterval}
              onValueChange={handleIntervalChange}
            >
              <SelectTrigger
                aria-label={messages.intervalLabel}
                aria-busy={intervalPending}
                className="w-full @min-[640px]/billing-pricing-table:w-44"
                size="lg"
              >
                <SelectValue>
                  {(value: string | null) =>
                    value ? intervalLabel(value) : messages.intervalLabel
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {intervals.map((availableInterval) => (
                    <SelectItem
                      className="min-h-11"
                      key={availableInterval}
                      value={availableInterval}
                    >
                      {intervalLabel(availableInterval)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
          {intervalError ? (
            <Alert className="max-w-sm" variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertDescription>{intervalError}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>

      <div className="grid items-stretch gap-4 @min-[768px]/billing-pricing-table:grid-cols-2 @min-[1024px]/billing-pricing-table:grid-cols-3 @min-[1152px]/billing-pricing-table:grid-cols-4">
        {resource.data.map((plan) => {
          const price = priceForInterval(plan, selectedInterval || undefined);
          const previews = (plan.entitlements ?? []).slice(
            0,
            Math.max(0, entitlementPreviewLimit)
          );
          const isPending = pendingAction?.planId === plan.id;
          const hasAction =
            !plan.current &&
            ((price?.kind === 'fixed' && Boolean(onSelectPlan)) ||
              (price?.kind === 'contact_sales' && Boolean(onContactSales)));

          return (
            <Card
              className={cn(
                'flex h-full min-w-0 max-w-full flex-col overflow-hidden',
                plan.featured && 'ring-1 ring-primary/20'
              )}
              data-current={plan.current || undefined}
              data-featured={plan.featured || undefined}
              key={plan.id}
              variant={plan.featured ? 'elevated' : 'flat'}
            >
              <CardHeader className="has-data-[slot=card-action]:grid-cols-1">
                {plan.featured || plan.current ? (
                  <div className="mb-1 flex flex-wrap gap-1.5">
                    {plan.featured ? (
                      <Badge variant="secondary">{messages.featuredBadge}</Badge>
                    ) : null}
                    {plan.current ? (
                      <Badge variant="outline">{messages.currentPlanBadge}</Badge>
                    ) : null}
                  </div>
                ) : null}
                <CardTitle>
                  <h3 className="break-words text-balance">
                    {plan.name}
                  </h3>
                </CardTitle>
                {plan.description ? (
                  <CardDescription className="break-words">
                    {plan.description}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-5">
                {price ? (
                  <PriceDisplay
                    price={price}
                    messages={messages}
                    formatOptions={formatOptions}
                  />
                ) : (
                  <p className="text-pretty text-sm text-muted-foreground">
                    {messages.noPrice}
                  </p>
                )}

                <Separator />

                {previews.length > 0 ? (
                  <dl className="flex flex-col gap-3">
                    {previews.map((entitlement) => (
                      <EntitlementPreviewRow
                        key={entitlement.id}
                        entitlement={entitlement}
                        messages={messages}
                        formatOptions={formatOptions}
                      />
                    ))}
                  </dl>
                ) : (
                  <p className="text-pretty text-sm text-muted-foreground">
                    {messages.noEntitlements}
                  </p>
                )}

                {actionError?.planId === plan.id ? (
                  <Alert variant="destructive">
                    <CircleAlertIcon aria-hidden="true" />
                    <AlertDescription>{actionError.message}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>

              {hasAction ? (
                <CardFooter className="mt-auto">
                  {price?.kind === 'fixed' && onSelectPlan ? (
                    <Button
                      className="w-full"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(
                          { kind: 'select', planId: plan.id },
                          () =>
                            onSelectPlan({
                              planId: plan.id,
                              priceId: price.id,
                              account
                            }),
                          'billingPricingTable.selectPlan.error'
                        )
                      }
                    >
                      {isPending && pendingAction?.kind === 'select'
                        ? messages.selectingPlanButton
                        : messages.selectPlanButton}
                    </Button>
                  ) : null}
                  {price?.kind === 'contact_sales' && onContactSales ? (
                    <Button
                      className="w-full"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(
                          { kind: 'contact', planId: plan.id },
                          () => onContactSales({ planId: plan.id, account }),
                          'billingPricingTable.contactSales.error'
                        )
                      }
                      variant="outline"
                    >
                      {isPending && pendingAction?.kind === 'contact'
                        ? messages.contactingSalesButton
                        : messages.contactSalesButton}
                    </Button>
                  ) : null}
                </CardFooter>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
